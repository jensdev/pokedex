import { match } from 'ts-pattern';
import type {
  PokemonVariant,
  PokemonType,
  PokemonClassification,
} from '../../generated/types.gen.js';
import { Stats, Height, Weight, PokemonId } from './value-objects.js';

export interface CreatePokemonProps {
  id: PokemonId;
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: Stats;
  heightMetres: Height;
  weightKg: Weight;
  isObtainable: boolean;
  classification: PokemonClassification;
}

export class Pokemon {
  private constructor(private readonly state: PokemonVariant) {}

  static create(props: CreatePokemonProps): Pokemon {
    const now = new Date().toISOString();

    const base = {
      id: props.id.value,
      name: props.name,
      primaryType: props.primaryType,
      secondaryType: props.secondaryType,
      baseStats: props.baseStats.value,
      heightMetres: props.heightMetres.value,
      weightKg: props.weightKg.value,
      isObtainable: props.isObtainable,
      createdAt: now,
      updatedAt: now,
    };

    const state: PokemonVariant = match(props.classification)
      .with('legendary', (classification) => ({
        ...base,
        classification,
        legendaryGroup: 'Unknown',
        isBoxLegendary: false,
      }))
      .with('mythical', (classification) => ({
        ...base,
        classification,
        distributionMethod: 'Unknown',
        isCurrentlyDistributed: false,
        loreDescription: 'A newly discovered Mythical Pokemon.',
      }))
      .with('normal', (classification) => ({
        ...base,
        classification,
        encounterRate: 50,
      }))
      .exhaustive();

    const pokemon = new Pokemon(state);
    return pokemon;
  }

  // Rehydrate from persistence
  static load(state: PokemonVariant): Pokemon {
    return new Pokemon(state);
  }

  get id(): PokemonId {
    return PokemonId.create(this.state.id);
  }

  // To map it back to the DTO for the repository/API response
  toDto(): PokemonVariant {
    return this.state;
  }
}
