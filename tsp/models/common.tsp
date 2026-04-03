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
