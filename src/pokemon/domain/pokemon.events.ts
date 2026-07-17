import type { PokemonId } from './value-objects.js';

/**
 * Domain events: facts the aggregate records about its own state changes.
 * `occurredAt` comes from the `now` the entity already receives (see the
 * `Clock` port), so recording an event stays pure. Each event carries a
 * literal `name` discriminant — TypeScript types structurally, so without it
 * the identically-shaped event classes would be indistinguishable to the
 * exhaustiveness checker.
 */
export class PokemonCreatedEvent {
  readonly name = 'PokemonCreatedEvent';
  constructor(
    readonly id: PokemonId,
    readonly pokemonName: string,
    readonly occurredAt: string,
  ) {}
}

export class PokemonReplacedEvent {
  readonly name = 'PokemonReplacedEvent';
  constructor(
    readonly id: PokemonId,
    readonly pokemonName: string,
    readonly occurredAt: string,
  ) {}
}

/**
 * Deletion bypasses the aggregate (the repository removes by id), so this
 * event is raised by the delete command rather than recorded by the entity.
 */
export class PokemonDeletedEvent {
  readonly name = 'PokemonDeletedEvent';
  constructor(
    readonly id: PokemonId,
    readonly occurredAt: string,
  ) {}
}

export type PokemonEvent =
  | PokemonCreatedEvent
  | PokemonReplacedEvent
  | PokemonDeletedEvent;
