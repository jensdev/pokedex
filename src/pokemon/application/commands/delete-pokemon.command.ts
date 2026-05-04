import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { PokemonNotFoundError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';

@Injectable()
export class DeletePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  handle(id: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const index = this.repository.findIndexById(id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    this.repository.remove(index);
    return Promise.resolve(R.succeed(undefined));
  }
}
