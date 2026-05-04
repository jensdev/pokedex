import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../../generated/nestjs.gen.js';
import { HealthLivenessQuery } from '../../application/queries/health-liveness.query.js';

@Controller('health')
export class HealthLivenessRequest implements Pick<
  HealthControllerMethods,
  'healthLiveness'
> {
  constructor(private readonly query: HealthLivenessQuery) {}

  @Get('live')
  async healthLiveness() {
    return await this.query.get();
  }
}
