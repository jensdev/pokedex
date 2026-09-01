/**
 * The API the *server* serves: the generated contract plus the middleware that
 * gives schema violations a contract-shaped body.
 *
 * `HttpApiBuilder` reports a violated param, query, or payload by failing with
 * an `HttpApiSchemaError`, which is `Respondable` and answers an **empty** 400
 * — no content type, no body — while every endpoint declares an `ApiError` for
 * that status. The generated client cannot decode an empty 400, so it falls
 * into `orElse: unexpectedStatus` and the caller learns nothing.
 * {@link SchemaErrorHandler} closes that gap.
 *
 * **The middleware must be attached here, not at `HttpApiBuilder.layer`.**
 * `HttpApiBuilder.group` bakes an endpoint's middleware into its routes at
 * layer-build time (`applyMiddleware` reads `endpoint.middlewares`), so an api
 * that only grows middleware afterwards produces routes that never run it —
 * a silent no-op, verified by probe. Every module that builds handlers must
 * therefore import {@link ServerApi}, never `PokedexApi`.
 */
import { Effect } from 'effect';
import { HttpServerResponse } from 'effect/unstable/http';
import { HttpApiMiddleware } from 'effect/unstable/httpapi';
import type {
  CreatePokemon400,
  DeletePokemon400,
  GetPokemonById400,
  HealthCheck400,
  HealthLiveness400,
  HealthReadiness400,
  ListPokemon400,
  ReplacePokemon400,
} from '../generated/Api.js';
import { PokedexApi } from '../generated/Api.js';

/**
 * The 400 body, as *every* endpoint declares it.
 *
 * One middleware answers the 400 for all eight operations, so its body has to
 * satisfy all eight declarations. They are the same `CodedApiError<"BAD_REQUEST">`
 * today; the intersection is what makes that an assertion rather than an
 * assumption — if `tsp/` ever gives one of them a shape of its own, this stops
 * compiling instead of quietly serving an undeclared body.
 */
type ContractBadRequest = HealthCheck400 &
  HealthLiveness400 &
  HealthReadiness400 &
  ListPokemon400 &
  CreatePokemon400 &
  GetPokemonById400 &
  ReplacePokemon400 &
  DeletePokemon400;

/**
 * The `code` of the contract's 400 body. Pinned to a literal in `tsp/` so the
 * 400 member of an endpoint's error union is disjoint from the 404 and 500
 * members — see `tsp/models/common.tsp`.
 */
export const VALIDATION_ERROR_CODE = 'BAD_REQUEST';

/**
 * Turns an `HttpApiSchemaError` into the contract's 400 body.
 *
 * `schemaError.message` is only the *kind* (`"Query"`, `"Params"`, …); the
 * useful half is `schemaError.cause`, a `Schema.SchemaError` whose `message` is
 * the formatted issue tree. Both go in: the kind says *where* the request was
 * wrong, the issue says *how*. Neither says anything about the server — a 400
 * is the client's mistake, and describing it is the whole job.
 */
export const validationErrorBody = (
  kind: string,
  detail: string,
): ContractBadRequest => ({
  code: VALIDATION_ERROR_CODE,
  message: `${kind} is invalid: ${detail}`,
});

/**
 * Declares the middleware.
 *
 * Deliberately **no** `error` schema. Declaring one is the obvious shape and
 * the one the hardening plan sketched, but `HttpApiEndpoint.getErrorSchemas`
 * appends a middleware's error to every endpoint's error union, and
 * `OpenApi.fromApi` then documents each 400 as an `anyOf` of the contract's
 * body and the middleware's — including, for a `Schema.Error` class, its `_tag`
 * (verified by probe: `pokedex_ValidationErrorEncoded` lists `_tag` even though
 * `Schema.tagDefaultOmit` keeps it off the wire). The served `/openapi.json` is
 * built from {@link ServerApi} and must not drift from
 * `tsp-output/openapi.yaml`, so the middleware answers with a response instead
 * — which `layerSchemaErrorTransform` explicitly allows, its transform being
 * typed to return an `HttpServerResponse`. The 400 stays declared where it
 * belongs, in `tsp/`.
 */
export class SchemaErrorHandler extends HttpApiMiddleware.Service<SchemaErrorHandler>()(
  'pokedex/SchemaErrorHandler',
) {}

/**
 * The contract with the middleware attached to every endpoint.
 *
 * `middleware()` returns a *new* api — `PokedexApi` itself is untouched, which
 * is why the generated file stays generated.
 */
export class ServerApi extends PokedexApi.middleware(SchemaErrorHandler) {}

/** The implementation of {@link SchemaErrorHandler}. */
export const SchemaErrorHandlerLayer =
  HttpApiMiddleware.layerSchemaErrorTransform(
    SchemaErrorHandler,
    (schemaError) =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          validationErrorBody(schemaError.kind, schemaError.cause.message),
          { status: 400 },
        ),
      ),
  );
