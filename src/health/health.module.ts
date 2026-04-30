import { Module } from '@nestjs/common';
import { HealthCheckQueryHandler } from './queries/health-check.query.js';
import { HealthLivenessQueryHandler } from './queries/health-liveness.query.js';
import { HealthReadinessQueryHandler } from './queries/health-readiness.query.js';
import {
  HealthCheckRequest,
} from './requests/health-check.request.js';
import {
  HealthLivenessRequest,
} from './requests/health-liveness.request.js';
import {
  HealthReadinessRequest,
} from './requests/health-readiness.request.js';

@Module({
  controllers: [
    HealthCheckRequest,
    HealthLivenessRequest,
    HealthReadinessRequest,
  ],
  providers: [
    HealthCheckQueryHandler,
    HealthLivenessQueryHandler,
    HealthReadinessQueryHandler,
  ],
})
export class HealthModule {}
