import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { match } from 'ts-pattern';
import type {
  PokemonVariant,
  UpdatePokemonRequest,
} from '../../generated/types.gen.js';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

export class ReplacePokemonCommand {
  constructor(
    public readonly id: number,
    public readonly body: UpdatePokemonRequest,
  ) {}
}

@Injectable()
export class ReplacePokemonCommandHandler {
  constructor(private readonly repository: PokemonRepository) {}

  execute(
    command: ReplacePokemonCommand,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const index = this.repository.findIndexById(command.id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const existing = this.repository.findById(command.id);
    if (!existing) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const now = new Date().toISOString();
    const base = {
      id: existing.id,
      name: command.body.name,
      primaryType: command.body.primaryType,
      secondaryType: command.body.secondaryType,
      baseStats: command.body.baseStats,
      heightMetres: command.body.heightMetres,
      weightKg: command.body.weightKg,
      isObtainable: command.body.isObtainable,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(command.body.classification)
      .with('legendary', (classification) => ({
        ...base,
        classification,
        legendaryGroup:
          existing.classification === 'legendary'
            ? existing.legendaryGroup
            : 'Unknown',
        isBoxLegendary:
          existing.classification === 'legendary'
            ? existing.isBoxLegendary
            : false,
      }))
      .with('mythical', (classification) => ({
        ...base,
        classification,
        distributionMethod:
          existing.classification === 'mythical'
            ? existing.distributionMethod
            : 'Unknown',
        isCurrentlyDistributed:
          existing.classification === 'mythical'
            ? existing.isCurrentlyDistributed
            : false,
        loreDescription:
          existing.classification === 'mythical'
            ? existing.loreDescription
            : 'A newly discovered Mythical Pokemon.',
      }))
      .with('normal', (classification) => ({
        ...base,
        classification,
        encounterRate: 50,
      }))
      .exhaustive();

    this.repository.replace(index, pokemon);
    return Promise.resolve(R.succeed(pokemon));
  }
}
