import { Pokemon } from '../domain/pokemon.entity.js';
import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { match } from 'ts-pattern';
import type {
  PokemonVariant,
  UpdatePokemonRequest,
} from '../../generated/types.gen.js';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

@Injectable()
export class ReplacePokemonCommand {
  constructor(private readonly repository: PokemonRepository) {}

  handle(
    id: number,
    body: UpdatePokemonRequest,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const index = this.repository.findIndexById(id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const existingEntity = this.repository.findById(id);
    if (!existingEntity) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const existing = existingEntity.toDto();

    const now = new Date().toISOString();
    const base = {
      id: existing.id,
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: body.baseStats,
      heightMetres: body.heightMetres,
      weightKg: body.weightKg,
      isObtainable: body.isObtainable,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    const pokemon: PokemonVariant = match(body.classification)
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

    const updatedEntity = Pokemon.load(pokemon);

    this.repository.replace(index, updatedEntity);
    return Promise.resolve(R.succeed(updatedEntity.toDto()));
  }
}
