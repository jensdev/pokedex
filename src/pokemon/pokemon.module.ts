import { Module } from '@nestjs/common';
import { CreatePokemonCommandHandler } from './commands/create-pokemon.command.js';
import { DeletePokemonCommandHandler } from './commands/delete-pokemon.command.js';
import { ReplacePokemonCommandHandler } from './commands/replace-pokemon.command.js';
import { PokemonRepository } from './pokemon.repository.js';
import {
  CreatePokemonRequest,
} from './requests/create-pokemon.request.js';
import {
  DeletePokemonRequest,
} from './requests/delete-pokemon.request.js';
import {
  GetPokemonByIdRequest,
} from './requests/get-pokemon-by-id.request.js';
import {
  ListPokemonsRequest,
} from './requests/list-pokemons.request.js';
import {
  ReplacePokemonRequest,
} from './requests/replace-pokemon.request.js';
import { GetPokemonByIdQueryHandler } from './queries/get-pokemon-by-id.query.js';
import { ListPokemonsQueryHandler } from './queries/list-pokemons.query.js';

@Module({
  controllers: [
    ListPokemonsRequest,
    GetPokemonByIdRequest,
    CreatePokemonRequest,
    ReplacePokemonRequest,
    DeletePokemonRequest,
  ],
  providers: [
    PokemonRepository,
    ListPokemonsQueryHandler,
    GetPokemonByIdQueryHandler,
    CreatePokemonCommandHandler,
    ReplacePokemonCommandHandler,
    DeletePokemonCommandHandler,
  ],
})
export class PokemonModule {}
