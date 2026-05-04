import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace NestPokemon;

@tag("Trainer")
@route("/trainers")
interface TrainerController {
  /**
   * Register a new Trainer.
   */
  @post
  @summary("Create Trainer")
  @operationId("createTrainer")
  create(
    @body body: CreateTrainerRequest,
  ): CreatedResponse & Body<Trainer> | ApiError;

  /**
   * Get a Trainer by ID.
   */
  @get
  @route("/{id}")
  @summary("Get Trainer by ID")
  @operationId("getTrainerById")
  getById(
    @path id: int32,
  ): OkResponse & Body<Trainer> | NotFoundResponse | ApiError;

  /**
   * Catch a Pokemon for a specific Trainer.
   */
  @post
  @route("/{id}/catch")
  @summary("Catch Pokemon")
  @operationId("catchPokemon")
  catch(
    @path id: int32,
    @body body: CatchPokemonRequest,
  ): CreatedResponse & Body<CapturedPokemon> | NotFoundResponse | ApiError;
}
