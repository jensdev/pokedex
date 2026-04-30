import {
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../generated/nestjs.gen.js';
import type { DeletePokemonData } from '../../generated/types.gen.js';
import { zDeletePokemonPath } from '../../generated/zod.gen.js';
import { ZodPipe } from '../../zod.pipe.js';
import {
  DeletePokemonCommand,
  DeletePokemonCommandHandler,
} from '../commands/delete-pokemon.command.js';

@Controller('pokemon')
export class DeletePokemonRequest
  implements Pick<PokedexControllerMethods, 'deletePokemon'>
{
  constructor(private readonly handler: DeletePokemonCommandHandler) {}

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(
    @Param(new ZodPipe(zDeletePokemonPath)) path: DeletePokemonData['path'],
  ) {
    const result = await this.handler.execute(new DeletePokemonCommand(path.id));

    match(result)
      .with({ type: 'Success' }, () => {})
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Pokemon with id ${path.id} not found`);
      })
      .exhaustive();
  }
}
