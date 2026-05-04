import { Injectable } from '@nestjs/common';
import * as z from 'zod';
import { zPokemonVariant } from '../generated/zod.gen.js';
import type { PokemonVariant } from '../generated/types.gen.js';
import { rawPokemon } from './pokemon.constants.js';

@Injectable()
export class PokemonRepository {
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

  findById(id: number): PokemonVariant | undefined {
    return this.pokemon.find((item) => item.id === id);
  }

  findIndexById(id: number): number {
    return this.pokemon.findIndex((item) => item.id === id);
  }

  nextId(): number {
    const id = this.nextIdValue;
    this.nextIdValue += 1;
    return id;
  }

  create(item: PokemonVariant): void {
    this.pokemon.push(item);
  }

  replace(index: number, item: PokemonVariant): void {
    this.pokemon[index] = item;
  }

  remove(index: number): void {
    this.pokemon.splice(index, 1);
  }
}
