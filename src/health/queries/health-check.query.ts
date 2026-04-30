import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '../../generated/types.gen.js';

@Injectable()
export class HealthCheckQuery {
  async get(): Promise<HealthCheckResponse> {
    return Promise.resolve({
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      version: '1.0.0',
      components: {
        database: {
          status: 'healthy',
          latencyMs: 1,
        },
      },
    });
  }
}
