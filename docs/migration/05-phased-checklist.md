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

## Phase 4 — Domain + repository ✅

No HTTP in this phase; pure Effect.

- [x] `src/domain/Errors.ts` (`PokemonNotFound`, `PokemonDataParse`)
- [x] `src/domain/Pokemon.ts` (`makeVariant` / `replaceVariant` pure functions implementing
      the default/preservation rules from the behavior spec — including quirk P2)
- [x] `src/services/seed.ts` — the 4 seed Pokémon, byte-identical values to the old constants
- [x] `src/services/PokemonRepository.ts` — port + `layerInMemory` (Ref store, ID sequence
      from 1026, flaky `fetchAll` behind `FLAKY_UPSTREAM_RATE`)
- [x] Unit tests for `makeVariant`/`replaceVariant` (all three classifications, change vs.
      keep classification) and repository (save/replace/remove/nextId)
- [x] Verify: `npm run check` green
- [x] Commit

Notes from executing this phase:

- **`Option.fromNullishOr` takes one argument** in the installed rc, not the two the
  repository snippet in [04-implementation-patterns.md](04-implementation-patterns.md#2-repository-port--in-memory-adapter--servicespokemonrepositoryts)
  shows (`(value, null)`). The doc snippet is otherwise accurate; it has been corrected there.
- **`makeVariant`/`replaceVariant` use a classification-keyed record, not a `switch`.**
  oxlint's `typescript(consistent-return)` fires on a `switch` that returns from every arm
  of an exhaustive union with no `default`, and adding a `default` would silently swallow a
  fourth classification. Indexing `createdExtras[input.classification]` keeps exhaustiveness
  as a compile error (a new contract classification has no entry) with no dead branch.
- **Replace never carries `evolvesInto` or `mascotForGames`.** The NestJS `ReplacePokemonCommand`
  rebuilt the variant from the payload plus the scalar extras only, so both collections were
  dropped on every replace. Kept for parity and documented on `replaceVariant`.
- Repository tests provide `FLAKY_UPSTREAM_RATE` through
  `ConfigProvider.layer(ConfigProvider.fromEnvRecord(...))` and provide the repository layer
  per test with `Effect.provide(layer, { local: true })` — layers are memoized between
  `provide` calls by default, which would leak one test's store and id sequence into the next.

## Phase 5 — Pokedex read endpoints ✅

- [x] `src/services/Pokedex.ts`: `list` (filter → search → sort → paginate, exact semantics
      from behavior spec §listPokemon) and `getById`
- [x] `src/http/PokedexHandlers.ts`: replace stubs for `listPokemon` + `getPokemonById`
      (error mapping: `PokemonDataParse` → `ApiError` 500, `PokemonNotFound` → empty 404)
- [x] Domain tests: each filter, combined filters, sort by each field asc/desc, pagination
      edges (`total` counts pre-pagination; page beyond end → empty items)
- [x] HTTP tests: list happy path, `?classification=&type=&search=` combinations, 404,
      out-of-range id → 400
- [x] Verify against spec: same requests against old NestJS behavior spec expectations
- [x] Commit

Notes from executing this phase:

- **`Pokedex` exports two layers.** [04-implementation-patterns.md](04-implementation-patterns.md#3-domain-service--servicespokedexts)
  sketches a single `Pokedex.layer` with the repository baked in, which leaves the data set
  untestable: all four seed Pokémon share `createdAt: 2024-01-01T00:00:00.000Z`, so
  `sortBy=createdAt` is unobservable over the seed. `Pokedex.layerWithRepository` requires a
  `PokemonRepository` so `test/Pokedex.test.ts` can drive the service with an eight-entry
  fixture store; `Pokedex.layer` is that layer plus `PokemonRepository.layerInMemory` and
  stays the application wiring in `http/Routes.ts`.
- **`HttpRouter.toHttpEffect` surfaces a rejected request as a failed effect, not a
  response.** A 400 (out-of-range `id`, `pageSize=0`) fails the handler with a
  `HttpApiSchemaError`; nothing renders it because response rendering lives one level up. The
  routes tests therefore run the handler through `Effect.exit` and
  `HttpServerError.causeResponse` — the same function `HttpEffect.toHandled` calls on the
  real server, so a `Respondable` failure still picks its own status.
- **oxlint bans the mutating array methods.** `unicorn(no-array-sort)` and
  `unicorn(no-array-reverse)` are `correctness` errors, so sorting is `toSorted` (which also
  removes the defensive copy the pattern sketch needed) and test assertions use `toReversed`.
- **`Effect.fail(undefined)` trips `unicorn(no-useless-undefined)`.** It is a warning, not an
  error, but the `undefined` is load-bearing — it selects the `Schema.Void` member of the
  error union — so it carries a one-line `// oxlint-disable-next-line` above it. The
  directive must be exactly one line: an `-- explanation` suffix or a wrapped second comment
  line silently stops oxlint from recognising it.
- The three write handlers stay `Effect.die` stubs, and the write methods are absent from the
  `Pokedex` interface rather than stubbed on it — Phase 6 adds both together.

## Phase 6 — Pokedex write endpoints ✅

- [x] `Pokedex.create` / `replace` / `remove` + handler wiring for `createPokemon` (201),
      `replacePokemon`, `deletePokemon` (204)
- [x] Tests: create defaults per classification; id sequence 1026, 1027…; replace preserves
      `createdAt` + variant extras when classification unchanged (and documents quirk P2);
      replace/delete 404; delete then get → 404
- [x] Verify: full `npm run check`; manual smoke via `/docs`
- [x] Commit

Notes from executing this phase:

- **The contract capped `PokemonBase.id` at 1025, which made every create a 500.** Parity
  decision P4 starts the generated id sequence at 1026, deliberately above the National
  Pokédex range — but `@maxValue(1025)` on the id applies to the *response* variants too, so
  encoding the 201 body failed with `Expected a value less than or equal to 1025 at ["id"]`.
  NestJS never validated its responses, so the conflict only surfaced here. Fixed in
  `tsp/models/pokemon.tsp` by dropping the `@maxValue` from `PokemonBase.id` (the `@minValue(1)`
  stays) and regenerating; the only schema change is the removed check on the three variants.
- **`GET /pokemon/{id}` still caps `id` at 1025, so a created entry is listable but not
  addressable by id.** That path-parameter cap is unchanged from the NestJS contract and is
  documented in the behavior spec, so it is kept as parity — but it means the round trip in
  [04-implementation-patterns.md](04-implementation-patterns.md#6-testing--testpokedexapitestts)
  (create, then `getPokemonById({ id: created.id })`) cannot work as written. The doc snippet
  has been corrected to fetch through `listPokemon`. Worth putting to stakeholders in Phase 7.
- **`PokemonBaseStats` carries no `@minValue`.** The behavior spec's §createPokemon claimed
  contract validation rejects negative stats with a 400 before the value-object guards could
  throw; it does not — `hp: -1` is a valid request and gets stored. The spec has been
  corrected and `test/PokedexApi.test.ts` pins the current behavior; adding the bounds is a
  Phase 7 item.
- **`remove` uses the repository's boolean return, not a find-then-delete pair.**
  `repository.remove` already reports whether the id was there, which is the same
  `PokemonNotFound`-or-succeed semantics in one call.
- **Write tests build their layer per test.** `layer()` from `@effect/vitest` builds its
  layer once per suite (a cached `contextEffect`), so every test in a suite shares one `Ref`
  store — fine while nothing writes, order-dependent the moment something does. The client
  tests wrap each program in `Effect.provide(TestLayer, { local: true })`; the route tests get
  it for free because `HttpRouter.toHttpEffect` calls `Layer.build` per invocation.
- `@effect/vitest`'s `it.effect` provides a `TestClock` that starts at epoch millis 0, so
  `DateTime.now` yields `1970-01-01T00:00:00.000Z` and timestamps are directly assertable;
  `TestClock.adjust` makes "updatedAt advanced, createdAt did not" observable.
- Importing `it` from `@effect/vitest` at module scope collides with the `it` that
  `layer(...)((it) => …)` hands each suite — oxlint's `eslint(no-shadow)` is a hard error, so
  the write suites are `layer(HttpServer.layerServices)(name, (it) => …)` blocks too.

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
