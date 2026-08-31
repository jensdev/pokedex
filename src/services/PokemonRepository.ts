/**
 * Storage port for Pokémon, plus the in-memory adapter.
 *
 * The port describes storage only: no wire validation, no HTTP, no filtering or
 * sorting (those live in `services/Pokedex.ts`). The adapter is a `Ref`-backed
 * store seeded from `seed.ts`, so all state is lost on restart — parity with
 * the NestJS implementation.
 */
import { Context, Effect, Layer, Option, Ref } from 'effect';
import { FlakyUpstreamRate } from '../AppConfig.js';
import { PokemonDataParse } from '../domain/Errors.js';
import type { PokemonVariant } from '../generated/Api.js';
import { seedPokemon } from './seed.js';

/**
 * First id handed out by {@link PokemonRepository.nextId}. Parity decision P4:
 * the sequence starts above the National Pokédex range, never reuses a freed
 * id, and is unaffected by deletes.
 */
export const FIRST_GENERATED_ID = 1026;

export class PokemonRepository extends Context.Service<
  PokemonRepository,
  {
    /**
     * The full data set. Simulates the flaky upstream of parity decision P1:
     * fails with {@link PokemonDataParse} at `FLAKY_UPSTREAM_RATE`.
     */
    readonly fetchAll: Effect.Effect<
      ReadonlyArray<PokemonVariant>,
      PokemonDataParse
    >;
    readonly findById: (
      id: number,
    ) => Effect.Effect<Option.Option<PokemonVariant>>;
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
          const roll = yield* Effect.sync(() => Math.random());
          if (roll < flakyRate) return yield* new PokemonDataParse();
          return yield* Ref.get(store);
        }),

        findById: (id) =>
          Ref.get(store).pipe(
            Effect.map((all) =>
              Option.fromNullishOr(all.find((pokemon) => pokemon.id === id)),
            ),
          ),

        nextId: Ref.getAndUpdate(idSequence, (n) => n + 1),

        save: (pokemon) =>
          Ref.update(store, (all) =>
            all.some((entry) => entry.id === pokemon.id)
              ? all.map((entry) => (entry.id === pokemon.id ? pokemon : entry))
              : [...all, pokemon],
          ),

        remove: (id) =>
          Ref.modify(store, (all) => {
            const remaining = all.filter((pokemon) => pokemon.id !== id);
            return [remaining.length !== all.length, remaining];
          }),
      };
    }),
  );
}
