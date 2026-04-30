import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '../../generated/types.gen.js';

export class HealthCheckQuery {}

@Injectable()
export class HealthCheckQueryHandler {
  async execute(_: HealthCheckQuery): Promise<HealthCheckResponse> {
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
