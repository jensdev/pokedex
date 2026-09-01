# Effect Pokédex

A **contract-first** Pokédex API built with [TypeSpec](https://typespec.io/),
[OpenAPI](https://www.openapis.org/), and [Effect 4.0](https://effect.website/).

The API is defined in TypeSpec, compiled to an OpenAPI 3.0 spec, and then used to generate both
the Effect `HttpApi` contract the server implements *and* a typed client consumers can use —
so the implementation, the documentation, and the consumer cannot drift from each other.

There is no web framework here beyond Effect itself: services are `Context.Service` +
`Layer`, handlers are `HttpApiBuilder` groups, and the server is `NodeHttpServer` over
`node:http`.

> This repository was rewritten from NestJS 11 to Effect 4.0. The migration is complete;
> [docs/migration/](./docs/migration/) is kept as the **design record** — what the old
> implementation did, why the target architecture looks like this, and the phase-by-phase
> execution log.

## Pipeline

```
                                                    ┌─ --format httpapi    ─▶ src/generated/Api.ts     (server)
tsp/*.tsp ──tsp compile──▶ tsp-output/openapi.yaml ─┤
                                                    └─ --format httpclient ─▶ src/generated/Client.ts  (consumers)
```

Everything under `src/generated/` and `tsp-output/` is **emitted, never hand-edited** —
regenerate with `npm run generate`. CI regenerates and fails the build on any diff.

## Request flow

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

Three error channels, deliberately distinct: contract responses are typed failures a handler
maps to a declared member; schema violations are `Respondable` defects the platform answers
with 400; anything else is a plain defect, logged with its cause and flattened to one opaque
`ApiError` 500. See [docs/patterns/boundaries.md](./docs/patterns/boundaries.md).

## Project structure

```
├── tsp/                    # TypeSpec definitions (the source of truth)
│   ├── main.tsp            #   Service metadata & imports
│   ├── health.tsp          #   Health-check endpoints
│   ├── pokedex.tsp         #   Pokédex CRUD endpoints
│   └── models/             #   Shared models (Pokemon, pagination, etc.)
├── tsp-output/
│   └── openapi.yaml        # Generated OpenAPI 3.0 spec
├── src/
│   ├── generated/
│   │   ├── Api.ts          #   Generated Effect HttpApi contract (DO NOT EDIT)
│   │   └── Client.ts       #   Generated Effect HttpClient for consumers (DO NOT EDIT)
│   ├── domain/             #   Pure rules and errors — no HTTP, no clock, no randomness
│   ├── services/           #   Health, Pokedex, and the storage port + in-memory adapter
│   ├── http/               #   Handlers, the defect boundary, and route composition
│   ├── AppConfig.ts        #   Config values (APP_VERSION, FLAKY_UPSTREAM_RATE)
│   └── main.ts             #   Entry point (server bootstrap)
├── test/                   # Test suite (@effect/vitest)
├── docs/
│   ├── migration/          #   NestJS → Effect design record
│   └── patterns/           #   Living architecture rules
├── repos/effect            # Vendored Effect source (upstream `main`, ahead of the pin)
├── .github/workflows/ci.yml# Contract drift gate + npm run check
├── tspconfig.yaml          # TypeSpec compiler config
├── tsconfig.json           # Type-checking config
├── tsconfig.build.json     # Build config (excludes tests)
├── vitest.config.ts        # Test config
├── .oxlintrc.json          # oxlint config
└── .oxfmtrc.json           # oxfmt config
```

## Prerequisites

- **Node.js** ≥ 22
- **npm**

## Commands

| Command                    | What it does                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm ci`                   | Install exactly what the lockfile pins                                      |
| `npm run generate`         | `typespec:compile` + `generate:api` + `generate:client` — the full pipeline |
| `npm run typespec:compile` | Compile `tsp/` into `tsp-output/openapi.yaml`                               |
| `npm run generate:api`     | Generate `src/generated/Api.ts` (server contract)                           |
| `npm run generate:client`  | Generate `src/generated/Client.ts` (consumer client)                        |
| `npm run dev`              | Run the server in watch mode (`tsx`) on `PORT` (default `3000`)             |
| `npm run build`            | Compile to `dist/`                                                          |
| `npm start`                | Run the compiled server (`node dist/main.js`)                               |
| `npm run typecheck`        | `tsc --noEmit`                                                              |
| `npm run lint`             | Lint with `oxlint` (type-aware)                                             |
| `npm run lint:fix`         | Lint and auto-fix                                                           |
| `npm run format`           | Format with `oxfmt`                                                         |
| `npm run format:check`     | Check formatting without writing                                            |
| `npm test`                 | Run the test suite (`vitest run`)                                           |
| `npm run check`            | `lint` + `format:check` + `typecheck` + `test` — the gate for every change  |

After changing anything under `tsp/`, run `npm run generate` and commit the regenerated
`tsp-output/openapi.yaml`, `src/generated/Api.ts`, and `src/generated/Client.ts`.

## Configuration

| Variable              | Default  | What it does                                                                                                                                                       |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                | `3000`   | Port the HTTP server listens on                                                                                                                                    |
| `APP_VERSION`         | `1.0.0`  | `version` reported by the health endpoints, and `service.version` on exported telemetry                                                                            |
| `FLAKY_UPSTREAM_RATE` | `0`      | Opt-in chaos switch: probability that the simulated upstream returns unparseable data, so `GET /pokemon` answers a 500 (parity decision P1). Off unless you set it |
| `OTLP_URL`            | _unset_  | Base URL of an OTLP collector, e.g. `http://localhost:4318`. Set it and spans go to `/v1/traces` and log records to `/v1/logs`; unset, neither is exported          |

## Endpoints

Interactive reference at `/docs`, machine-readable spec at `/openapi.json`.

| Method   | Path            | Notes                                                       |
| -------- | --------------- | ----------------------------------------------------------- |
| `GET`    | `/health`       | Aggregate health with a per-component breakdown             |
| `GET`    | `/health/live`  | Liveness — uptime in seconds                                |
| `GET`    | `/health/ready` | Readiness — same shape as `/health`                         |
| `GET`    | `/pokemon`      | Filter (`classification`, `type`, `search`), sort, paginate |
| `POST`   | `/pokemon`      | 201 with the full variant; classification-specific defaults |
| `GET`    | `/pokemon/{id}` | 200 or empty 404; `id` is capped at 1025 by the contract    |
| `PUT`    | `/pokemon/{id}` | Full replace; preserves `id` and `createdAt`                |
| `DELETE` | `/pokemon/{id}` | 204 with an empty body, or empty 404                        |

State is in memory and seeded with four Pokémon, so it resets on every restart. The exact
semantics — including the quirks kept for parity — are specified in
[docs/migration/01-current-behavior-spec.md](./docs/migration/01-current-behavior-spec.md).

## Stack

| Library                                                                       | Purpose                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`effect`](https://effect.website/)                                           | Runtime, effect system, `Schema`, `Layer`, and `HttpApi` |
| [`@effect/platform-node`](https://effect.website/docs/platform/introduction/) | Node HTTP server platform layer                          |
| [`@typespec/compiler`](https://typespec.io/)                                  | API-first contract definition language                   |
| [`@effect/openapi-generator`](https://github.com/Effect-TS/effect)            | Generates the Effect contract and client from OpenAPI    |
| [`@effect/vitest`](https://github.com/Effect-TS/effect)                       | Effect-aware test helpers on top of `vitest`             |
| [`oxlint` / `oxfmt`](https://oxc.rs/)                                         | Linting and formatting (replaces eslint + prettier)      |

All `effect` packages are **pinned to an exact version** (`4.0.0-rc.112`). Verify Effect APIs
against the installed source (`node_modules/effect/src` and the `src/` each `@effect/*` package
ships) — the vendored `repos/effect` subtree tracks upstream `main` and has drifted ahead of
the pin. Bump the pins and the subtree together, then rerun `npm run generate && npm run check`.

## Agent instructions

This repository is optimized for AI agents (Gemini, Claude, etc.).
See [AGENTS.md](./AGENTS.md) — [GEMINI.md](./GEMINI.md) is a symlink to it — for architectural
conventions, rules, and the gotchas worth knowing before touching anything.

## License

UNLICENSED
