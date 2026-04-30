import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../generated/types.gen.js';
import { PokemonRepository } from '../pokemon.repository.js';

@Injectable()
export class CreatePokemonCommand {
  constructor(private readonly repository: PokemonRepository) {}

  async handle(body: CreatePokemonRequest): Promise<PokemonVariant> {
    const now = new Date().toISOString();

    const base = {
      id: this.repository.nextId(),
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: body.baseStats,
      heightMetres: body.heightMetres,
      weightKg: body.weightKg,
      isObtainable: body.isObtainable,
      createdAt: now,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(body.classification)
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

    this.repository.create(pokemon);
    return Promise.resolve(pokemon);
  }
}
