# Architectural Boundaries

This document is the *living* rule set for where code goes and what may import what. For the
reasoning behind these boundaries — and the NestJS implementation they replaced — see
[docs/migration/02-target-architecture.md](../migration/02-target-architecture.md).

There are three layers and one generated artifact between them.

| Layer                | Responsibility                                           | May import                                                                                                     |
| :------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **`src/http/`**      | The wire boundary: routing, decode/encode, error mapping | `effect/unstable/http*`, `effect/unstable/httpapi`, `src/generated/`, `src/services/`, `src/domain/`           |
| **`src/services/`**  | Application logic and the storage port                   | `effect` core (`Effect`, `Layer`, `Schema`, `Ref`, `Clock`, `DateTime`), `src/generated/` types, `src/domain/` |
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

A service that depends on a port exposes **two** layers: `layerWithX` requiring the port (so a
test can substitute a fixture) and `layer` wiring the production adapter. `Pokedex` is the
example. Swapping the `Ref` store for a database is then a new `Layer` and nothing else.

## Error boundaries

Failures are values, and which channel they travel in is a design decision, not an accident.

| Channel              | Where it is created                           | Where it is turned into a response |
| :------------------- | :-------------------------------------------- | :--------------------------------- |
| Typed failure        | `src/domain/Errors.ts` (`Schema.TaggedError`) | `src/http/*Handlers.ts`            |
| `Respondable` defect | `HttpApiBuilder`, on a schema violation       | the platform — leave it alone      |
| Plain defect         | a bug, anywhere                               | `src/http/Defects.ts`              |

Rules:

1. **Domain errors are HTTP-agnostic.** `PokemonNotFound` carries an id, not a 404.
2. **The handler owns the mapping.** `PokemonNotFound` → the contract's empty-404 member,
   `PokemonDataParse` → the contract's `ApiError`. Both mappings live in
   `src/http/PokedexHandlers.ts` and nowhere else.
3. **Every failure a caller should handle is in the error channel.** If a service method can
   fail, it says so in its type. `Pokedex.create` has no error channel because there is
   genuinely nothing left to reject once the contract has validated the payload.
4. **A defect is a bug, never a shortcut.** No `Effect.die` placeholders. Where a defect is
   the honest answer, a comment says why the case is unreachable.
5. **Nothing internal reaches the client.** The defect boundary answers a fixed `ApiError`
   and puts the cause in the log, not the body.

## Purity

`src/domain/` is total, synchronous, and effect-free: `makeVariant` and `replaceVariant` take
the id and the timestamps as arguments rather than reading a clock or a random source. Time
and randomness enter through Effect services — `DateTime.now`, `Clock`, and the `Config`-driven
flaky-upstream simulation — so a test can control every one of them.

## Summary

- HTTP stops at `src/http/`; the grep above is the test.
- Generated types are shared; the transport is not.
- Ports are interfaces, adapters are layers, and a service that has a port has two layers.
- Expected failures are typed; defects are logged and flattened to one opaque 500.
