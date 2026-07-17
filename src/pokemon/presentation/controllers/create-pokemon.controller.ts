import { Body, Controller, Post } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { CreatePokemonData } from '../../../generated/types.gen.js';
import { zCreatePokemonBody } from '../../../generated/zod.gen.js';
import { CreatePokemonCommand } from '../../application/commands/create-pokemon.command.js';
import { respond } from '../respond.js';

@Controller('pokemon')
export class CreatePokemonController implements Pick<
  PokedexControllerMethods,
  'createPokemon'
> {
  constructor(private readonly command: CreatePokemonCommand) {}

  @Post()
  async createPokemon(
    @Body({ schema: zCreatePokemonBody }) body: CreatePokemonData['body'],
  ) {
    return respond(await this.command.handle(body));
  }
}
