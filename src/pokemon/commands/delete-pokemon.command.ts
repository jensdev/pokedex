import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

@Injectable()
export class DeletePokemonCommand {
  constructor(private readonly repository: PokemonRepository) {}

  handle(id: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const index = this.repository.findIndexById(id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    this.repository.remove(index);
    return Promise.resolve(R.succeed(undefined));
  }
}
