import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scope discovery to this project's own tests. Without an explicit include
    // vitest also picks up the ~440 test files in the vendored `repos/effect`
    // reference subtree.
    include: ['src/**/*.test.ts'],
    // No tests exist yet (they arrive from Phase 3 onwards), so an empty run
    // must not fail `npm run check`.
    passWithNoTests: true,
  },
});
