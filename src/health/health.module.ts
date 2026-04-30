import { Module } from '@nestjs/common';
import { HealthCheckQuery } from './queries/health-check.query.js';
import { HealthLivenessQuery } from './queries/health-liveness.query.js';
import { HealthReadinessQuery } from './queries/health-readiness.query.js';
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
    HealthCheckQuery,
    HealthLivenessQuery,
    HealthReadinessQuery,
  ],
})
export class HealthModule {}
