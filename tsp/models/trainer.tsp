import "@typespec/http";

using TypeSpec.Http;

namespace NestPokemon;

/** A Trainer who catches and battles Pokemon. */
model Trainer {
  /** The unique identifier of the Trainer. */
  @minValue(1)
  id: int32;

  /** The name of the Trainer. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** The list of Pokemon caught by the Trainer. */
  caughtPokemon: CapturedPokemon[];

  /** When this entry was added. */
  createdAt: utcDateTime;
}

/** A Pokemon that has been captured by a Trainer. */
model CapturedPokemon {
  /** The unique identifier of the capture. */
  @minValue(1)
  id: int32;

  /** National Pokedex number of the captured Pokemon. */
  @minValue(1)
  @maxValue(1025)
  pokemonId: int32;

  /** Nickname given to the Pokemon, if any. */
  @maxLength(100)
  nickname?: string;

  /** Level of the captured Pokemon. */
  @minValue(1)
  @maxValue(100)
  level: int32;

  /** When the Pokemon was captured. */
  capturedAt: utcDateTime;
}

/** Payload for creating a new Trainer. */
model CreateTrainerRequest {
  @minLength(1)
  @maxLength(100)
  name: string;
}

/** Payload for catching a new Pokemon. */
model CatchPokemonRequest {
  @minValue(1)
  @maxValue(1025)
  pokemonId: int32;

  @maxLength(100)
  nickname?: string;

  @minValue(1)
  @maxValue(100)
  level: int32;
}
