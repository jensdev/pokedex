import { Controller, Get, Param } from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { GetPokemonByIdData } from '../../../generated/types.gen.js';
import { zGetPokemonByIdPath } from '../../../generated/zod.gen.js';
import { GetPokemonByIdQuery } from '../../application/queries/get-pokemon-by-id.query.js';
import { throwHttpException } from '../http-error.mapper.js';

@Controller('pokemon')
export class GetPokemonByIdController implements Pick<
  PokedexControllerMethods,
  'getPokemonById'
> {
  constructor(private readonly query: GetPokemonByIdQuery) {}

  @Get(':id')
  async getPokemonById(
    @Param({ schema: zGetPokemonByIdPath }) path: GetPokemonByIdData['path'],
  ) {
    const result = await this.query.get(path.id);

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, ({ error }) => throwHttpException(error))
      .exhaustive();
  }
}
