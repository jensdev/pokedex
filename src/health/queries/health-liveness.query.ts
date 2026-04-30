import { Injectable } from '@nestjs/common';
import type { HealthLivenessResponse } from '../../generated/types.gen.js';

export class HealthLivenessQuery {}

@Injectable()
export class HealthLivenessQueryHandler {
  private readonly startTime = Date.now();

  async execute(_: HealthLivenessQuery): Promise<HealthLivenessResponse> {
    return Promise.resolve({
      status: 'ok',
      uptime: (Date.now() - this.startTime) / 1000,
    });
  }
}
