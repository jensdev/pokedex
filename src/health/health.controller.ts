import { Controller, Get } from '@nestjs/common';
import type { HealthControllerMethods } from '../generated/nestjs.gen.js';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController implements Pick<
  HealthControllerMethods,
  'healthCheck' | 'healthLiveness' | 'healthReadiness'
> {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async healthCheck() {
    return await this.healthService.check();
  }

  @Get('live')
  async healthLiveness() {
    return await this.healthService.liveness();
  }

  @Get('ready')
  async healthReadiness() {
    return await this.healthService.readiness();
  }
}
