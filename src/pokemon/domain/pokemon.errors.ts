import { ErrorFactory } from '@praha/error-factory';

export class PokemonNotFoundError extends ErrorFactory({
  name: 'PokemonNotFoundError',
  message: 'Pokemon not found',
}) {}

export class PokemonDataParseError extends ErrorFactory({
  name: 'PokemonDataParseError',
  message: 'Pokemon data from source failed to parse',
}) {}
