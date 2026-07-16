import { R, Result } from '@praha/byethrow';
import { describe, expect, it } from 'vitest';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { PokemonDataParseError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { ListPokemonsQuery } from './list-pokemons.query.js';

const variant = (overrides: Partial<PokemonVariant>): PokemonVariant =>
  ({
    id: 1,
    name: 'bulbasaur',
    primaryType: 'grass',
    baseStats: {
      hp: 45,
      attack: 49,
      defense: 49,
      specialAttack: 65,
      specialDefense: 65,
      speed: 45,
    },
    heightMetres: 0.7,
    weightKg: 6.9,
    isObtainable: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    classification: 'normal',
    encounterRate: 45,
    ...overrides,
  }) as PokemonVariant;

const stubRepository = (
  findAll: () => Result.ResultAsync<Pokemon[], PokemonDataParseError>,
): IPokemonRepository => ({
  findAll,
  findById: () => Promise.reject(new Error('not implemented')),
  nextId: () => Promise.reject(new Error('not implemented')),
  save: () => Promise.reject(new Error('not implemented')),
  remove: () => Promise.reject(new Error('not implemented')),
});

const seed = [
  variant({ id: 1, name: 'bulbasaur', primaryType: 'grass' }),
  variant({ id: 4, name: 'charmander', primaryType: 'fire' }),
  variant({
    id: 150,
    name: 'mewtwo',
    primaryType: 'psychic',
    classification: 'legendary',
    legendaryGroup: 'Mewtwo',
    isBoxLegendary: true,
  } as Partial<PokemonVariant>),
];

const queryWithSeed = () =>
  new ListPokemonsQuery(
    stubRepository(async () => R.succeed(seed.map((s) => Pokemon.load(s)))),
  );

describe('ListPokemonsQuery', () => {
  it('propagates a parse failure from the repository', async () => {
    const query = new ListPokemonsQuery(
      stubRepository(async () => R.fail(new PokemonDataParseError())),
    );

    const result = await query.get();

    expect(R.isFailure(result)).toBe(true);
    expect(R.unwrapError(result)).toBeInstanceOf(PokemonDataParseError);
  });

  it('filters by classification', async () => {
    const result = await queryWithSeed().get({ classification: 'legendary' });

    const page = R.unwrap(result);
    expect(page.total).toBe(1);
    expect(page.items[0]?.name).toBe('mewtwo');
  });

  it('sorts by name descending', async () => {
    const result = await queryWithSeed().get({
      sortBy: 'name',
      sortOrder: 'desc',
    });

    const page = R.unwrap(result);
    expect(page.items.map(({ name }) => name)).toEqual([
      'mewtwo',
      'charmander',
      'bulbasaur',
    ]);
  });

  it('paginates with defaults applied', async () => {
    const result = await queryWithSeed().get({ page: 1, pageSize: 2 });

    const page = R.unwrap(result);
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(2);
  });
});
