/**
 * Entry point: composes the route layers with the Node HTTP server and hands
 * the result to `NodeRuntime.runMain`, which wires interruption and teardown
 * (Ctrl-C drains the server scope).
 */
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Config, Layer } from 'effect';
import { HttpRouter } from 'effect/unstable/http';
import { createServer } from 'node:http';
import { AllRoutes } from './http/Routes.js';

const ServerLayer = HttpRouter.serve(AllRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.port('PORT').pipe(Config.withDefault(3000)),
    }),
  ),
);

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain);
