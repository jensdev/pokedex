import { Injectable } from '@nestjs/common';
import type { HealthReadinessResponse } from '../../generated/types.gen.js';

@Injectable()
export class HealthReadinessQuery {
  async get(): Promise<HealthReadinessResponse> {
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
