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
    const existing = this.repository.findById(PokemonId.create(idValue));
    if (!existing) {
      return Promise.resolve(R.fail(new PokemonNotFoundError()));
    }

    const stats = Stats.create(body.baseStats);
    if (R.isFailure(stats)) return Promise.resolve(stats);

    const height = Height.create(body.heightMetres);
    if (R.isFailure(height)) {
      return Promise.resolve(height);
    }

    const weight = Weight.create(body.weightKg);
    if (R.isFailure(weight)) {
      return Promise.resolve(weight);
    }

    const updated = existing.replace({
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: stats.value,
      heightMetres: height.value,
      weightKg: weight.value,
      isObtainable: body.isObtainable,
      classification: body.classification,
    });

    this.repository.save(updated);
    return Promise.resolve(R.succeed(updated.toDto()));
  }
}
