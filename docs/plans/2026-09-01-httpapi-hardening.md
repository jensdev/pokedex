# HttpApi hardening plan

**Status:** implemented on `feat/httpapi-hardening`, one commit per phase.
**Date:** 2026-09-01
**Scope:** the ten findings from the Effect 4.0 best-practices review of the HttpApi
implementation. Verified against the installed `effect@4.0.0-rc.112` source and by
probing the running router (`HttpRouter.toWebHandler`), not from memory — per rule 2
in `AGENTS.md`.

## What the plan did not foresee

Two things, both settled against the pinned rc.112 and both recorded in
[docs/patterns/boundaries.md](../patterns/boundaries.md):

1. **D1 traded one greedy match for another.** Removing `HttpApiSchema.Empty(404)`
   left three structurally identical `ApiError` members (400, 404, `default` 500)
   in each error union, and `HttpApiBuilder` encodes a failure against them in
   declaration order, first match wins — so every typed failure encoded as 400
   (probed). `tsp/models/common.tsp` pins `code` to a literal per status, which
   makes the members disjoint and the choice a compile-time one.
2. **A middleware's declared error changes the served OpenAPI.**
   `HttpApiEndpoint.getErrorSchemas` appends it to every endpoint's error union,
   so the `{ error: ValidationError }` of Phase B made `/openapi.json` document
   each 400 as an `anyOf` including the error's `_tag` — the drift Phase B itself
   forbids. The middleware answers with a response instead, which
   `layerSchemaErrorTransform` is typed for. `test/ServerApi.test.ts` is the gate.

## Background: the findings

The Effect-4 shape of the codebase is sound — `Context.Service` + static
`Layer.effect`, `HttpApiBuilder.group`/`handleAll`, `HttpApiTest.groups`,
`Effect.fn` spans, `DateTime.now` over `Date.now`, a well-argued defect boundary.
The gaps are between the contract and what the server actually puts on the wire,
plus an observability stack that is built but not plugged in.

1. **Schema-validation failures ship an empty body.** Every endpoint declares
   `default: ApiError`, but a violated param/query/payload answers
   `400`, no content type, empty body (probed). The generated client cannot
   decode these — they fall into `orElse: unexpectedStatus`. Fix:
   `HttpApiMiddleware.layerSchemaErrorTransform` (exists in rc.112).
2. **No 4xx is declared in `tsp/` at all.** Even with (1) fixed, the spec
   documents no 400. The contract, server, and client must agree.
3. **Path-param validation is inconsistent.** `@minValue(1) @maxValue(1025)`
   sits only on `getById`; `PUT`/`DELETE /pokemon/0` answer 404 where
   `GET /pokemon/0` answers 400.
4. **Genuine 500s are logged at INFO with zero diagnostics.**
   `Effect.mapError(dataParseError)` in `PokedexHandlers.ts` discards
   `PokemonDataParse` without a log line, while defects get a full
   `Effect.logError` with cause.
5. **Every span is thrown away.** No exporter is wired.
   `effect/unstable/observability` ships `OtlpTracer`/`OtlpLogger` in the
   pinned version — no new dependency needed.
6. **No `ErrorReporter` registered.** Failures outside the router middleware
   (response-write errors, server-chain failures) route through
   `reportCauseUnsafe` and vanish.
7. **`Math.random()` in a service**, against the repo's own rule
   (`PokemonRepository.fetchAll`). Should read the `Random` service.
8. **`PokemonRepository` is invisible above `Pokedex`.** `Pokedex.layer` bakes
   in `layerInMemory`; a second consumer providing the repository itself would
   silently get a second `Ref` store. `Routes.ts` is also acting as the
   composition root instead of `main.ts`.
9. **Readiness can never fail.** `Health` hardcodes `healthy` everywhere; as a
   k8s readiness probe it is a no-op, and the contract declares no non-200.
10. **`FLAKY_UPSTREAM_RATE` defaults to `0.1`** — a 10% random 500 on
    `listPokemon` in production by default. Its doc comment is also stale
    ("Unused until Phase 4").

Two verified gotchas the implementation must respect:

- **Middleware must be attached to the api before `HttpApiBuilder.group` builds
  handlers.** Routes bake middleware in at `group()` time; attaching it only at
  `HttpApiBuilder.layer` is a silent no-op (verified by probe).
- **`HttpApiSchema.Empty(404)` is `Schema.Void` and greedily matches anything**
  in the endpoint error union. With the schema-error middleware attached,
  validation failures on `/pokemon/:id` encoded as empty 404s instead of the
  middleware's status (verified by probe). This is why decision D1 below is a
  prerequisite for the middleware, not a nice-to-have.

## Decisions

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| D1 | Empty 404s vs 404 with `ApiError` body | **Give 404s an `ApiError` body** | The empty 404 is `Schema.Void` in the generated union and greedily matches anything (see gotcha above), and the generated client's `decodeVoidError('404')` gives consumers zero information. NestJS parity was the migration rule; the migration is closed out, so the contract is free to improve. |
| D2 | `@maxValue(1025)` on `getById` | **Drop the max, keep `@minValue(1)`** | Generated ids start at `FIRST_GENERATED_ID = 1026` — a Pokemon created via POST can never be fetched by id (400). The cap is incoherent with the id sequence. |
| D3 | Scope of real health checks | **Light check-registry; readiness gains a 503** | The tsp doc says "Returns 200 only when ready" but declares no non-200, and everything is hardcoded `healthy`. A registry keeps it bounded: one built-in check (repository), aggregate = worst status, readiness answers 503 when unhealthy. |

## Phase A — Contract changes (findings 2, 3, 9-contract; D1/D2)

All in `tsp/`, then `npm run generate`. One commit with `tsp/` + `tsp-output/` +
`src/generated/` together (CI drift gate).

1. `tsp/models/common.tsp`
   - Add `scalar PokemonId extends int32` with `@minValue(1)` (no max, per D2).
   - Add a named 400 response: `BadRequestResponse & Body<ApiError>` usable by
     every endpoint (finding 2).
2. `tsp/pokedex.tsp`
   - Use `PokemonId` on `getById`, `replace`, `remove` — same validation on all
     three (finding 3).
   - Add the explicit 400 `ApiError` response to every operation (finding 2).
   - `NotFoundResponse` → `NotFoundResponse & Body<ApiError>` on the three id
     endpoints (D1).
3. `tsp/health.tsp` — add `ServiceUnavailableResponse & Body<HealthResponse>`
   (503) to `readiness` (D3, contract half).
4. Regenerate, then fix fallout:
   - The `notFound` helper in `src/http/PokedexHandlers.ts` changes from
     `Effect.fail(undefined)` to failing with an `ApiError` value
     (`code: 'POKEMON_NOT_FOUND'`, message includes the id — the domain error
     already carries it).
   - Tests asserting empty 404 bodies (`test/PokedexApi.test.ts`,
     `test/GeneratedClient.test.ts`) now assert the body.
   - Confirm the generator emits the 404 member as
     `ApiError.pipe(HttpApiSchema.status(404))` — no more `Empty(404)`, which
     is what makes Phase B safe.

**Gate:** `npm run check` + drift gate clean. Wire re-probe:
`PUT/DELETE /pokemon/0` now 400; `GET /pokemon/1026` after a create now 200.

## Phase B — Schema-error middleware (finding 1)

Depends on Phase A (D1 removes the Void-matches-everything hazard).

1. New `src/http/ServerApi.ts` (hand-written, not generated):
   - `ValidationError` — `Schema.TaggedError` carrying `code`/`message`. The
     wire body must match the contract's `ApiError` exactly (no `_tag`): encode
     via a transformation. The served `/openapi.json` is built from `ServerApi`
     at runtime and must not drift from `tsp-output/openapi.yaml`.
   - `SchemaErrorHandler extends HttpApiMiddleware.Service<...>()(
     'pokedex/SchemaErrorHandler', { error: ... })` with status 400.
   - `class ServerApi extends PokedexApi.middleware(SchemaErrorHandler) {}` —
     **critical:** middleware must be on the api before `HttpApiBuilder.group`
     runs (see gotcha above).
   - `SchemaErrorHandlerLayer = HttpApiMiddleware.layerSchemaErrorTransform(...)`
     — format `schemaError.cause`, not `schemaError.message` (which is just
     `"Query"` / `"Params"`).
2. Point `src/http/HealthHandlers.ts`, `src/http/PokedexHandlers.ts`, and
   `src/http/Routes.ts` at `ServerApi` instead of `PokedexApi`; provide
   `SchemaErrorHandlerLayer` in `Routes.ts`.
3. Tests: update `test/Defects.test.ts` — "respondable defect keeps its own
   status" becomes "schema violation answers 400 with the contract body". Add
   cases: bad param, bad query, bad payload each return `ApiError`-shaped JSON.
   Assert the served `/openapi.json` still matches the committed spec (a real
   assertion now, since runtime OpenAPI includes middleware errors).

## Phase C — Composition root (finding 8)

1. `src/http/Routes.ts` stops providing services: drop
   `Layer.provide([Health.layer, Pokedex.layer])`; `AllRoutes` now *requires*
   `Health | Pokedex`.
2. `src/services/Pokedex.ts`: rename `layerWithRepository` → `layerNoDeps`
   (upstream fixture convention); `layer` stays as convenience wiring but is no
   longer used by the app.
3. `src/main.ts` becomes the composition root: provide `Pokedex.layerNoDeps`,
   `Health.layer`, and `PokemonRepository.layerInMemory` at one visible level —
   one `Ref` store, swappable per environment.
4. Tests: `test/GeneratedClient.test.ts` and `test/Defects.test.ts` compose the
   same stack explicitly. Prefer a shared `src/http/AppLayer.ts` export used by
   both `main.ts` and the tests, to avoid drift.

## Phase D — Observability wiring (findings 4, 5, 6)

1. Finding 4, `src/http/PokedexHandlers.ts`: before
   `Effect.mapError(dataParseError)`, add
   `Effect.tapError((e) => Effect.logError('listPokemon failed: upstream data parse', e))`
   (or `tapCause`). Assert the log in `test/PokedexApi.test.ts` the same way
   `test/Defects.test.ts` asserts the boundary's log line.
2. Finding 5, new `src/Observability.ts`: `Layer.unwrap` over
   `Config.option(Config.string('OTLP_URL'))` — when set, `OtlpTracer.layer` +
   `OtlpLogger.layer` (from `effect/unstable/observability`, already in the
   pin) with `OtlpSerialization.layerJson` + `FetchHttpClient.layer` provided;
   when unset, an empty layer. Service name/version from `AppVersion`.
3. Finding 6, same file: an `ErrorReporter.layer([ErrorReporter.make(...)])`
   that logs cause + severity — covers failure paths outside the router
   middleware (response-write errors) that currently vanish through
   `reportCauseUnsafe`. Note in `src/http/Defects.ts`'s doc comment that the
   reporter now exists and what each covers.
4. `src/main.ts`: provide both at the very root (below the server layer) so
   every span/log is exported.

## Phase E — Service correctness (findings 7, 9, 10)

1. Finding 7, `src/services/PokemonRepository.ts`:
   `Effect.sync(() => Math.random())` → `Random.next`. Existing rate-0/rate-1
   test pins keep working. Add one seeded test (`Random.withSeed`) exercising
   the actual threshold comparison.
2. Finding 10, `src/AppConfig.ts`: default `FLAKY_UPSTREAM_RATE` to `0`, fix
   the stale "Unused until Phase 4" comment, document the env var as the
   opt-in chaos switch in README/AGENTS.md. Test suites can then drop most
   `DeterministicConfig` pins (keep the rate-1 pin for the 500 path).
3. Finding 9, `src/services/Health.ts` (D3):
   - New `HealthCheck` registry: a `Context.Reference` (or small service)
     holding named checks `Effect<ComponentHealth>`;
     `PokemonRepository.layerInMemory` registers a `database` check (a
     `Ref.get` round-trip timed via `Clock` for `latencyMs`).
   - `Health.check`/`readiness` compute aggregate = worst component status
     instead of hardcoding.
   - `readiness` maps an `unhealthy` aggregate to the new 503 contract member.
   - Tests: a failing registered check flips the aggregate and turns readiness
     into 503; liveness unaffected.

## Cross-cutting, last

- `AGENTS.md` / docs: update the request-flow diagram (schema errors now
  400-with-body via middleware, observability layer at root), the "Errors"
  three-channel section, and `docs/patterns/boundaries.md`.
- Full wire re-probe of the Phase-A/B matrix as a final sanity pass, plus
  `npm run check`.

## Commit sequence

A → B → C → D → E, one commit per phase — each independently revertable, and
A/B are the only phases that touch generated files.

## Explicitly out of scope

- The `Config` PascalCase rename (`Config.string` → `Config.String`, etc.):
  that is the next-RC upgrade — the vendored `repos/effect` main carries the
  unreleased `clean-config-names` changeset, but the pin (`rc.112`) still uses
  the current names.
- CORS and gating `/docs` + `/openapi.json` behind config: real but small
  items outside the ten findings.
- Smaller review items not planned here: `Service.of({...})` wrappers,
  deduplicating pagination defaults, the client generator's
  `default-response-remapped` behavior on `deletePokemon` (root cause shared
  with finding 2 — declaring explicit status codes fixes both).
