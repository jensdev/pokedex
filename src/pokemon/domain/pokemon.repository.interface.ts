import { Pokemon } from './pokemon.entity.js';
import { PokemonId } from './value-objects.js';

export const POKEMON_REPOSITORY_TOKEN = Symbol('POKEMON_REPOSITORY_TOKEN');

export interface IPokemonRepository {
  fetchRaw(): Promise<unknown>;
  findById(id: PokemonId): Pokemon | undefined;
  nextId(): PokemonId;
  save(item: Pokemon): void;
  remove(id: PokemonId): void;
}
