# Effect Pokédex

A Pokédex HTTP API where the contract comes first and everything else is derived from it.
The API is written in [TypeSpec](https://typespec.io/), compiled to an
[OpenAPI 3.0](https://www.openapis.org/) document, and that document generates both the
[Effect 4.0](https://effect.website/) `HttpApi` the server implements *and* the typed client a
consumer calls. Implementation, documentation, and consumer are three views of one artifact,
and CI fails if they stop agreeing.

There is no web framework beyond Effect itself. Services are `Context.Service` + `Layer`,
handlers are `HttpApiBuilder` groups, and the server is `NodeHttpServer` over `node:http`.

## Quick start

Requires **Node.js ≥ 22** and npm.

```sh
npm ci
npm run dev            # http://localhost:3000
```

Then:

- `http://localhost:3000/docs` — interactive [Scalar](https://scalar.com/) reference
- `http://localhost:3000/openapi.json` — the served spec
- `curl localhost:3000/pokemon` — four seeded Pokémon (bulbasaur, pikachu, mewtwo, mew)

State lives in a `Ref`, so every restart resets it to the seed.

## The contract pipeline

```
                                                    ┌─ --format httpapi    ─▶ src/generated/Api.ts     (server)
tsp/*.tsp ──tsp compile──▶ tsp-output/openapi.yaml ─┤
                                                    └─ --format httpclient ─▶ src/generated/Client.ts  (consumers)
```

`tsp/` is the only thing here written by hand. Everything under `tsp-output/` and
`src/generated/` is emitted — never edit it. Change an endpoint by changing the TypeSpec, then:

```sh
npm run generate       # compile + regenerate api + client
npm run check          # lint + format + typecheck + test
```

Commit the regenerated files with the change. CI regenerates from scratch and fails on any
diff or untracked file, so a hand-edited generated file or a forgotten `npm run generate` is
caught before review.

## What a request goes through

```
node:http
  └─ HttpRouter.serve            request log line + tracer span (both on by default)
     └─ DefectBoundary           logs the cause, answers a contract-shaped 500
        └─ route match
           ├─ /openapi.json, /docs        the spec and the Scalar reference
           └─ /health*, /pokemon*         HttpApiBuilder
              ├─ decode params/query/payload against the generated Schema → 400 on violation
              ├─ src/http/*Handlers.ts    wire ⟷ domain, domain error → contract member
              │  └─ src/services/*.ts     the actual logic (spans and span attributes)
              │     └─ PokemonRepository  Ref-backed in-memory store
              └─ encode the success body, or the selected error member
```

### Three error channels, deliberately distinct

| What went wrong | Who answers | Client sees |
| --- | --- | --- |
| A modelled failure — no such Pokémon, upstream data unparseable | the handler, mapping a domain error to a declared member | `ApiError` at the member's status (404, 500) |
| The request violates the contract | `SchemaErrorHandler` middleware in `src/http/ServerApi.ts` | `ApiError` 400 with `code: "BAD_REQUEST"`, saying which part of the request was wrong and how |
| Anything unmodelled — a throw, a bug | `DefectBoundary` in `src/http/Defects.ts` | one opaque `ApiError` 500; the cause goes to the log, never the wire |

The status is chosen by the body, not by the handler: `HttpApiBuilder` encodes a failure
against a union of the endpoint's declared error members in declaration order, first match
wins. Three structurally identical `ApiError` members would all collapse onto the first one, so
`tsp/models/common.tsp` pins `code` to a literal per status (`BAD_REQUEST`,
`POKEMON_NOT_FOUND`) and TypeScript makes picking the wrong one a compile error.

Failures raised *outside* any route — a response that fails to write — never reach the
boundary; an `ErrorReporter` in `src/Observability.ts` catches those. Full reasoning in
[`docs/patterns/boundaries.md`](./docs/patterns/boundaries.md).

## Endpoints

| Method | Path | Behaviour |
| --- | --- | --- |
| `GET` | `/health` | Aggregate status + per-component breakdown. Always 200 — read the `status` field |
| `GET` | `/health/live` | Liveness: `{ status: "ok", uptime }` in seconds |
| `GET` | `/health/ready` | Same body as `/health`, but **503** when the aggregate is `unhealthy` |
| `GET` | `/pokemon` | Filter by `classification`, `type` (matches either slot), `search` (case-insensitive substring); `sortBy` × `sortOrder`; `page`/`pageSize` (default `0`/`20`, max `100`) |
| `POST` | `/pokemon` | 201 with the full variant; server allocates `id`, classification-specific fields are defaulted. Send `nationalDexNumber` only for a real Pokémon |
| `GET` | `/pokemon/{id}` | 200, or 404 with `POKEMON_NOT_FOUND` echoing the id |
| `PUT` | `/pokemon/{id}` | Full replace; `id` and `createdAt` are preserved. An omitted `nationalDexNumber` is cleared, as with any other optional field |
| `DELETE` | `/pokemon/{id}` | 204 empty, or 404 |

A Pokémon is a discriminated union on `classification` — `normal`, `legendary`, `mythical` —
each arm carrying its own fields.

**Two numbers, deliberately.** `id` is a surrogate key: `≥ 1`, uncapped, allocated by the
server from `1026` upward, never reused, and unaffected by deletes. `nationalDexNumber` is the
real-world number and is bounded `1–1025` — Bulbasaur through Pecharunt — because that bound is
a fact about Pokémon, not a limit on how many rows this store may hold. It is optional
everywhere: an entry invented through `POST /pokemon` has no National Pokédex number, and the
server never derives one from `id`. It is a reference, not a key — nothing enforces that two
entries carry different numbers.

The four seeded entries have `id === nationalDexNumber` because they were seeded at their
Pokédex numbers. Nothing may depend on that coincidence.

The health aggregate is the *worst* component status, so one unhealthy dependency cannot be
averaged away by healthy ones. Today the only registered probe is `database` — the repository
timing its own round trip; adding a `cache` probe is one line in `HealthChecks.layer`.

Exact semantics — including the quirks the endpoints deliberately keep — are specified in
[`docs/migration/01-current-behavior-spec.md`](./docs/migration/01-current-behavior-spec.md).

## Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `PORT` | `3000` | Port the HTTP server binds |
| `APP_VERSION` | `1.0.0` | `version` in the health bodies, `service.version` on exported telemetry |
| `FLAKY_UPSTREAM_RATE` | `0` | Probability the simulated upstream returns unparseable data, making `GET /pokemon` answer 500. Off by default — opt in to exercise the failure path |
| `OTLP_URL` | _unset_ | Base URL of an OTLP collector, e.g. `http://localhost:4318`. Set it and spans go to `/v1/traces`, log records to `/v1/logs`. Unset exports nothing and the app still boots |

## Observability

Spans and a request log line are produced whether or not anything collects them: services wrap
their methods in `Effect.withSpan` and annotate the arguments worth querying on
(`pokedex.filter.type`, `pokedex.id`, and the *effective* page size rather than the one the
caller happened to send). Setting `OTLP_URL` installs the exporters at the root — below the
server layer, so the router's own span and log line are exported too. The OTLP support ships
inside the pinned `effect` package, so this costs no extra dependency.

## Layout

```
├── tsp/                     # TypeSpec — the source of truth
│   ├── main.tsp             #   service metadata & imports
│   ├── health.tsp           #   health endpoints
│   ├── pokedex.tsp          #   Pokédex CRUD
│   └── models/              #   Pokemon, pagination, the shared error shapes
├── tsp-output/openapi.yaml  # generated spec
├── src/
│   ├── generated/           # generated Api.ts + Client.ts — DO NOT EDIT
│   ├── domain/              # pure rules and errors: no HTTP, no clock, no randomness
│   ├── services/            # Health, HealthChecks, Pokedex, and the storage port + adapter
│   ├── http/                # handlers, middleware, route composition, and AppLayer
│   ├── AppConfig.ts         # APP_VERSION, FLAKY_UPSTREAM_RATE
│   ├── Observability.ts     # OTLP exporters + the error reporter
│   └── main.ts              # entry point: AppLayer + NodeHttpServer
├── test/                    # 136 tests over 9 files (@effect/vitest)
├── docs/
│   ├── migration/           #   behaviour spec and architecture design record
│   ├── patterns/            #   living architecture rules
│   └── plans/               #   executed change plans
├── repos/effect             # vendored Effect source (upstream main, ahead of the pin)
└── .github/workflows/ci.yml # contract drift gate + npm run check
```

Two composition points are worth knowing before you touch the wiring:

- **`src/http/AppLayer.ts` is the composition root.** It is the only place that decides which
  implementation backs each service, and the reason the health probe and the request handlers
  share one repository instance instead of quietly getting two. The tests drive this same
  layer, not a lookalike.
- **`src/http/ServerApi.ts` is the api the server serves** — the generated contract with the
  schema-error middleware attached. `HttpApiBuilder.group` bakes an endpoint's middleware in at
  build time, so a handler group built from the bare generated `PokedexApi` silently loses it.
  Always build handlers against `ServerApi`.

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Install exactly what the lockfile pins |
| `npm run dev` | Server in watch mode (`tsx`) |
| `npm run generate` | `typespec:compile` + `generate:api` + `generate:client` |
| `npm run typespec:compile` | `tsp/` → `tsp-output/openapi.yaml` |
| `npm run generate:api` | → `src/generated/Api.ts` (server contract) |
| `npm run generate:client` | → `src/generated/Client.ts` (consumer client) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | `vitest run` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | Type-aware `oxlint` |
| `npm run format` / `format:check` | `oxfmt` |
| `npm run check` | lint + format:check + typecheck + test — the gate for every change |

## Stack

| Library | Role |
| --- | --- |
| [`effect`](https://effect.website/) | Runtime, effect system, `Schema`, `Layer`, `HttpApi`, OTLP |
| [`@effect/platform-node`](https://effect.website/docs/platform/introduction/) | Node HTTP server platform layer |
| [`@typespec/compiler`](https://typespec.io/) | Contract definition language |
| [`@effect/openapi-generator`](https://github.com/Effect-TS/effect) | OpenAPI → Effect contract and client |
| [`@effect/vitest`](https://github.com/Effect-TS/effect) | Effect-aware test helpers |
| [`oxlint` / `oxfmt`](https://oxc.rs/) | Linting and formatting, in place of eslint + prettier |

Every `effect` package is pinned to an exact version (`4.0.0-rc.112`). Check APIs against the
installed source (`node_modules/effect/src`, and the `src/` each `@effect/*` package ships) —
the vendored `repos/effect` subtree tracks upstream `main` and has drifted ahead of the pin.
Bump the pins and the subtree together, then rerun `npm run generate && npm run check`.

## Working on this repo

[AGENTS.md](./AGENTS.md) — with [GEMINI.md](./GEMINI.md) symlinked to it — holds the
conventions, the boundary rules, and the gotchas. It is written for AI agents and is just as
useful to a human arriving cold. Read it before changing anything under `src/`.

## License

UNLICENSED
