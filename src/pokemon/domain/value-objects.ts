import type { PokemonBaseStats } from '../../generated/types.gen.js';

export class InvalidStatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStatException';
  }
}

export class Stats {
  private constructor(public readonly value: PokemonBaseStats) {}

  static create(stats: PokemonBaseStats): Stats {
    if (
      stats.hp < 0 ||
      stats.attack < 0 ||
      stats.defense < 0 ||
      stats.specialAttack < 0 ||
      stats.specialDefense < 0 ||
      stats.speed < 0
    ) {
      throw new InvalidStatException('Stats cannot be negative.');
    }
    return new Stats(stats);
  }
}

export class InvalidMeasurementException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMeasurementException';
  }
}

export class Height {
  private constructor(public readonly value: number) {}

  static create(metres: number): Height {
    if (metres <= 0) {
      throw new InvalidMeasurementException(
        'Height must be greater than zero.',
      );
    }
    return new Height(metres);
  }
}

export class Weight {
  private constructor(public readonly value: number) {}

  static create(kg: number): Weight {
    if (kg <= 0) {
      throw new InvalidMeasurementException(
        'Weight must be greater than zero.',
      );
    }
    return new Weight(kg);
  }
}
