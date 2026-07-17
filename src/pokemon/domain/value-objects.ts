import { R, Result } from '@praha/byethrow';
import * as z from 'zod';
import type { PokemonBaseStats } from '../../generated/types.gen.js';
import { InvalidPokemonAttributeError } from './pokemon.errors.js';

export class Stats {
  private constructor(public readonly value: PokemonBaseStats) {}

  static create(
    stats: PokemonBaseStats,
  ): Result.Result<Stats, InvalidPokemonAttributeError> {
    if (
      stats.hp < 0 ||
      stats.attack < 0 ||
      stats.defense < 0 ||
      stats.specialAttack < 0 ||
      stats.specialDefense < 0 ||
      stats.speed < 0
    ) {
      return R.fail(
        new InvalidPokemonAttributeError({
          reason: 'Stats cannot be negative.',
        }),
      );
    }
    return R.succeed(new Stats(stats));
  }
}

export class Height {
  private constructor(public readonly value: number) {}

  static create(
    metres: number,
  ): Result.Result<Height, InvalidPokemonAttributeError> {
    if (metres <= 0) {
      return R.fail(
        new InvalidPokemonAttributeError({
          reason: 'Height must be greater than zero.',
        }),
      );
    }
    return R.succeed(new Height(metres));
  }
}

export class Weight {
  private constructor(public readonly value: number) {}

  static create(
    kg: number,
  ): Result.Result<Weight, InvalidPokemonAttributeError> {
    if (kg <= 0) {
      return R.fail(
        new InvalidPokemonAttributeError({
          reason: 'Weight must be greater than zero.',
        }),
      );
    }
    return R.succeed(new Weight(kg));
  }
}

/**
 * `PokemonId` is a branded primitive, not a class: it carries a constraint
 * but no behaviour, so a zod brand gives nominal typing (a raw `number` is
 * not assignable to `PokemonId`) with zero runtime wrapper — ids keep
 * primitive ergonomics (`===`, arithmetic, JSON). Class value objects like
 * `Stats` above are reserved for attributes that combine a constraint with
 * behaviour. The schema is domain-owned: the contract's Pokedex cap
 * (1..1025) stays a boundary concern.
 */
const PokemonIdSchema = z.number().int().positive().brand<'PokemonId'>();

export type PokemonId = z.infer<typeof PokemonIdSchema>;

export const PokemonId = {
  /**
   * Identity invariant, not an expected business failure: `id` always
   * originates from a Zod-validated path param (`gte(1)`) or the repository's
   * own counter, so a non-positive value here signals a programming error.
   * It therefore throws (a defect) rather than returning a `Result`.
   */
  of: (value: number): PokemonId => PokemonIdSchema.parse(value),
};
