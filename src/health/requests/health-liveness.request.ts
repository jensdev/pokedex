import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../generated/nestjs.gen.js';
import {
  HealthLivenessQuery,
  HealthLivenessQueryHandler,
} from '../queries/health-liveness.query.js';

@Controller('health')
export class HealthLivenessRequest
  implements Pick<HealthControllerMethods, 'healthLiveness'>
{
  constructor(private readonly handler: HealthLivenessQueryHandler) {}

  @Get('live')
  async healthLiveness() {
    return await this.handler.execute(new HealthLivenessQuery());
  }
}
