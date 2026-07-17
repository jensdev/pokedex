import { Injectable, Logger } from '@nestjs/common';
import { match, P } from 'ts-pattern';
import { IEventPublisher } from '../domain/event-publisher.js';
import {
  PokemonCreatedEvent,
  PokemonDeletedEvent,
  PokemonEvent,
  PokemonReplacedEvent,
} from '../domain/pokemon.events.js';

/**
 * Audit-log subscriber, decoupled from the commands that raise the events:
 * swapping this adapter (or adding a message-broker one) requires no change
 * to domain or application code. The match is exhaustive on `PokemonEvent`,
 * so adding an event without deciding its audit representation is a compile
 * error — the same guarantee the HTTP error mapper gives for failures.
 */
@Injectable()
export class AuditLogEventPublisher implements IEventPublisher {
  private readonly logger = new Logger('PokemonAudit');

  publish(events: readonly PokemonEvent[]): void {
    for (const event of events) {
      this.logger.log(
        match(event)
          .with(
            P.instanceOf(PokemonCreatedEvent),
            ({ id, pokemonName, occurredAt }) =>
              `created #${id} "${pokemonName}" at ${occurredAt}`,
          )
          .with(
            P.instanceOf(PokemonReplacedEvent),
            ({ id, pokemonName, occurredAt }) =>
              `replaced #${id} "${pokemonName}" at ${occurredAt}`,
          )
          .with(
            P.instanceOf(PokemonDeletedEvent),
            ({ id, occurredAt }) => `deleted #${id} at ${occurredAt}`,
          )
          .exhaustive(),
      );
    }
  }
}
