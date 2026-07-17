import { Controller, Get, Query } from '@nestjs/common';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { ListPokemonData } from '../../../generated/types.gen.js';
import { zListPokemonQuery } from '../../../generated/zod.gen.js';
import { ListPokemonsQuery } from '../../application/queries/list-pokemons.query.js';
import { respond } from '../respond.js';

@Controller('pokemon')
export class ListPokemonsController implements Pick<
  PokedexControllerMethods,
  'listPokemon'
> {
  constructor(private readonly query: ListPokemonsQuery) {}

  @Get()
  async listPokemon(
    @Query({ schema: zListPokemonQuery }) query?: ListPokemonData['query'],
  ) {
    return respond(await this.query.get(query));
  }
}
