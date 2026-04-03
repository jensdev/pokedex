// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './tsp-output/openapi.yaml',
  output: {
    path: './src/generated',
    postProcess: ['eslint', 'prettier'],
  },
  plugins: ['nestjs', '@hey-api/sdk', 'zod'],
});
