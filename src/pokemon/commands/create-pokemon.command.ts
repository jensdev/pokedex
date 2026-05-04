import { Injectable } from '@nestjs/common';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../generated/types.gen.js';
import { PokemonRepository } from '../pokemon.repository.js';
import { Pokemon } from '../domain/pokemon.entity.js';
import { Height, Stats, Weight } from '../domain/value-objects.js';

@Injectable()
export class CreatePokemonCommand {
  constructor(private readonly repository: PokemonRepository) {}

  async handle(body: CreatePokemonRequest): Promise<PokemonVariant> {
    const stats = Stats.create(body.baseStats);
    const height = Height.create(body.heightMetres);
    const weight = Weight.create(body.weightKg);

    const pokemonEntity = Pokemon.create({
      id: this.repository.nextId(),
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      baseStats: stats,
      heightMetres: height,
      weightKg: weight,
      isObtainable: body.isObtainable,
      classification: body.classification,
    });

    const pokemonDto = pokemonEntity.toDto();
    this.repository.create(pokemonDto);

    return Promise.resolve(pokemonDto);
  }
}
