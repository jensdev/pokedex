/**
 * Health, liveness, and readiness values.
 *
 * Only `uptime` is this module's own: the component statuses come from
 * {@link HealthChecks}, and the aggregate is the worst of them. Nothing is
 * hardcoded `healthy` any more, which is what makes readiness a probe rather
 * than a formality.
 *
 * The three members are effect *values*, not functions, so they carry their
 * span via `Effect.withSpan` rather than `Effect.fn` — same span name, no
 * zero-argument functions forced into the service interface to get one.
 */
import { Clock, Context, DateTime, Effect, Layer } from 'effect';
import { AppVersion } from '../AppConfig.js';
import type { HealthResponse, LivenessResponse } from '../generated/Api.js';
import { HealthChecks, worstStatus } from './HealthChecks.js';

export class Health extends Context.Service<
  Health,
  {
    /** Full health check with the per-component breakdown. Always succeeds. */
    readonly check: Effect.Effect<HealthResponse>;
    /** Liveness probe: uptime in seconds since the layer was constructed. */
    readonly liveness: Effect.Effect<LivenessResponse>;
    /**
     * Readiness probe. Same report as {@link check}, but an `unhealthy`
     * aggregate is a *failure* — the 503 the contract declares. The report
     * travels with it, so a probe that fails still says which component failed.
     */
    readonly readiness: Effect.Effect<HealthResponse, HealthResponse>;
  }
>()('pokedex/Health') {
  static readonly layer = Layer.effect(
    Health,
    Effect.gen(function* () {
      const version = yield* AppVersion;
      const checks = yield* HealthChecks;
      // Process start, as far as the application is concerned. Read through the
      // Clock so tests can control it, never the platform wall clock.
      const startedAtMillis = yield* Clock.currentTimeMillis;

      // `satisfies` rather than a type annotation on the `const`: piping into
      // `withSpan` costs the generator its contextual type, and without one
      // `status: 'healthy'` widens to `string` and stops matching the contract's
      // literal union.
      const check = Effect.gen(function* () {
        const checkedAt = DateTime.formatIso(yield* DateTime.now);
        const components = yield* checks.components;
        return {
          status: worstStatus(components),
          checkedAt,
          version,
          components,
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

      // Its own span as well as its own outcome: a slow readiness probe is then
      // distinguishable from a slow health check in a trace.
      //
      // `degraded` still answers 200. The contract has two readiness outcomes,
      // and a service that is answering requests badly is still answering them
      // — taking it out of the load balancer would make things worse, not
      // better. Only `unhealthy` means "send me nothing".
      const readiness = check.pipe(
        Effect.flatMap((report) =>
          report.status === 'unhealthy'
            ? Effect.fail(report)
            : Effect.succeed(report),
        ),
        Effect.withSpan('Health.readiness'),
      );

      return { check, liveness, readiness };
    }),
  );
}
