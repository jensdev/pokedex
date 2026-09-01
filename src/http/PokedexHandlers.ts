/**
 * Handlers for the `Pokedex` group.
 *
 * No domain logic lives here — the handlers translate between the wire
 * contract and {@link Pokedex}, error mapping included:
 *
 * - `PokemonDataParse` → the contract's `ApiError` struct, encoded as 500
 * - `PokemonNotFound` → the `HttpApiSchema.Empty(404)` member, an empty 404
 *
 * Statuses are the contract's, not the handlers': `createPokemon` is annotated
 * 201 and `deletePokemon` `Empty(204)` in the generated api, so the handlers
 * return the variant and `void` respectively and the builder does the rest.
 */
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type { ApiError } from '../generated/Api.js';
import { PokedexApi } from '../generated/Api.js';
import { Pokedex } from '../services/Pokedex.js';

/** The upstream data set failed to parse — contract-correct 500 body. */
const dataParseError = (): ApiError => ({
  code: 'POKEMON_DATA_PARSE_ERROR',
  message: 'Pokemon data from source failed to parse',
});

/**
 * Encodes as the `HttpApiSchema.Empty(404)` member of the error union: status
 * 404, no body. That member is `Schema.Void`, so `undefined` is not a useless
 * value here — it is the one that selects it.
 */
// oxlint-disable-next-line unicorn/no-useless-undefined
const notFound = Effect.fail(undefined);

export const PokedexHandlers = HttpApiBuilder.group(
  PokedexApi,
  'Pokedex',
  Effect.fn(function* (handlers) {
    const pokedex = yield* Pokedex;

    return handlers.handleAll({
      listPokemon: ({ query }) =>
        pokedex.list(query).pipe(Effect.mapError(dataParseError)),

      getPokemonById: ({ params }) =>
        pokedex
          .getById(params.id)
          .pipe(Effect.catchTag('PokemonNotFound', () => notFound)),

      createPokemon: ({ payload }) => pokedex.create(payload),

      replacePokemon: ({ params, payload }) =>
        pokedex
          .replace(params.id, payload)
          .pipe(Effect.catchTag('PokemonNotFound', () => notFound)),

      deletePokemon: ({ params }) =>
        pokedex
          .remove(params.id)
          .pipe(Effect.catchTag('PokemonNotFound', () => notFound)),
    });
  }),
);
