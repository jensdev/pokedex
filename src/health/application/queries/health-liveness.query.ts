import { Injectable } from '@nestjs/common';
import type { HealthLivenessResponse } from '../../../generated/types.gen.js';

@Injectable()
export class HealthLivenessQuery {
  private readonly startTime = Date.now();

  async get(): Promise<HealthLivenessResponse> {
    return Promise.resolve({
      status: 'ok',
      uptime: (Date.now() - this.startTime) / 1000,
    });
  }
}
