import { Module } from '@nestjs/common';
import { HealthCheckQuery } from './application/queries/health-check.query.js';
import { HealthLivenessQuery } from './application/queries/health-liveness.query.js';
import { HealthReadinessQuery } from './application/queries/health-readiness.query.js';
import { HealthCheckRequest } from './presentation/requests/health-check.request.js';
import { HealthLivenessRequest } from './presentation/requests/health-liveness.request.js';
import { HealthReadinessRequest } from './presentation/requests/health-readiness.request.js';

@Module({
  controllers: [
    HealthCheckRequest,
    HealthLivenessRequest,
    HealthReadinessRequest,
  ],
  providers: [HealthCheckQuery, HealthLivenessQuery, HealthReadinessQuery],
})
export class HealthModule {}
