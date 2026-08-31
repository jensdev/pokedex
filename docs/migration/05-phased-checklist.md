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

## Phase 1 — Contract fix (TypeSpec) ✅

Do this **before** teardown so the contract change is reviewable against the still-running
NestJS app.

First, refresh the vendored Effect reference (the subtree and the npm pins must always move
together — the subtree is the API reference all Effect code is verified against):

- [x] `git subtree pull --prefix repos/effect https://github.com/Effect-TS/effect.git main --squash`
- [x] Read the new version from `repos/effect/packages/effect/package.json` and update every
      Effect pin reference in the migration docs (`03-toolchain.md`, `README.md`,
      `04-implementation-patterns.md`, and the Phase 2 pin below) to that version
- [x] Re-run the generator smoke test against the new rc:
      `npx @effect/openapi-generator@rc --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi`

Then the contract fix itself:

- [x] Refactor `tsp/models/pokemon.tsp`: replace `@discriminator` + `extends` with
      `PokemonBase` + `...spread` per [03-toolchain.md](03-toolchain.md#required-contract-fix-discriminated-union)
- [x] `npm run typespec:compile` — regenerate `tsp-output/openapi.yaml`
- [x] Verify: `NormalPokemon`/`LegendaryPokemon`/`MythicalPokemon` in the emitted YAML are
      self-contained objects (no `allOf`), `PokemonVariant` is an `anyOf` of the three refs
- [x] Verify: `npx @effect/openapi-generator@rc --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi`
      output contains **zero** `Schema.Never` and a three-member `PokemonVariant` union
- [x] Commit

## Phase 2 — NestJS teardown → push to `main` ✅

- [x] Delete `src/` entirely (including `src/generated` hey-api output), `nest-cli.json`,
      `tsconfig.build.json`, `openapi-ts.config.ts`, `patches/`, jest config in `package.json`
- [x] Rewrite `package.json` per [03-toolchain.md](03-toolchain.md#target-packagejson)
      (pinned `4.0.0-rc.112`), delete `package-lock.json`, `npm install`
- [x] New `tsconfig.json` / `tsconfig.build.json` per 03-toolchain.md
- [x] Keep: `tsp/`, `tspconfig.yaml`, `tsp-output/`, `docs/`, `repos/effect`
- [x] Replace eslint/prettier with **oxlint + oxfmt** (`.oxlintrc.json`, `.oxfmtrc.json`) —
      `eslint.config.mjs` and `.prettierrc` deleted, `oxfmt` replaces `prettier --write` in
      `generate:api`, and `npm run check` gains `lint` + `format:check` gates. See
      [03-toolchain.md](03-toolchain.md#linting--formatting-oxlint--oxfmt)
- [x] `mkdir src/generated && npm run generate` — commit the generated `src/generated/Api.ts`
- [x] Add a placeholder `src/main.ts` (`console.log("not yet implemented")`) so
      `npm run typecheck` and `npm run build` pass
- [x] Verify: `npm run generate` idempotent (no diff on second run), `npm run typecheck` green
- [x] Update `README.md` (commands, no more Nest)
- [x] Commit, push to `main`

Three corrections to 03-toolchain.md surfaced while executing this phase (all applied there):

- `vitest` must be `^4.1.0`, not `^3.0.0` — `@effect/vitest@4.0.0-rc.112` declares
  `peer vitest ">=4.1.0 <5.0.0"` and `npm install` fails outright on vitest 3.
- A `vitest.config.ts` is required. With no `include`, `vitest run` discovers the ~440 test
  files in the vendored `repos/effect` subtree and hangs. It scopes discovery to
  `src/**/*.test.ts` and sets `passWithNoTests: true` so `npm run check` is green until
  Phase 3 adds the first tests.
- **Lint/format is oxc, not eslint/prettier.** The target `package.json` had `prettier` but no
  eslint deps, which would have left `eslint.config.mjs` as a dead config. Both tools are
  replaced by `oxlint` + `oxfmt` instead. The same "always pass explicit paths" trap as vitest
  applies: a bare `oxlint` run finds `repos/effect/.oxlintrc.json` and dies on its JS plugin.

## Phase 3 — Runtime skeleton + Health group ✅

Smallest end-to-end slice: server boots, one group fully implemented.

- [x] `src/AppConfig.ts` (`PORT` handled in main, `APP_VERSION`, `FLAKY_UPSTREAM_RATE`)
- [x] `src/services/Health.ts` (`Context.Service`; uptime via `Clock`, values per behavior spec)
- [x] `src/http/HealthHandlers.ts` (`HttpApiBuilder.group(PokedexApi, "Health", ...)`)
- [x] `src/http/Routes.ts` with the Health group only + `HttpApiScalar` docs route +
      `openapiPath: "/openapi.json"`; **stub the Pokedex group** with
      `Effect.die("not implemented")` handlers so `HttpApiBuilder.layer` finds every group
- [x] `src/main.ts` per [04-implementation-patterns.md](04-implementation-patterns.md#5-routes--entry-point--httproutests-and-maints)
- [x] Tests: `HttpApiTest.groups(PokedexApi, ["Health"])` — check all three endpoints
- [x] Verify manually: `npm run dev`, then `curl localhost:3000/health`,
      `/health/live`, `/health/ready`, open `/docs`, `/openapi.json`
- [x] Commit

Notes from executing this phase:

- **`repos/effect` has drifted ahead of the published `4.0.0-rc.112`.** Its
  `packages/effect/package.json` still reads `4.0.0-rc.112`, but the source is post-release
  `main`: `Config` constructors were renamed there (`Config.string` → `Config.String`,
  `Config.finite` → `Config.Finite`, `Config.port` → `Config.Port`). The published package
  keeps the lowercase names, so **`node_modules/effect/src` is the authoritative reference
  for code that has to compile**; the subtree is for reading upstream direction. Verify
  against `node_modules/effect/src` first, and only fall back to `repos/effect` when the
  installed package does not ship the source.
- Tests live in `test/`, which the Phase 2 configs did not cover. `tsconfig.json` now
  includes `src`, `test`, and `vitest.config.ts` with `noEmit`; `outDir`/`rootDir` moved to
  `tsconfig.build.json` (which already excluded `test`), because `rootDir: "src"` plus an
  included `test/` is a TS6059 error. `vitest.config.ts` includes `test/**/*.test.ts` and
  dropped `passWithNoTests`; `lint`/`format` scripts gained the `test` path.
- The Pokedex stub group is a plain (non-generator) `build` function — `Effect.fn(function*)`
  with no `yield` trips oxlint's `require-yield`. `HttpApiBuilder.group` accepts a `Handlers`
  value as well as an `Effect` of one.
- `HttpApiTest.groups` gives a typed client that decodes the success channel, so it cannot
  observe the wire status. `test/HealthApi.test.ts` therefore adds a second suite driving
  `HttpRouter.toHttpEffect(AllRoutes)` to assert 200s, content types, and that
  `/openapi.json` and `/docs` are mounted.

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
      (already covers `lint`, `format:check`, `typecheck`, `test`)
- [ ] `GEMINI.md` / `AGENTS.md` refresh: new commands, architecture pointers to `docs/migration/`
- [ ] Optional: typed client package via `--format httpclient` for consumers
- [ ] Optional: revisit parity decisions P1/P2 with stakeholders
- [ ] Commit

---

## Session ritual

Start of each session: read `README.md` + this checklist, `git log --oneline -5`, then pick
the next unchecked phase. End of each session: tick the boxes done here, commit docs updates
together with the code.
