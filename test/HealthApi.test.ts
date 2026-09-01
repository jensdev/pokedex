import { assert, layer } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import {
  HttpClientRequest,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
} from 'effect/unstable/http';
import { HttpApiTest } from 'effect/unstable/httpapi';
import { HealthHandlers } from '../src/http/HealthHandlers.js';
import { AppLayer } from '../src/http/AppLayer.js';
import { SchemaErrorHandlerLayer, ServerApi } from '../src/http/ServerApi.js';
import { Health } from '../src/services/Health.js';

// `ServerApi`, not the generated `PokedexApi`: the handlers are built against
// the api that carries the schema-error middleware, and the typed client has to
// describe the same endpoints.
const makeClient = HttpApiTest.groups(ServerApi, ['Health']);

const TestLayer = Layer.mergeAll(
  HealthHandlers.pipe(
    Layer.provideMerge(SchemaErrorHandlerLayer),
    Layer.provide(Health.layer),
  ),
  HttpServer.layerServices,
);

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
      assert.deepStrictEqual(body.components, {
        database: { status: 'healthy', latencyMs: 1 },
      });
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

  it.effect('healthReadiness matches healthCheck', () =>
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
