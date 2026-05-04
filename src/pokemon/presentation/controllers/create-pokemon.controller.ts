import {
  Body,
  Controller,
  Post,
  InternalServerErrorException,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { CreatePokemonData } from '../../../generated/types.gen.js';
import { zCreatePokemonBody } from '../../../generated/zod.gen.js';
import { ZodPipe } from '../../../zod.pipe.js';
import { CreatePokemonCommand } from '../../application/commands/create-pokemon.command.js';

@Controller('pokemon')
export class CreatePokemonController implements Pick<
  PokedexControllerMethods,
  'createPokemon'
> {
  constructor(private readonly command: CreatePokemonCommand) {}

  @Post()
  async createPokemon(
    @Body(new ZodPipe(zCreatePokemonBody)) body: CreatePokemonData['body'],
  ) {
    const result = await this.command.handle(body);

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new InternalServerErrorException();
      })
      .exhaustive();
  }
}
