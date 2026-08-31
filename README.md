# Effect Pokédex

A **contract-first** Pokédex API built with [TypeSpec](https://typespec.io/),
[OpenAPI](https://www.openapis.org/), and [Effect 4.0](https://effect.website/).

The API is defined in TypeSpec, compiled to an OpenAPI 3.0 spec, and then used to generate an
Effect `HttpApi` contract (`HttpApiGroup` / `HttpApiEndpoint` definitions plus `Schema` models)
— keeping the implementation and the documentation in sync by design.

> **Status: mid-migration.** This repository is being rewritten from NestJS 11 to Effect 4.0.
> The NestJS implementation is gone and the Effect implementation is landing phase by phase.
> The server **boots** and the health endpoints (`/health`, `/health/live`, `/health/ready`)
> are implemented, alongside `/docs` (Scalar) and `/openapi.json`. The `/pokemon` endpoints
> are registered but still stubbed — calling one is a defect (500). See
> [docs/migration/](./docs/migration/) for the plan and
> [docs/migration/05-phased-checklist.md](./docs/migration/05-phased-checklist.md) for what is
> done and what comes next.

## Pipeline

```
tsp/*.tsp ──tsp compile──▶ tsp-output/openapi.yaml ──openapigen (httpapi)──▶ src/generated/Api.ts
```

`src/generated/Api.ts` is **emitted, never hand-edited** — regenerate it with `npm run generate`.

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
│   │   └── Api.ts          # Generated Effect HttpApi contract (DO NOT EDIT)
│   ├── services/           #   Domain services (Health, …) — no HTTP imports
│   ├── http/               #   HttpApi handlers + route composition
│   ├── AppConfig.ts        #   Config values (APP_VERSION, FLAKY_UPSTREAM_RATE)
│   └── main.ts             # Entry point (server bootstrap)
├── test/                   # Test suite (@effect/vitest)
├── docs/migration/         # NestJS → Effect migration plan & checklist
├── repos/effect            # Vendored Effect source (upstream `main`, ahead of the pin)
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

| Command                    | What it does                                                               |
| -------------------------- | -------------------------------------------------------------------------- |
| `npm install`              | Install dependencies                                                       |
| `npm run generate`         | `typespec:compile` + `generate:api` — the full contract pipeline           |
| `npm run typespec:compile` | Compile `tsp/` into `tsp-output/openapi.yaml`                              |
| `npm run generate:api`     | Generate `src/generated/Api.ts` from the OpenAPI spec                      |
| `npm run dev`              | Run the server in watch mode (`tsx`) on `PORT` (default `3000`)            |
| `npm run build`            | Compile to `dist/`                                                         |
| `npm start`                | Run the compiled server (`node dist/main.js`)                              |
| `npm run typecheck`        | `tsc --noEmit`                                                             |
| `npm run lint`             | Lint with `oxlint` (type-aware)                                            |
| `npm run lint:fix`         | Lint and auto-fix                                                          |
| `npm run format`           | Format with `oxfmt`                                                        |
| `npm run format:check`     | Check formatting without writing                                           |
| `npm run test`             | Run the test suite (`vitest run`)                                          |
| `npm run check`            | `lint` + `format:check` + `typecheck` + `test` — the gate for every change |

After changing anything under `tsp/`, run `npm run generate` and commit the regenerated
`tsp-output/openapi.yaml` and `src/generated/Api.ts`.

## Stack

| Library                                                                       | Purpose                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`effect`](https://effect.website/)                                           | Runtime, effect system, `Schema`, `Layer`, and `HttpApi` |
| [`@effect/platform-node`](https://effect.website/docs/platform/introduction/) | Node HTTP server platform layer                          |
| [`@typespec/compiler`](https://typespec.io/)                                  | API-first contract definition language                   |
| [`@effect/openapi-generator`](https://github.com/Effect-TS/effect)            | Generates the Effect `HttpApi` contract from OpenAPI     |
| [`@effect/vitest`](https://github.com/Effect-TS/effect)                       | Effect-aware test helpers on top of `vitest`             |
| [`oxlint` / `oxfmt`](https://oxc.rs/)                                         | Linting and formatting (replaces eslint + prettier)      |

All `effect` packages are **pinned to an exact version** (`4.0.0-rc.112`). Verify Effect APIs
against `node_modules/effect/src` — the vendored `repos/effect` subtree tracks upstream `main`
and has drifted ahead of the pin. Bump the pins and the subtree together, then rerun
`npm run generate && npm run check`.

## Agent instructions

This repository is optimized for AI agents (Gemini, Claude, etc.).
See [AGENTS.md](./AGENTS.md) and [GEMINI.md](./GEMINI.md) for architectural conventions, rules,
and best practices for contributing to this codebase.

## License

UNLICENSED
