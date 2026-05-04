import { Injectable } from '@nestjs/common';
import * as z from 'zod';
import { zPokemonVariant } from '../../../generated/zod.gen.js';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { rawPokemon } from '../pokemon.constants.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { PokemonId } from '../../domain/value-objects.js';

@Injectable()
export class PokemonRepository implements IPokemonRepository {
  private pokemon: PokemonVariant[] = z
    .array(zPokemonVariant)
    .parse(rawPokemon);

  private nextIdValue = 1026;

  async fetchRaw(): Promise<unknown> {
    if (Math.random() < 0.1) {
      return Promise.resolve([{ id: 'oops', name: null }]);
    }

    return Promise.resolve(this.pokemon);
  }

  findById(id: PokemonId): Pokemon | undefined {
    const item = this.pokemon.find((item) => item.id === id.value);
    if (!item) return undefined;
    return Pokemon.load(item);
  }

  nextId(): PokemonId {
    const id = this.nextIdValue;
    this.nextIdValue += 1;
    return PokemonId.create(id);
  }

  save(item: Pokemon): void {
    const dto = item.toDto();
    const index = this.pokemon.findIndex((p) => p.id === dto.id);
    if (index === -1) {
      this.pokemon.push(dto);
    } else {
      this.pokemon[index] = dto;
    }
  }

  remove(id: PokemonId): void {
    const index = this.pokemon.findIndex((p) => p.id === id.value);
    if (index !== -1) {
      this.pokemon.splice(index, 1);
    }
  }
}
