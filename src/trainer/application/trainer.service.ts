import { Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { Trainer, CapturedPokemon } from '../domain/trainer.entity.js';

export class TrainerNotFoundError extends Error {
  constructor(id: number) {
    super(`Trainer with id ${id} not found`);
    this.name = 'TrainerNotFoundError';
  }
}

@Injectable()
export class TrainerService {
  private trainers: Trainer[] = [];
  private nextTrainerId = 1;
  private nextCaptureId = 1;

  createTrainer(name: string): Promise<Trainer> {
    const trainer = new Trainer(
      this.nextTrainerId++,
      name,
      [],
      new Date().toISOString(),
    );
    this.trainers.push(trainer);
    return Promise.resolve(trainer);
  }

  getTrainerById(id: number): Result.ResultAsync<Trainer, TrainerNotFoundError> {
    const trainer = this.trainers.find((t) => t.id === id);
    return Promise.resolve(
      trainer ? R.succeed(trainer) : R.fail(new TrainerNotFoundError(id)),
    );
  }

  catchPokemon(
    trainerId: number,
    pokemonId: number,
    level: number,
    nickname?: string,
  ): Result.ResultAsync<CapturedPokemon, TrainerNotFoundError> {
    const trainer = this.trainers.find((t) => t.id === trainerId);
    if (!trainer) {
      return Promise.resolve(R.fail(new TrainerNotFoundError(trainerId)));
    }

    const captured = trainer.catchPokemon(
      this.nextCaptureId++,
      pokemonId,
      level,
      nickname,
    );
    return Promise.resolve(R.succeed(captured));
  }
}
