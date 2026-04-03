import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace NestPokemon;

/** Additional query parameters for listing Pokemon. */
model ListPokemonParams {
  @query
  @doc("Filter by classification.")
  classification?: PokemonClassification;

  @query
  @doc("Filter by primary or secondary type.")
  type?: PokemonType;

  @query
  @doc("Search by partial name (case-insensitive).")
  @maxLength(100)
  search?: string;

  @query
  @doc("Field to sort by.")
  sortBy?: "id" | "name" | "createdAt";

  @query
  @doc("Sort direction.")
  sortOrder?: "asc" | "desc";
}

@tag("Pokedex")
@route("/pokemon")
interface PokedexController {
  /**
   * List all Pokemon with optional filtering and pagination.
   */
  @get
  @summary("List Pokemon")
  @operationId("listPokemon")
  list(
    ...PaginationParams,
    ...ListPokemonParams,
  ): OkResponse & Body<PaginatedList<PokemonVariant>> | ApiError;

  /**
   * Get a single Pokemon by its national Pokedex number.
   *
   * The response body is a discriminated union — the shape depends on the
   * `classification` field: `"normal"`, `"legendary"`, or `"mythical"`.
   */
  @get
  @route("/{id}")
  @summary("Get Pokemon by ID")
  @operationId("getPokemonById")
  getById(
    @path
    @doc("National Pokedex number.")
    @minValue(1)
    @maxValue(1025)
    id: int32,
  ): OkResponse & Body<PokemonVariant> | NotFoundResponse | ApiError;

  /**
   * Add a new Pokemon entry to the Pokedex.
   */
  @post
  @summary("Create Pokemon")
  @operationId("createPokemon")
  create(
    @body body: CreatePokemonRequest,
  ): CreatedResponse & Body<PokemonVariant> | ApiError;

  /**
   * Fully replace an existing Pokemon entry.
   */
  @put
  @route("/{id}")
  @summary("Replace Pokemon")
  @operationId("replacePokemon")
  replace(
    @path id: int32,
    @body body: UpdatePokemonRequest,
  ): OkResponse & Body<PokemonVariant> | NotFoundResponse | ApiError;

  /**
   * Remove a Pokemon entry from the Pokedex.
   */
  @delete
  @route("/{id}")
  @summary("Delete Pokemon")
  @operationId("deletePokemon")
  remove(
    @path id: int32,
  ): NoContentResponse | NotFoundResponse | ApiError;
}
