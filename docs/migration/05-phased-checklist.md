# Phased Execution Checklist

Each phase is sized for one working session, ends in a green `npm run check` (once it
exists), and finishes with a commit. Verification steps are part of the phase — a phase is
not done until they pass.

---

## Phase 0 — Spec & plan ✅

- [x] Behavior spec of the NestJS implementation (`01-current-behavior-spec.md`)
- [x] Target architecture, toolchain, and implementation patterns documented
- [x] Generation pipeline validated end-to-end against `tsp-output/openapi.yaml`
      (found + solved the `allOf` → `Schema.Never` union collapse)
- [x] Commit docs to the repo

## Phase 1 — Contract fix (TypeSpec)

Do this **before** teardown so the contract change is reviewable against the still-running
NestJS app.

First, refresh the vendored Effect reference (the subtree and the npm pins must always move
together — the subtree is the API reference all Effect code is verified against):

- [ ] `git subtree pull --prefix repos/effect https://github.com/Effect-TS/effect.git main --squash`
- [ ] Read the new version from `repos/effect/packages/effect/package.json` and update every
      `4.0.0-rc.110` pin reference in `docs/migration/03-toolchain.md` and `docs/migration/README.md`
- [ ] Re-run the generator smoke test against the new rc:
      `npx @effect/openapi-generator@rc --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi`

Then the contract fix itself:

- [ ] Refactor `tsp/models/pokemon.tsp`: replace `@discriminator` + `extends` with
      `PokemonBase` + `...spread` per [03-toolchain.md](03-toolchain.md#required-contract-fix-discriminated-union)
- [ ] `npm run typespec:compile` — regenerate `tsp-output/openapi.yaml`
- [ ] Verify: `NormalPokemon`/`LegendaryPokemon`/`MythicalPokemon` in the emitted YAML are
      self-contained objects (no `allOf`), `PokemonVariant` is an `anyOf` of the three refs
- [ ] Verify: `npx @effect/openapi-generator@rc --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi`
      output contains **zero** `Schema.Never` and a three-member `PokemonVariant` union
- [ ] Commit

## Phase 2 — NestJS teardown → push to `main`

- [ ] Delete `src/` entirely (including `src/generated` hey-api output), `nest-cli.json`,
      `tsconfig.build.json`, `openapi-ts.config.ts`, `patches/`, jest config in `package.json`
- [ ] Rewrite `package.json` per [03-toolchain.md](03-toolchain.md#target-packagejson)
      (pinned `4.0.0-rc.110`), delete `package-lock.json`, `npm install`
- [ ] New `tsconfig.json` / `tsconfig.build.json` per 03-toolchain.md
- [ ] Keep: `tsp/`, `tspconfig.yaml`, `tsp-output/`, `docs/`, `repos/effect`, eslint/prettier
      (trim NestJS-specific eslint rules)
- [ ] `mkdir src/generated && npm run generate` — commit the generated `src/generated/Api.ts`
- [ ] Add a placeholder `src/main.ts` (`console.log("not yet implemented")`) so
      `npm run typecheck` and `npm run build` pass
- [ ] Verify: `npm run generate` idempotent (no diff on second run), `npm run typecheck` green
- [ ] Update `README.md` (commands, no more Nest)
- [ ] Commit, push to `main`

## Phase 3 — Runtime skeleton + Health group

Smallest end-to-end slice: server boots, one group fully implemented.

- [ ] `src/AppConfig.ts` (`PORT` handled in main, `APP_VERSION`, `FLAKY_UPSTREAM_RATE`)
- [ ] `src/services/Health.ts` (`Context.Service`; uptime via `Clock`, values per behavior spec)
- [ ] `src/http/HealthHandlers.ts` (`HttpApiBuilder.group(PokedexApi, "Health", ...)`)
- [ ] `src/http/Routes.ts` with the Health group only + `HttpApiScalar` docs route +
      `openapiPath: "/openapi.json"`; **stub the Pokedex group** with
      `Effect.die("not implemented")` handlers so `HttpApiBuilder.layer` finds every group
- [ ] `src/main.ts` per [04-implementation-patterns.md](04-implementation-patterns.md#5-routes--entry-point--httproutests-and-maints)
- [ ] Tests: `HttpApiTest.groups(PokedexApi, ["Health"])` — check all three endpoints
- [ ] Verify manually: `npm run dev`, then `curl localhost:3000/health`,
      `/health/live`, `/health/ready`, open `/docs`, `/openapi.json`
- [ ] Commit

## Phase 4 — Domain + repository

No HTTP in this phase; pure Effect.

- [ ] `src/domain/Errors.ts` (`PokemonNotFound`, `PokemonDataParse`)
- [ ] `src/domain/Pokemon.ts` (`makeVariant` / `replaceVariant` pure functions implementing
      the default/preservation rules from the behavior spec — including quirk P2)
- [ ] `src/services/seed.ts` — the 4 seed Pokémon, byte-identical values to the old constants
- [ ] `src/services/PokemonRepository.ts` — port + `layerInMemory` (Ref store, ID sequence
      from 1026, flaky `fetchAll` behind `FLAKY_UPSTREAM_RATE`)
- [ ] Unit tests for `makeVariant`/`replaceVariant` (all three classifications, change vs.
      keep classification) and repository (save/replace/remove/nextId)
- [ ] Verify: `npm run check` green
- [ ] Commit

## Phase 5 — Pokedex read endpoints

- [ ] `src/services/Pokedex.ts`: `list` (filter → search → sort → paginate, exact semantics
      from behavior spec §listPokemon) and `getById`
- [ ] `src/http/PokedexHandlers.ts`: replace stubs for `listPokemon` + `getPokemonById`
      (error mapping: `PokemonDataParse` → `ApiError` 500, `PokemonNotFound` → empty 404)
- [ ] Domain tests: each filter, combined filters, sort by each field asc/desc, pagination
      edges (`total` counts pre-pagination; page beyond end → empty items)
- [ ] HTTP tests: list happy path, `?classification=&type=&search=` combinations, 404,
      out-of-range id → 400
- [ ] Verify against spec: same requests against old NestJS behavior spec expectations
- [ ] Commit

## Phase 6 — Pokedex write endpoints

- [ ] `Pokedex.create` / `replace` / `remove` + handler wiring for `createPokemon` (201),
      `replacePokemon`, `deletePokemon` (204)
- [ ] Tests: create defaults per classification; id sequence 1026, 1027…; replace preserves
      `createdAt` + variant extras when classification unchanged (and documents quirk P2);
      replace/delete 404; delete then get → 404
- [ ] Verify: full `npm run check`; manual smoke via `/docs`
- [ ] Commit

## Phase 7 — Hardening & DX

- [ ] Error-channel audit: no `Effect.die` stubs left; defects log but return contract-shaped 500s
- [ ] Logging/tracing pass: `Effect.fn` span names on service methods,
      `Effect.annotateCurrentSpan` for search/filter params
- [ ] CI: `npm run generate && git diff --exit-code` (contract drift gate) + `npm run check`
- [ ] `GEMINI.md` / `AGENTS.md` refresh: new commands, architecture pointers to `docs/migration/`
- [ ] Optional: typed client package via `--format httpclient` for consumers
- [ ] Optional: revisit parity decisions P1/P2 with stakeholders
- [ ] Commit

---

## Session ritual

Start of each session: read `README.md` + this checklist, `git log --oneline -5`, then pick
the next unchecked phase. End of each session: tick the boxes done here, commit docs updates
together with the code.
