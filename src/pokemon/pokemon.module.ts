import { Module } from '@nestjs/common';
import { CreatePokemonCommand } from './application/commands/create-pokemon.command.js';
import { DeletePokemonCommand } from './application/commands/delete-pokemon.command.js';
import { ReplacePokemonCommand } from './application/commands/replace-pokemon.command.js';
import { PokemonRepository } from './infrastructure/persistence/pokemon.repository.js';
import { POKEMON_REPOSITORY_TOKEN } from './domain/pokemon.repository.interface.js';
import { CreatePokemonRequest } from './presentation/requests/create-pokemon.request.js';
import { DeletePokemonRequest } from './presentation/requests/delete-pokemon.request.js';
import { GetPokemonByIdRequest } from './presentation/requests/get-pokemon-by-id.request.js';
import { ListPokemonsRequest } from './presentation/requests/list-pokemons.request.js';
import { ReplacePokemonRequest } from './presentation/requests/replace-pokemon.request.js';
import { GetPokemonByIdQuery } from './application/queries/get-pokemon-by-id.query.js';
import { ListPokemonsQuery } from './application/queries/list-pokemons.query.js';

@Module({
  controllers: [
    ListPokemonsRequest,
    GetPokemonByIdRequest,
    CreatePokemonRequest,
    ReplacePokemonRequest,
    DeletePokemonRequest,
  ],
  providers: [
    {
      provide: POKEMON_REPOSITORY_TOKEN,
      useClass: PokemonRepository,
    },
    ListPokemonsQuery,
    GetPokemonByIdQuery,
    CreatePokemonCommand,
    ReplacePokemonCommand,
    DeletePokemonCommand,
  ],
})
export class PokemonModule {}
