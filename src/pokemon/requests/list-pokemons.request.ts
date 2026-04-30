import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../../generated/nestjs.gen.js';
import type { ListPokemonData } from '../../generated/types.gen.js';
import { zListPokemonQuery } from '../../generated/zod.gen.js';
import { ZodPipe } from '../../zod.pipe.js';
import {
  ListPokemonsQuery,
  ListPokemonsQueryHandler,
} from '../queries/list-pokemons.query.js';

@Controller('pokemon')
export class ListPokemonsRequest
  implements Pick<PokedexControllerMethods, 'listPokemon'>
{
  constructor(private readonly handler: ListPokemonsQueryHandler) {}

  @Get()
  async listPokemon(
    @Query(new ZodPipe(zListPokemonQuery)) query?: ListPokemonData['query'],
  ) {
    const result = await this.handler.execute(new ListPokemonsQuery(query));

    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, ({ error }) => {
        throw new InternalServerErrorException(error);
      })
      .exhaustive();
  }
}
