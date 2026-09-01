import "@typespec/http";

using TypeSpec.Http;

namespace NestPokemon;

/** Standard error returned for all 4xx/5xx responses. */
@error
model ApiError {
  /** Machine-readable error code. */
  code: string;

  /** Human-readable error message. */
  message: string;

  /** Optional additional context about the error. */
  details?: Record<string>;
}

/**
 * `ApiError` with `code` pinned to the one value a given status uses.
 *
 * Not cosmetic. `HttpApiBuilder` encodes a handler's failure against a
 * `Schema.Union` of the endpoint's error members **in declaration order, first
 * match wins**. Three structurally identical `ApiError` members (400, 404, and
 * the `default` 500) would make every typed failure encode as the first one —
 * 400 — whatever the handler meant. Pinning `code` per status makes the members
 * disjoint, so the value selects its own status, and the generated literal type
 * makes a handler that picks the wrong one a compile error.
 *
 * The `default` 500 keeps the open `ApiError`: it is last in the union, so it
 * is the catch-all it reads as, and internal failures do not share one code.
 */
model CodedApiError<Code extends string> {
  /** Machine-readable error code. */
  code: Code;

  /** Human-readable error message. */
  message: string;

  /** Optional additional context about the error. */
  details?: Record<string>;
}

/**
 * A National Pokédex number, or a generated id.
 *
 * Deliberately uncapped (decision D2 in the hardening plan): entries created
 * through `POST /pokemon` get ids from `FIRST_GENERATED_ID = 1026` upwards, so
 * a `@maxValue(1025)` on the path parameter would make them unaddressable.
 */
@minValue(1)
scalar PokemonId extends int32;

/**
 * The 400 every operation answers when the request violates the contract.
 *
 * The body is served by the schema-error middleware in `src/http/ServerApi.ts`,
 * not by a handler — declaring it here is what makes contract, server, and
 * generated client agree on the shape.
 */
@doc("The request violates the contract.")
model BadRequestApiError {
  ...BadRequestResponse;
  ...Body<CodedApiError<"BAD_REQUEST">>;
}

/** The 404 the id-addressed operations answer. Carries an `ApiError` body. */
@doc("No Pokemon with this id exists.")
model NotFoundApiError {
  ...NotFoundResponse;
  ...Body<CodedApiError<"POKEMON_NOT_FOUND">>;
}

/** Paginated list wrapper used for collection endpoints. */
model PaginatedList<T> {
  /** The items on the current page. */
  items: T[];

  /** Total number of items across all pages. */
  total: int32;

  /** Zero-based page index. */
  page: int32;

  /** Number of items per page. */
  pageSize: int32;
}

/** Common query parameters for paginated collection endpoints. */
model PaginationParams {
  @query
  @doc("Zero-based page index. Defaults to 0.")
  @minValue(0)
  page?: int32 = 0;

  @query
  @doc("Number of items per page. Max 100.")
  @minValue(1)
  @maxValue(100)
  pageSize?: int32 = 20;
}
