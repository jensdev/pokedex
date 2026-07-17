import { Injectable } from '@nestjs/common';
import { Clock } from '../domain/clock.js';

@Injectable()
export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}
