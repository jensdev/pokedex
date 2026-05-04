import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../../../generated/nestjs.gen.js';
import { HealthCheckQuery } from '../../application/queries/health-check.query.js';

@Controller('health')
export class HealthCheckRequest implements Pick<
  HealthControllerMethods,
  'healthCheck'
> {
  constructor(private readonly query: HealthCheckQuery) {}

  @Get()
  async healthCheck() {
    return await this.query.get();
  }
}
