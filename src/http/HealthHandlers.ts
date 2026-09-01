/**
 * Handlers for the `Health` group. No logic beyond delegating to the service —
 * the health endpoints have no error cases, so nothing to map.
 *
 * Built against `ServerApi`, not the generated `PokedexApi`: the schema-error
 * middleware is baked into a group's routes at build time, so a group built
 * from the bare contract silently loses it.
 */
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { Health } from '../services/Health.js';
import { ServerApi } from './ServerApi.js';

export const HealthHandlers = HttpApiBuilder.group(
  ServerApi,
  'Health',
  Effect.fn(function* (handlers) {
    const health = yield* Health;

    return handlers.handleAll({
      healthCheck: () => health.check,
      healthLiveness: () => health.liveness,
      healthReadiness: () => health.readiness,
    });
  }),
);
