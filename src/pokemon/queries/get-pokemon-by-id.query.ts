import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type { PokemonVariant } from '../../generated/types.gen.js';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

@Injectable()
export class GetPokemonByIdQuery {
  constructor(private readonly repository: PokemonRepository) {}

  get(id: number): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const pokemon = this.repository.findById(id);

    return Promise.resolve(
      pokemon ? R.succeed(pokemon) : R.fail(new PokemonNotFoundError()),
    );
  }
}
