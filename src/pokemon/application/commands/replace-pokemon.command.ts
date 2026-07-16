import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  PokemonVariant,
  UpdatePokemonRequest,
} from '../../../generated/types.gen.js';
import {
  InvalidPokemonAttributeError,
  PokemonNotFoundError,
} from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import {
  Height,
  PokemonId,
  Stats,
  Weight,
} from '../../domain/value-objects.js';

@Injectable()
export class ReplacePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
  ) {}

  handle(
    idValue: number,
    body: UpdatePokemonRequest,
  ): Result.ResultAsync<
    PokemonVariant,
    PokemonNotFoundError | InvalidPokemonAttributeError
  > {
    return R.pipe(
      R.do(),
      R.bind('existing', async () => {
        const existing = await this.repository.findById(
          PokemonId.create(idValue),
        );
        return existing
          ? R.succeed(existing)
          : R.fail(new PokemonNotFoundError({ id: idValue }));
      }),
      R.bind('baseStats', () => Stats.create(body.baseStats)),
      R.bind('heightMetres', () => Height.create(body.heightMetres)),
      R.bind('weightKg', () => Weight.create(body.weightKg)),
      R.map(({ existing, ...valueObjects }) =>
        existing.replace({
          name: body.name,
          primaryType: body.primaryType,
          secondaryType: body.secondaryType,
          isObtainable: body.isObtainable,
          classification: body.classification,
          ...valueObjects,
        }),
      ),
      R.andThrough(async (updated) => {
        await this.repository.save(updated);
        return R.succeed();
      }),
      R.map((updated) => updated.toDto()),
    );
  }
}
