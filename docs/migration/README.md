# NestJS → Effect 4.0 Migration

> ## ✅ Migration complete — 2026-09-01
>
> All seven phases are done. The Pokédex backend runs on **`effect` /
> `@effect/platform-node` `4.0.0-rc.112`** (pinned exactly), with no NestJS left in the
> repository. Every Health and Pokédex endpoint is implemented and tested, CI gates the
> TypeSpec → OpenAPI → Effect contract against drift, and a typed consumer client is generated
> from the same spec.
>
> **These documents are now a design record, not a plan.** They describe what the NestJS
> implementation did, why the target architecture looks the way it does, and what each phase
> ran into — read them to understand a decision, not to find out what to do next. The living
> rules are [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), and
> [docs/patterns/boundaries.md](../patterns/boundaries.md).
>
> What is still *open* — parity decisions the rewrite kept deliberately, and the questions
> Phase 7 raised about them — is in
> [§Open questions](01-current-behavior-spec.md#open-questions-phase-7). Nothing there has been
> acted on; each item is a stakeholder call.

Greenfield rewrite of the Pokédex backend from NestJS 11 to Effect 4.0 (RC), keeping the
TypeSpec contract in `tsp/` as the single source of truth.

## The three macro steps

1. **Spec & plan** — capture how the current NestJS implementation behaves,
   design the target architecture, and validate the generation toolchain. No code changes.
2. **Teardown** — delete all NestJS code and dependencies, land a minimal Effect-ready
   skeleton (scripts, tsconfig, generated contract), push to `main`. The repo has no runnable
   server at the end of this step — that is expected.
3. **Rebuild bit by bit** — implement the Effect application in small, independently
   verifiable phases (one or more per session).

## Documents

| Doc | Contents |
| --- | --- |
| [01-current-behavior-spec.md](01-current-behavior-spec.md) | What the NestJS app did — endpoint semantics, seed data, quirks, and parity decisions, plus the **open questions** Phase 7 raised about them |
| [02-target-architecture.md](02-target-architecture.md) | Target directory layout, layer graph, and module responsibilities |
| [03-toolchain.md](03-toolchain.md) | TypeSpec → openapi.yaml → `@effect/openapi-generator` pipeline, configs, scripts, and the contract fix required for the generator |
| [04-implementation-patterns.md](04-implementation-patterns.md) | Verified Effect 4.0 code patterns: services, repository, `HttpApiBuilder.group` handlers, `main.ts`, testing |
| [05-phased-checklist.md](05-phased-checklist.md) | The phase-by-phase execution checklist with verification steps per phase |

## Key decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Effect version | Pin exact `4.0.0-rc.112` | RC releases can break between versions; the installed package source (`node_modules/effect/src`) is the API reference |
| Generator | `@effect/openapi-generator` (`openapigen`), format `httpapi` | Generates `HttpApi`/`HttpApiGroup`/`HttpApiEndpoint` + `Schema` models directly from `tsp-output/openapi.yaml` — validated end-to-end against this repo's spec |
| Contract change | Replace `extends Pokemon` + `@discriminator` with `...spread` composition in `tsp/models/pokemon.tsp` | The generator collapses `allOf`-inheritance schemas to `Schema.Never` (verified). Spread emits self-contained variant schemas, which generate a correct discriminated union (verified). Wire format is unchanged |
| HTTP platform | `@effect/platform-node` (`NodeHttpServer` + `node:http`) | Node is the current deployment target; Bun swap is a one-line change in `main.ts` |
| State | In-memory repository behind a port (`Context.Service`), seeded with the same 4 Pokémon | Parity with the current app; a real database becomes a new `Layer` later |
| Tests | `@effect/vitest` + `HttpApiTest.groups` in-memory client | Exercises the full encode/route/decode pipeline without a live server |

## Ground rules

- Effect APIs are verified against `node_modules/effect/src` (the installed rc), never from
  memory. `repos/effect` tracks upstream `main` and has drifted ahead of the published
  `4.0.0-rc.112` despite reporting that version, so when the two disagree the installed source
  wins; `@effect/platform-node` and `@effect/openapi-generator` ship their own `src/` too.
- `src/generated/Api.ts` and `src/generated/Client.ts` are emitted — never hand-edited.
  Regenerate with `npm run generate`; CI fails on any drift.
- Handlers contain **no domain logic**: they translate between the wire contract and domain
  services (error mapping included).
- Domain services and the repository never import from `effect/unstable/http*` — they are
  pure Effect (`Effect`, `Layer`, `Schema`, `Ref`, `Clock`).
