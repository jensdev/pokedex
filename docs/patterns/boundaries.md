# Architectural Boundaries

This document is the *living* rule set for where code goes and what may import what. For the
reasoning behind these boundaries — and the NestJS implementation they replaced — see
[docs/migration/02-target-architecture.md](../migration/02-target-architecture.md).

There are three layers and one generated artifact between them.

| Layer                | Responsibility                                           | May import                                                                                                     |
| :------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **`src/http/`**      | The wire boundary: routing, decode/encode, error mapping | `effect/unstable/http*`, `effect/unstable/httpapi`, `src/generated/`, `src/services/`, `src/domain/`           |
| **`src/services/`**  | Application logic and the storage port                   | `effect` core (`Effect`, `Layer`, `Schema`, `Ref`, `Clock`, `DateTime`, `Random`), `src/generated/` types, `src/domain/` |
| **`src/domain/`**    | Pure rules and error types                               | `effect` (`Schema` only, today), `src/generated/` types                                                        |
| **`src/generated/`** | Emitted from `tsp/`                                      | nothing of ours — it is generated                                                                              |

## The core rule: HTTP stops at `src/http/`

`src/services/` and `src/domain/` **must not import from `effect/unstable/http*` or
`effect/unstable/httpapi`.** That is the whole boundary, and it is mechanically checkable:

```bash
grep -rn "unstable/http" src/domain src/services   # must print nothing
```

What it buys: the services are drivable from a test, a CLI, a queue consumer, or a second
transport without touching a line of them. It is also what makes the test pyramid in
[AGENTS.md](../../AGENTS.md) possible — `test/Pokedex.test.ts` exercises the full read side
with no server anywhere in scope.

## Generated types cross the boundary; HTTP does not

This is the one place this codebase deliberately departs from classic clean architecture.
There are **no mappers and no separate domain entities**. `src/services/` and `src/domain/`
use the generated `PokemonVariant`, `CreatePokemonRequest`, and friends directly.

Why: the TypeSpec contract *is* the domain model here, and a hand-written duplicate of it
would be a second source of truth that drifts. `src/generated/Api.ts` exports plain types and
`Schema` values — no HTTP, no framework — so importing it costs the domain nothing it was
protecting. The moment a domain concept stops matching its wire shape, that is the moment to
introduce a domain type and a mapper for it, and not before.

What the domain still must not do is depend on the *transport*: no status codes, no headers,
no `HttpApiSchema` annotations below `src/http/`.

## Dependency inversion

The storage port is a `Context.Service` interface with the adapter as a separate `Layer`:

```ts
// The port — src/services/PokemonRepository.ts
export class PokemonRepository extends Context.Service<PokemonRepository, {
  readonly fetchAll: Effect.Effect<ReadonlyArray<PokemonVariant>, PokemonDataParse>
  // …
}>()('pokedex/PokemonRepository') {
  static readonly layerInMemory = Layer.effect(PokemonRepository, /* the Ref-backed adapter */)
}
```

A service that depends on a port exposes **two** layers: `layerNoDeps` requiring the port and
`layer` wiring an adapter for convenience. `Pokedex` is the example.

**The application uses `layerNoDeps`.** `src/http/AppLayer.ts` is the composition root and the
only place that names an adapter:

```ts
export const AppLayer = AllRoutes.pipe(
  Layer.provide([Health.layer, Pokedex.layerNoDeps]),
  Layer.provide(HealthChecks.layer),
  Layer.provide(PokemonRepository.layerInMemory),
);
```

A convenience `layer` that bakes its adapter in is fine for a test; wiring the *application*
out of them is not. It hides the instance: a second consumer that provided its own repository
would get a second `Ref` store, silently, because the service in front of it already had one.
Naming the adapter once, above every consumer, is what makes them share it — and what makes
swapping the `Ref` store for a database a one-line change with a type error anywhere it does
not fit.

`src/main.ts` composes `AppLayer` with the server and the observability layer and does nothing
else. The tests that exercise the whole stack import `AppLayer` too, so they run the server's
wiring rather than a lookalike that can drift from it.

## Error boundaries

Failures are values, and which channel they travel in is a design decision, not an accident.

| Channel           | Where it is created                           | Where it is turned into a response |
| :---------------- | :-------------------------------------------- | :--------------------------------- |
| Typed failure     | `src/domain/Errors.ts` (`Schema.TaggedError`) | `src/http/*Handlers.ts`            |
| Schema violation  | `HttpApiBuilder`, on a bad param/query/payload | `src/http/ServerApi.ts` middleware |
| Plain defect      | a bug, anywhere                               | `src/http/Defects.ts`              |
| Anything outside a route | the server chain — a response that fails to write | the `ErrorReporter` in `src/Observability.ts` |

Rules:

1. **Domain errors are HTTP-agnostic.** `PokemonNotFound` carries an id, not a 404.
2. **The handler owns the mapping.** `PokemonNotFound` → the contract's 404 `ApiError`,
   `PokemonDataParse` → the contract's 500 `ApiError`. Both mappings live in
   `src/http/PokedexHandlers.ts` and nowhere else.
3. **Every failure a caller should handle is in the error channel.** If a service method can
   fail, it says so in its type. `Pokedex.create` has no error channel because there is
   genuinely nothing left to reject once the contract has validated the payload.
4. **A defect is a bug, never a shortcut.** No `Effect.die` placeholders. Where a defect is
   the honest answer, a comment says why the case is unreachable.
5. **Nothing internal reaches the client.** The defect boundary answers a fixed `ApiError`
   and puts the cause in the log, not the body. A 4xx is the exception that proves it: a
   schema violation is the *client's* mistake, so its body says which part of the request was
   wrong and why.
6. **A failure that becomes a response still gets logged.** `Effect.mapError` to a contract
   body throws the cause away, and the contract bodies are deliberately uninformative — so a
   500 the handler produces is logged with its cause before the mapping, exactly like one the
   defect boundary catches.

### Selecting a status is a schema problem

`HttpApiBuilder` encodes a handler's failure against a `Schema.Union` of the endpoint's error
members **in declaration order, first match wins**. It does not consult the handler about
which status it meant. Two consequences, both learned the hard way:

- `HttpApiSchema.Empty(404)` is `Schema.Void`, which matches anything. An endpoint carrying
  one answers 404 for every typed failure it has.
- Structurally identical members are just as bad. Three `ApiError` bodies at 400, 404, and 500
  would make every failure a 400.

So the members have to be **disjoint**, and `tsp/models/common.tsp` makes them so by pinning
`code` to a literal per status (`CodedApiError<"BAD_REQUEST">`, `CodedApiError<"POKEMON_NOT_FOUND">`).
The open `ApiError` stays on the `default` 500, which is last. The payoff is that the
generated literal types make picking the wrong status a compile error rather than a wire bug.

### Middleware attaches to the api, not to the layer

`HttpApiBuilder.group` bakes an endpoint's middleware into its routes when the *group layer*
is built. An api that grows middleware afterwards — at `HttpApiBuilder.layer`, say — produces
routes that never run it, with no error anywhere. `src/http/ServerApi.ts` therefore exports
`ServerApi`, and **every module that builds handlers imports that**, never the generated
`PokedexApi`.

The same mechanism has a second edge: `HttpApiEndpoint.getErrorSchemas` appends a middleware's
declared error to every endpoint's error union, so declaring one changes the served
`/openapi.json`. The served document has to stay equal to the committed contract, which is why
`SchemaErrorHandler` declares no error and answers with a response instead.
`test/ServerApi.test.ts` is the gate.

## Purity

`src/domain/` is total, synchronous, and effect-free: `makeVariant` and `replaceVariant` take
the id and the timestamps as arguments rather than reading a clock or a random source. Time
and randomness enter through Effect services — `DateTime.now`, `Clock`, and `Random.next` —
so a test can control every one of them with `TestClock` and `Random.withSeed`. No
`Date.now()` and no `Math.random()` anywhere below `src/http/`:

```bash
grep -rn "Date.now()\|Math.random()" src   # must print nothing
```

## Observability

Spans and log records are produced throughout and *exported* in exactly one place. Services
carry their own spans (`Effect.fn` for methods with arguments, `Effect.withSpan` for members
that are effect values) and know nothing about where they go; `src/Observability.ts` decides
that from `OTLP_URL`, and `src/main.ts` provides it below the server layer so the framework's
own request span and log line are exported too.

A test never installs an exporter. That is why observability is provided in `main.ts` rather
than in `AppLayer`.

## Summary

- HTTP stops at `src/http/`; the grep above is the test.
- Generated types are shared; the transport is not.
- Ports are interfaces, adapters are layers, and `src/http/AppLayer.ts` is the only place that
  picks one.
- Expected failures are typed; defects are logged and flattened to one opaque 500; schema
  violations are the client's mistake and say so.
- Error-union members must be disjoint, or the status the handler meant is not the status the
  client gets.
- Handlers build from `ServerApi`, never from `PokedexApi`.
