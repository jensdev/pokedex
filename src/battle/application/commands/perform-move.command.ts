import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  PerformMoveRequest,
  BattleStatus,
} from '../../../generated/types.gen.js';
import { BATTLE_REPOSITORY_TOKEN } from '../../domain/battle.repository.interface.js';
import type { IBattleRepository } from '../../domain/battle.repository.interface.js';

@Injectable()
export class PerformMoveCommand {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly repository: IBattleRepository,
  ) {}

  async handle(
    id: string,
    body: PerformMoveRequest,
  ): Promise<Result.Result<BattleStatus, Error>> {
    const battleResult = await this.repository.getById(id);

    if (R.isFailure(battleResult) || !battleResult.value) {
      return R.fail(new Error(`Battle ${id} not found.`));
    }

    const battle = battleResult.value;

    try {
      battle.performMove(body.trainerId, body.moveName);
    } catch (error) {
      return R.fail(error as Error);
    }

    await this.repository.save(battle);

    return R.succeed(battle.state);
  }
}
