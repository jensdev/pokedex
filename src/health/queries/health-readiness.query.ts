import { Injectable } from '@nestjs/common';
import type { HealthReadinessResponse } from '../../generated/types.gen.js';

export class HealthReadinessQuery {}

@Injectable()
export class HealthReadinessQueryHandler {
  async execute(_: HealthReadinessQuery): Promise<HealthReadinessResponse> {
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
