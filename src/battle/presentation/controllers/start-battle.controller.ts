import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { R } from '@praha/byethrow';
import type {
  StartBattleRequest,
  BattleStatus,
} from '../../../generated/types.gen.js';
import { StartBattleCommand } from '../../application/commands/start-battle.command.js';

@Controller('battles')
export class StartBattleController {
  constructor(private readonly startBattleCommand: StartBattleCommand) {}

  @Post()
  async start(@Body() body: StartBattleRequest): Promise<BattleStatus> {
    const result = await this.startBattleCommand.handle(body);
    if (R.isFailure(result)) {
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }
}
