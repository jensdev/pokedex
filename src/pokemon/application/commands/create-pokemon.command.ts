import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../../generated/types.gen.js';
import { InvalidPokemonAttributeError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { Height, Stats, Weight } from '../../domain/value-objects.js';

@Injectable()
export class CreatePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  handle(
    body: CreatePokemonRequest,
  ): Result.ResultAsync<PokemonVariant, InvalidPokemonAttributeError> {
    const stats = Stats.create(body.baseStats);
    if (R.isFailure(stats)) {
      return Promise.resolve(stats);
    }

    const height = Height.create(body.heightMetres);
    if (R.isFailure(height)) {
      return Promise.resolve(height);
    }

    const weight = Weight.create(body.weightKg);
    if (R.isFailure(weight)) {
      return Promise.resolve(weight);
    }

    const pokemonEntity = Pokemon.create({
      id: this.repository.nextId(),
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: stats.value,
      heightMetres: height.value,
      weightKg: weight.value,
      isObtainable: body.isObtainable,
      classification: body.classification,
    });

    this.repository.save(pokemonEntity);

    return Promise.resolve(R.succeed(pokemonEntity.toDto()));
  }
}
