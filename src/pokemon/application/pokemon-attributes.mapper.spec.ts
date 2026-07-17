import { R } from '@praha/byethrow';
import { describe, expect, it } from 'vitest';
import type { CreatePokemonRequest } from '../../generated/types.gen.js';
import { InvalidPokemonAttributesError } from '../domain/pokemon.errors.js';
import { Height, Stats, Weight } from '../domain/value-objects.js';
import { toPokemonAttributes } from './pokemon-attributes.mapper.js';

const request = (
  overrides: Partial<CreatePokemonRequest> = {},
): CreatePokemonRequest => ({
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
  classification: 'normal',
  ...overrides,
});

describe('toPokemonAttributes', () => {
  it('builds validated value objects from a valid request', () => {
    const result = toPokemonAttributes(request());

    const attributes = R.unwrap(result);
    expect(attributes.baseStats).toBeInstanceOf(Stats);
    expect(attributes.heightMetres).toBeInstanceOf(Height);
    expect(attributes.weightKg).toBeInstanceOf(Weight);
    expect(attributes.name).toBe('bulbasaur');
  });

  it('collects every attribute violation instead of stopping at the first', () => {
    const result = toPokemonAttributes(
      request({
        baseStats: {
          hp: -1,
          attack: 49,
          defense: 49,
          specialAttack: 65,
          specialDefense: 65,
          speed: 45,
        },
        heightMetres: 0,
        weightKg: -5,
      }),
    );

    const error = R.unwrapError(result);
    expect(error).toBeInstanceOf(InvalidPokemonAttributesError);
    expect(error.errors.map(({ message }) => message)).toEqual([
      'Stats cannot be negative.',
      'Height must be greater than zero.',
      'Weight must be greater than zero.',
    ]);
  });
});
