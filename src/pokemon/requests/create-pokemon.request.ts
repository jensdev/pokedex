import { Body, Controller, Post } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../generated/nestjs.gen.js';
import type { CreatePokemonData } from '../../generated/types.gen.js';
import { zCreatePokemonBody } from '../../generated/zod.gen.js';
import { ZodPipe } from '../../zod.pipe.js';
import {
  CreatePokemonCommand,
  CreatePokemonCommandHandler,
} from '../commands/create-pokemon.command.js';

@Controller('pokemon')
export class CreatePokemonRequest
  implements Pick<PokedexControllerMethods, 'createPokemon'>
{
  constructor(private readonly handler: CreatePokemonCommandHandler) {}

  @Post()
  async createPokemon(
    @Body(new ZodPipe(zCreatePokemonBody)) body: CreatePokemonData['body'],
  ) {
    return await this.handler.execute(new CreatePokemonCommand(body));
  }
}
