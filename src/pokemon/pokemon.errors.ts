import { ErrorFactory } from '@praha/error-factory';

export class PokemonNotFoundError extends ErrorFactory({
  name: 'PokemonNotFoundError',
  message: 'Pokemon not found',
}) {}
