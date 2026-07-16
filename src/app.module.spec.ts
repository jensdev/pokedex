import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';

describe('AppModule', () => {
  // Compiling the module wires the full DI graph, which only resolves if the
  // test runner emits decorator metadata — so this doubles as a check that the
  // Vitest/oxc transform is configured correctly for NestJS.
  it('compiles and initializes the dependency graph', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
