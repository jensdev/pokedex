import { R, Result } from '@praha/byethrow';
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
 * Identity invariant, not an expected business failure: `id` always originates
 * from a Zod-validated path param (`gte(1)`) or the repository's own counter,
 * so a non-positive value here signals a programming error. It therefore throws
 * rather than returning a `Result`.
 */
export class PokemonId {
  private constructor(public readonly value: number) {}

  static create(id: number): PokemonId {
    if (id <= 0) {
      throw new Error('Pokemon ID must be greater than zero.');
    }
    return new PokemonId(id);
  }

  equals(other: PokemonId): boolean {
    return this.value === other.value;
  }
}
