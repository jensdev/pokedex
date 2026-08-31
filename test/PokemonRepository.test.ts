import { assert, describe, it } from '@effect/vitest';
import { ConfigProvider, Effect, Layer, Option } from 'effect';
import { PokemonDataParse } from '../src/domain/Errors.js';
import type { PokemonVariant } from '../src/generated/Api.js';
import {
  FIRST_GENERATED_ID,
  PokemonRepository,
} from '../src/services/PokemonRepository.js';
import { seedPokemon } from '../src/services/seed.js';

/**
 * The repository reads `FLAKY_UPSTREAM_RATE` from the ambient `ConfigProvider`;
 * pinning it makes `fetchAll` deterministic (0 = never fails, 1 = always).
 */
const repositoryWithFlakyRate = (rate: number) =>
  PokemonRepository.layerInMemory.pipe(
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: String(rate) }),
      ),
    ),
  );

const Deterministic = repositoryWithFlakyRate(0);
const AlwaysCorrupt = repositoryWithFlakyRate(1);

/**
 * Runs `program` against a freshly built repository. `local: true` bypasses
 * layer memoization, so no test observes another test's store or id sequence.
 */
const withRepository = <A, E>(
  program: Effect.Effect<A, E, PokemonRepository>,
  layer: typeof Deterministic = Deterministic,
) => program.pipe(Effect.provide(layer, { local: true }));

const missingno: PokemonVariant = {
  id: 1026,
  name: 'missingno',
  primaryType: 'normal',
  baseStats: {
    hp: 1,
    attack: 1,
    defense: 1,
    specialAttack: 1,
    specialDefense: 1,
    speed: 1,
  },
  heightMetres: 1,
  weightKg: 1,
  isObtainable: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  classification: 'normal',
  encounterRate: 50,
};

describe('PokemonRepository.layerInMemory', () => {
  it.effect('starts seeded with the four canonical Pokemon', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        const all = yield* repository.fetchAll;

        assert.deepStrictEqual(all, seedPokemon);
        assert.deepStrictEqual(
          all.map((pokemon) => pokemon.id),
          [1, 25, 150, 151],
        );
      }),
    ),
  );

  it.effect('finds a seeded Pokemon by id and misses on an unknown one', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        const found = yield* repository.findById(25);
        const missing = yield* repository.findById(999);

        assert.deepStrictEqual(Option.getOrUndefined(found)?.name, 'pikachu');
        assert.isTrue(Option.isNone(missing));
      }),
    ),
  );

  it.effect('hands out ids from 1026 upwards, one per call', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        const ids = yield* Effect.all([
          repository.nextId,
          repository.nextId,
          repository.nextId,
        ]);

        assert.deepStrictEqual(ids, [
          FIRST_GENERATED_ID,
          FIRST_GENERATED_ID + 1,
          FIRST_GENERATED_ID + 2,
        ]);
      }),
    ),
  );

  it.effect('never reuses an id, even after the entry is removed', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        const first = yield* repository.nextId;
        yield* repository.save(missingno);
        assert.isTrue(yield* repository.remove(first));

        assert.strictEqual(yield* repository.nextId, first + 1);
      }),
    ),
  );

  it.effect('save appends an unknown id', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        yield* repository.save(missingno);

        const all = yield* repository.fetchAll;
        assert.strictEqual(all.length, seedPokemon.length + 1);
        assert.deepStrictEqual(all.at(-1), missingno);
      }),
    ),
  );

  it.effect('save replaces in place when the id already exists', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        const renamed: PokemonVariant = {
          ...missingno,
          id: 25,
          name: 'raichu',
        };

        yield* repository.save(renamed);

        const all = yield* repository.fetchAll;
        assert.strictEqual(all.length, seedPokemon.length);
        assert.deepStrictEqual(all[1], renamed);
        assert.deepStrictEqual(
          Option.getOrUndefined(yield* repository.findById(25)),
          renamed,
        );
      }),
    ),
  );

  it.effect('remove reports whether the id was there', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        assert.isTrue(yield* repository.remove(150));
        assert.isFalse(yield* repository.remove(150));
        assert.isFalse(yield* repository.remove(999));

        const all = yield* repository.fetchAll;
        assert.deepStrictEqual(
          all.map((pokemon) => pokemon.id),
          [1, 25, 151],
        );
      }),
    ),
  );

  it.effect('fetchAll never fails at FLAKY_UPSTREAM_RATE=0', () =>
    withRepository(
      Effect.gen(function* () {
        const repository = yield* PokemonRepository;

        // 50 rolls: enough that a non-zero rate would show up.
        const runs = yield* Effect.all(
          Array.from({ length: 50 }, () => repository.fetchAll),
        );

        assert.isTrue(runs.every((all) => all.length === seedPokemon.length));
      }),
    ),
  );

  it.effect(
    'fetchAll fails with PokemonDataParse at FLAKY_UPSTREAM_RATE=1',
    () =>
      withRepository(
        Effect.gen(function* () {
          const repository = yield* PokemonRepository;

          const error = yield* Effect.flip(repository.fetchAll);

          assert.instanceOf(error, PokemonDataParse);
        }),
        AlwaysCorrupt,
      ),
  );
});
