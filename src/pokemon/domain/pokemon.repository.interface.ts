import { Result } from '@praha/byethrow';
import { Pokemon } from './pokemon.entity.js';
import {
  PokemonDataParseError,
  PokemonNotFoundError,
} from './pokemon.errors.js';
import { PokemonId } from './value-objects.js';

export const POKEMON_REPOSITORY_TOKEN = Symbol('POKEMON_REPOSITORY_TOKEN');

/**
 * Domain port for Pokemon persistence. Speaks domain language only: entities
 * in, entities out. Adapters own the translation to their storage/transport
 * format — including validating untrusted source data — so a parse failure
 * surfaces here as a typed `Result`, never as raw data leaking through.
 *
 * Absence is part of the contract, not an afterthought: `findById` and
 * `remove` fail with a typed `PokemonNotFoundError`, so no caller can forget
 * the not-found case or need a defensive `undefined` check.
 *
 * Every method speaks Result, so the error slot always tells the truth:
 * `PokemonNotFoundError` where absence is expected, `PokemonDataParseError`
 * where untrusted data enters, and `never` where no expected failure exists.
 * If `save` ever gains a real failure mode (e.g. an optimistic-concurrency
 * conflict), replacing `never` breaks every call site that has not decided
 * how to handle it. Defects (bugs) still throw and hit the 500 boundary.
 */
export interface IPokemonRepository {
  findAll(): Result.ResultAsync<Pokemon[], PokemonDataParseError>;
  findById(id: PokemonId): Result.ResultAsync<Pokemon, PokemonNotFoundError>;
  nextId(): Result.ResultAsync<PokemonId, never>;
  save(pokemon: Pokemon): Result.ResultAsync<void, never>;
  remove(id: PokemonId): Result.ResultAsync<void, PokemonNotFoundError>;
}
