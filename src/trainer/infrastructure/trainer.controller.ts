import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { TrainerControllerMethods } from '../../generated/nestjs.gen';
import type {
  CreateTrainerData,
  GetTrainerByIdData,
  CatchPokemonData,
} from '../../generated/types.gen';
import {
  zCreateTrainerBody,
  zGetTrainerByIdPath,
  zCatchPokemonPath,
  zCatchPokemonBody,
} from '../../generated/zod.gen';
import { ZodPipe } from '../../zod.pipe.js';
import { TrainerService } from '../application/trainer.service.js';

@Controller('trainers')
export class TrainerController implements TrainerControllerMethods {
  constructor(private readonly trainerService: TrainerService) {}

  @Post()
  async createTrainer(
    @Body(new ZodPipe(zCreateTrainerBody)) body: CreateTrainerData['body'],
  ) {
    return await this.trainerService.createTrainer(body.name);
  }

  @Get(':id')
  async getTrainerById(
    @Param(new ZodPipe(zGetTrainerByIdPath)) path: GetTrainerByIdData['path'],
  ) {
    const result = await this.trainerService.getTrainerById(path.id);
    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Trainer with id ${path.id} not found`);
      })
      .exhaustive();
  }

  @Post(':id/catch')
  async catchPokemon(
    @Param(new ZodPipe(zCatchPokemonPath)) path: CatchPokemonData['path'],
    @Body(new ZodPipe(zCatchPokemonBody)) body: CatchPokemonData['body'],
  ) {
    const result = await this.trainerService.catchPokemon(
      path.id,
      body.pokemonId,
      body.level,
      body.nickname,
    );
    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Trainer with id ${path.id} not found`);
      })
      .exhaustive();
  }
}
