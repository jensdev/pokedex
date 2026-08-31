# Target Architecture

## Directory layout

```
tsp/                          # TypeSpec contract — the source of truth
tsp-output/openapi.yaml       # emitted by `tsp compile` (committed)
src/
├── generated/
│   └── Api.ts                # ⚙️ emitted by openapigen — NEVER hand-edited
├── domain/
│   ├── Pokemon.ts            # domain aliases over generated types + variant construction rules
│   └── Errors.ts             # Schema.TaggedError domain errors (PokemonNotFound, PokemonDataParse)
├── services/
│   ├── PokemonRepository.ts  # port (Context.Service) + in-memory adapter Layer + seed data
│   ├── Pokedex.ts            # domain service: list/get/create/replace/delete orchestration
│   └── Health.ts             # health/liveness/readiness values
├── http/
│   ├── PokedexHandlers.ts    # HttpApiBuilder.group(PokedexApi, "Pokedex", ...)
│   ├── HealthHandlers.ts     # HttpApiBuilder.group(PokedexApi, "Health", ...)
│   └── Routes.ts             # HttpApiBuilder.layer + HttpApiScalar docs route
├── AppConfig.ts              # Config values (port, flaky-upstream rate, version)
└── main.ts                   # layer composition + NodeRuntime.runMain
test/
├── PokedexApi.test.ts        # HttpApiTest.groups end-to-end tests
└── Pokedex.test.ts           # domain service tests
docs/migration/               # these documents
```

## Dependency rule

```
main.ts ─▶ http/ ─▶ services/ ─▶ domain/ ─▶ generated/
```

- `generated/` has no project imports (only `effect`).
- `domain/` imports only `generated/` and core `effect` modules.
- `services/` define **ports** as `Context.Service` classes and ship their **adapters** as
  static `Layer`s on the same class (`PokemonRepository.layerInMemory`). No HTTP imports.
- `http/` is the only place that imports `effect/unstable/httpapi` besides `generated/` and
  `main.ts`. Handlers map domain errors → wire errors and nothing else.
- `main.ts` is the only file that knows about the platform (`@effect/platform-node`).

## Layer graph

```
                        Layer.launch ▶ NodeRuntime.runMain
                                 │
                     HttpRouter.serve(AllRoutes)
                                 │
             ┌───────────────────┴───────────────────┐
        AllRoutes                            NodeHttpServer.layerConfig
   Layer.mergeAll(...)                        (node:http, Config PORT)
     │             │
 ApiRoutes      DocsRoute
 HttpApiBuilder  HttpApiScalar
 .layer(Api)     .layer(Api, "/docs")
     │
     ├── PokedexHandlers ──▶ Pokedex ──▶ PokemonRepository.layerInMemory
     └── HealthHandlers  ──▶ Health                │
                                              AppConfig (flaky rate)
```

Each box is a `Layer`; arrows are `Layer.provide`. Every arrow is swappable in tests:
`PokemonRepository.layerInMemory` for a deterministic variant, the whole server for
`HttpApiTest.groups`.

## Module responsibilities

| Module | Owns | Must not |
| --- | --- | --- |
| `generated/Api.ts` | `PokedexApi` (`HttpApi`), groups `"Health"` / `"Pokedex"`, all request/response `Schema`s | Be edited; contain logic |
| `domain/Pokemon.ts` | `PokemonVariant` type aliases, `makeVariant`/`replaceVariant` pure construction rules (defaults from the behavior spec) | Perform effects |
| `domain/Errors.ts` | `PokemonNotFound`, `PokemonDataParse` as `Schema.TaggedError` | Know about HTTP statuses (mapping lives in `http/`) |
| `services/PokemonRepository.ts` | Port interface + in-memory `Ref`-based adapter, seed data, ID sequence | Validate wire payloads |
| `services/Pokedex.ts` | Filtering/sorting/pagination, orchestration, timestamps via `DateTime`/`Clock` | Build HTTP responses |
| `http/*Handlers.ts` | `handlers.handleAll({...})`, domain-error → contract-error mapping | Contain business rules |
| `main.ts` | Composition, config, runtime | Export anything used elsewhere |
