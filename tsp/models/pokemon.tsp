import "@typespec/http";

using TypeSpec.Http;

namespace NestPokemon;

/** Pokemon classification used when creating or filtering Pokemon. */
enum PokemonClassification {
  Normal: "normal",
  Legendary: "legendary",
  Mythical: "mythical",
}

/** Pokemon elemental type. */
enum PokemonType {
  Bug: "bug",
  Dark: "dark",
  Dragon: "dragon",
  Electric: "electric",
  Fairy: "fairy",
  Fighting: "fighting",
  Fire: "fire",
  Flying: "flying",
  Ghost: "ghost",
  Grass: "grass",
  Ground: "ground",
  Ice: "ice",
  Normal: "normal",
  Poison: "poison",
  Psychic: "psychic",
  Rock: "rock",
  Steel: "steel",
  Water: "water",
}

/** Six base stats shared by every Pokemon. */
model PokemonBaseStats {
  @minValue(0)
  hp: int32;

  @minValue(0)
  attack: int32;

  @minValue(0)
  defense: int32;

  @minValue(0)
  specialAttack: int32;

  @minValue(0)
  specialDefense: int32;

  @minValue(0)
  speed: int32;
}

/**
 * Shared Pokemon fields, composed into each concrete classification with
 * spread (`...PokemonBase`). Deliberately **not** a base type to inherit from:
 * `extends` emits `allOf` in OpenAPI, which the Effect schema generator
 * collapses to `Schema.Never`. See docs/migration/03-toolchain.md.
 *
 * The `classification` discriminator lives on each variant, narrowed to a
 * string literal.
 */
model PokemonBase {
  // The surrogate key. Uncapped here *and* on the `GET /pokemon/{id}` path
  // parameter, so a created entry stays addressable — see `PokemonId` in
  // models/common.tsp.
  /** Identifies this entry. Unique; allocated by the server on create. */
  id: PokemonId;

  /**
   * National Pokedex number, when this entry is a real Pokemon. Absent for
   * entries invented through `POST /pokemon`.
   */
  nationalDexNumber?: NationalDexNumber;

  /** Species name in lowercase (e.g. "bulbasaur"). */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Primary elemental type. */
  primaryType: PokemonType;

  /** Secondary elemental type, if any. */
  secondaryType?: PokemonType;

  /** Base stat block. */
  baseStats: PokemonBaseStats;

  /** Height in metres. */
  @minValue(0)
  heightMetres: float32;

  /** Weight in kilograms. */
  @minValue(0)
  weightKg: float32;

  /** Whether this Pokemon appears in the wild in main series games. */
  isObtainable: boolean;

  /** When this entry was added to the Pokedex. */
  createdAt: utcDateTime;

  /** When this entry was last updated. */
  updatedAt: utcDateTime;
}

/** A regular, catchable Pokemon with no special legendary status. */
model NormalPokemon {
  ...PokemonBase;

  /** Discriminator — fixes this variant's classification. */
  classification: "normal";

  /** Encounter rate in the wild (0–100). */
  @minValue(0)
  @maxValue(100)
  encounterRate: float32;

  /** National Pokedex IDs of the Pokemon this one can evolve into, if any. */
  evolvesInto?: int32[];
}

/**
 * A Legendary Pokemon — extremely rare, part of a legendary group,
 * cannot be bred.
 */
model LegendaryPokemon {
  ...PokemonBase;

  /** Discriminator — fixes this variant's classification. */
  classification: "legendary";

  /** Name of the legendary group or trio (e.g. "Legendary Birds"). */
  legendaryGroup: string;

  /** Whether this Pokemon is the box mascot of a main series game. */
  isBoxLegendary: boolean;

  /** Game titles for which this Pokemon is the primary mascot, if any. */
  mascotForGames?: string[];
}

/**
 * A Mythical Pokemon — event-only distribution, outside the normal story,
 * typically cannot be caught in the wild.
 */
model MythicalPokemon {
  ...PokemonBase;

  /** Discriminator — fixes this variant's classification. */
  classification: "mythical";

  /** How this Pokemon is distributed (e.g. "Mystery Gift", "in-game event"). */
  distributionMethod: string;

  /** Whether an active distribution is currently running. */
  isCurrentlyDistributed: boolean;

  /** In-lore description of this Pokemon's mythical origin. */
  loreDescription: string;
}

/**
 * Discriminated union of all concrete Pokemon classifications.
 * Used as the return type for Pokedex operations — emits an `anyOf` of the
 * three self-contained variant schemas, discriminated on `classification`.
 */
union PokemonVariant {
  normal: NormalPokemon,
  legendary: LegendaryPokemon,
  mythical: MythicalPokemon,
}

/** Payload for creating a new Pokemon entry. */
model CreatePokemonRequest {
  /**
   * National Pokedex number, if this is a real Pokemon. Omit it for an
   * invented one — the server never derives it from `id`.
   */
  nationalDexNumber?: NationalDexNumber;

  @minLength(1)
  @maxLength(100)
  name: string;

  primaryType: PokemonType;
  secondaryType?: PokemonType;
  baseStats: PokemonBaseStats;

  @minValue(0)
  heightMetres: float32;

  @minValue(0)
  weightKg: float32;

  isObtainable: boolean;
  classification: PokemonClassification;
}

/** Payload for fully replacing an existing Pokemon entry. */
model UpdatePokemonRequest {
  ...CreatePokemonRequest;
}
