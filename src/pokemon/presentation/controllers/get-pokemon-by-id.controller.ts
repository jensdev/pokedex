import { Controller, Get, Param } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { GetPokemonByIdData } from '../../../generated/types.gen.js';
import { zGetPokemonByIdPath } from '../../../generated/zod.gen.js';
import { GetPokemonByIdQuery } from '../../application/queries/get-pokemon-by-id.query.js';
import { respond } from '../respond.js';

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
    return respond(await this.query.get(path.id));
  }
}
