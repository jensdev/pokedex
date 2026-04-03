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
export class PokemonController implements Pick<
  PokedexControllerMethods,
  | 'listPokemon'
  | 'createPokemon'
  | 'getPokemonById'
  | 'replacePokemon'
  | 'deletePokemon'
> {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  async listPokemon(@Query() query?: ListPokemonData['query']) {
    return await this.pokemonService.list(query);
  }

  @Post()
  async createPokemon(@Body() body: CreatePokemonData['body']) {
    return await this.pokemonService.create(body);
  }

  @Get(':id')
  async getPokemonById(@Param() path: GetPokemonByIdData['path']) {
    const pokemon = await this.pokemonService.getById(Number(path.id));

    if (!pokemon) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return pokemon;
  }

  @Put(':id')
  async replacePokemon(
    @Param() path: ReplacePokemonData['path'],
    @Body() body: ReplacePokemonData['body'],
  ) {
    const pokemon = await this.pokemonService.replace(Number(path.id), body);

    if (!pokemon) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }

    return pokemon;
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePokemon(@Param() path: DeletePokemonData['path']) {
    const deleted = await this.pokemonService.remove(Number(path.id));

    if (!deleted) {
      throw new NotFoundException(`Pokemon with id ${path.id} not found`);
    }
  }
}
