import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type { PokemonVariant } from '../../generated/types.gen.js';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

export class GetPokemonByIdQuery {
  constructor(public readonly id: number) {}
}

@Injectable()
export class GetPokemonByIdQueryHandler {
  constructor(private readonly repository: PokemonRepository) {}

  execute(
    query: GetPokemonByIdQuery,
  ): Result.ResultAsync<PokemonVariant, PokemonNotFoundError> {
    const pokemon = this.repository.findById(query.id);

    return Promise.resolve(
      pokemon ? R.succeed(pokemon) : R.fail(new PokemonNotFoundError()),
    );
  }
}
