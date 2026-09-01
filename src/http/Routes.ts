/**
 * Route composition: the served API mounted on an `HttpRouter`, plus the
 * OpenAPI document, the interactive Scalar reference, and the defect boundary
 * that covers all three.
 *
 * Everything here builds from {@link ServerApi} — the generated contract with
 * the schema-error middleware attached — so the routes, the served
 * `/openapi.json`, and the Scalar reference all describe the same thing.
 */
import { Layer } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi';
import { Health } from '../services/Health.js';
import { Pokedex } from '../services/Pokedex.js';
import { DefectBoundary } from './Defects.js';
import { HealthHandlers } from './HealthHandlers.js';
import { PokedexHandlers } from './PokedexHandlers.js';
import { SchemaErrorHandlerLayer, ServerApi } from './ServerApi.js';

/**
 * Registers every group with the router and serves the spec at
 * `/openapi.json`. Every group needs a handler layer here or the build dies at
 * startup.
 *
 * `SchemaErrorHandlerLayer` is provided *to the handler layers*, not next to
 * them: `HttpApiBuilder.group` resolves an endpoint's middleware from its own
 * build-time context.
 */
export const ApiRoutes = HttpApiBuilder.layer(ServerApi, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([HealthHandlers, PokedexHandlers]),
  Layer.provide(SchemaErrorHandlerLayer),
  Layer.provide([Health.layer, Pokedex.layer]),
);

/** Interactive API docs. */
export const DocsRoute = HttpApiScalar.layer(ServerApi, { path: '/docs' });

/**
 * Everything the server serves. {@link DefectBoundary} is global middleware, so
 * merging it in wraps every route registered by the layers next to it.
 */
export const AllRoutes = Layer.mergeAll(ApiRoutes, DocsRoute, DefectBoundary);
