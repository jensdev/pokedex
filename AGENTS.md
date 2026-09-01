# Agent Instructions: Effect Pokédex

A contract-first Pokédex API. TypeSpec is the source of truth, `@effect/openapi-generator`
turns it into an Effect `HttpApi`, and the implementation is plain Effect 4.0 — services,
layers, and `HttpApiBuilder` handlers. There is no framework beyond Effect itself.

> This file is the working guide. `GEMINI.md` is a symlink to it, so both agents read the same
> instructions — edit `AGENTS.md`. For *why* the architecture looks like this, read
> [docs/migration/](./docs/migration/), the design record of the NestJS → Effect rewrite.

## The four rules

1. **The contract starts in `tsp/`.** `tsp-output/openapi.yaml` and `src/generated/*.ts` are
   emitted and committed. **Never hand-edit a file under `src/generated/` or `tsp-output/`** —
   change `tsp/` and run `npm run generate`. CI regenerates and fails on any diff, so a
   hand-edit does not survive review.
2. **Verify Effect APIs against source, never from memory.** Effect 4.0 is a release
   candidate and its API moves between RCs. The authority is the **installed** source:
   `node_modules/effect/src`, `node_modules/@effect/platform-node/src`, and
   `node_modules/@effect/openapi-generator/src` — all three ship `src/`, and all three are
   pinned to an exact version. `repos/effect` is a vendored checkout of upstream `main` for
   browsing tests, examples, and `LLMS.md`; it reports the same version but has drifted ahead
   of the pin, so when the two disagree the installed source wins.
3. **Handlers hold no domain logic.** `src/http/` translates between the wire contract and the
   services, error mapping included. Domain logic lives in `src/services/` and `src/domain/`,
   which never import from `effect/unstable/http*`. See
   [docs/patterns/boundaries.md](./docs/patterns/boundaries.md).
4. **`npm run check` is the gate.** Lint, format, typecheck, and tests. Run it before calling
   anything done; CI runs the same thing plus the contract gate.

## Commands

| Command                    | What it does                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm ci`                   | Install exactly what the lockfile pins                                      |
| `npm run generate`         | `typespec:compile` + `generate:api` + `generate:client` — the full pipeline |
| `npm run typespec:compile` | `tsp/` → `tsp-output/openapi.yaml`                                          |
| `npm run generate:api`     | spec → `src/generated/Api.ts` (server contract, `--format httpapi`)         |
| `npm run generate:client`  | spec → `src/generated/Client.ts` (consumer client, `--format httpclient`)   |
| `npm run dev`              | Watch-mode server (`tsx`) on `PORT`, default `3000`                         |
| `npm run build` / `start`  | Compile to `dist/` / run the compiled server                                |
| `npm run typecheck`        | `tsc --noEmit`                                                              |
| `npm run lint[:fix]`       | `oxlint --type-aware`                                                       |
| `npm run format[:check]`   | `oxfmt`                                                                     |
| `npm test`                 | `vitest run`                                                                |
| `npm run check`            | lint + format:check + typecheck + test                                      |

## Where things live

```
tsp/                      TypeSpec contract — the source of truth
  main.tsp                  service metadata & imports
  health.tsp, pokedex.tsp   endpoints
  models/                   shared models
tsp-output/openapi.yaml   generated OpenAPI 3.0 spec (never hand-edited)
src/
  generated/Api.ts        generated HttpApi + Schema models (never hand-edited)
  generated/Client.ts     generated consumer HttpClient (never hand-edited)
  domain/                 pure rules and errors — no Effect HTTP imports
    Pokemon.ts              variant construction/replacement rules (total, effect-free)
    Errors.ts               HTTP-agnostic domain errors
  services/               application services — no Effect HTTP imports
    Health.ts               health/liveness/readiness values
    Pokedex.ts              filter, search, sort, paginate; ids and timestamps
    PokemonRepository.ts    storage port + Ref-backed in-memory adapter
    seed.ts                 the four seeded Pokémon
  http/                   the wire boundary
    HealthHandlers.ts       HttpApiBuilder group for Health
    PokedexHandlers.ts      HttpApiBuilder group for Pokedex, incl. error mapping
    Defects.ts              defect boundary: log the cause, answer a contract 500
    Routes.ts               route composition (API + /openapi.json + /docs + boundary)
  AppConfig.ts            Config values (APP_VERSION, FLAKY_UPSTREAM_RATE)
  main.ts                 entry point: NodeHttpServer + HttpRouter.serve
test/                     @effect/vitest suites
docs/migration/           the design record of the NestJS → Effect rewrite
docs/patterns/            the living architecture rules
repos/effect              vendored upstream Effect source (reference only)
```

## Request flow

```
node:http
  └─ HttpRouter.serve            request log line + tracer span (both on by default)
     └─ DefectBoundary           global middleware — src/http/Defects.ts
        └─ route match
           ├─ /openapi.json, /docs        the spec and the Scalar reference
           └─ /health*, /pokemon*         HttpApiBuilder
              ├─ decode params/query/payload against the generated Schema → 400 on violation
              ├─ src/http/*Handlers.ts    wire ⟷ domain, domain error → contract member
              │  └─ src/services/*.ts     the actual logic (spans live here)
              │     └─ PokemonRepository  Ref-backed store
              └─ encode the success body, or the selected error member
```

## Conventions

### Adding or changing an endpoint

1. Edit `tsp/`. 2. `npm run generate`. 3. Implement the handler in `src/http/`, the logic in
`src/services/`. 4. Add a test. 5. `npm run check`. 6. Commit `tsp/`, `tsp-output/`, and
`src/generated/` together with the code — CI fails if they are out of step.

### Services

`Context.Service` with the interface in the type parameter and the implementation in a static
`Layer.effect`. Expose a `layerWithX` when a dependency should be injectable in tests, and a
`layer` that is the application wiring — `Pokedex` does both.

### Errors

Three channels, and the distinction matters:

- **Contract responses** — declared in `tsp/`, so they are typed failures. Domain errors are
  `Schema.TaggedError` in `src/domain/Errors.ts`; the handler maps each to a member of the
  endpoint's error union.
- **Schema violations** — `HttpApiBuilder` reports these by *dying* with a `Respondable`
  `HttpApiSchemaError` that answers 400 itself. Do not catch them.
- **Defects** — anything else. `src/http/Defects.ts` logs the cause and answers the contract's
  `ApiError` 500. Nothing internal reaches the client.

Do not add an `Effect.die` as a placeholder. If a defect really is the right answer, say in a
comment why the case is unreachable.

### Observability

Every service method carries a span: `Effect.fn('Service.method')` for methods that take
arguments, `Effect.withSpan` for members that are effect *values*. Annotate the inputs worth
searching a trace by with `Effect.annotateCurrentSpan` — `Pokedex.list` records its effective
query, the id-taking methods record the id.

### Tests

`@effect/vitest`. Reach for the cheapest level that can observe what you care about:

- `HttpApiTest.groups` for an in-memory typed client — success bodies, typed failures.
- `HttpRouter.toHttpEffect` for wire statuses, raw bodies, and requests a typed client would
  refuse to encode. Render failures through `HttpServerError.causeResponse`, as the server does.
- `NodeHttpServer.layerTest` only where a real socket is the point — currently just the
  generated-client smoke test.

`it.effect` provides a `TestClock` starting at epoch 0, so timestamps are directly assertable
and `TestClock.adjust` makes "`updatedAt` moved, `createdAt` did not" observable. Pin
`FLAKY_UPSTREAM_RATE` to `0` via a `ConfigProvider` layer or list assertions become coin flips.
`layer()` builds once per suite, so a suite that writes needs either
`Effect.provide(TestLayer, { local: true })` per test or its own suite block.

## Gotchas worth knowing

- **TypeSpec: spread, not `extends`.** The generator collapses `allOf` inheritance to
  `Schema.Never`. `tsp/models/pokemon.tsp` composes variants with `...` spread, which emits
  self-contained schemas and a correct discriminated union. The wire format is identical.
- **`oxlint` shadowing.** `layer(...)((it) => …)` binds `it`; importing `it` from
  `@effect/vitest` at module scope collides with it and `no-shadow` is a hard error.
- **Piping away a contextual type.** A `const x: Effect.Effect<T> = Effect.gen(…)` loses its
  contextual type the moment you `.pipe(...)` it, and string literals widen. Use `satisfies`
  on the returned object instead — `src/services/Health.ts` does.
- **No real `Date.now()` or `Math.random()` in domain code.** Read the clock through
  `DateTime.now` / `Clock`, so tests can control it.
