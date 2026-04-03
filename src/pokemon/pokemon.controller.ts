import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { R } from '@praha/byethrow';
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
    return R.unwrap(await this.pokemonService.list(query));
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

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return R.unwrap(result);
  }

  @Put(':id')
  async replacePokemon(
    @Param(new ZodPipe(zReplacePokemonPath)) path: ReplacePokemonData['path'],
    @Body(new ZodPipe(zReplacePokemonBody)) body: ReplacePokemonData['body'],
  ) {
    const result = await this.pokemonService.replace(path.id, body);

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return R.unwrap(result);
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(
    @Param(new ZodPipe(zDeletePokemonPath)) path: DeletePokemonData['path'],
  ) {
    const result = await this.pokemonService.remove(path.id);

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }
  }
}
