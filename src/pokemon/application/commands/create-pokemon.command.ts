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
    return R.pipe(
      R.do(),
      R.bind('baseStats', () => Stats.create(body.baseStats)),
      R.bind('heightMetres', () => Height.create(body.heightMetres)),
      R.bind('weightKg', () => Weight.create(body.weightKg)),
      R.andThen(async (valueObjects) =>
        R.succeed(
          Pokemon.create({
            id: await this.repository.nextId(),
            name: body.name,
            primaryType: body.primaryType,
            secondaryType: body.secondaryType,
            isObtainable: body.isObtainable,
            classification: body.classification,
            ...valueObjects,
          }),
        ),
      ),
      R.andThrough(async (pokemon) => {
        await this.repository.save(pokemon);
        return R.succeed();
      }),
      R.map((pokemon) => pokemon.toDto()),
    );
  }
}
