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

  async handle(idValue: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const id = PokemonId.create(idValue);
    const existing = await this.repository.findById(id);

    if (!existing) {
      return R.fail(new PokemonNotFoundError({ id: idValue }));
    }

    await this.repository.remove(id);
    return R.succeed(undefined);
  }
}
