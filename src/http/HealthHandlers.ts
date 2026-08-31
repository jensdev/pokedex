/**
 * Handlers for the `Health` group. No logic beyond delegating to the service —
 * the health endpoints have no error cases, so nothing to map.
 */
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { PokedexApi } from '../generated/Api.js';
import { Health } from '../services/Health.js';

export const HealthHandlers = HttpApiBuilder.group(
  PokedexApi,
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
