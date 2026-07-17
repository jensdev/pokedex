import { R } from '@praha/byethrow';
import { describe, expect, it } from 'vitest';
import { Pokemon, PokemonAttributes } from './pokemon.entity.js';
import { InvalidPokemonAttributeError } from './pokemon.errors.js';
import {
  PokemonCreatedEvent,
  PokemonReplacedEvent,
} from './pokemon.events.js';
import { Height, PokemonId, Stats, Weight } from './value-objects.js';

const T0 = '2024-01-01T00:00:00.000Z';
const T1 = '2024-06-01T00:00:00.000Z';

const attributes = (
  overrides: Partial<PokemonAttributes> = {},
): PokemonAttributes => ({
  name: 'mewtwo',
  primaryType: 'psychic',
  baseStats: R.unwrap(
    Stats.create({
      hp: 106,
      attack: 110,
      defense: 90,
      specialAttack: 154,
      specialDefense: 90,
      speed: 130,
    }),
  ),
  heightMetres: R.unwrap(Height.create(2)),
  weightKg: R.unwrap(Weight.create(122)),
  isObtainable: true,
  classification: 'legendary',
  ...overrides,
});

const createMewtwo = (now = T0): Pokemon =>
  R.unwrap(Pokemon.create({ id: PokemonId.of(150), ...attributes() }, now));

// Timestamps are inputs (via the Clock port), so entity behaviour is a pure
// function of its arguments — no Date mocking anywhere in these tests.
describe('Pokemon', () => {
  it('create stamps both timestamps with the provided instant', () => {
    const pokemon = createMewtwo();

    const dto = pokemon.toDto();
    expect(dto.createdAt).toBe(T0);
    expect(dto.updatedAt).toBe(T0);
    expect(dto.classification).toBe('legendary');
  });

  it('create rejects a secondary type equal to the primary type', () => {
    const result = Pokemon.create(
      {
        id: PokemonId.of(150),
        ...attributes({ primaryType: 'psychic', secondaryType: 'psychic' }),
      },
      T0,
    );

    const error = R.unwrapError(result);
    expect(error).toBeInstanceOf(InvalidPokemonAttributeError);
    expect(error.message).toBe('Secondary type must differ from primary type.');
  });

  it('create accepts a distinct secondary type', () => {
    const result = Pokemon.create(
      {
        id: PokemonId.of(150),
        ...attributes({ primaryType: 'psychic', secondaryType: 'fighting' }),
      },
      T0,
    );

    expect(R.unwrap(result).toDto().secondaryType).toBe('fighting');
  });

  it('replace enforces the same type invariant', () => {
    const result = createMewtwo().replace(
      attributes({ primaryType: 'fire', secondaryType: 'fire' }),
      T1,
    );

    expect(R.isFailure(result)).toBe(true);
  });

  it('replace preserves identity and createdAt, updates updatedAt', () => {
    const created = createMewtwo();

    const replaced = R.unwrap(
      created.replace(attributes({ name: 'mewtwo-mega' }), T1),
    );

    const dto = replaced.toDto();
    expect(replaced.id).toBe(150);
    expect(dto.name).toBe('mewtwo-mega');
    expect(dto.createdAt).toBe(T0);
    expect(dto.updatedAt).toBe(T1);
  });

  it('replace carries classification-specific fields over when unchanged', () => {
    const existing = Pokemon.load({
      ...createMewtwo().toDto(),
      classification: 'legendary',
      legendaryGroup: 'Mewtwo',
      isBoxLegendary: true,
    });

    const replaced = R.unwrap(existing.replace(attributes(), T1)).toDto();

    expect(replaced).toMatchObject({
      classification: 'legendary',
      legendaryGroup: 'Mewtwo',
      isBoxLegendary: true,
    });
  });

  it('replace resets classification-specific fields when the classification changes', () => {
    const replaced = R.unwrap(
      createMewtwo().replace(attributes({ classification: 'normal' }), T1),
    ).toDto();

    expect(replaced).toMatchObject({
      classification: 'normal',
      encounterRate: 50,
    });
    expect(replaced).not.toHaveProperty('legendaryGroup');
  });

  it('create records a PokemonCreatedEvent', () => {
    const events = createMewtwo().pullEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(PokemonCreatedEvent);
    expect(events[0]).toMatchObject({
      id: 150,
      pokemonName: 'mewtwo',
      occurredAt: T0,
    });
  });

  it('replace records a PokemonReplacedEvent', () => {
    const replaced = R.unwrap(
      createMewtwo().replace(attributes({ name: 'mewtwo-mega' }), T1),
    );

    const events = replaced.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(PokemonReplacedEvent);
    expect(events[0]).toMatchObject({ pokemonName: 'mewtwo-mega', occurredAt: T1 });
  });

  it('load records no events, and pullEvents drains', () => {
    const loaded = Pokemon.load(createMewtwo().toDto());
    expect(loaded.pullEvents()).toHaveLength(0);

    const created = createMewtwo();
    expect(created.pullEvents()).toHaveLength(1);
    expect(created.pullEvents()).toHaveLength(0);
  });
});
