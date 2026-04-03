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
import type { PokedexControllerMethods } from '../generated/nestjs.gen.js';
import type {
  CreatePokemonData,
  DeletePokemonData,
  GetPokemonByIdData,
  ListPokemonData,
  ReplacePokemonData,
} from '../generated/types.gen.js';
import { PokemonService } from './pokemon.service';

@Controller('pokemon')
export class PokemonController implements PokedexControllerMethods {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  async listPokemon(@Query() query?: ListPokemonData['query']) {
    return R.unwrap(await this.pokemonService.list(query));
  }

  @Post()
  async createPokemon(@Body() body: CreatePokemonData['body']) {
    return await this.pokemonService.create(body);
  }

  @Get(':id')
  async getPokemonById(@Param() path: GetPokemonByIdData['path']) {
    const result = await this.pokemonService.getById(Number(path.id));

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return R.unwrap(result);
  }

  @Put(':id')
  async replacePokemon(
    @Param() path: ReplacePokemonData['path'],
    @Body() body: ReplacePokemonData['body'],
  ) {
    const result = await this.pokemonService.replace(Number(path.id), body);

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return R.unwrap(result);
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(@Param() path: DeletePokemonData['path']) {
    const result = await this.pokemonService.remove(Number(path.id));

    if (R.isFailure(result)) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }
  }
}
