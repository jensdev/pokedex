import { assert, layer } from '@effect/vitest';
import { Config, Effect, Layer } from 'effect';
import {
  HttpClientRequest,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
} from 'effect/unstable/http';
import { HttpApiTest } from 'effect/unstable/httpapi';
import { AppLayer } from '../src/http/AppLayer.js';
import { HealthHandlers } from '../src/http/HealthHandlers.js';
import { SchemaErrorHandlerLayer, ServerApi } from '../src/http/ServerApi.js';
import { Health } from '../src/services/Health.js';
import type { HealthComponents } from '../src/services/HealthChecks.js';
import { HealthChecks } from '../src/services/HealthChecks.js';
import { PokemonRepository } from '../src/services/PokemonRepository.js';

// `ServerApi`, not the generated `PokedexApi`: the handlers are built against
// the api that carries the schema-error middleware, and the typed client has to
// describe the same endpoints.
const makeClient = HttpApiTest.groups(ServerApi, ['Health']);

/** The handler stack over a given registry — the only thing these tests vary. */
const healthWith = (checks: Layer.Layer<HealthChecks, Config.ConfigError>) =>
  Layer.mergeAll(
    HealthHandlers.pipe(
      Layer.provideMerge(SchemaErrorHandlerLayer),
      Layer.provide(Health.layer),
      Layer.provide(checks),
    ),
    HttpServer.layerServices,
  );

/** A registry with the real repository probe behind it, as the app has. */
const RealChecks = HealthChecks.layer.pipe(
  Layer.provide(PokemonRepository.layerInMemory),
);

/** One fixed component, so a test can name the status it wants to see. */
const fixedChecks = (components: HealthComponents) =>
  HealthChecks.layerOf(components);

const TestLayer = healthWith(RealChecks);

/** ISO 8601 instant, as the `checkedAt` schema's `date-time` format demands. */
const isIsoInstant = (value: string) =>
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;

layer(TestLayer)('Health API', (it) => {
  it.effect('healthCheck reports every component healthy', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const body = yield* client.Health.healthCheck();

      assert.strictEqual(body.status, 'healthy');
      assert.strictEqual(body.version, '1.0.0');
      // The status is the repository's answer now, not a constant, and it comes
      // with what the probe actually measured.
      assert.strictEqual(body.components.database.status, 'healthy');
      assert.strictEqual(body.components.database.message, '4 entries');
      assert.isAtLeast(body.components.database.latencyMs ?? -1, 0);
      assert.isTrue(isIsoInstant(body.checkedAt));
    }),
  );

  it.effect('healthLiveness reports uptime in seconds', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const body = yield* client.Health.healthLiveness();

      assert.strictEqual(body.status, 'ok');
      assert.isTrue(Number.isFinite(body.uptime));
      assert.isAtLeast(body.uptime, 0);
    }),
  );

  it.effect('healthReadiness matches healthCheck while healthy', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;

      const [check, readiness] = yield* Effect.all([
        client.Health.healthCheck(),
        client.Health.healthReadiness(),
      ]);

      assert.strictEqual(readiness.status, check.status);
      assert.strictEqual(readiness.version, check.version);
      assert.deepStrictEqual(readiness.components, check.components);
      assert.isTrue(isIsoInstant(readiness.checkedAt));
    }),
  );
});

/**
 * Finding 9: the aggregate used to be the literal `'healthy'`, so readiness
 * could not fail and the endpoint declared no non-200. It is the worst
 * component status now, and `unhealthy` is a 503.
 */
const aggregates = [
  {
    status: 'degraded',
    components: {
      database: { status: 'degraded', message: 'slow' },
    },
  },
  {
    status: 'unhealthy',
    components: {
      database: { status: 'unhealthy', message: 'connection refused' },
    },
  },
] as const satisfies ReadonlyArray<{
  readonly status: string;
  readonly components: HealthComponents;
}>;

for (const { status, components } of aggregates) {
  layer(healthWith(fixedChecks(components)))(`Health API — ${status}`, (it) => {
    it.effect(`healthCheck reports the ${status} aggregate as 200`, () =>
      Effect.gen(function* () {
        const client = yield* makeClient;

        const body = yield* client.Health.healthCheck();

        // `check` never fails: its contract says to read the `status` field.
        assert.strictEqual(body.status, status);
        assert.deepStrictEqual(body.components, components);
      }),
    );

    it.effect('healthLiveness is unaffected by component health', () =>
      Effect.gen(function* () {
        const client = yield* makeClient;

        const body = yield* client.Health.healthLiveness();

        // Liveness answers "the process is running", which it is. A component
        // that is down is a readiness question, not a restart signal.
        assert.strictEqual(body.status, 'ok');
      }),
    );

    if (status === 'unhealthy') {
      it.effect('healthReadiness fails with the 503 member', () =>
        Effect.gen(function* () {
          const client = yield* makeClient;

          const error = yield* Effect.flip(client.Health.healthReadiness());

          // The typed client's failure channel also carries transport errors;
          // this one has to be the declared 503 body.
          assert.isTrue(
            'components' in error,
            'the 503 body, not a transport error',
          );
          if (!('components' in error)) return;
          // The body is the full report, so a probe that failed still says
          // which component failed.
          assert.strictEqual(error.status, 'unhealthy');
          assert.deepStrictEqual(error.components, components);
        }),
      );
    } else {
      it.effect('healthReadiness still succeeds when merely degraded', () =>
        Effect.gen(function* () {
          const client = yield* makeClient;

          // A service answering badly is still answering; pulling it out of the
          // load balancer would make things worse.
          const body = yield* client.Health.healthReadiness();

          assert.strictEqual(body.status, 'degraded');
        }),
      );
    }
  });
}

/**
 * The typed client above decodes the success channel and therefore cannot see
 * the wire status. Drive the real router instead to assert it, along with the
 * OpenAPI and Scalar routes mounted next to the API.
 */
const RoutesLayer = AppLayer.pipe(Layer.provideMerge(HttpServer.layerServices));

layer(HttpServer.layerServices)('Health routes', (it) => {
  const get = (path: string) =>
    Effect.gen(function* () {
      const handler = yield* HttpRouter.toHttpEffect(RoutesLayer);
      return yield* handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(HttpClientRequest.get(path)),
        ),
      );
    });

  for (const path of ['/health', '/health/live', '/health/ready']) {
    it.effect(`GET ${path} responds 200 with JSON`, () =>
      Effect.gen(function* () {
        const response = yield* get(path);

        assert.strictEqual(response.status, 200);
        assert.include(
          response.headers['content-type'] ?? '',
          'application/json',
        );
      }),
    );
  }

  it.effect('GET /openapi.json serves the spec', () =>
    Effect.gen(function* () {
      const response = yield* get('/openapi.json');

      assert.strictEqual(response.status, 200);
      assert.include(
        response.headers['content-type'] ?? '',
        'application/json',
      );
    }),
  );

  it.effect('GET /docs serves the Scalar reference', () =>
    Effect.gen(function* () {
      const response = yield* get('/docs');

      assert.strictEqual(response.status, 200);
      assert.include(response.headers['content-type'] ?? '', 'text/html');
    }),
  );
});
