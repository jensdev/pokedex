import { defineConfig } from 'vitest/config';

// Unit specs (`*.spec.ts`) and e2e specs (`*.e2e-spec.ts`) live in the same
// tree but run as separate projects. `npm run test` targets `unit`,
// `npm run test:e2e` targets `e2e`; a bare `vitest run` runs both.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          include: ['**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          globals: true,
          include: ['**/*.e2e-spec.ts'],
        },
      },
    ],
  },
});
