import { assert, describe, it } from '@effect/vitest';
import { ConfigProvider, Effect, Layer, Option } from 'effect';
import type { Config } from 'effect';
import { PokemonDataParse, PokemonNotFound } from '../src/domain/Errors.js';
import type { ListPokemonQuery, PokemonVariant } from '../src/generated/Api.js';
import { Pokedex } from '../src/services/Pokedex.js';
import { PokemonRepository } from '../src/services/PokemonRepository.js';

const stats = {
  hp: 1,
  attack: 1,
  defense: 1,
  specialAttack: 1,
  specialDefense: 1,
  speed: 1,
};

const base = (id: number, name: string, createdAt: string) => ({
  id,
  name,
  baseStats: stats,
  heightMetres: 1,
  weightKg: 1,
  isObtainable: true,
  createdAt,
  updatedAt: createdAt,
});

/**
 * Eight entries chosen so every list dimension is observable: three
 * classifications, types that only match on `secondaryType`, one capitalised
 * name, and `createdAt` order that is deliberately not id order.
 */
const fixtures: ReadonlyArray<PokemonVariant> = [
  {
    ...base(1, 'bulbasaur', '2024-01-01T00:00:00.000Z'),
    primaryType: 'grass',
    secondaryType: 'poison',
    classification: 'normal',
    encounterRate: 45,
  },
  {
    ...base(4, 'charmander', '2024-03-01T00:00:00.000Z'),
    primaryType: 'fire',
    classification: 'normal',
    encounterRate: 45,
  },
  {
    ...base(25, 'pikachu', '2024-02-01T00:00:00.000Z'),
    primaryType: 'electric',
    classification: 'normal',
    encounterRate: 30,
  },
  {
    ...base(94, 'gengar', '2024-05-01T00:00:00.000Z'),
    primaryType: 'ghost',
    secondaryType: 'poison',
    classification: 'normal',
    encounterRate: 10,
  },
  {
    ...base(122, 'Mr. Mime', '2024-08-01T00:00:00.000Z'),
    primaryType: 'psychic',
    secondaryType: 'fairy',
    classification: 'normal',
    encounterRate: 5,
  },
  {
    ...base(150, 'mewtwo', '2024-04-01T00:00:00.000Z'),
    primaryType: 'psychic',
    classification: 'legendary',
    legendaryGroup: 'Mew Duo',
    isBoxLegendary: false,
  },
  {
    ...base(151, 'mew', '2024-06-01T00:00:00.000Z'),
    primaryType: 'psychic',
    classification: 'mythical',
    distributionMethod: 'Mystery Gift',
    isCurrentlyDistributed: false,
    loreDescription: 'A Mythical Pokemon.',
  },
  {
    ...base(249, 'lugia', '2024-07-01T00:00:00.000Z'),
    primaryType: 'psychic',
    secondaryType: 'flying',
    classification: 'legendary',
    legendaryGroup: 'Tower Duo',
    isBoxLegendary: true,
  },
];

/**
 * A read-only repository over a fixed data set. The read side never writes, so
 * the write members are defects: if one is ever reached the test fails loudly
 * instead of silently exercising a no-op.
 */
const fixtureRepository = (items: ReadonlyArray<PokemonVariant>) =>
  Layer.succeed(PokemonRepository, {
    fetchAll: Effect.succeed(items),
    findById: (id: number) =>
      Effect.sync(() => {
        const found = items.find((pokemon) => pokemon.id === id);
        return found === undefined ? Option.none() : Option.some(found);
      }),
    nextId: Effect.die('the read side does not allocate ids'),
    save: () => Effect.die('the read side does not write'),
    remove: () => Effect.die('the read side does not write'),
  });

const FixtureLayer = Pokedex.layerWithRepository.pipe(
  Layer.provide(fixtureRepository(fixtures)),
);

/**
 * The real in-memory adapter, with the flaky upstream pinned: 0 never fails,
 * 1 always does.
 */
const inMemoryWithFlakyRate = (rate: number) =>
  Pokedex.layer.pipe(
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: String(rate) }),
      ),
    ),
  );

/** `local: true` bypasses layer memoization, so each test gets a fresh store. */
const withPokedex = <A, E>(
  program: Effect.Effect<A, E, Pokedex>,
  // `ConfigError` because the in-memory layers read `FLAKY_UPSTREAM_RATE`.
  layer: Layer.Layer<Pokedex, Config.ConfigError> = FixtureLayer,
) => program.pipe(Effect.provide(layer, { local: true }));

/** Lists are compared by id — the whole variant would drown the assertion. */
const idsOf = (items: ReadonlyArray<PokemonVariant>) =>
  items.map((pokemon) => pokemon.id);

const listing = (query: ListPokemonQuery) =>
  withPokedex(
    Effect.gen(function* () {
      const pokedex = yield* Pokedex;
      return yield* pokedex.list(query);
    }),
  );

describe('Pokedex.list', () => {
  it.effect('returns everything, page 0 of 20, when the query is empty', () =>
    Effect.gen(function* () {
      const result = yield* listing({});

      assert.deepStrictEqual(
        idsOf(result.items),
        [1, 4, 25, 94, 122, 150, 151, 249],
      );
      assert.strictEqual(result.total, fixtures.length);
      assert.strictEqual(result.page, 0);
      assert.strictEqual(result.pageSize, 20);
    }),
  );

  it.effect('preserves repository order when no sortBy is given', () =>
    Effect.gen(function* () {
      // `Mr. Mime` sorts last by id but sits fifth in the fixture order, so an
      // accidental default sort would show up here.
      const result = yield* listing({});

      assert.deepStrictEqual(
        result.items.map((pokemon) => pokemon.name),
        fixtures.map((pokemon) => pokemon.name),
      );
    }),
  );

  describe('filters', () => {
    it.effect('classification matches exactly', () =>
      Effect.gen(function* () {
        const legendary = yield* listing({ classification: 'legendary' });
        const mythical = yield* listing({ classification: 'mythical' });
        const normal = yield* listing({ classification: 'normal' });

        assert.deepStrictEqual(idsOf(legendary.items), [150, 249]);
        assert.deepStrictEqual(idsOf(mythical.items), [151]);
        assert.deepStrictEqual(idsOf(normal.items), [1, 4, 25, 94, 122]);
      }),
    );

    it.effect('type matches primaryType or secondaryType', () =>
      Effect.gen(function* () {
        // Neither Bulbasaur nor Gengar is poison-typed in the primary slot.
        const poison = yield* listing({ type: 'poison' });
        const psychic = yield* listing({ type: 'psychic' });
        const dragon = yield* listing({ type: 'dragon' });

        assert.deepStrictEqual(idsOf(poison.items), [1, 94]);
        assert.deepStrictEqual(idsOf(psychic.items), [122, 150, 151, 249]);
        assert.deepStrictEqual(idsOf(dragon.items), []);
        assert.strictEqual(dragon.total, 0);
      }),
    );

    it.effect('search is a case-insensitive substring of the name', () =>
      Effect.gen(function* () {
        const lower = yield* listing({ search: 'mew' });
        const upper = yield* listing({ search: 'MEW' });
        // The haystack is lowercased too, so a capitalised name still matches.
        const capitalised = yield* listing({ search: 'mr.' });
        // Substring, not prefix.
        const infix = yield* listing({ search: 'chu' });

        assert.deepStrictEqual(idsOf(lower.items), [150, 151]);
        assert.deepStrictEqual(idsOf(upper.items), idsOf(lower.items));
        assert.deepStrictEqual(idsOf(capitalised.items), [122]);
        assert.deepStrictEqual(idsOf(infix.items), [25]);
      }),
    );

    it.effect('combined filters intersect', () =>
      Effect.gen(function* () {
        const both = yield* listing({
          classification: 'legendary',
          type: 'psychic',
        });
        const all3 = yield* listing({
          classification: 'legendary',
          type: 'psychic',
          search: 'LUG',
        });
        // Legendary Pokemon that are grass-typed: none.
        const empty = yield* listing({
          classification: 'legendary',
          type: 'grass',
        });

        assert.deepStrictEqual(idsOf(both.items), [150, 249]);
        assert.deepStrictEqual(idsOf(all3.items), [249]);
        assert.deepStrictEqual(idsOf(empty.items), []);
      }),
    );
  });

  describe('sorting', () => {
    it.effect('by id, numerically', () =>
      Effect.gen(function* () {
        const asc = yield* listing({ sortBy: 'id' });
        const desc = yield* listing({ sortBy: 'id', sortOrder: 'desc' });

        assert.deepStrictEqual(
          idsOf(asc.items),
          [1, 4, 25, 94, 122, 150, 151, 249],
        );
        assert.deepStrictEqual(
          idsOf(desc.items),
          idsOf(asc.items).toReversed(),
        );
      }),
    );

    it.effect('by name, with localeCompare', () =>
      Effect.gen(function* () {
        const asc = yield* listing({ sortBy: 'name' });
        const desc = yield* listing({ sortBy: 'name', sortOrder: 'desc' });

        // `Mr. Mime` lands between `mewtwo` and `pikachu`; a codepoint sort
        // would put it first, ahead of every lowercase name.
        const ascending = [
          'bulbasaur',
          'charmander',
          'gengar',
          'lugia',
          'mew',
          'mewtwo',
          'Mr. Mime',
          'pikachu',
        ];
        assert.deepStrictEqual(
          asc.items.map((pokemon) => pokemon.name),
          ascending,
        );
        assert.deepStrictEqual(
          desc.items.map((pokemon) => pokemon.name),
          ascending.toReversed(),
        );
      }),
    );

    it.effect('by createdAt, chronologically', () =>
      Effect.gen(function* () {
        const asc = yield* listing({ sortBy: 'createdAt' });
        const desc = yield* listing({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        // Fixture createdAt order is not id order, so this cannot pass by luck.
        assert.deepStrictEqual(
          idsOf(asc.items),
          [1, 25, 4, 150, 94, 151, 249, 122],
        );
        assert.deepStrictEqual(
          idsOf(desc.items),
          idsOf(asc.items).toReversed(),
        );
      }),
    );

    it.effect('sortOrder defaults to asc', () =>
      Effect.gen(function* () {
        const implicit = yield* listing({ sortBy: 'id' });
        const explicit = yield* listing({ sortBy: 'id', sortOrder: 'asc' });

        assert.deepStrictEqual(idsOf(implicit.items), idsOf(explicit.items));
      }),
    );

    it.effect('sortOrder alone does not sort', () =>
      Effect.gen(function* () {
        // Step 5 runs "only when sortBy is given" — a lone sortOrder is inert.
        const result = yield* listing({ sortOrder: 'desc' });

        assert.deepStrictEqual(idsOf(result.items), idsOf(fixtures));
      }),
    );

    it.effect('sorting runs after filtering, before pagination', () =>
      Effect.gen(function* () {
        const result = yield* listing({
          classification: 'normal',
          sortBy: 'name',
          sortOrder: 'desc',
          pageSize: 2,
        });

        assert.deepStrictEqual(
          result.items.map((pokemon) => pokemon.name),
          ['pikachu', 'Mr. Mime'],
        );
        assert.strictEqual(result.total, 5);
      }),
    );
  });

  describe('pagination', () => {
    it.effect('slices page * pageSize to (page + 1) * pageSize', () =>
      Effect.gen(function* () {
        const first = yield* listing({ sortBy: 'id', page: 0, pageSize: 3 });
        const second = yield* listing({ sortBy: 'id', page: 1, pageSize: 3 });

        assert.deepStrictEqual(idsOf(first.items), [1, 4, 25]);
        assert.deepStrictEqual(idsOf(second.items), [94, 122, 150]);
      }),
    );

    it.effect('a partial last page returns what is left', () =>
      Effect.gen(function* () {
        const last = yield* listing({ sortBy: 'id', page: 2, pageSize: 3 });

        assert.deepStrictEqual(idsOf(last.items), [151, 249]);
      }),
    );

    it.effect('total counts the filtered set, before pagination', () =>
      Effect.gen(function* () {
        const result = yield* listing({
          classification: 'normal',
          pageSize: 2,
        });

        assert.strictEqual(result.items.length, 2);
        assert.strictEqual(result.total, 5);
      }),
    );

    it.effect('a page beyond the end is empty but keeps total', () =>
      Effect.gen(function* () {
        const result = yield* listing({ page: 5, pageSize: 3 });

        assert.deepStrictEqual(result.items, []);
        assert.strictEqual(result.total, fixtures.length);
        assert.strictEqual(result.page, 5);
        assert.strictEqual(result.pageSize, 3);
      }),
    );

    it.effect('pageSize 1 yields one item per page', () =>
      Effect.gen(function* () {
        const result = yield* listing({ sortBy: 'id', page: 7, pageSize: 1 });

        assert.deepStrictEqual(idsOf(result.items), [249]);
      }),
    );

    it.effect('a pageSize at or above the total returns everything', () =>
      Effect.gen(function* () {
        const exact = yield* listing({ pageSize: fixtures.length });
        const over = yield* listing({ pageSize: 100 });

        assert.strictEqual(exact.items.length, fixtures.length);
        assert.strictEqual(over.items.length, fixtures.length);
      }),
    );

    it.effect('page and pageSize echo the effective values', () =>
      Effect.gen(function* () {
        const defaults = yield* listing({});
        const explicit = yield* listing({ page: 1, pageSize: 3 });

        assert.strictEqual(defaults.page, 0);
        assert.strictEqual(defaults.pageSize, 20);
        assert.strictEqual(explicit.page, 1);
        assert.strictEqual(explicit.pageSize, 3);
      }),
    );
  });

  it.effect('surfaces PokemonDataParse when the upstream is corrupt', () =>
    withPokedex(
      Effect.gen(function* () {
        const pokedex = yield* Pokedex;

        const error = yield* Effect.flip(pokedex.list({}));

        assert.instanceOf(error, PokemonDataParse);
      }),
      inMemoryWithFlakyRate(1),
    ),
  );

  it.effect('lists the seeded data over the real in-memory store', () =>
    withPokedex(
      Effect.gen(function* () {
        const pokedex = yield* Pokedex;

        const result = yield* pokedex.list({ sortBy: 'id' });

        assert.deepStrictEqual(idsOf(result.items), [1, 25, 150, 151]);
        assert.strictEqual(result.total, 4);
      }),
      inMemoryWithFlakyRate(0),
    ),
  );
});

describe('Pokedex.getById', () => {
  it.effect('returns the entry with that id', () =>
    withPokedex(
      Effect.gen(function* () {
        const pokedex = yield* Pokedex;

        const found = yield* pokedex.getById(150);

        assert.strictEqual(found.name, 'mewtwo');
        assert.strictEqual(found.classification, 'legendary');
      }),
    ),
  );

  it.effect('fails with PokemonNotFound carrying the id', () =>
    withPokedex(
      Effect.gen(function* () {
        const pokedex = yield* Pokedex;

        const error = yield* Effect.flip(pokedex.getById(999));

        assert.instanceOf(error, PokemonNotFound);
        assert.strictEqual(error.id, 999);
      }),
    ),
  );
});
