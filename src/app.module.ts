import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PokemonModule } from './pokemon/pokemon.module.js';
import { TrainerModule } from './trainer/trainer.module.js';

@Module({
  imports: [HealthModule, PokemonModule, TrainerModule],
})
export class AppModule {}
