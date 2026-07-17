import { Body, Controller, Param, Put } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { ReplacePokemonData } from '../../../generated/types.gen.js';
import {
  zReplacePokemonBody,
  zReplacePokemonPath,
} from '../../../generated/zod.gen.js';
import { ReplacePokemonCommand } from '../../application/commands/replace-pokemon.command.js';
import { respond } from '../respond.js';

@Controller('pokemon')
export class ReplacePokemonController implements Pick<
  PokedexControllerMethods,
  'replacePokemon'
> {
  constructor(private readonly command: ReplacePokemonCommand) {}

  @Put(':id')
  async replacePokemon(
    @Param({ schema: zReplacePokemonPath }) path: ReplacePokemonData['path'],
    @Body({ schema: zReplacePokemonBody }) body: ReplacePokemonData['body'],
  ) {
    return respond(await this.command.handle(path.id, body));
  }
}
