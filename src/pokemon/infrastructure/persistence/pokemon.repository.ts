import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import * as z from 'zod';
import { zPokemonVariant } from '../../../generated/zod.gen.js';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { rawPokemon } from '../pokemon.constants.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { PokemonDataParseError } from '../../domain/pokemon.errors.js';
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

  async findById(id: PokemonId): Promise<Pokemon | undefined> {
    const item = this.pokemon.find((item) => item.id === id.value);
    return item ? Pokemon.load(item) : undefined;
  }

  async nextId(): Promise<PokemonId> {
    const id = this.nextIdValue;
    this.nextIdValue += 1;
    return PokemonId.create(id);
  }

  async save(pokemon: Pokemon): Promise<void> {
    const dto = pokemon.toDto();
    const index = this.pokemon.findIndex((p) => p.id === dto.id);
    if (index === -1) {
      this.pokemon.push(dto);
    } else {
      this.pokemon[index] = dto;
    }
  }

  async remove(id: PokemonId): Promise<void> {
    const index = this.pokemon.findIndex((p) => p.id === id.value);
    if (index !== -1) {
      this.pokemon.splice(index, 1);
    }
  }
}
