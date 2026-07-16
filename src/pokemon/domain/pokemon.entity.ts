import { match } from 'ts-pattern';
import type {
  PokemonBaseStats,
  PokemonVariant,
  PokemonType,
  PokemonClassification,
} from '../../generated/types.gen.js';
import { Stats, Height, Weight, PokemonId } from './value-objects.js';

/** Mutable attributes shared by create and replace. */
export interface PokemonAttributes {
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: Stats;
  heightMetres: Height;
  weightKg: Weight;
  isObtainable: boolean;
  classification: PokemonClassification;
}

export interface CreatePokemonProps extends PokemonAttributes {
  id: PokemonId;
}

/** Classification-independent fields shared by every variant. */
interface PokemonCommonState {
  id: number;
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: PokemonBaseStats;
  heightMetres: number;
  weightKg: number;
  isObtainable: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Pokemon {
  private constructor(private readonly state: PokemonVariant) {}

  static create(props: CreatePokemonProps): Pokemon {
    const now = new Date().toISOString();
    return new Pokemon(
      Pokemon.withClassification(
        Pokemon.toCommonState(props, props.id.value, now, now),
        props.classification,
      ),
    );
  }

  // Rehydrate from persistence
  static load(state: PokemonVariant): Pokemon {
    return new Pokemon(state);
  }

  /**
   * Fully replace this Pokemon's attributes, preserving its identity and
   * creation timestamp. Classification-specific fields (e.g. `legendaryGroup`)
   * are carried over when the classification is unchanged, otherwise reset to
   * sensible defaults.
   */
  replace(attributes: PokemonAttributes): Pokemon {
    return new Pokemon(
      Pokemon.withClassification(
        Pokemon.toCommonState(
          attributes,
          this.state.id,
          this.state.createdAt,
          new Date().toISOString(),
        ),
        attributes.classification,
        this.state,
      ),
    );
  }

  get id(): PokemonId {
    return PokemonId.create(this.state.id);
  }

  // Map back to the DTO for the repository/API response
  toDto(): PokemonVariant {
    return this.state;
  }

  private static toCommonState(
    attributes: PokemonAttributes,
    id: number,
    createdAt: string,
    updatedAt: string,
  ): PokemonCommonState {
    return {
      id,
      name: attributes.name,
      primaryType: attributes.primaryType,
      secondaryType: attributes.secondaryType,
      baseStats: attributes.baseStats.value,
      heightMetres: attributes.heightMetres.value,
      weightKg: attributes.weightKg.value,
      isObtainable: attributes.isObtainable,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Assemble the discriminated `PokemonVariant` for a classification. When a
   * `previous` variant of the same classification is supplied, its
   * classification-specific fields are carried over; otherwise defaults apply.
   */
  private static withClassification(
    base: PokemonCommonState,
    classification: PokemonClassification,
    previous?: PokemonVariant,
  ): PokemonVariant {
    return match(classification)
      .with('legendary', (value) => ({
        ...base,
        classification: value,
        legendaryGroup:
          previous?.classification === 'legendary'
            ? previous.legendaryGroup
            : 'Unknown',
        isBoxLegendary:
          previous?.classification === 'legendary'
            ? previous.isBoxLegendary
            : false,
        mascotForGames:
          previous?.classification === 'legendary'
            ? previous.mascotForGames
            : undefined,
      }))
      .with('mythical', (value) => ({
        ...base,
        classification: value,
        distributionMethod:
          previous?.classification === 'mythical'
            ? previous.distributionMethod
            : 'Unknown',
        isCurrentlyDistributed:
          previous?.classification === 'mythical'
            ? previous.isCurrentlyDistributed
            : false,
        loreDescription:
          previous?.classification === 'mythical'
            ? previous.loreDescription
            : 'A newly discovered Mythical Pokemon.',
      }))
      .with('normal', (value) => ({
        ...base,
        classification: value,
        encounterRate:
          previous?.classification === 'normal' ? previous.encounterRate : 50,
        evolvesInto:
          previous?.classification === 'normal'
            ? previous.evolvesInto
            : undefined,
      }))
      .exhaustive();
  }
}
