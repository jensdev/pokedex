import type { PokemonEvent } from './pokemon.events.js';

export const EVENT_PUBLISHER_TOKEN = Symbol('EVENT_PUBLISHER_TOKEN');

/**
 * Domain port for publishing recorded events after persistence succeeds.
 * Commands publish; they never know who is listening — subscribers (audit
 * log, cache invalidation, webhooks, ...) live behind the adapter.
 */
export interface IEventPublisher {
  publish(events: readonly PokemonEvent[]): void;
}
