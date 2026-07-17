import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { DeletePokemonData } from '../../../generated/types.gen.js';
import { zDeletePokemonPath } from '../../../generated/zod.gen.js';
import { DeletePokemonCommand } from '../../application/commands/delete-pokemon.command.js';
import { respond } from '../respond.js';

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
    respond(await this.command.handle(path.id));
  }
}
