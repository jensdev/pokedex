import { Pokemon } from './pokemon.entity.js';

export const POKEMON_REPOSITORY_TOKEN = Symbol('POKEMON_REPOSITORY_TOKEN');

export interface IPokemonRepository {
  fetchRaw(): Promise<unknown>;
  findById(id: number): Pokemon | undefined;
  findIndexById(id: number): number;
  nextId(): number;
  create(item: Pokemon): void;
  replace(index: number, item: Pokemon): void;
  remove(index: number): void;
}
