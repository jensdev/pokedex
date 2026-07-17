import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import type {
  PokemonVariant,
  UpdatePokemonRequest,
} from '../../../generated/types.gen.js';
import {
  InvalidPokemonAttributeError,
  InvalidPokemonAttributesError,
  PokemonNotFoundError,
} from '../../domain/pokemon.errors.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { CLOCK_TOKEN, type Clock } from '../../domain/clock.js';
import {
  EVENT_PUBLISHER_TOKEN,
  type IEventPublisher,
} from '../../domain/event-publisher.js';
import { PokemonId } from '../../domain/value-objects.js';
import { toPokemonAttributes } from '../pokemon-attributes.mapper.js';

@Injectable()
export class ReplacePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
    @Inject(CLOCK_TOKEN)
    private readonly clock: Clock,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly publisher: IEventPublisher,
  ) {}

  handle(
    idValue: number,
    body: UpdatePokemonRequest,
  ): Result.ResultAsync<
    PokemonVariant,
    | PokemonNotFoundError
    | InvalidPokemonAttributesError
    | InvalidPokemonAttributeError
  > {
    return R.pipe(
      R.do(),
      R.bind('existing', () =>
        this.repository.findById(PokemonId.of(idValue)),
      ),
      R.bind('attributes', () => toPokemonAttributes(body)),
      R.andThen(({ existing, attributes }) =>
        existing.replace(attributes, this.clock.now()),
      ),
      R.andThrough((updated) => this.repository.save(updated)),
      // Events go out only after persistence succeeded.
      R.andThrough((updated) => {
        this.publisher.publish(updated.pullEvents());
        return R.succeed();
      }),
      R.map((updated) => updated.toDto()),
    );
  }
}
