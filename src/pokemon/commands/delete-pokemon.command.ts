import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { PokemonNotFoundError } from '../pokemon.errors.js';
import { PokemonRepository } from '../pokemon.repository.js';

export class DeletePokemonCommand {
  constructor(public readonly id: number) {}
}

@Injectable()
export class DeletePokemonCommandHandler {
  constructor(private readonly repository: PokemonRepository) {}

  execute(
    command: DeletePokemonCommand,
  ): Result.ResultAsync<void, PokemonNotFoundError> {
    const index = this.repository.findIndexById(command.id);

    if (index === -1) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    this.repository.remove(index);
    return Promise.resolve(R.succeed(undefined));
  }
}
