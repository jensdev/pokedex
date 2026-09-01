/**
 * Where the telemetry goes.
 *
 * Every service method already carries a span and the boundaries already log
 * their causes — but nothing was collecting either. Spans went to the no-op
 * tracer and were dropped, and failures raised *outside* the router middleware
 * (a response that fails to write, a failure in the server chain) went through
 * `reportCauseUnsafe`, which does nothing at all while `CurrentErrorReporters`
 * is the empty set it defaults to.
 *
 * Both are fixed here, and both are inert unless configured: an unset
 * `OTLP_URL` leaves the default tracer and logger in place, so nothing about
 * running the app locally changes.
 *
 * `effect/unstable/observability` is part of the pinned `effect` package —
 * OTLP export costs no new dependency.
 */
import { Config, Effect, ErrorReporter, Layer } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from 'effect/unstable/observability';
import { AppVersion } from './AppConfig.js';

/** Identifies this process in a trace. */
const SERVICE_NAME = 'effect-pokedex';

/**
 * The collector's base URL, e.g. `http://localhost:4318`. Absent means "export
 * nothing" rather than "fail to start": telemetry is an operational concern,
 * and a Pokédex that refuses to boot without a collector is worse than one
 * that boots without traces.
 */
const OtlpUrl = Config.option(Config.string('OTLP_URL'));

/**
 * OTLP traces and logs when `OTLP_URL` is set, nothing when it is not.
 *
 * `Layer.unwrap` is what lets the *shape* of the layer depend on config: the
 * decision is made once at layer-build time, not per request.
 */
export const Telemetry = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* OtlpUrl;
    if (url._tag === 'None') return Layer.empty;

    const resource = {
      serviceName: SERVICE_NAME,
      serviceVersion: yield* AppVersion,
    };

    return Layer.mergeAll(
      OtlpTracer.layer({ url: `${url.value}/v1/traces`, resource }),
      OtlpLogger.layer({ url: `${url.value}/v1/logs`, resource }),
    ).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer),
    );
  }),
);

/** The log message the reporter emits; asserted in the tests. */
export const REPORTED_FAILURE_LOG_MESSAGE = 'Reported failure';

/**
 * Catches the failures the two logging boundaries cannot see.
 *
 * `src/http/Defects.ts` covers everything that reaches a route, but the server
 * reports failures outside that scope — a response that fails to write, for
 * instance — through `ErrorReporter` rather than the logger. With no reporter
 * registered those vanish silently. This one turns each into a log record at
 * the severity the error itself declares, so it travels the same path as
 * everything else, OTLP export included.
 */
export const Reporter = ErrorReporter.layer([
  ErrorReporter.make(({ attributes, error, fiber, severity }) => {
    // The callback is synchronous, so the log has to be run rather than
    // returned. It runs on the reporting fiber's own context, not a fresh
    // default one: that is where the application's `Logger` layer and log
    // annotations live, and a report that bypassed them would print to stderr
    // while every other record went to the collector.
    Effect.runFork(
      Effect.logWithLevel(severity)(REPORTED_FAILURE_LOG_MESSAGE, error).pipe(
        Effect.annotateLogs(attributes),
        Effect.provideContext(fiber.context),
      ),
    );
  }),
]);

/** Both, as one layer to provide at the root. */
export const Observability = Layer.mergeAll(Telemetry, Reporter);
