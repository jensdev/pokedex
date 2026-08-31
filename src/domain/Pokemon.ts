/**
 * Pure construction rules for Pokémon variants.
 *
 * The request payloads carry only the base fields plus a `classification`;
 * everything variant-specific is derived here. Both functions are total,
 * synchronous, and effect-free — the caller supplies the id and the timestamps
 * (from `repo.nextId` and `DateTime.now`), so nothing in this module reads a
 * clock or a random source.
 *
 * Rules come from `docs/migration/01-current-behavior-spec.md`
 * (§createPokemon and §replacePokemon).
 */
import type {
  CreatePokemonRequest,
  PokemonVariant,
  UpdatePokemonRequest,
} from '../generated/Api.js';

/** The `normal` arm of the generated {@link PokemonVariant} union. */
export type NormalPokemon = Extract<
  PokemonVariant,
  { classification: 'normal' }
>;
/** The `legendary` arm of the generated {@link PokemonVariant} union. */
export type LegendaryPokemon = Extract<
  PokemonVariant,
  { classification: 'legendary' }
>;
/** The `mythical` arm of the generated {@link PokemonVariant} union. */
export type MythicalPokemon = Extract<
  PokemonVariant,
  { classification: 'mythical' }
>;

/**
 * The caller-supplied fields. `CreatePokemonRequest` and `UpdatePokemonRequest`
 * are structurally identical in the contract; both are accepted here.
 */
export type PokemonInput = CreatePokemonRequest | UpdatePokemonRequest;

/** Identity and timestamps the caller owns; never derived in this module. */
export interface VariantStamp {
  readonly id: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The encounter rate every `normal` Pokemon gets when none is carried over. */
const NORMAL_ENCOUNTER_RATE = 50;

/**
 * Variant-specific fields for a create, keyed by classification. Indexing this
 * record with the payload's classification is what makes the set exhaustive:
 * a classification added to the contract fails to compile until it has an entry.
 */
const createdExtras = {
  normal: { classification: 'normal', encounterRate: NORMAL_ENCOUNTER_RATE },
  legendary: {
    classification: 'legendary',
    legendaryGroup: 'Unknown',
    isBoxLegendary: false,
  },
  mythical: {
    classification: 'mythical',
    distributionMethod: 'Unknown',
    isCurrentlyDistributed: false,
    loreDescription: 'A newly discovered Mythical Pokemon.',
  },
} as const;

/**
 * Variant-specific fields for a replace: carried over from the existing entry
 * when the classification is unchanged, defaulted otherwise.
 *
 * **Quirk P2 (kept for parity):** `normal` has nothing to carry over — the
 * encounter rate is *always* reset to 50, even for normal → normal.
 */
const replacedExtras = {
  normal: () => createdExtras.normal,

  legendary: (existing: PokemonVariant) =>
    existing.classification === 'legendary'
      ? ({
          classification: 'legendary',
          legendaryGroup: existing.legendaryGroup,
          isBoxLegendary: existing.isBoxLegendary,
        } as const)
      : createdExtras.legendary,

  mythical: (existing: PokemonVariant) =>
    existing.classification === 'mythical'
      ? ({
          classification: 'mythical',
          distributionMethod: existing.distributionMethod,
          isCurrentlyDistributed: existing.isCurrentlyDistributed,
          loreDescription: existing.loreDescription,
        } as const)
      : createdExtras.mythical,
} as const;

/**
 * The fields shared by every variant. `secondaryType` is omitted rather than
 * set to `undefined` so the result matches the contract's optional key exactly.
 */
const baseOf = (input: PokemonInput, stamp: VariantStamp) => ({
  id: stamp.id,
  name: input.name,
  primaryType: input.primaryType,
  ...(input.secondaryType === undefined
    ? {}
    : { secondaryType: input.secondaryType }),
  baseStats: input.baseStats,
  heightMetres: input.heightMetres,
  weightKg: input.weightKg,
  isObtainable: input.isObtainable,
  createdAt: stamp.createdAt,
  updatedAt: stamp.updatedAt,
});

/**
 * Builds a new variant from a create payload, defaulting every
 * classification-specific field (behavior spec §createPokemon):
 *
 * - `normal` → `encounterRate: 50`, no `evolvesInto`
 * - `legendary` → `legendaryGroup: "Unknown"`, `isBoxLegendary: false`
 * - `mythical` → `distributionMethod: "Unknown"`,
 *   `isCurrentlyDistributed: false`, and the placeholder lore description
 */
export const makeVariant = (
  input: CreatePokemonRequest,
  stamp: VariantStamp,
): PokemonVariant => ({
  ...baseOf(input, stamp),
  ...createdExtras[input.classification],
});

/**
 * Fully replaces `existing` with `input`, preserving `id` and `createdAt` and
 * stamping the supplied `updatedAt` (behavior spec §replacePokemon).
 *
 * Classification-specific fields are carried over from `existing` only when the
 * classification is unchanged; otherwise they get the same defaults as
 * {@link makeVariant} — see {@link replacedExtras} for quirk P2.
 *
 * The collection-valued extras (`evolvesInto`, `mascotForGames`) are never
 * carried over: the NestJS implementation dropped them on every replace, and
 * parity is the rule until the API has real consumers.
 */
export const replaceVariant = (
  existing: PokemonVariant,
  input: UpdatePokemonRequest,
  updatedAt: string,
): PokemonVariant => ({
  ...baseOf(input, {
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt,
  }),
  ...replacedExtras[input.classification](existing),
});
