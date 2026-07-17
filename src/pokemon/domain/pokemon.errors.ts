import { ErrorFactory } from '@praha/error-factory';

export class PokemonNotFoundError extends ErrorFactory({
  name: 'PokemonNotFoundError',
  message: ({ id }) => `Pokemon with id ${id} not found`,
  fields: ErrorFactory.fields<{ id: number }>(),
}) {}

export class PokemonDataParseError extends ErrorFactory({
  name: 'PokemonDataParseError',
  message: 'Pokemon data from source failed to parse',
}) {}

export class InvalidPokemonAttributeError extends ErrorFactory({
  name: 'InvalidPokemonAttributeError',
  message: ({ reason }) => reason,
  fields: ErrorFactory.fields<{ reason: string }>(),
}) {}

/**
 * Aggregate of every attribute violation in a request, so a client learns
 * about all of them in one round-trip instead of one per attempt.
 */
export class InvalidPokemonAttributesError extends ErrorFactory({
  name: 'InvalidPokemonAttributesError',
  message: ({ errors }) => errors.map(({ message }) => message).join(' '),
  fields: ErrorFactory.fields<{ errors: InvalidPokemonAttributeError[] }>(),
}) {}

/**
 * Every failure the Pokemon domain can surface across a layer boundary. The
 * presentation layer matches exhaustively on this union, so adding an error
 * here without deciding its HTTP mapping is a compile error.
 */
export type PokemonError =
  | PokemonNotFoundError
  | PokemonDataParseError
  | InvalidPokemonAttributeError
  | InvalidPokemonAttributesError;
