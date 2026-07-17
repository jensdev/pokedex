import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import * as z from 'zod';
import { zPokemonVariant } from '../../../generated/zod.gen.js';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { rawPokemon } from '../pokemon.constants.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import {
  PokemonDataParseError,
  PokemonNotFoundError,
} from '../../domain/pokemon.errors.js';
import { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { PokemonId } from '../../domain/value-objects.js';

@Injectable()
export class PokemonRepository implements IPokemonRepository {
  private pokemon: PokemonVariant[] = z
    .array(zPokemonVariant)
    .parse(rawPokemon);

  private nextIdValue = Math.max(...this.pokemon.map((p) => p.id)) + 1;

  /**
   * Simulates fetching from an untrusted external source (an HTTP API, a
   * file, ...) whose payload cannot be trusted at compile time. `protected`
   * so tests can substitute a broken source to exercise the parse-error rail.
   */
  protected fetchRaw(): Promise<unknown> {
    return Promise.resolve(this.pokemon);
  }

  /**
   * Adapter boundary: raw source data is validated here, so the rest of the
   * application only ever sees domain entities or a typed failure.
   */
  async findAll(): Result.ResultAsync<Pokemon[], PokemonDataParseError> {
    return R.pipe(
      R.parse(z.array(zPokemonVariant), await this.fetchRaw()),
      R.mapError(() => new PokemonDataParseError()),
      R.map((items) => items.map((item) => Pokemon.load(item))),
    );
  }

  async findById(
    id: PokemonId,
  ): Result.ResultAsync<Pokemon, PokemonNotFoundError> {
    const item = this.pokemon.find((item) => item.id === id);
    return item
      ? R.succeed(Pokemon.load(structuredClone(item)))
      : R.fail(new PokemonNotFoundError({ id }));
  }

  async nextId(): Result.ResultAsync<PokemonId, never> {
    const id = this.nextIdValue;
    this.nextIdValue += 1;
    return R.succeed(PokemonId.of(id));
  }

  /**
   * Entities are cloned at this boundary (here and in `findById`), so the
   * store, the entity, and any response body never alias the same object —
   * immutability by construction instead of by convention.
   */
  async save(pokemon: Pokemon): Result.ResultAsync<void, never> {
    const dto = structuredClone(pokemon.toDto());
    const index = this.pokemon.findIndex((p) => p.id === dto.id);
    if (index === -1) {
      this.pokemon.push(dto);
    } else {
      this.pokemon[index] = dto;
    }
    return R.succeed();
  }

  async remove(id: PokemonId): Result.ResultAsync<void, PokemonNotFoundError> {
    const index = this.pokemon.findIndex((p) => p.id === id);
    if (index === -1) {
      return R.fail(new PokemonNotFoundError({ id }));
    }
    this.pokemon.splice(index, 1);
    return R.succeed();
  }
}
