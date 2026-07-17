import { R, Result } from '@praha/byethrow';
import type { CreatePokemonRequest } from '../../generated/types.gen.js';
import { InvalidPokemonAttributesError } from '../domain/pokemon.errors.js';
import type { PokemonAttributes } from '../domain/pokemon.entity.js';
import { Height, Stats, Weight } from '../domain/value-objects.js';

/**
 * Builds validated domain attributes from a request body. Uses `R.collect`
 * (applicative validation) rather than a short-circuiting `R.bind` chain, so
 * every invalid attribute is reported in a single response instead of one
 * per round-trip.
 *
 * `UpdatePokemonRequest` spreads `CreatePokemonRequest` in TypeSpec, so one
 * signature serves both commands.
 */
export function toPokemonAttributes(
  body: CreatePokemonRequest,
): Result.Result<PokemonAttributes, InvalidPokemonAttributesError> {
  return R.pipe(
    R.collect({
      baseStats: Stats.create(body.baseStats),
      heightMetres: Height.create(body.heightMetres),
      weightKg: Weight.create(body.weightKg),
    }),
    R.mapError((errors) => new InvalidPokemonAttributesError({ errors })),
    R.map((valueObjects) => ({
      name: body.name,
      primaryType: body.primaryType,
      secondaryType: body.secondaryType,
      isObtainable: body.isObtainable,
      classification: body.classification,
      ...valueObjects,
    })),
  );
}
