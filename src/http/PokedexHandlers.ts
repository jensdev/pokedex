/**
 * Handlers for the `Pokedex` group.
 *
 * No domain logic lives here — the handlers translate between the wire
 * contract and {@link Pokedex}, error mapping included:
 *
 * - `PokemonDataParse` → the contract's open `ApiError`, encoded as 500
 * - `PokemonNotFound` → the contract's `POKEMON_NOT_FOUND` body, encoded as 404
 *
 * The `code` literal is what *selects* the status: `HttpApiBuilder` encodes a
 * failure against a union of the endpoint's error members in declaration order,
 * first match wins, so the narrowed codes in `tsp/models/common.tsp` are the
 * only thing keeping a 404 from going out as a 400. TypeScript enforces it —
 * the literal type is part of the member.
 *
 * Built against `ServerApi`, not the generated `PokedexApi`: the schema-error
 * middleware is baked into a group's routes at build time, so a group built
 * from the bare contract silently loses it.
 *
 * Statuses are the contract's, not the handlers': `createPokemon` is annotated
 * 201 and `deletePokemon` `Empty(204)` in the generated api, so the handlers
 * return the variant and `void` respectively and the builder does the rest.
 */
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type { ApiError } from '../generated/Api.js';
import { Pokedex } from '../services/Pokedex.js';
import { ServerApi } from './ServerApi.js';

/** The upstream data set failed to parse — contract-correct 500 body. */
const dataParseError = (): ApiError => ({
  code: 'POKEMON_DATA_PARSE_ERROR',
  message: 'Pokemon data from source failed to parse',
});

/**
 * The 404 body of the three id-addressed endpoints. The id is echoed back
 * because the domain error carries it and a client that got a 404 has no other
 * way to tell which of several ids it asked about failed.
 */
const notFound = (id: number) =>
  Effect.fail({
    code: 'POKEMON_NOT_FOUND',
    message: `No Pokemon with id ${id}`,
  } as const);

export const PokedexHandlers = HttpApiBuilder.group(
  ServerApi,
  'Pokedex',
  Effect.fn(function* (handlers) {
    const pokedex = yield* Pokedex;

    return handlers.handleAll({
      listPokemon: ({ query }) =>
        pokedex.list(query).pipe(Effect.mapError(dataParseError)),

      getPokemonById: ({ params }) =>
        pokedex
          .getById(params.id)
          .pipe(Effect.catchTag('PokemonNotFound', ({ id }) => notFound(id))),

      createPokemon: ({ payload }) => pokedex.create(payload),

      replacePokemon: ({ params, payload }) =>
        pokedex
          .replace(params.id, payload)
          .pipe(Effect.catchTag('PokemonNotFound', ({ id }) => notFound(id))),

      deletePokemon: ({ params }) =>
        pokedex
          .remove(params.id)
          .pipe(Effect.catchTag('PokemonNotFound', ({ id }) => notFound(id))),
    });
  }),
);
