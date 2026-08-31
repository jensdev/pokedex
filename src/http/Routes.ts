/**
 * Route composition: the generated API mounted on an `HttpRouter`, plus the
 * OpenAPI document and the interactive Scalar reference.
 */
import { Layer } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi';
import { PokedexApi } from '../generated/Api.js';
import { Health } from '../services/Health.js';
import { HealthHandlers } from './HealthHandlers.js';
import { PokedexHandlers } from './PokedexHandlers.js';

/**
 * Registers every group with the router and serves the spec at
 * `/openapi.json`. Every group needs a handler layer here or the build dies at
 * startup — hence the Pokedex stubs.
 */
export const ApiRoutes = HttpApiBuilder.layer(PokedexApi, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([HealthHandlers, PokedexHandlers]),
  Layer.provide(Health.layer),
);

/** Interactive API docs. */
export const DocsRoute = HttpApiScalar.layer(PokedexApi, { path: '/docs' });

export const AllRoutes = Layer.mergeAll(ApiRoutes, DocsRoute);
