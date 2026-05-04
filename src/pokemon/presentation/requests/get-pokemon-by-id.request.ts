import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { GetPokemonByIdData } from '../../../generated/types.gen.js';
import { zGetPokemonByIdPath } from '../../../generated/zod.gen.js';
import { ZodPipe } from '../../../zod.pipe.js';
import { GetPokemonByIdQuery } from '../../application/queries/get-pokemon-by-id.query.js';

@Controller('pokemon')
export class GetPokemonByIdRequest implements Pick<
  PokedexControllerMethods,
  'getPokemonById'
> {
  constructor(private readonly query: GetPokemonByIdQuery) {}

  @Get(':id')
  async getPokemonById(
    @Param(new ZodPipe(zGetPokemonByIdPath)) path: GetPokemonByIdData['path'],
  ) {
    const result = await this.query.get(path.id);

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Pokemon with id ${path.id} not found`);
      })
      .exhaustive();
  }
}
