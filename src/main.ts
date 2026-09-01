/**
 * Entry point: composes the application layer with the Node HTTP server and
 * hands the result to `NodeRuntime.runMain`, which wires interruption and
 * teardown (Ctrl-C drains the server scope).
 *
 * The service wiring itself lives in `http/AppLayer.ts`, so the tests that
 * exercise the whole stack run the same composition this does. Observability
 * is provided here rather than there: it is a property of the running process,
 * and a test that installed an OTLP exporter would be a surprise.
 */
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Config, Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { createServer } from 'node:http';
import { AppLayer } from './http/AppLayer.js';
import { Observability } from './Observability.js';

const ServerLayer = HttpRouter.serve(AppLayer).pipe(
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.port('PORT').pipe(Config.withDefault(3000)),
    }),
  ),
  // Below the server layer, so the request span and log line `HttpRouter.serve`
  // emits are exported too — not just the ones the handlers make.
  Layer.provide(Observability),
);

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain);
