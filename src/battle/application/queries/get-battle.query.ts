import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type { BattleStatus } from '../../../generated/types.gen.js';
import { BATTLE_REPOSITORY_TOKEN } from '../../domain/battle.repository.interface.js';
import type { IBattleRepository } from '../../domain/battle.repository.interface.js';

@Injectable()
export class GetBattleQuery {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly repository: IBattleRepository,
  ) {}

  async handle(id: string): Promise<Result.Result<BattleStatus, Error>> {
    const battleResult = await this.repository.getById(id);

    if (R.isFailure(battleResult) || !battleResult.value) {
      return R.fail(new Error(`Battle ${id} not found.`));
    }

    return R.succeed(battleResult.value.state);
  }
}
