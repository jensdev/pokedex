/**
 * Stub handlers for the `Pokedex` group.
 *
 * `HttpApiBuilder.layer` dies at startup unless every group of the API has a
 * handler layer, so the group is registered here with defects until Phase 5/6
 * implement it for real.
 */
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { PokedexApi } from '../generated/Api.js';

const notImplemented = (endpoint: string) =>
  Effect.die(`${endpoint} is not implemented yet`);

export const PokedexHandlers = HttpApiBuilder.group(
  PokedexApi,
  'Pokedex',
  (handlers) =>
    handlers.handleAll({
      listPokemon: () => notImplemented('listPokemon'),
      createPokemon: () => notImplemented('createPokemon'),
      getPokemonById: () => notImplemented('getPokemonById'),
      replacePokemon: () => notImplemented('replacePokemon'),
      deletePokemon: () => notImplemented('deletePokemon'),
    }),
);
