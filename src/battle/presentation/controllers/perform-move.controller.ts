import {
  Body,
  Controller,
  Param,
  Post,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { R } from '@praha/byethrow';
import type {
  PerformMoveRequest,
  BattleStatus,
} from '../../../generated/types.gen.js';
import { PerformMoveCommand } from '../../application/commands/perform-move.command.js';

@Controller('battles')
export class PerformMoveController {
  constructor(private readonly performMoveCommand: PerformMoveCommand) {}

  @Post(':id/move')
  async performMove(
    @Param('id') id: string,
    @Body() body: PerformMoveRequest,
  ): Promise<BattleStatus> {
    const result = await this.performMoveCommand.handle(id, body);
    if (R.isFailure(result)) {
      if (result.error.message.includes('not found')) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }
}
