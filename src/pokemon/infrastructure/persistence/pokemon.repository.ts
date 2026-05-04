import { Injectable } from '@nestjs/common';
import * as z from 'zod';
import { zPokemonVariant } from '../../../generated/zod.gen.js';
import type { PokemonVariant } from '../../../generated/types.gen.js';
import { rawPokemon } from '../pokemon.constants.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';

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

  findById(id: number): Pokemon | undefined {
    const item = this.pokemon.find((item) => item.id === id);
    if (!item) return undefined;
    return Pokemon.load(item);
  }

  findIndexById(id: number): number {
    return this.pokemon.findIndex((item) => item.id === id);
  }

  nextId(): number {
    const id = this.nextIdValue;
    this.nextIdValue += 1;
    return id;
  }

  create(item: Pokemon): void {
    this.pokemon.push(item.toDto());
  }

  replace(index: number, item: Pokemon): void {
    this.pokemon[index] = item.toDto();
  }

  remove(index: number): void {
    this.pokemon.splice(index, 1);
  }
}
