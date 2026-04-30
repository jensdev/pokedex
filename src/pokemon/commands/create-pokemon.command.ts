import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../generated/types.gen.js';
import { PokemonRepository } from '../pokemon.repository.js';

export class CreatePokemonCommand {
  constructor(public readonly body: CreatePokemonRequest) {}
}

@Injectable()
export class CreatePokemonCommandHandler {
  constructor(private readonly repository: PokemonRepository) {}

  async execute(command: CreatePokemonCommand): Promise<PokemonVariant> {
    const now = new Date().toISOString();

    const base = {
      id: this.repository.nextId(),
      name: command.body.name,
      primaryType: command.body.primaryType,
      secondaryType: command.body.secondaryType,
      baseStats: command.body.baseStats,
      heightMetres: command.body.heightMetres,
      weightKg: command.body.weightKg,
      isObtainable: command.body.isObtainable,
      createdAt: now,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(command.body.classification)
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
