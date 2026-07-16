import { Result } from '@praha/byethrow';
import { Pokemon } from './pokemon.entity.js';
import { PokemonDataParseError } from './pokemon.errors.js';
import { PokemonId } from './value-objects.js';

export const POKEMON_REPOSITORY_TOKEN = Symbol('POKEMON_REPOSITORY_TOKEN');

/**
 * Domain port for Pokemon persistence. Speaks domain language only: entities
 * in, entities out. Adapters own the translation to their storage/transport
 * format — including validating untrusted source data — so a parse failure
 * surfaces here as a typed `Result`, never as raw data leaking through.
 */
export interface IPokemonRepository {
  findAll(): Result.ResultAsync<Pokemon[], PokemonDataParseError>;
  findById(id: PokemonId): Promise<Pokemon | undefined>;
  nextId(): Promise<PokemonId>;
  save(pokemon: Pokemon): Promise<void>;
  remove(id: PokemonId): Promise<void>;
}
