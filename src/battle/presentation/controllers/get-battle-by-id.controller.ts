import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { R } from '@praha/byethrow';
import type { BattleStatus } from '../../../generated/types.gen.js';
import { GetBattleQuery } from '../../application/queries/get-battle.query.js';

@Controller('battles')
export class GetBattleByIdController {
  constructor(private readonly getBattleQuery: GetBattleQuery) {}

  @Get(':id')
  async getById(@Param('id') id: string): Promise<BattleStatus> {
    const result = await this.getBattleQuery.handle(id);
    if (R.isFailure(result)) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
