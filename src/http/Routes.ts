/**
 * Route composition: the generated API mounted on an `HttpRouter`, plus the
 * OpenAPI document, the interactive Scalar reference, and the defect boundary
 * that covers all three.
 */
import { Layer } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi';
import { PokedexApi } from '../generated/Api.js';
import { Health } from '../services/Health.js';
import { Pokedex } from '../services/Pokedex.js';
import { DefectBoundary } from './Defects.js';
import { HealthHandlers } from './HealthHandlers.js';
import { PokedexHandlers } from './PokedexHandlers.js';

/**
 * Registers every group with the router and serves the spec at
 * `/openapi.json`. Every group needs a handler layer here or the build dies at
 * startup.
 */
export const ApiRoutes = HttpApiBuilder.layer(PokedexApi, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([HealthHandlers, PokedexHandlers]),
  Layer.provide([Health.layer, Pokedex.layer]),
);

/** Interactive API docs. */
export const DocsRoute = HttpApiScalar.layer(PokedexApi, { path: '/docs' });

/**
 * Everything the server serves. {@link DefectBoundary} is global middleware, so
 * merging it in wraps every route registered by the layers next to it.
 */
export const AllRoutes = Layer.mergeAll(ApiRoutes, DocsRoute, DefectBoundary);
