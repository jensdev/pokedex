// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './tsp-output/openapi.yaml',
  output: {
    path: './src/generated',
    postProcess: ['oxlint', 'prettier'],
  },
  plugins: [
    'nestjs',
    '@hey-api/sdk',
    {
      name: 'zod',
      // Path and query parameters always arrive as strings over HTTP, but the
      // OpenAPI spec types them as integers/numbers. The stock Zod output
      // (`z.int()` / `z.number()`) then rejects valid input like `/pokemon/25`.
      // Override the number resolver to emit `z.coerce.number()` so the same
      // generated schemas validate both JSON bodies and string params. Real
      // numbers pass through unchanged; numeric strings are coerced.
      '~resolvers': {
        number: (ctx) => {
          const { chain, nodes, schema, symbols, utils } = ctx;
          const { z } = symbols;

          const constNode = nodes.const(ctx);
          if (constNode) {
            chain.current = constNode;
            return chain.current;
          }

          chain.current = utils.shouldCoerceToBigInt(schema.format)
            ? ctx.$(z).attr('coerce').attr('bigint').call()
            : ctx.$(z).attr('coerce').attr('number').call();

          const minNode = nodes.min(ctx);
          if (minNode) chain.current = minNode;

          const maxNode = nodes.max(ctx);
          if (maxNode) chain.current = maxNode;

          return chain.current;
        },
      },
    },
  ],
});
