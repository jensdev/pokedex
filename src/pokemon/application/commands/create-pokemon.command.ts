import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  CreatePokemonRequest,
  PokemonVariant,
} from '../../../generated/types.gen.js';
import { CLOCK_TOKEN, type Clock } from '../../domain/clock.js';
import {
  EVENT_PUBLISHER_TOKEN,
  type IEventPublisher,
} from '../../domain/event-publisher.js';
import {
  InvalidPokemonAttributeError,
  InvalidPokemonAttributesError,
} from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { Pokemon } from '../../domain/pokemon.entity.js';
import { toPokemonAttributes } from '../pokemon-attributes.mapper.js';

@Injectable()
export class CreatePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
    @Inject(CLOCK_TOKEN)
    private readonly clock: Clock,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly publisher: IEventPublisher,
  ) {}

  handle(
    body: CreatePokemonRequest,
  ): Result.ResultAsync<
    PokemonVariant,
    InvalidPokemonAttributesError | InvalidPokemonAttributeError
  > {
    return R.pipe(
      R.do(),
      R.bind('attributes', () => toPokemonAttributes(body)),
      R.bind('id', () => this.repository.nextId()),
      R.andThen(({ id, attributes }) =>
        Pokemon.create({ id, ...attributes }, this.clock.now()),
      ),
      R.andThrough((pokemon) => this.repository.save(pokemon)),
      // Events go out only after persistence succeeded.
      R.andThrough((pokemon) => {
        this.publisher.publish(pokemon.pullEvents());
        return R.succeed();
      }),
      R.map((pokemon) => pokemon.toDto()),
    );
  }
}
