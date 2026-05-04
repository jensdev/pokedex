import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { PokemonNotFoundError } from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { PokemonId } from '../../domain/value-objects.js';

@Injectable()
export class DeletePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  handle(idValue: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const id = PokemonId.create(idValue);
    const existingEntity = this.repository.findById(id);

    if (!existingEntity) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    this.repository.remove(id);
    return Promise.resolve(R.succeed(undefined));
  }
}
