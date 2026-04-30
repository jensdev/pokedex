import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../generated/nestjs.gen.js';
import type { ReplacePokemonData } from '../../generated/types.gen.js';
import { zReplacePokemonBody, zReplacePokemonPath } from '../../generated/zod.gen.js';
import { ZodPipe } from '../../zod.pipe.js';
import {
  ReplacePokemonCommand,
  ReplacePokemonCommandHandler,
} from '../commands/replace-pokemon.command.js';

@Controller('pokemon')
export class ReplacePokemonRequest
  implements Pick<PokedexControllerMethods, 'replacePokemon'>
{
  constructor(private readonly handler: ReplacePokemonCommandHandler) {}

  @Put(':id')
  async replacePokemon(
    @Param(new ZodPipe(zReplacePokemonPath)) path: ReplacePokemonData['path'],
    @Body(new ZodPipe(zReplacePokemonBody)) body: ReplacePokemonData['body'],
  ) {
    const result = await this.handler.execute(
      new ReplacePokemonCommand(path.id, body),
    );

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Pokemon with id ${path.id} not found`);
      })
      .exhaustive();
  }
}
