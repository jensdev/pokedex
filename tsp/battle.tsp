import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace NestPokemon;

@tag("Battle")
@route("/battles")
interface BattleController {
  /**
   * Start a new battle between two trainers.
   */
  @post
  @summary("Start Battle")
  @operationId("startBattle")
  start(
    @body body: StartBattleRequest,
  ): CreatedResponse & Body<BattleStatus> | ApiError;

  /**
   * Perform a move in an ongoing battle.
   */
  @post
  @route("/{id}/move")
  @summary("Perform Move")
  @operationId("performMove")
  performMove(
    @path id: string,
    @body body: PerformMoveRequest,
  ): OkResponse & Body<BattleStatus> | NotFoundResponse | ApiError;

  /**
   * Get the current status and history of a battle.
   */
  @get
  @route("/{id}")
  @summary("Get Battle Status")
  @operationId("getBattleById")
  getById(
    @path id: string,
  ): OkResponse & Body<BattleStatus> | NotFoundResponse | ApiError;
}

model StartBattleRequest {
  trainer1Id: string;
  trainer1PokemonId: int32;
  trainer2Id: string;
  trainer2PokemonId: int32;
}

model PerformMoveRequest {
  trainerId: string;
  moveName: string;
}

model BattleStatus {
  id: string;
  status: "ongoing" | "finished";
  winnerId?: string;
  turn: int32;
  activeTrainerId: string;
  pokemon: BattlePokemon[];
  history: BattleEvent[];
}

model BattlePokemon {
  trainerId: string;
  pokemonId: int32;
  name: string;
  maxHp: int32;
  currentHp: int32;
}

@discriminator("type")
model BattleEvent {
  type: string;
  timestamp: string;
}

model BattleStartedEvent extends BattleEvent {
  type: "BattleStarted";
  battleId: string;
  trainer1: BattleParticipant;
  trainer2: BattleParticipant;
}

model MovePerformedEvent extends BattleEvent {
  type: "MovePerformed";
  trainerId: string;
  moveName: string;
  damageDealt: int32;
  targetId: string;
  isCritical: boolean;
}

model BattleFinishedEvent extends BattleEvent {
  type: "BattleFinished";
  winnerId: string;
}

model BattleParticipant {
  trainerId: string;
  pokemon: BattlePokemon;
}
