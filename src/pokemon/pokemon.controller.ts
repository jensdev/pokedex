import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type { PokedexControllerMethods } from '../generated/nestjs.gen';
import type {
  CreatePokemonData,
  DeletePokemonData,
  GetPokemonByIdData,
  ListPokemonData,
  ReplacePokemonData,
} from '../generated/types.gen';
import {
  zCreatePokemonBody,
  zDeletePokemonPath,
  zGetPokemonByIdPath,
  zListPokemonQuery,
  zReplacePokemonBody,
  zReplacePokemonPath,
} from '../generated/zod.gen';
import { ZodPipe } from '../zod.pipe';
import { PokemonService } from './pokemon.service';

@Controller('pokemon')
export class PokemonController implements PokedexControllerMethods {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  async listPokemon(
    @Query(new ZodPipe(zListPokemonQuery))
    query?: ListPokemonData['query'],
  ) {
    const result = await this.pokemonService.list(query);
    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, ({ error }) => {
        throw new InternalServerErrorException(error);
      })
      .exhaustive();
  }

  @Post()
  async createPokemon(
    @Body(new ZodPipe(zCreatePokemonBody)) body: CreatePokemonData['body'],
  ) {
    return await this.pokemonService.create(body);
  }

  @Get(':id')
  async getPokemonById(
    @Param(new ZodPipe(zGetPokemonByIdPath)) path: GetPokemonByIdData['path'],
  ) {
    const result = await this.pokemonService.getById(path.id);
    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with(
        { type: 'Failure', error: { name: 'PokemonNotFoundError' } },
        () => {
          throw new NotFoundException(`Pokemon with id ${path.id} not found`);
        },
      )
      .otherwise(({ error }) => {
        throw new InternalServerErrorException(error);
      });
  }

  @Put(':id')
  async replacePokemon(
    @Param(new ZodPipe(zReplacePokemonPath)) path: ReplacePokemonData['path'],
    @Body(new ZodPipe(zReplacePokemonBody)) body: ReplacePokemonData['body'],
  ) {
    const result = await this.pokemonService.replace(path.id, body);
    return match(result)
      .with({ type: 'Success' }, ({ value }) => value)
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Pokemon with id ${path.id} not found`);
      })
      .exhaustive();
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(
    @Param(new ZodPipe(zDeletePokemonPath)) path: DeletePokemonData['path'],
  ) {
    const result = await this.pokemonService.remove(path.id);
    match(result)
      .with({ type: 'Success' }, () => {})
      .with({ type: 'Failure' }, () => {
        throw new NotFoundException(`Pokemon with id ${path.id} not found`);
      })
      .exhaustive();
  }
}
