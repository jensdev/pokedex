import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { match, P } from 'ts-pattern';
import {
  InvalidPokemonAttributeError,
  InvalidPokemonAttributesError,
  PokemonDataParseError,
  PokemonError,
  PokemonNotFoundError,
} from '../domain/pokemon.errors.js';

/**
 * The presentation-layer error boundary: every expected domain failure is
 * mapped to its HTTP exception in one place. The match is exhaustive on the
 * domain's `PokemonError` union, so adding a domain error without deciding
 * its HTTP status is a compile error.
 */
export function throwHttpException(error: PokemonError): never {
  return match(error)
    .with(P.instanceOf(PokemonNotFoundError), ({ message }) => {
      throw new NotFoundException(message);
    })
    .with(P.instanceOf(InvalidPokemonAttributeError), ({ message }) => {
      throw new BadRequestException(message);
    })
    .with(P.instanceOf(InvalidPokemonAttributesError), ({ errors }) => {
      // One 400 listing every violated invariant, mirroring how the
      // validation pipe reports multiple schema violations.
      throw new BadRequestException(errors.map(({ message }) => message));
    })
    .with(P.instanceOf(PokemonDataParseError), ({ message }) => {
      throw new InternalServerErrorException(message);
    })
    .exhaustive();
}
