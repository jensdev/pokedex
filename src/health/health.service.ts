import { Injectable } from '@nestjs/common';
import type {
  HealthCheckResponse,
  HealthLivenessResponse,
  HealthReadinessResponse,
} from '../generated/types.gen.js';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  async check(): Promise<HealthCheckResponse> {
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

  async liveness(): Promise<HealthLivenessResponse> {
    return Promise.resolve({
      status: 'ok',
      uptime: (Date.now() - this.startTime) / 1000,
    });
  }

  async readiness(): Promise<HealthReadinessResponse> {
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
