/**
 * Storage port for Pokémon, plus the in-memory adapter.
 *
 * The port describes storage only: no wire validation, no HTTP, no filtering or
 * sorting (those live in `services/Pokedex.ts`). The adapter is a `Ref`-backed
 * store seeded from `seed.ts`, so all state is lost on restart — parity with
 * the NestJS implementation.
 *
 * Every method carries a span, so a trace shows where a request's time went
 * once the store is something slower than a `Ref`. The methods that take an id
 * annotate it; `fetchAll` and `nextId` have no arguments worth recording.
 */
import { Clock, Context, Effect, Layer, Option, Random, Ref } from 'effect';
import { FlakyUpstreamRate } from '../AppConfig.js';
import { PokemonDataParse } from '../domain/Errors.js';
import type { HealthResponse, PokemonVariant } from '../generated/Api.js';
import { seedPokemon } from './seed.js';

/**
 * First id handed out by {@link PokemonRepository.nextId}. Parity decision P4:
 * the sequence starts above the National Pokédex range, never reuses a freed
 * id, and is unaffected by deletes.
 */
export const FIRST_GENERATED_ID = 1026;

/**
 * The contract's per-component health shape. Derived rather than imported: the
 * generator inlines `ComponentHealth` into `HealthResponse` instead of emitting
 * a name for it, and deriving it here keeps `services/HealthChecks.ts` — which
 * depends on this module — out of this module's imports.
 */
type ComponentHealth = HealthResponse['components']['database'];

export class PokemonRepository extends Context.Service<
  PokemonRepository,
  {
    /**
     * The full data set. Simulates the flaky upstream of parity decision P1:
     * fails with {@link PokemonDataParse} at `FLAKY_UPSTREAM_RATE`, which
     * defaults to `0` — the chaos is opt-in.
     */
    readonly fetchAll: Effect.Effect<
      ReadonlyArray<PokemonVariant>,
      PokemonDataParse
    >;
    readonly findById: (
      id: number,
    ) => Effect.Effect<Option.Option<PokemonVariant>>;
    /**
     * Probes the store for the health endpoints — the adapter knows what a
     * round trip to *its* storage costs; `services/HealthChecks.ts` only knows
     * which contract component to file the answer under.
     */
    readonly health: Effect.Effect<ComponentHealth>;
    /** The next id in the sequence; consumed by the call. */
    readonly nextId: Effect.Effect<number>;
    /** Inserts, or replaces the entry with the same id. */
    readonly save: (pokemon: PokemonVariant) => Effect.Effect<void>;
    /** Returns false when the id did not exist. */
    readonly remove: (id: number) => Effect.Effect<boolean>;
  }
>()('pokedex/PokemonRepository') {
  static readonly layerInMemory = Layer.effect(
    PokemonRepository,
    Effect.gen(function* () {
      const flakyRate = yield* FlakyUpstreamRate;
      const store = yield* Ref.make<ReadonlyArray<PokemonVariant>>(seedPokemon);
      const idSequence = yield* Ref.make(FIRST_GENERATED_ID);

      return {
        fetchAll: Effect.gen(function* () {
          // Through the `Random` service, not the global generator: the repo's
          // own rule is that nothing non-deterministic is read directly, so a
          // test can pin the sequence with `Random.withSeed` rather than only
          // the rate.
          const roll = yield* Random.next;
          if (roll < flakyRate) return yield* new PokemonDataParse();
          return yield* Ref.get(store);
        }).pipe(Effect.withSpan('PokemonRepository.fetchAll')),

        findById: Effect.fn('PokemonRepository.findById')(function* (
          id: number,
        ) {
          yield* Effect.annotateCurrentSpan('pokedex.id', id);
          const all = yield* Ref.get(store);
          return Option.fromNullishOr(all.find((pokemon) => pokemon.id === id));
        }),

        nextId: Ref.getAndUpdate(idSequence, (n) => n + 1).pipe(
          Effect.withSpan('PokemonRepository.nextId'),
        ),

        health: Effect.gen(function* () {
          const startedAt = yield* Clock.currentTimeMillis;
          const all = yield* Ref.get(store);
          const latencyMs = (yield* Clock.currentTimeMillis) - startedAt;

          // A `Ref.get` cannot fail, so this adapter has no unhealthy branch to
          // report — the shape is what matters: a store that can lose its
          // connection reports one from here, and the aggregate picks it up.
          return {
            status: 'healthy',
            message: `${all.length} entries`,
            latencyMs,
          } satisfies ComponentHealth;
        }).pipe(Effect.withSpan('PokemonRepository.health')),

        save: Effect.fn('PokemonRepository.save')(function* (
          pokemon: PokemonVariant,
        ) {
          yield* Effect.annotateCurrentSpan('pokedex.id', pokemon.id);
          yield* Ref.update(store, (all) =>
            all.some((entry) => entry.id === pokemon.id)
              ? all.map((entry) => (entry.id === pokemon.id ? pokemon : entry))
              : [...all, pokemon],
          );
        }),

        remove: Effect.fn('PokemonRepository.remove')(function* (id: number) {
          yield* Effect.annotateCurrentSpan('pokedex.id', id);
          return yield* Ref.modify(store, (all) => {
            const remaining = all.filter((pokemon) => pokemon.id !== id);
            return [remaining.length !== all.length, remaining];
          });
        }),
      };
    }),
  );
}
