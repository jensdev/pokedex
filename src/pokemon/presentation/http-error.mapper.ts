import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { match } from 'ts-pattern';
import type {
  InvalidPokemonAttributeError,
  PokemonDataParseError,
  PokemonNotFoundError,
} from '../domain/pokemon.errors.js';

type PokemonDomainError =
  | PokemonNotFoundError
  | InvalidPokemonAttributeError
  | PokemonDataParseError;

/**
 * The presentation-layer error boundary: every expected domain failure is
 * mapped to its HTTP exception in one place. The match is exhaustive on the
 * error union, so adding a domain error without deciding its HTTP status is
 * a compile error.
 */
export function throwHttpException(error: PokemonDomainError): never {
  return match(error)
    .with({ name: 'PokemonNotFoundError' }, ({ message }) => {
      throw new NotFoundException(message);
    })
    .with({ name: 'InvalidPokemonAttributeError' }, ({ message }) => {
      throw new BadRequestException(message);
    })
    .with({ name: 'PokemonDataParseError' }, ({ message }) => {
      throw new InternalServerErrorException(message);
    })
    .exhaustive();
}
