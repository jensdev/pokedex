/**
 * Health, liveness, and readiness values.
 *
 * All checks are hardcoded — there is nothing to probe yet (behavior spec
 * §Health group). Only `version` and `uptime` are dynamic.
 */
import { Clock, Context, DateTime, Effect, Layer } from 'effect';
import { AppVersion } from '../AppConfig.js';
import type { HealthResponse, LivenessResponse } from '../generated/Api.js';

export class Health extends Context.Service<
  Health,
  {
    /** Full health check with the per-component breakdown. */
    readonly check: Effect.Effect<HealthResponse>;
    /** Liveness probe: uptime in seconds since the layer was constructed. */
    readonly liveness: Effect.Effect<LivenessResponse>;
    /** Readiness probe — same shape and values as {@link check}. */
    readonly readiness: Effect.Effect<HealthResponse>;
  }
>()('pokedex/Health') {
  static readonly layer = Layer.effect(
    Health,
    Effect.gen(function* () {
      const version = yield* AppVersion;
      // Process start, as far as the application is concerned. Read through the
      // Clock so tests can control it; never `Date.now()`.
      const startedAtMillis = yield* Clock.currentTimeMillis;

      const check: Effect.Effect<HealthResponse> = Effect.gen(function* () {
        const checkedAt = DateTime.formatIso(yield* DateTime.now);
        return {
          status: 'healthy',
          checkedAt,
          version,
          components: { database: { status: 'healthy', latencyMs: 1 } },
        };
      });

      const liveness: Effect.Effect<LivenessResponse> = Effect.map(
        Clock.currentTimeMillis,
        (nowMillis) => ({
          status: 'ok',
          uptime: (nowMillis - startedAtMillis) / 1000,
        }),
      );

      return { check, liveness, readiness: check };
    }),
  );
}
