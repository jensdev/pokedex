/**
 * The observability wiring: both halves are inert by default and both do
 * something when they are not.
 *
 * The OTLP exporters are not driven against a real collector here — that would
 * test `effect/unstable/observability`, not this repo. What is worth pinning is
 * the decision this module makes: an unset `OTLP_URL` must leave the process
 * exactly as it was, because that is the configuration every test run and every
 * local `npm run dev` uses.
 */
import { assert, layer } from '@effect/vitest';
import {
  Cause,
  ConfigProvider,
  Effect,
  ErrorReporter,
  Layer,
  Logger,
  Tracer,
} from 'effect';
import {
  REPORTED_FAILURE_LOG_MESSAGE,
  Reporter,
  Telemetry,
} from '../src/Observability.js';

const withEnv = (env: Readonly<Record<string, string>>) =>
  ConfigProvider.layer(ConfigProvider.fromEnvRecord(env));

interface LogEntry {
  readonly logLevel: string;
  readonly message: unknown;
}

const isMessageArray = (message: unknown): message is ReadonlyArray<unknown> =>
  Array.isArray(message);

/** Collects log records instead of printing them. */
const withCapturedLogs = <A, E, R>(program: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const entries: Array<LogEntry> = [];
    const collector = Logger.make<unknown, void>(({ logLevel, message }) => {
      entries.push({ logLevel, message });
    });

    const value = yield* Effect.provide(program, Logger.layer([collector]));
    return { value, entries } as const;
  });

layer(Layer.empty)('Telemetry', (it) => {
  it.effect('is a no-op when OTLP_URL is unset', () =>
    Effect.gen(function* () {
      // The default tracer is what a process without an exporter runs with;
      // building `Telemetry` must not replace it.
      const before = yield* Tracer.Tracer;

      const after = yield* Effect.provide(
        Tracer.Tracer,
        Telemetry.pipe(Layer.provide(withEnv({}))),
      );

      assert.strictEqual(after, before);
    }),
  );

  it.effect('installs an OTLP tracer when OTLP_URL is set', () =>
    Effect.gen(function* () {
      const before = yield* Tracer.Tracer;

      const after = yield* Effect.provide(
        Tracer.Tracer,
        Telemetry.pipe(
          Layer.provide(withEnv({ OTLP_URL: 'http://localhost:4318' })),
        ),
      );

      // Nothing is exported here — no request is made until a span ends and
      // the batch interval elapses. That the tracer changed at all is the
      // decision under test.
      assert.notStrictEqual(after, before);
    }),
  );
});

layer(Layer.empty)('Reporter', (it) => {
  /**
   * Finding 6: `reportCauseUnsafe` is what the server uses for failures raised
   * outside the router middleware, and it does nothing while
   * `CurrentErrorReporters` is the empty set it defaults to. `ErrorReporter.report`
   * drives the same path a response-write failure would.
   */
  it.effect('turns a reported cause into a log record', () =>
    Effect.gen(function* () {
      const { entries } = yield* withCapturedLogs(
        Effect.provide(
          ErrorReporter.report(Cause.fail(new Error('write failed'))),
          Reporter,
        ),
      );

      const logged = entries.filter(
        (entry) =>
          isMessageArray(entry.message) &&
          entry.message.includes(REPORTED_FAILURE_LOG_MESSAGE),
      );
      assert.lengthOf(logged, 1);

      // The error travels as a log argument, not flattened into a string, so a
      // structured logger keeps its stack. (`JSON.stringify` would not see the
      // message — `Error.prototype.message` is not enumerable.)
      const [entry] = logged;
      const reported = isMessageArray(entry.message)
        ? entry.message[1]
        : undefined;
      assert.instanceOf(reported, Error);
      if (!(reported instanceof Error)) return;
      assert.include(reported.message, 'write failed');
    }),
  );

  it.effect('reports nothing when no reporter is registered', () =>
    Effect.gen(function* () {
      const { entries } = yield* withCapturedLogs(
        ErrorReporter.report(Cause.fail(new Error('write failed'))),
      );

      assert.deepStrictEqual(entries, []);
    }),
  );
});
