import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PokemonModule } from './pokemon/pokemon.module.js';

@Module({
  imports: [HealthModule, PokemonModule],
})
export class AppModule {}
