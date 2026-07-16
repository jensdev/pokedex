import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { DeletePokemonData } from '../../../generated/types.gen.js';
import { zDeletePokemonPath } from '../../../generated/zod.gen.js';
import { DeletePokemonCommand } from '../../application/commands/delete-pokemon.command.js';
import { throwHttpException } from '../http-error.mapper.js';

@Controller('pokemon')
export class DeletePokemonController implements Pick<
  PokedexControllerMethods,
  'deletePokemon'
> {
  constructor(private readonly command: DeletePokemonCommand) {}

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(
    @Param({ schema: zDeletePokemonPath }) path: DeletePokemonData['path'],
  ) {
    const result = await this.command.handle(path.id);

    match(result)
      .with({ type: 'Success' }, () => {})
      .with({ type: 'Failure' }, ({ error }) => throwHttpException(error))
      .exhaustive();
  }
}
