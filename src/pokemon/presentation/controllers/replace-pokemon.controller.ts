import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { ReplacePokemonData } from '../../../generated/types.gen.js';
import {
  zReplacePokemonBody,
  zReplacePokemonPath,
} from '../../../generated/zod.gen.js';
import { ReplacePokemonCommand } from '../../application/commands/replace-pokemon.command.js';

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
    const result = await this.command.handle(path.id, body);

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with(
        { type: 'Failure', error: { name: 'PokemonNotFoundError' } },
        () => {
          throw new NotFoundException(`Pokemon with id ${path.id} not found`);
        },
      )
      .with({ type: 'Failure' }, ({ error }) => {
        throw new BadRequestException(error.message);
      })
      .exhaustive();
  }
}
