import { Module } from '@nestjs/common';
import { HealthCheckQuery } from './application/queries/health-check.query.js';
import { HealthLivenessQuery } from './application/queries/health-liveness.query.js';
import { HealthReadinessQuery } from './application/queries/health-readiness.query.js';
import { HealthCheckController } from './presentation/controllers/health-check.controller.js';
import { HealthLivenessController } from './presentation/controllers/health-liveness.controller.js';
import { HealthReadinessController } from './presentation/controllers/health-readiness.controller.js';

@Module({
  controllers: [
    HealthCheckController,
    HealthLivenessController,
    HealthReadinessController,
  ],
  providers: [HealthCheckQuery, HealthLivenessQuery, HealthReadinessQuery],
})
export class HealthModule {}
