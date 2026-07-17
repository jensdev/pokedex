import { Inject, Injectable } from '@nestjs/common';
import { R, Result } from '@praha/byethrow';
import { CLOCK_TOKEN, type Clock } from '../../domain/clock.js';
import {
  EVENT_PUBLISHER_TOKEN,
  type IEventPublisher,
} from '../../domain/event-publisher.js';
import { PokemonNotFoundError } from '../../domain/pokemon.errors.js';
import { PokemonDeletedEvent } from '../../domain/pokemon.events.js';
import type { IPokemonRepository } from '../../domain/pokemon.repository.interface.js';
import { POKEMON_REPOSITORY_TOKEN } from '../../domain/pokemon.repository.interface.js';
import { PokemonId } from '../../domain/value-objects.js';

@Injectable()
export class DeletePokemonCommand {
  constructor(
    @Inject(POKEMON_REPOSITORY_TOKEN)
    private readonly repository: IPokemonRepository,
    @Inject(CLOCK_TOKEN)
    private readonly clock: Clock,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly publisher: IEventPublisher,
  ) {}

  handle(idValue: number): Result.ResultAsync<void, PokemonNotFoundError> {
    const id = PokemonId.of(idValue);

    // Absence handling lives in the port's type: `remove` fails with a typed
    // error, so there is no find-then-delete race and nothing to check here.
    // Deletion bypasses the aggregate, so the command raises the event itself
    // — on the success rail only, after removal happened.
    return R.pipe(
      this.repository.remove(id),
      R.andThrough(() => {
        this.publisher.publish([
          new PokemonDeletedEvent(id, this.clock.now()),
        ]);
        return R.succeed();
      }),
    );
  }
}
