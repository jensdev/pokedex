/**
 * Health, liveness, and readiness values.
 *
 * All checks are hardcoded — there is nothing to probe yet (behavior spec
 * §Health group). Only `version` and `uptime` are dynamic.
 *
 * The three members are effect *values*, not functions, so they carry their
 * span via `Effect.withSpan` rather than `Effect.fn` — same span name, no
 * zero-argument functions forced into the service interface to get one.
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

      // `satisfies` rather than a type annotation on the `const`: piping into
      // `withSpan` costs the generator its contextual type, and without one
      // `status: 'healthy'` widens to `string` and stops matching the contract's
      // literal union.
      const check = Effect.gen(function* () {
        const checkedAt = DateTime.formatIso(yield* DateTime.now);
        return {
          status: 'healthy',
          checkedAt,
          version,
          components: { database: { status: 'healthy', latencyMs: 1 } },
        } satisfies HealthResponse;
      }).pipe(Effect.withSpan('Health.check'));

      const liveness = Clock.currentTimeMillis.pipe(
        Effect.map(
          (nowMillis) =>
            ({
              status: 'ok',
              uptime: (nowMillis - startedAtMillis) / 1000,
            }) satisfies LivenessResponse,
        ),
        Effect.withSpan('Health.liveness'),
      );

      // Same values as `check`, but its own span: a slow readiness probe is
      // then distinguishable from a slow health check in a trace.
      const readiness = check.pipe(Effect.withSpan('Health.readiness'));

      return { check, liveness, readiness };
    }),
  );
}
