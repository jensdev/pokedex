import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { PokemonNotFoundError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { PokemonId } from '../../domain/value-objects.js';

@Injectable()
export class GetPokemonByIdQuery {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  get(
    idValue: number,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const id = PokemonId.create(idValue);
    const pokemonEntity = this.repository.findById(id);

    return Promise.resolve(
      pokemonEntity
        ? R.succeed(pokemonEntity.toDto())
        : R.fail(new PokemonNotFoundError()),
    );
  }
}
