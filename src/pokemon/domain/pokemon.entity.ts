import { R, Result } from '@praha/byethrow';
import { match } from 'ts-pattern';
import type {
  PokemonBaseStats,
  PokemonVariant,
  PokemonType,
  PokemonClassification,
} from '../../generated/types.gen.js';
import { InvalidPokemonAttributeError } from './pokemon.errors.js';
import {
  PokemonCreatedEvent,
  PokemonEvent,
  PokemonReplacedEvent,
} from './pokemon.events.js';
import { Stats, Height, Weight, PokemonId } from './value-objects.js';

/**
 * Mutable attributes shared by create and replace.
 *
 * `name` is deliberately a contract-validated primitive rather than a value
 * object: the generated schema already enforces its only rules (non-empty,
 * max length) and the domain attaches no behaviour to it. Value objects are
 * reserved for attributes that carry domain invariants of their own.
 */
export interface PokemonAttributes {
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: Stats;
  heightMetres: Height;
  weightKg: Weight;
  isObtainable: boolean;
  classification: PokemonClassification;
}

export interface CreatePokemonProps extends PokemonAttributes {
  id: PokemonId;
}

/** Classification-independent fields shared by every variant. */
interface PokemonCommonState {
  id: number;
  name: string;
  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: PokemonBaseStats;
  heightMetres: number;
  weightKg: number;
  isObtainable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timestamps are passed in (see the `Clock` port) rather than read from
 * `new Date()`, so the entity is a pure function of its inputs.
 */
export class Pokemon {
  /** Identity as a value object, constructed once at (re)hydration time. */
  readonly id: PokemonId;

  private constructor(
    private readonly state: Readonly<PokemonVariant>,
    private events: readonly PokemonEvent[] = [],
  ) {
    this.id = PokemonId.of(state.id);
  }

  /**
   * Drains the events recorded since this instance was constructed. Draining
   * (rather than reading) makes double-publishing impossible: the command
   * pulls exactly once, after persistence succeeds.
   */
  pullEvents(): readonly PokemonEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  static create(
    props: CreatePokemonProps,
    now: string,
  ): Result.Result<Pokemon, InvalidPokemonAttributeError> {
    return R.pipe(
      Pokemon.ensureDistinctTypes(props),
      R.map(
        () =>
          new Pokemon(
            Pokemon.withClassification(
              Pokemon.toCommonState(props, props.id, now, now),
              props.classification,
            ),
            [new PokemonCreatedEvent(props.id, props.name, now)],
          ),
      ),
    );
  }

  // Rehydrate from persistence
  static load(state: PokemonVariant): Pokemon {
    return new Pokemon(state);
  }

  /**
   * Fully replace this Pokemon's attributes, preserving its identity and
   * creation timestamp. Classification-specific fields (e.g. `legendaryGroup`)
   * are carried over when the classification is unchanged, otherwise reset to
   * sensible defaults.
   */
  replace(
    attributes: PokemonAttributes,
    now: string,
  ): Result.Result<Pokemon, InvalidPokemonAttributeError> {
    return R.pipe(
      Pokemon.ensureDistinctTypes(attributes),
      R.map(
        () =>
          new Pokemon(
            Pokemon.withClassification(
              Pokemon.toCommonState(
                attributes,
                this.state.id,
                this.state.createdAt,
                now,
              ),
              attributes.classification,
              this.state,
            ),
            [new PokemonReplacedEvent(this.id, attributes.name, now)],
          ),
      ),
    );
  }

  // Map back to the DTO for the repository/API response
  toDto(): PokemonVariant {
    return this.state;
  }

  /**
   * Relationship invariant — it spans two attributes, so it belongs to the
   * aggregate, not to a single value object. Field-level invariants (height,
   * weight, stats) are enforced by the value objects themselves.
   */
  private static ensureDistinctTypes(
    attributes: PokemonAttributes,
  ): Result.Result<void, InvalidPokemonAttributeError> {
    if (
      attributes.secondaryType !== undefined &&
      attributes.secondaryType === attributes.primaryType
    ) {
      return R.fail(
        new InvalidPokemonAttributeError({
          reason: 'Secondary type must differ from primary type.',
        }),
      );
    }
    return R.succeed();
  }

  private static toCommonState(
    attributes: PokemonAttributes,
    id: number,
    createdAt: string,
    updatedAt: string,
  ): PokemonCommonState {
    return {
      id,
      name: attributes.name,
      primaryType: attributes.primaryType,
      secondaryType: attributes.secondaryType,
      baseStats: attributes.baseStats.value,
      heightMetres: attributes.heightMetres.value,
      weightKg: attributes.weightKg.value,
      isObtainable: attributes.isObtainable,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Assemble the discriminated `PokemonVariant` for a classification. When a
   * `previous` variant of the same classification is supplied, its
   * classification-specific fields are carried over; otherwise defaults apply.
   */
  private static withClassification(
    base: PokemonCommonState,
    classification: PokemonClassification,
    previous?: Readonly<PokemonVariant>,
  ): PokemonVariant {
    return match(classification)
      .with('legendary', (value) => {
        const prev = previous?.classification === value ? previous : undefined;
        return {
          ...base,
          classification: value,
          legendaryGroup: prev?.legendaryGroup ?? 'Unknown',
          isBoxLegendary: prev?.isBoxLegendary ?? false,
          mascotForGames: prev?.mascotForGames,
        };
      })
      .with('mythical', (value) => {
        const prev = previous?.classification === value ? previous : undefined;
        return {
          ...base,
          classification: value,
          distributionMethod: prev?.distributionMethod ?? 'Unknown',
          isCurrentlyDistributed: prev?.isCurrentlyDistributed ?? false,
          loreDescription:
            prev?.loreDescription ?? 'A newly discovered Mythical Pokemon.',
        };
      })
      .with('normal', (value) => {
        const prev = previous?.classification === value ? previous : undefined;
        return {
          ...base,
          classification: value,
          encounterRate: prev?.encounterRate ?? 50,
          evolvesInto: prev?.evolvesInto,
        };
      })
      .exhaustive();
  }
}
