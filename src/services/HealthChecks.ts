/**
 * The health check registry.
 *
 * `Health` used to hardcode `healthy` for everything, which made
 * `GET /health/ready` a probe that could not fail — as a Kubernetes readiness
 * gate, a no-op. The status has to come from somewhere real, and the component
 * that knows how to probe itself is the component itself: `PokemonRepository`
 * owns its round trip, this module owns which contract component the answer is
 * filed under and how the parts combine into one.
 *
 * Bounded on purpose (decision D3). The contract fixes the component names, so
 * the registry is a record of exactly those, and registering a `cache` probe
 * later is a line in {@link HealthChecks.layer} — not a new subsystem.
 */
import { Context, Effect, Layer } from 'effect';
import type { HealthResponse } from '../generated/Api.js';
import { PokemonRepository } from './PokemonRepository.js';

/** The contract's per-component health shape. */
export type ComponentHealth = HealthResponse['components']['database'];

/** The `components` object of a health report — the contract's, exactly. */
export type HealthComponents = HealthResponse['components'];

/** The aggregate status, worst first: the order a report degrades in. */
const STATUS_ORDER = ['unhealthy', 'degraded', 'healthy'] as const;

/**
 * The aggregate is the *worst* component status, so one unhealthy dependency
 * cannot be averaged away by three healthy ones. `HealthResponse.status`
 * documents itself as exactly this.
 */
export const worstStatus = (
  components: HealthComponents,
): HealthResponse['status'] =>
  STATUS_ORDER.find((status) =>
    Object.values(components).some(
      (component: ComponentHealth) => component.status === status,
    ),
  ) ?? 'healthy';

export class HealthChecks extends Context.Service<
  HealthChecks,
  {
    /**
     * Runs every registered probe. Concurrent: a report is as slow as its
     * slowest component, not as slow as all of them put together.
     */
    readonly components: Effect.Effect<HealthComponents>;
  }
>()('pokedex/HealthChecks') {
  /**
   * A registry that answers with a fixed report. For a caller that needs a
   * `HealthChecks` without a store behind it — which is how a test reaches the
   * `degraded` and `unhealthy` aggregates the real probes cannot produce.
   */
  static readonly layerOf = (components: HealthComponents) =>
    Layer.succeed(HealthChecks)({ components: Effect.succeed(components) });

  /**
   * The application registry: the repository, filed under `database`. Every
   * probe this deployment has, in one place.
   */
  static readonly layer = Layer.effect(
    HealthChecks,
    Effect.gen(function* () {
      const repository = yield* PokemonRepository;

      return {
        components: Effect.all(
          { database: repository.health },
          { concurrency: 'unbounded' },
        ).pipe(Effect.withSpan('HealthChecks.components')),
      };
    }),
  );
}
