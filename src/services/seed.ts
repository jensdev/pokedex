/**
 * Seed data for the in-memory store.
 *
 * Values are identical to the NestJS implementation's
 * `src/pokemon/infrastructure/pokemon.constants.ts` — parity decision P5 in
 * `docs/migration/01-current-behavior-spec.md`. All four entries share the
 * timestamp `2024-01-01T00:00:00.000Z`.
 */
import type { PokemonVariant } from '../generated/Api.js';

const SEEDED_AT = '2024-01-01T00:00:00.000Z';

export const seedPokemon: ReadonlyArray<PokemonVariant> = [
  {
    id: 1,
    name: 'bulbasaur',
    primaryType: 'grass',
    secondaryType: 'poison',
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
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    classification: 'normal',
    encounterRate: 45,
    evolvesInto: [2],
  },
  {
    id: 25,
    name: 'pikachu',
    primaryType: 'electric',
    baseStats: {
      hp: 35,
      attack: 55,
      defense: 40,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    },
    heightMetres: 0.4,
    weightKg: 6.0,
    isObtainable: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    classification: 'normal',
    encounterRate: 30,
    evolvesInto: [26],
  },
  {
    id: 150,
    name: 'mewtwo',
    primaryType: 'psychic',
    baseStats: {
      hp: 106,
      attack: 110,
      defense: 90,
      specialAttack: 154,
      specialDefense: 90,
      speed: 130,
    },
    heightMetres: 2.0,
    weightKg: 122.0,
    isObtainable: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    classification: 'legendary',
    legendaryGroup: 'Mew Duo',
    isBoxLegendary: false,
  },
  {
    id: 151,
    name: 'mew',
    primaryType: 'psychic',
    baseStats: {
      hp: 100,
      attack: 100,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    },
    heightMetres: 0.4,
    weightKg: 4.0,
    isObtainable: false,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    classification: 'mythical',
    distributionMethod: 'Mystery Gift',
    isCurrentlyDistributed: false,
    loreDescription:
      'A Mythical Pokemon said to possess the genetic composition of all Pokemon.',
  },
];
