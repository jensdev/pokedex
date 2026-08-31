# Implementation Patterns (Effect 4.0 RC)

All snippets below use APIs verified against `repos/effect` at `4.0.0-rc.112`. Import paths
to remember:

```ts
import { Config, Context, Effect, Layer, Option, Ref, Schema } from "effect"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiScalar, HttpApiTest } from "effect/unstable/httpapi"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
```

## 1. Domain errors — `domain/Errors.ts`

```ts
import { Schema } from "effect"

export class PokemonNotFound extends Schema.TaggedError<PokemonNotFound>()(
  "PokemonNotFound",
  { id: Schema.Number }
) {}

export class PokemonDataParse extends Schema.TaggedError<PokemonDataParse>()(
  "PokemonDataParse",
  {}
) {}
```

Domain errors stay HTTP-agnostic; the status mapping happens in the handlers.

## 2. Repository port + in-memory adapter — `services/PokemonRepository.ts`

The port is a `Context.Service`; the adapter is a static `Layer` on the same class.

```ts
import { Context, Effect, Layer, Option, Ref } from "effect"
import type { PokemonVariant } from "../generated/Api.js"
import { PokemonDataParse } from "../domain/Errors.js"
import { seedPokemon } from "./seed.js"
import { FlakyUpstreamRate } from "../AppConfig.js"

export class PokemonRepository extends Context.Service<PokemonRepository, {
  /** Simulates the flaky upstream: fails with PokemonDataParse at the configured rate. */
  readonly fetchAll: Effect.Effect<ReadonlyArray<PokemonVariant>, PokemonDataParse>
  readonly findById: (id: number) => Effect.Effect<Option.Option<PokemonVariant>>
  readonly nextId: Effect.Effect<number>
  readonly save: (pokemon: PokemonVariant) => Effect.Effect<void>
  /** Returns false when the id did not exist. */
  readonly remove: (id: number) => Effect.Effect<boolean>
}>()("pokedex/PokemonRepository") {
  static readonly layerInMemory = Layer.effect(
    PokemonRepository,
    Effect.gen(function*() {
      const flakyRate = yield* FlakyUpstreamRate
      const store = yield* Ref.make<ReadonlyArray<PokemonVariant>>(seedPokemon)
      const idSequence = yield* Ref.make(1026)

      return {
        fetchAll: Effect.gen(function*() {
          const roll = yield* Effect.sync(() => Math.random())
          if (roll < flakyRate) return yield* new PokemonDataParse()
          return yield* Ref.get(store)
        }),
        findById: (id) =>
          Ref.get(store).pipe(
            Effect.map((all) => Option.fromNullishOr(all.find((p) => p.id === id), null))
          ),
        nextId: Ref.getAndUpdate(idSequence, (n) => n + 1),
        save: (pokemon) =>
          Ref.update(store, (all) =>
            all.some((p) => p.id === pokemon.id)
              ? all.map((p) => (p.id === pokemon.id ? pokemon : p))
              : [...all, pokemon]),
        remove: (id) =>
          Ref.modify(store, (all) => {
            const next = all.filter((p) => p.id !== id)
            return [next.length !== all.length, next]
          })
      }
    })
  )
}
```

## 3. Domain service — `services/Pokedex.ts`

Owns filtering/sorting/pagination and the variant construction rules
(defaults per the behavior spec). Sketch of the shape:

```ts
import { Context, DateTime, Effect, Layer } from "effect"
import type { ListPokemonQuery, ListPokemon200, PokemonVariant, CreatePokemonRequest } from "../generated/Api.js"
import { PokemonNotFound, PokemonDataParse } from "../domain/Errors.js"
import { makeVariant, replaceVariant } from "../domain/Pokemon.js"
import { PokemonRepository } from "./PokemonRepository.js"

export class Pokedex extends Context.Service<Pokedex, {
  readonly list: (query: ListPokemonQuery) => Effect.Effect<ListPokemon200, PokemonDataParse>
  readonly getById: (id: number) => Effect.Effect<PokemonVariant, PokemonNotFound>
  readonly create: (input: CreatePokemonRequest) => Effect.Effect<PokemonVariant>
  readonly replace: (id: number, input: CreatePokemonRequest) => Effect.Effect<PokemonVariant, PokemonNotFound>
  readonly remove: (id: number) => Effect.Effect<void, PokemonNotFound>
}>()("pokedex/Pokedex") {
  static readonly layer = Layer.effect(
    Pokedex,
    Effect.gen(function*() {
      const repo = yield* PokemonRepository

      const list = Effect.fn("Pokedex.list")(function*(query: ListPokemonQuery) {
        const all = yield* repo.fetchAll
        // classification filter → type filter (primary OR secondary) →
        // case-insensitive name search → optional sort → slice-paginate.
        // total = filtered length BEFORE pagination (behavior spec §listPokemon).
        // ...
      })

      const create = Effect.fn("Pokedex.create")(function*(input: CreatePokemonRequest) {
        const id = yield* repo.nextId
        const now = DateTime.formatIso(yield* DateTime.now)
        const pokemon = makeVariant(input, { id, createdAt: now, updatedAt: now })
        yield* repo.save(pokemon)
        return pokemon
      })

      // getById / replace / remove follow the same shape, failing with
      // new PokemonNotFound({ id }) when Option.isNone(...)
      return { list, getById, create, replace, remove }
    })
  ).pipe(Layer.provide(PokemonRepository.layerInMemory))
}
```

Timestamps come from `DateTime.now` (Clock-backed → deterministic in tests with `TestClock`),
never `new Date()`.

## 4. Handlers — `http/PokedexHandlers.ts`

`HttpApiBuilder.group(api, groupName, build)` returns a `Layer` providing that group's
handlers. `handlers.handleAll` forces every endpoint of the group to be implemented —
a missing or misnamed key is a **compile error**, which is the contract-first guarantee.

The generated error schemas determine what handlers `Effect.fail` with:

- `ApiError` is a plain struct (default status → 500): fail with `{ code, message }`.
- `HttpApiSchema.Empty(404)` is `Schema.Void` annotated with status 404: fail with
  `undefined` — the builder encodes it as an empty 404.

```ts
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { PokedexApi, type ApiError } from "../generated/Api.js"
import { Pokedex } from "../services/Pokedex.js"

/** PokemonDataParse (and anything unexpected) → contract ApiError, status 500. */
const toApiError = (): ApiError => ({
  code: "POKEMON_DATA_PARSE_ERROR",
  message: "Pokemon data from source failed to parse"
})

/** Encodes as the HttpApiSchema.Empty(404) member of the error union. */
const notFound = Effect.fail(undefined)

export const PokedexHandlers = HttpApiBuilder.group(
  PokedexApi,
  "Pokedex",
  Effect.fn(function*(handlers) {
    const pokedex = yield* Pokedex

    return handlers.handleAll({
      listPokemon: ({ query }) =>
        pokedex.list(query).pipe(Effect.mapError(toApiError)),

      getPokemonById: ({ params }) =>
        pokedex.getById(params.id).pipe(Effect.catchTag("PokemonNotFound", () => notFound)),

      createPokemon: ({ payload }) => pokedex.create(payload),

      replacePokemon: ({ params, payload }) =>
        pokedex.replace(params.id, payload).pipe(Effect.catchTag("PokemonNotFound", () => notFound)),

      deletePokemon: ({ params }) =>
        pokedex.remove(params.id).pipe(Effect.catchTag("PokemonNotFound", () => notFound))
    })
  })
)
```

`http/HealthHandlers.ts` is the same pattern over the `"Health"` group
(`healthCheck`, `healthLiveness`, `healthReadiness`).

Handler inputs are fully typed and pre-validated: `params`/`query`/`payload` have already
been decoded with the generated schemas. Invalid requests never reach the handler — the
builder responds 400 with a structured schema error.

## 5. Routes + entry point — `http/Routes.ts` and `main.ts`

```ts
// http/Routes.ts
import { Layer } from "effect"
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi"
import { PokedexApi } from "../generated/Api.js"
import { HealthHandlers } from "./HealthHandlers.js"
import { PokedexHandlers } from "./PokedexHandlers.js"

// Registers every group with the router; serves the spec at /openapi.json.
// Fails fast at startup if any group layer is missing.
export const ApiRoutes = HttpApiBuilder.layer(PokedexApi, {
  openapiPath: "/openapi.json"
}).pipe(Layer.provide([PokedexHandlers, HealthHandlers]))

// Interactive API docs.
export const DocsRoute = HttpApiScalar.layer(PokedexApi, { path: "/docs" })

export const AllRoutes = Layer.mergeAll(ApiRoutes, DocsRoute)
```

```ts
// main.ts
import { createServer } from "node:http"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Config, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { AllRoutes } from "./http/Routes.js"

const ServerLayer = HttpRouter.serve(AllRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.port("PORT").pipe(Config.withDefault(3000))
    })
  )
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
```

That is the whole bootstrap: `HttpRouter.serve` turns the route layers into an HTTP app with
request logging, `NodeHttpServer.layerConfig` reads `PORT` from the environment,
`NodeRuntime.runMain` wires interruption/teardown (Ctrl-C drains the server scope).
Swapping to Bun is replacing the `NodeHttpServer`/`NodeRuntime` imports with
`BunHttpServer`/`BunRuntime` from `@effect/platform-bun`.

`AppConfig.ts` holds the remaining config:

```ts
import { Config } from "effect"

export const FlakyUpstreamRate = Config.finite("FLAKY_UPSTREAM_RATE").pipe(Config.withDefault(0.1))
export const AppVersion = Config.string("APP_VERSION").pipe(Config.withDefault("1.0.0"))
```

## 6. Testing — `test/PokedexApi.test.ts`

`HttpApiTest.groups` builds a typed client wired straight to the handlers — full
encode/route/decode pipeline, no sockets.

```ts
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpServer } from "effect/unstable/http"
import { HttpApiTest } from "effect/unstable/httpapi"
import { PokedexApi } from "../src/generated/Api.js"
import { PokedexHandlers } from "../src/http/PokedexHandlers.js"

const makeClient = HttpApiTest.groups(PokedexApi, ["Pokedex"])

// Provide handlers + the platform services the pipeline needs.
// (Provide a deterministic repository layer here — FLAKY_UPSTREAM_RATE=0.)
const TestLayer = Layer.mergeAll(PokedexHandlers, HttpServer.layerServices)

layer(TestLayer)("PokedexApi", (it) => {
  it.effect("creates and fetches a pokemon", () =>
    Effect.gen(function*() {
      const client = yield* makeClient

      const created = yield* client.Pokedex.createPokemon({
        payload: {
          name: "missingno",
          primaryType: "normal",
          baseStats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
          heightMetres: 1,
          weightKg: 1,
          isObtainable: false,
          classification: "normal"
        }
      })
      assert.strictEqual(created.id, 1026)

      const fetched = yield* client.Pokedex.getPokemonById({ params: { id: created.id } })
      assert.strictEqual(fetched.name, "missingno")
    }))

  it.effect("404s for a missing pokemon", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const result = yield* Effect.flip(client.Pokedex.getPokemonById({ params: { id: 999 } }))
      // Empty(404) decodes to void on the client error channel
      assert.isUndefined(result)
    }))
})
```

Domain-level tests (`Pokedex.test.ts`) skip HTTP entirely: provide
`PokemonRepository.layerInMemory` (or a handcrafted stub layer) and assert on the service
directly — list filter/sort/pagination cases live here, not in HTTP tests.
