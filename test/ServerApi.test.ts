/**
 * The served API document must describe the committed contract and nothing
 * else.
 *
 * `src/http/ServerApi.ts` attaches middleware to the generated `PokedexApi`,
 * and `HttpApiBuilder.layer` builds `/openapi.json` from the *result*. That is
 * a second source of truth for the wire contract, and it is not covered by
 * CI's drift gate: the gate regenerates `tsp-output/openapi.yaml` and
 * `src/generated/` from `tsp/` and fails on a diff, which pins
 * `PokedexApi ≡ tsp-output/openapi.yaml` — but says nothing about what
 * `ServerApi` adds on top.
 *
 * This closes the chain. `OpenApi.fromApi(ServerApi)` must equal
 * `OpenApi.fromApi(PokedexApi)`, so the served document is the committed one,
 * transitively. It is a real constraint, not a tautology:
 * `HttpApiEndpoint.getErrorSchemas` appends a middleware's declared error to
 * every endpoint's error union, so a middleware that declares one makes each
 * 400 an `anyOf` of the contract's body and the middleware's — `_tag` and all.
 * That is exactly what `SchemaErrorHandler` avoids by answering with a
 * response instead of a declared failure.
 */
import { assert, layer } from '@effect/vitest';
import { ConfigProvider, Effect, Layer } from 'effect';
import {
  HttpClientRequest,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http';
import { OpenApi } from 'effect/unstable/httpapi';
import { PokedexApi } from '../src/generated/Api.js';
import { AppLayer } from '../src/http/AppLayer.js';
import { ServerApi } from '../src/http/ServerApi.js';

const RoutesLayer = AppLayer.pipe(
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromEnvRecord({ FLAKY_UPSTREAM_RATE: '0' }),
    ),
  ),
  Layer.provideMerge(HttpServer.layerServices),
);

/** `JSON.parse` is typed `any`; bind it to `unknown` so assertions stay honest. */
const parseJson: (text: string) => unknown = JSON.parse;

layer(HttpServer.layerServices)('Served OpenAPI document', (it) => {
  it.effect('attaching the middleware changes nothing in the document', () =>
    Effect.sync(() => {
      assert.deepStrictEqual(
        OpenApi.fromApi(ServerApi),
        OpenApi.fromApi(PokedexApi),
      );
    }),
  );

  it.effect('GET /openapi.json serves that document', () =>
    Effect.gen(function* () {
      const handler = yield* HttpRouter.toHttpEffect(RoutesLayer);
      const response = yield* handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(
            HttpClientRequest.get('/openapi.json'),
          ),
        ),
      );

      const body = yield* HttpServerResponse.toClientResponse(response).text;
      assert.deepStrictEqual(
        parseJson(body),
        // Round-tripped: the served copy went through `JSON.stringify`, which
        // drops `undefined` properties the in-memory document may still carry.
        parseJson(JSON.stringify(OpenApi.fromApi(PokedexApi))),
      );
    }),
  );
});
