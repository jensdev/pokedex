import { Module } from '@nestjs/common';
import { PokemonModule } from '../pokemon/pokemon.module.js';
import { StartBattleCommand } from './application/commands/start-battle.command.js';
import { PerformMoveCommand } from './application/commands/perform-move.command.js';
import { GetBattleQuery } from './application/queries/get-battle.query.js';
import { BATTLE_REPOSITORY_TOKEN } from './domain/battle.repository.interface.js';
import { InMemoryBattleRepository } from './infrastructure/persistence/battle.repository.js';
import { StartBattleController } from './presentation/controllers/start-battle.controller.js';
import { PerformMoveController } from './presentation/controllers/perform-move.controller.js';
import { GetBattleByIdController } from './presentation/controllers/get-battle-by-id.controller.js';

@Module({
  imports: [PokemonModule],
  controllers: [
    StartBattleController,
    PerformMoveController,
    GetBattleByIdController,
  ],
  providers: [
    StartBattleCommand,
    PerformMoveCommand,
    GetBattleQuery,
    {
      provide: BATTLE_REPOSITORY_TOKEN,
      useClass: InMemoryBattleRepository,
    },
  ],
})
export class BattleModule {}
