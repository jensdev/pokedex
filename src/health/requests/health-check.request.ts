import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../generated/nestjs.gen.js';
import {
  HealthCheckQuery,
  HealthCheckQueryHandler,
} from '../queries/health-check.query.js';

@Controller('health')
export class HealthCheckRequest
  implements Pick<HealthControllerMethods, 'healthCheck'>
{
  constructor(private readonly handler: HealthCheckQueryHandler) {}

  @Get()
  async healthCheck() {
    return await this.handler.execute(new HealthCheckQuery());
  }
}
