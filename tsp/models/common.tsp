import "@typespec/http";

using TypeSpec.Http;

namespace NestPokemon;

// Deliberately has no open `details` bag. It carried `Record<string>`, which
// TypeSpec emits as a model indexer — `additionalProperties` in OpenAPI 3.0 but
// `unevaluatedProperties` in 3.1+, a keyword `effect`'s JSON Schema reader
// rejects outright (`Unsupported JSON Schema keyword`). That single optional
// field, which no handler ever populated, was the only thing keeping this
// contract on 3.0. If structured error context is wanted later, give it a
// model with named fields rather than an indexer.
/** Standard error returned for all 4xx/5xx responses. */
@error
model ApiError {
  /** Machine-readable error code. */
  code: string;

  /** Human-readable error message. */
  message: string;
}

// `ApiError` with `code` pinned to the one value a given status uses.
//
// Not cosmetic, and not a doc comment: `@doc` text is emitted into the OpenAPI
// document, and this is a note to implementers, not to consumers.
//
// `HttpApiBuilder` encodes a handler's failure against a `Schema.Union` of the
// endpoint's error members in declaration order, first match wins. Three
// structurally identical `ApiError` members — 400, 404, and the `default` 500 —
// would make every typed failure encode as the first one, 400, whatever the
// handler meant. Pinning `code` per status makes the members disjoint, so the
// value selects its own status, and the generated literal type makes a handler
// that picks the wrong one a compile error.
//
// The `default` 500 keeps the open `ApiError`: it is last in the union, so it
// is the catch-all it reads as, and internal failures do not share one code.
/** An `ApiError` whose `code` is fixed to the one this status uses. */
model CodedApiError<Code extends string> {
  /** Machine-readable error code. */
  code: Code;

  /** Human-readable error message. */
  message: string;
}

// The id is a surrogate key and is deliberately uncapped (decision D2): it
// identifies a row in *this* Pokédex, not a Pokémon in the National Pokédex.
// Entries created through `POST /pokemon` get ids from
// `FIRST_GENERATED_ID = 1026` upwards, so a cap here would make them
// unaddressable — which is what the original `@maxValue(1025)` did.
//
// The real-world number lives in `nationalDexNumber` instead, where 1025 is a
// fact about Pokémon rather than a limit on how many rows this store may hold.
/** Identifies an entry in this Pokédex. Unique; allocated by the server. */
@minValue(1)
scalar PokemonId extends int32;

// 1025 is the number of Pokémon in the National Pokédex (Bulbasaur through
// Pecharunt), so the bound is a domain fact and belongs on this field alone.
//
// Optional wherever it appears: an entry invented through `POST /pokemon` has
// no National Pokédex number, and making one up for it would be a lie. Two
// entries may also carry the same number — a regional form and its base
// species, say — so this is a reference, never a key. `id` is the key.
/** National Pokédex number — 1 for Bulbasaur, 1025 for Pecharunt. */
@minValue(1)
@maxValue(1025)
scalar NationalDexNumber extends int32;

// The body is served by the schema-error middleware in `src/http/ServerApi.ts`,
// not by a handler — declaring it here is what makes contract, server, and
// generated client agree on the shape.
@doc("The request violates the contract.")
model BadRequestApiError {
  ...BadRequestResponse;
  ...Body<CodedApiError<"BAD_REQUEST">>;
}

// The 404 the id-addressed operations answer. Carries an `ApiError` body (D1).
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
