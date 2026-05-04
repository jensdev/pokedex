import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../../generated/types.gen.js';
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
  ): Result.ResultAsync<PokemonVariant, never> {
    const stats = Stats.create(body.baseStats);
    const height = Height.create(body.heightMetres);
    const weight = Weight.create(body.weightKg);

    const pokemonEntity = Pokemon.create({
      id: this.repository.nextId(),
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: stats,
      heightMetres: height,
      weightKg: weight,
      isObtainable: body.isObtainable,
      classification: body.classification,
    });

    this.repository.save(pokemonEntity);

    return Promise.resolve(R.succeed(pokemonEntity.toDto()));
  }
}
