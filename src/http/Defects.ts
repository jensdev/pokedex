/**
 * The defect boundary for the HTTP layer.
 *
 * A *defect* is anything the contract does not model: a thrown exception, an
 * `Effect.die`, a bug. The platform already turns one into a 500 — but an
 * **empty** one (`HttpServerError.causeResponse` falls back to
 * `Response.empty({ status: 500 })`), and it only reports the cause when an
 * `ErrorReporter` is installed, which by default there is not
 * (`CurrentErrorReporters` defaults to an empty set). So a defect would
 * currently vanish silently and answer with a body the contract does not
 * declare.
 *
 * This middleware closes both gaps in one place:
 *
 * - the cause is logged at `Error` level, as the log record's `cause` — never
 *   as part of the response, so no internals reach the client;
 * - the response is the contract's `ApiError` struct, which every endpoint
 *   declares as its `default` (= 500) response.
 *
 * Typed failures pass straight through: they are contract responses and the
 * handlers have already mapped them (`PokemonNotFound` → empty 404,
 * `PokemonDataParse` → `ApiError` 500), as does `RouteNotFound` → 404.
 */
import { Cause, Effect } from 'effect';
import {
  HttpRouter,
  HttpServerRespondable,
  HttpServerResponse,
} from 'effect/unstable/http';
import type { ApiError } from '../generated/Api.js';

/**
 * Deliberately says nothing about what went wrong: the client learns that the
 * server broke, the log carries the reason.
 */
export const INTERNAL_ERROR: ApiError = {
  code: 'INTERNAL_ERROR',
  message: 'An unexpected error occurred',
};

/** The log message the boundary emits; asserted in the tests. */
export const DEFECT_LOG_MESSAGE = 'Unhandled defect while handling a request';

/**
 * Not every defect is a bug. `HttpApiBuilder` reports a request that violates
 * the schema by dying with an `HttpApiSchemaError`, and
 * `HttpServerError.causeResponse` lets such a defect choose its own response
 * (400) because it is `Respondable`; a defect that *is* already an
 * `HttpServerResponse` is used as-is. Those two carry an intended answer, so
 * the boundary must leave them to the platform — catching them would turn every
 * 400 into a 500.
 */
const isPlainDefect = (defect: unknown): boolean =>
  !HttpServerResponse.isHttpServerResponse(defect) &&
  !HttpServerRespondable.isRespondable(defect);

/** True when the cause carries at least one defect nobody has an answer for. */
const hasPlainDefect = <E>(cause: Cause.Cause<E>): boolean =>
  cause.reasons.some(
    (reason) => Cause.isDieReason(reason) && isPlainDefect(reason.defect),
  );

/**
 * Global middleware, so it covers every route — the API groups, the OpenAPI
 * document, and the Scalar reference alike. Merged into `AllRoutes` rather than
 * passed to `HttpRouter.serve`, so the tests that drive the router directly get
 * the same boundary the server has.
 */
export const DefectBoundary = HttpRouter.middleware(
  (httpEffect) =>
    Effect.catchCauseIf(httpEffect, hasPlainDefect, (cause) =>
      Effect.as(
        Effect.logError(DEFECT_LOG_MESSAGE, cause),
        HttpServerResponse.jsonUnsafe(INTERNAL_ERROR, { status: 500 }),
      ),
    ),
  { global: true },
);
