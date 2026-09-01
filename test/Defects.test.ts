/**
 * The defect boundary: a defect must not reach the client as anything other
 * than a contract-shaped 500, and must reach the log with its cause.
 *
 * Nothing in `src/` can produce a defect on purpose any more — the audit for
 * Phase 7 found no `Effect.die` outside test fixtures, and `domain/Pokemon.ts`
 * is total — so both suites force one. That is the point: the boundary exists
 * for the bug nobody wrote yet.
 */
import { assert, layer } from '@effect/vitest';
import {
  Cause,
  ConfigProvider,
  Effect,
  Exit,
  Layer,
  Logger,
  Predicate,
} from 'effect';
import {
  HttpClientRequest,
  HttpRouter,
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http';
import {
  DEFECT_LOG_MESSAGE,
  DefectBoundary,
  INTERNAL_ERROR,
} from '../src/http/Defects.js';
import { AppLayer } from '../src/http/AppLayer.js';
import { AllRoutes } from '../src/http/Routes.js';
import { VALIDATION_ERROR_CODE } from '../src/http/ServerApi.js';
import { Health } from '../src/services/Health.js';
import { HealthChecks } from '../src/services/HealthChecks.js';
import { Pokedex } from '../src/services/Pokedex.js';

/** The defect every suite below forces. */
const BOOM = 'boom: a bug nobody wrote yet';

interface LogEntry {
  readonly logLevel: string;
  readonly message: unknown;
  readonly cause: Cause.Cause<unknown>;
}

/**
 * Runs `program` with a logger that collects instead of printing, and returns
 * what it logged alongside its result. `Logger.layer` replaces the default
 * logger, so nothing reaches stderr and the assertions see every record.
 */
const withCapturedLogs = <A, E, R>(program: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const entries: Array<LogEntry> = [];
    const collector = Logger.make<unknown, void>((options) => {
      entries.push({
        logLevel: options.logLevel,
        message: options.message,
        cause: options.cause,
      });
    });

    const value = yield* Effect.provide(program, Logger.layer([collector]));
    return { value, entries: entries as ReadonlyArray<LogEntry> } as const;
  });

const bodyOf = (response: HttpServerResponse.HttpServerResponse) =>
  HttpServerResponse.toClientResponse(response).text;

/** `JSON.parse` is typed `any`; bind it to `unknown` so assertions stay honest. */
const parseJson: (text: string) => unknown = JSON.parse;

/**
 * Asserts the boundary's two guarantees at once: the client got the contract's
 * `ApiError` and nothing else, and the log carries the defect's cause.
 */
const assertHandled = (
  response: HttpServerResponse.HttpServerResponse,
  entries: ReadonlyArray<LogEntry>,
) =>
  Effect.gen(function* () {
    assert.strictEqual(response.status, 500);

    const text = yield* bodyOf(response);
    // Exactly the contract's `ApiError` — no message, stack, or defect value
    // from the failure leaks into the body.
    assert.deepStrictEqual(parseJson(text), INTERNAL_ERROR);
    assert.notInclude(text, 'boom');

    const logged = entries.filter(
      (entry) =>
        Array.isArray(entry.message) &&
        entry.message.includes(DEFECT_LOG_MESSAGE),
    );
    assert.lengthOf(logged, 1);

    const [entry] = logged;
    assert.strictEqual(entry.logLevel, 'Error');
    // The cause travels as the log record's `cause`, not stringified into the
    // message, so a structured logger can ship it as such — and it is the
    // defect, not a typed failure standing in for one.
    assert.isTrue(Cause.hasDies(entry.cause));
    assert.include(Cause.pretty(entry.cause), BOOM);
  });

/**
 * Drives a routes layer the way the server does.
 *
 * A failure the boundary deliberately let past fails the router effect instead
 * of returning a response, so it is rendered here exactly as
 * `HttpEffect.toHandled` renders it: through `HttpServerError.causeResponse`,
 * which is what lets a `Respondable` defect pick its own status.
 */
const sendVia = <A, E, R>(routes: Layer.Layer<A, E, R>) =>
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(routes);

    return (request: HttpClientRequest.HttpClientRequest) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          handler.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromClientRequest(request),
            ),
          ),
        );
        if (Exit.isSuccess(exit)) return exit.value;
        const [response] = yield* HttpServerError.causeResponse(exit.cause);
        return response;
      });
  });

/**
 * The real {@link AppLayer}, plus one route that dies. Global middleware is
 * registered on the router rather than around a route, so the boundary merged
 * inside `AllRoutes` also wraps a route added by the layer next to it — which
 * is what makes this a test of the production wiring and not of a lookalike.
 */
const RoutesWithBoom = Layer.mergeAll(
  AppLayer,
  HttpRouter.add('GET', '/__boom', Effect.die(BOOM)),
).pipe(
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: '0' }),
    ),
  ),
  Layer.provideMerge(HttpServer.layerServices),
);

layer(HttpServer.layerServices)('Defect boundary — AppLayer', (it) => {
  it.effect('a dying route answers with the contract ApiError 500', () =>
    Effect.gen(function* () {
      const { value: response, entries } = yield* withCapturedLogs(
        Effect.flatMap(sendVia(RoutesWithBoom), (send) =>
          send(HttpClientRequest.get('/__boom')),
        ),
      );

      yield* assertHandled(response, entries);
    }),
  );

  it.effect('a healthy route is untouched by the boundary', () =>
    Effect.gen(function* () {
      const send = yield* sendVia(RoutesWithBoom);

      const response = yield* send(HttpClientRequest.get('/pokemon'));

      assert.strictEqual(response.status, 200);
    }),
  );

  /**
   * A schema violation is not a bug, and the boundary must not treat it as one.
   *
   * Without the middleware, `HttpApiBuilder` reports one by *dying* with a
   * `Respondable` `HttpApiSchemaError` that answers an empty 400 — the boundary
   * has to let that past or every rejected request becomes a 500.
   * `SchemaErrorHandler` now catches it earlier and answers the contract's
   * `ApiError` instead, so the request never reaches the boundary at all. Both
   * halves are asserted here: contract body out, nothing in the log.
   */
  it.effect('a schema violation answers 400 with the contract body', () =>
    Effect.gen(function* () {
      const { value: response, entries } = yield* withCapturedLogs(
        Effect.flatMap(sendVia(RoutesWithBoom), (send) =>
          // `PokemonId` starts at 1, so `0` violates the path parameter.
          send(HttpClientRequest.get('/pokemon/0')),
        ),
      );

      assert.strictEqual(response.status, 400);
      assert.include(
        response.headers['content-type'] ?? '',
        'application/json',
      );
      assert.deepStrictEqual(
        entries.filter(
          (entry) =>
            Array.isArray(entry.message) &&
            entry.message.includes(DEFECT_LOG_MESSAGE),
        ),
        [],
      );
    }),
  );

  /**
   * Finding 1: every one of these used to answer `400`, no content type, empty
   * body — undecodable by the generated client, and undeclared by nothing
   * except the spec that promised an `ApiError`. One case per `kind` the
   * platform reports (`Params`, `Query`, `Payload`), because the middleware
   * sees them at three different points in the request pipeline.
   */
  const violations = [
    {
      what: 'a bad path param',
      kind: 'Params',
      request: () => HttpClientRequest.get('/pokemon/0'),
    },
    {
      what: 'a bad query',
      kind: 'Query',
      request: () => HttpClientRequest.get('/pokemon?pageSize=0'),
    },
    {
      what: 'a bad payload',
      kind: 'Payload',
      request: () =>
        HttpClientRequest.post('/pokemon').pipe(
          HttpClientRequest.bodyJsonUnsafe({ name: 'missingno' }),
        ),
    },
  ] as const;

  for (const { what, kind, request } of violations) {
    it.effect(`${what} answers an ApiError-shaped 400`, () =>
      Effect.gen(function* () {
        const send = yield* sendVia(RoutesWithBoom);

        const response = yield* send(request());

        assert.strictEqual(response.status, 400);
        const body = parseJson(yield* bodyOf(response));
        assert.isTrue(
          Predicate.isReadonlyObject(body),
          'the 400 body is a JSON object',
        );
        if (!Predicate.isReadonlyObject(body)) return;
        // Exactly the contract's `ApiError` — `code` is the literal the 400
        // member of the error union is pinned to, and no `_tag` from the
        // server's own error type leaks onto the wire.
        assert.deepStrictEqual(Object.keys(body).toSorted(), [
          'code',
          'message',
        ]);
        assert.strictEqual(body['code'], VALIDATION_ERROR_CODE);
        // The message names the part of the request that was wrong, and why.
        assert.isString(body['message']);
        assert.include(String(body['message']), kind);
      }),
    );
  }
});

/**
 * A `Pokedex` whose read side is a defect, wired through the real
 * `PokedexHandlers`. Proves the boundary also covers a defect raised *inside* an
 * `HttpApiBuilder` handler — the builder encodes the contract's declared errors
 * and lets a defect through untouched.
 */
const DyingPokedex = Layer.succeed(Pokedex)(
  Pokedex.of({
    list: () => Effect.die(BOOM),
    getById: () => Effect.die(BOOM),
    create: () => Effect.die(BOOM),
    replace: () => Effect.die(BOOM),
    remove: () => Effect.die(BOOM),
  }),
);

const DyingRoutes = Layer.mergeAll(
  AllRoutes.pipe(
    Layer.provide([Health.layer, DyingPokedex]),
    // The health side is not what is under test here, and this suite has no
    // repository for the real registry to probe.
    Layer.provide(
      HealthChecks.layerOf({ database: { status: 'healthy', latencyMs: 0 } }),
    ),
  ),
  DefectBoundary,
).pipe(Layer.provideMerge(HttpServer.layerServices));

layer(HttpServer.layerServices)('Defect boundary — dying handler', (it) => {
  it.effect('GET /pokemon answers with the contract ApiError 500', () =>
    Effect.gen(function* () {
      const { value: response, entries } = yield* withCapturedLogs(
        Effect.flatMap(sendVia(DyingRoutes), (send) =>
          send(HttpClientRequest.get('/pokemon')),
        ),
      );

      yield* assertHandled(response, entries);
    }),
  );

  it.effect('DELETE /pokemon/1 answers with the contract ApiError 500', () =>
    Effect.gen(function* () {
      const { value: response, entries } = yield* withCapturedLogs(
        Effect.flatMap(sendVia(DyingRoutes), (send) =>
          send(HttpClientRequest.delete('/pokemon/1')),
        ),
      );

      yield* assertHandled(response, entries);
    }),
  );
});
