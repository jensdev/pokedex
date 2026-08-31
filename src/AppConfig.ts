/**
 * Application configuration.
 *
 * `PORT` is intentionally absent: it is read by `NodeHttpServer.layerConfig` in
 * `main.ts`, which is the only module allowed to know about the platform.
 */
import { Config } from 'effect';

/** Version string reported by the health endpoints. */
export const AppVersion = Config.string('APP_VERSION').pipe(
  Config.withDefault('1.0.0'),
);

/**
 * Probability (0–1) that the repository's simulated upstream returns corrupt
 * data — parity decision P1 in the behavior spec. Unused until Phase 4; tests
 * set it to `0` for determinism.
 */
export const FlakyUpstreamRate = Config.finite('FLAKY_UPSTREAM_RATE').pipe(
  Config.withDefault(0.1),
);
