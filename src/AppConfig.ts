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
 * data — parity decision P1 in the behavior spec.
 *
 * Defaults to `0`: the chaos is opt-in. The NestJS implementation shipped a
 * hardcoded 10%, and carrying that over as the *default* meant one production
 * `GET /pokemon` in ten answered a 500 for no reason. Set it to something
 * non-zero to exercise the failure path on purpose.
 */
export const FlakyUpstreamRate = Config.finite('FLAKY_UPSTREAM_RATE').pipe(
  Config.withDefault(0),
);
