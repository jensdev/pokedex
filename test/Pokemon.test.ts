import { assert, describe, it } from '@effect/vitest';
import {
  makeVariant,
  replaceVariant,
  type PokemonInput,
} from '../src/domain/Pokemon.js';
import type { PokemonVariant } from '../src/generated/Api.js';

const baseStats = {
  hp: 1,
  attack: 2,
  defense: 3,
  specialAttack: 4,
  specialDefense: 5,
  speed: 6,
};

/** A create/replace payload; only base fields plus a classification. */
const input = (
  classification: PokemonInput['classification'],
  overrides: Partial<PokemonInput> = {},
): PokemonInput => ({
  name: 'missingno',
  primaryType: 'normal',
  baseStats,
  heightMetres: 1.5,
  weightKg: 2.5,
  isObtainable: true,
  classification,
  ...overrides,
});

const CREATED = '2024-01-01T00:00:00.000Z';
const UPDATED = '2025-06-15T12:30:00.000Z';
const stamp = { id: 1026, createdAt: CREATED, updatedAt: CREATED };

/** The base fields every `makeVariant` result carries, for deep comparison. */
const expectedBase = {
  id: 1026,
  name: 'missingno',
  primaryType: 'normal' as const,
  baseStats,
  heightMetres: 1.5,
  weightKg: 2.5,
  isObtainable: true,
  createdAt: CREATED,
  updatedAt: CREATED,
};

describe('makeVariant', () => {
  it('defaults a normal Pokemon to encounterRate 50 with no evolvesInto', () => {
    const result = makeVariant(input('normal'), stamp);

    assert.deepStrictEqual(result, {
      ...expectedBase,
      classification: 'normal',
      encounterRate: 50,
    });
    assert.isFalse('evolvesInto' in result);
  });

  it('defaults a legendary Pokemon to an unknown, non-box group', () => {
    const result = makeVariant(input('legendary'), stamp);

    assert.deepStrictEqual(result, {
      ...expectedBase,
      classification: 'legendary',
      legendaryGroup: 'Unknown',
      isBoxLegendary: false,
    });
  });

  it('defaults a mythical Pokemon to the placeholder lore description', () => {
    const result = makeVariant(input('mythical'), stamp);

    assert.deepStrictEqual(result, {
      ...expectedBase,
      classification: 'mythical',
      distributionMethod: 'Unknown',
      isCurrentlyDistributed: false,
      loreDescription: 'A newly discovered Mythical Pokemon.',
    });
  });

  it('carries secondaryType through, and omits the key when absent', () => {
    const withSecondary = makeVariant(
      input('normal', { secondaryType: 'poison' }),
      stamp,
    );
    assert.strictEqual(withSecondary.secondaryType, 'poison');

    assert.isFalse('secondaryType' in makeVariant(input('normal'), stamp));
  });
});

describe('replaceVariant', () => {
  const existingNormal: PokemonVariant = {
    ...expectedBase,
    classification: 'normal',
    encounterRate: 12,
    evolvesInto: [2],
  };
  const existingLegendary: PokemonVariant = {
    ...expectedBase,
    classification: 'legendary',
    legendaryGroup: 'Mew Duo',
    isBoxLegendary: true,
  };
  const existingMythical: PokemonVariant = {
    ...expectedBase,
    classification: 'mythical',
    distributionMethod: 'Mystery Gift',
    isCurrentlyDistributed: true,
    loreDescription: 'Older than time.',
  };

  /** Base fields after a replace: new payload, original id and createdAt. */
  const replacedBase = {
    id: 1026,
    name: 'renamed',
    primaryType: 'water' as const,
    baseStats,
    heightMetres: 9,
    weightKg: 8,
    isObtainable: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
  };
  const payload = (classification: PokemonInput['classification']) =>
    input(classification, {
      name: 'renamed',
      primaryType: 'water',
      heightMetres: 9,
      weightKg: 8,
      isObtainable: false,
    });

  it('preserves id and createdAt and stamps the new updatedAt', () => {
    const result = replaceVariant(existingNormal, payload('normal'), UPDATED);

    assert.strictEqual(result.id, existingNormal.id);
    assert.strictEqual(result.createdAt, CREATED);
    assert.strictEqual(result.updatedAt, UPDATED);
  });

  // Quirk P2 (docs/migration/01-current-behavior-spec.md): normal → normal does
  // NOT preserve the existing encounterRate; it is always reset to 50.
  it('resets encounterRate to 50 even when the classification is unchanged', () => {
    const result = replaceVariant(existingNormal, payload('normal'), UPDATED);

    assert.deepStrictEqual(result, {
      ...replacedBase,
      classification: 'normal',
      encounterRate: 50,
    });
    assert.isFalse('evolvesInto' in result);
  });

  it('carries legendary extras over when the classification is unchanged', () => {
    const result = replaceVariant(
      existingLegendary,
      payload('legendary'),
      UPDATED,
    );

    assert.deepStrictEqual(result, {
      ...replacedBase,
      classification: 'legendary',
      legendaryGroup: 'Mew Duo',
      isBoxLegendary: true,
    });
  });

  it('carries mythical extras over when the classification is unchanged', () => {
    const result = replaceVariant(
      existingMythical,
      payload('mythical'),
      UPDATED,
    );

    assert.deepStrictEqual(result, {
      ...replacedBase,
      classification: 'mythical',
      distributionMethod: 'Mystery Gift',
      isCurrentlyDistributed: true,
      loreDescription: 'Older than time.',
    });
  });

  it('defaults legendary extras when the classification changed', () => {
    const fromNormal = replaceVariant(
      existingNormal,
      payload('legendary'),
      UPDATED,
    );
    const fromMythical = replaceVariant(
      existingMythical,
      payload('legendary'),
      UPDATED,
    );
    const expected = {
      ...replacedBase,
      classification: 'legendary' as const,
      legendaryGroup: 'Unknown',
      isBoxLegendary: false,
    };

    assert.deepStrictEqual(fromNormal, expected);
    assert.deepStrictEqual(fromMythical, expected);
  });

  it('defaults mythical extras when the classification changed', () => {
    const fromNormal = replaceVariant(
      existingNormal,
      payload('mythical'),
      UPDATED,
    );
    const fromLegendary = replaceVariant(
      existingLegendary,
      payload('mythical'),
      UPDATED,
    );
    const expected = {
      ...replacedBase,
      classification: 'mythical' as const,
      distributionMethod: 'Unknown',
      isCurrentlyDistributed: false,
      loreDescription: 'A newly discovered Mythical Pokemon.',
    };

    assert.deepStrictEqual(fromNormal, expected);
    assert.deepStrictEqual(fromLegendary, expected);
  });

  it('defaults encounterRate when the classification changed to normal', () => {
    const result = replaceVariant(
      existingLegendary,
      payload('normal'),
      UPDATED,
    );

    assert.deepStrictEqual(result, {
      ...replacedBase,
      classification: 'normal',
      encounterRate: 50,
    });
  });
});
