import { Controller, Get, Query } from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../../generated/nestjs.gen.js';
import type { ListPokemonData } from '../../../generated/types.gen.js';
import { zListPokemonQuery } from '../../../generated/zod.gen.js';
import { ListPokemonsQuery } from '../../application/queries/list-pokemons.query.js';
import { throwHttpException } from '../http-error.mapper.js';

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
    const result = await this.query.get(query);

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, ({ error }) => throwHttpException(error))
      .exhaustive();
  }
}
