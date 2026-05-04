import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PokemonModule } from './pokemon/pokemon.module.js';
import { BattleModule } from './battle/battle.module.js';

@Module({
  imports: [HealthModule, PokemonModule, BattleModule],
})
export class AppModule {}
