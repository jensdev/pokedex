/**
 * Entry point: composes the application layer with the Node HTTP server and
 * hands the result to `NodeRuntime.runMain`, which wires interruption and
 * teardown (Ctrl-C drains the server scope).
 *
 * The service wiring itself lives in `http/AppLayer.ts`, so the tests that
 * exercise the whole stack run the same composition this does.
 */
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Config, Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { createServer } from 'node:http';
import { AppLayer } from './http/AppLayer.js';

const ServerLayer = HttpRouter.serve(AppLayer).pipe(
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.port('PORT').pipe(Config.withDefault(3000)),
    }),
  ),
);

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain);
