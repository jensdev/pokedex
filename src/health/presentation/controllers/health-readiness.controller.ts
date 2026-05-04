import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../../generated/nestjs.gen.js';
import { HealthReadinessQuery } from '../../application/queries/health-readiness.query.js';

@Controller('health')
export class HealthReadinessController implements Pick<
  HealthControllerMethods,
  'healthReadiness'
> {
  constructor(private readonly query: HealthReadinessQuery) {}

  @Get('ready')
  async healthReadiness() {
    return await this.query.get();
  }
}
