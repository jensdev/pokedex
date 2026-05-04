import { Module } from '@nestjs/common';
import { CreatePokemonCommand } from './application/commands/create-pokemon.command.js';
import { DeletePokemonCommand } from './application/commands/delete-pokemon.command.js';
import { ReplacePokemonCommand } from './application/commands/replace-pokemon.command.js';
import { PokemonRepository } from './infrastructure/persistence/pokemon.repository.js';
import { POKEMON_REPOSITORY_TOKEN } from './domain/pokemon.repository.interface.js';
import { CreatePokemonController } from './presentation/controllers/create-pokemon.controller.js';
import { DeletePokemonController } from './presentation/controllers/delete-pokemon.controller.js';
import { GetPokemonByIdController } from './presentation/controllers/get-pokemon-by-id.controller.js';
import { ListPokemonsController } from './presentation/controllers/list-pokemons.controller.js';
import { ReplacePokemonController } from './presentation/controllers/replace-pokemon.controller.js';
import { GetPokemonByIdQuery } from './application/queries/get-pokemon-by-id.query.js';
import { ListPokemonsQuery } from './application/queries/list-pokemons.query.js';

@Module({
  controllers: [
    ListPokemonsController,
    GetPokemonByIdController,
    CreatePokemonController,
    ReplacePokemonController,
    DeletePokemonController,
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
