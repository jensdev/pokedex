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
