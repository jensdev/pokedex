import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../generated/nestjs.gen.js';
import {
  HealthReadinessQuery,
  HealthReadinessQueryHandler,
} from '../queries/health-readiness.query.js';

@Controller('health')
export class HealthReadinessRequest
  implements Pick<HealthControllerMethods, 'healthReadiness'>
{
  constructor(private readonly handler: HealthReadinessQueryHandler) {}

  @Get('ready')
  async healthReadiness() {
    return await this.handler.execute(new HealthReadinessQuery());
  }
}
