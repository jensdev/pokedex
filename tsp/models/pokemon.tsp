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
  hp: int32;
  attack: int32;
  defense: int32;
  specialAttack: int32;
  specialDefense: int32;
  speed: int32;
}

/**
 * Base Pokemon model. The `classification` property is the discriminator —
 * concrete sub-types narrow it to a string literal.
 */
@discriminator("classification")
model Pokemon {
  /** National Pokedex number (e.g. 1 for Bulbasaur). */
  @minValue(1)
  @maxValue(1025)
  id: int32;

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

  /** Discriminator property — narrows to a string literal in each sub-type. */
  classification: string;
}

/** A regular, catchable Pokemon with no special legendary status. */
model NormalPokemon extends Pokemon {
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
model LegendaryPokemon extends Pokemon {
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
model MythicalPokemon extends Pokemon {
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
 * Used as the return type for Pokedex operations — results in a
 * `oneOf` with `discriminator.mapping` in the generated OpenAPI schema.
 */
union PokemonVariant {
  normal: NormalPokemon,
  legendary: LegendaryPokemon,
  mythical: MythicalPokemon,
}

/** Payload for creating a new Pokemon entry. */
model CreatePokemonRequest {
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
