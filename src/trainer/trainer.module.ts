import { Module } from '@nestjs/common';
import { TrainerController } from './infrastructure/trainer.controller.js';
import { TrainerService } from './application/trainer.service.js';

@Module({
  controllers: [TrainerController],
  providers: [TrainerService],
})
export class TrainerModule {}
