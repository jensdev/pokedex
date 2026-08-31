/**
 * Domain errors.
 *
 * These stay HTTP-agnostic on purpose: the mapping to wire statuses
 * (`PokemonNotFound` → empty 404, `PokemonDataParse` → `ApiError` 500) lives in
 * `http/PokedexHandlers.ts`, per the dependency rule in
 * `docs/migration/02-target-architecture.md`.
 */
import { Schema } from 'effect';

/** No Pokémon with this id exists in the store. */
export class PokemonNotFound extends Schema.TaggedError<PokemonNotFound>()(
  'PokemonNotFound',
  { id: Schema.Number },
) {}

/**
 * The upstream data set failed to parse — the simulated flaky upstream of
 * parity decision P1 in `docs/migration/01-current-behavior-spec.md`.
 */
export class PokemonDataParse extends Schema.TaggedError<PokemonDataParse>()(
  'PokemonDataParse',
  {},
) {}
