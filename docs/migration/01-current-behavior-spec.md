# Current Behavior Spec (NestJS implementation)

Snapshot of what `src/` does today, written before teardown so the Effect implementation can
be verified against it. The wire contract lives in `tsp/` — this document covers the
*semantics* the contract cannot express.

## State model

- **In-memory store**, seeded at construction from `src/pokemon/infrastructure/pokemon.constants.ts`
  with 4 Pokémon: `bulbasaur (1, normal)`, `pikachu (25, normal)`, `mewtwo (150, legendary)`,
  `mew (151, mythical)`. All seed timestamps are `2024-01-01T00:00:00.000Z`.
- ID sequence starts at **1026** and increments on every create. It never reuses freed IDs
  and is not affected by deletes.
- All state is lost on restart.

## Endpoint semantics

### `GET /pokemon` — listPokemon

Processing order (each step feeds the next):

1. **Fetch**: repository returns the full data set. *Quirk: with 10% probability the
   repository returns deliberately corrupt data (`[{ id: 'oops', name: null }]`); the query
   revalidates with Zod and fails with `PokemonDataParseError`, surfaced as **500**.*
2. **Filter by `classification`** (exact match) if given.
3. **Filter by `type`**: matches `primaryType` *or* `secondaryType`.
4. **Filter by `search`**: case-insensitive substring match on `name`.
5. **Sort** only when `sortBy` given (`id` | `name` | `createdAt`); `sortOrder` defaults to
   `asc`. Strings compare with `localeCompare`, numbers numerically. `createdAt` sorts as an
   ISO string (equivalent to chronological).
6. **Paginate**: `items = filtered.slice(page * pageSize, (page + 1) * pageSize)` with
   defaults `page=0`, `pageSize=20`. `total` is the **filtered count before pagination**;
   `page`/`pageSize` echo the effective values.

### `GET /pokemon/{id}` — getPokemonById

- Found → 200 with the variant object.
- Missing → 404 (Nest `NotFoundException`).
- `id` outside 1–1025 → rejected by validation (400) before lookup. *No longer current: the
  path parameter is `@minValue(1)` only (D2), so the bound is now just `id >= 1`.*

### `POST /pokemon` — createPokemon

- `id` = next sequence value; `createdAt` = `updatedAt` = now (ISO string).
- The request carries only base fields + `classification`; variant-specific fields are
  **defaulted**:
  - `normal` → `encounterRate: 50` (no `evolvesInto`)
  - `legendary` → `legendaryGroup: "Unknown"`, `isBoxLegendary: false`
  - `mythical` → `distributionMethod: "Unknown"`, `isCurrentlyDistributed: false`,
    `loreDescription: "A newly discovered Mythical Pokemon."`
- Returns **201** with the full variant.
- Value-object guards (negative stats, non-positive height/weight) threw uncaught exceptions
  → 500 under NestJS. All of these are contract validation now: `heightMetres` and `weightKg`
  carry `@minValue(0)`, and `PokemonBaseStats` gained `@minValue(0)` on every stat, so a
  negative one is a **400** before the handler runs. `hp: -1` was a 500 under NestJS and a
  stored 201 in the first Effect cut, because the migration dropped the guards without
  replacing them; neither answer was right for a malformed request.
- Generated ids start at 1026 (P4). `GET /pokemon/{id}` originally capped `id` at 1025, so a
  created entry appeared in `GET /pokemon` but was a 400 on `GET /pokemon/{its id}`. Both caps
  are gone now: the response model's `@maxValue(1025)` was dropped in Phase 6 (it made the 201
  body unencodable), and the path parameter's in the hardening pass (D2). The 1–1025 bound
  lives on the optional `nationalDexNumber` instead, which is the only field it was ever a
  fact about.

### `PUT /pokemon/{id}` — replacePokemon

- Missing id → 404.
- Preserves `id` and `createdAt`; sets `updatedAt` = now; replaces all base fields from the body.
- Variant-specific fields:
  - Classification **unchanged** → `legendary`/`mythical` extras are carried over from the
    existing entry.
  - Classification **changed** → extras get the same defaults as create.
  - **Quirk:** for `normal`, `encounterRate` is *always* reset to `50`, even when the
    classification was already `normal` (existing rate is not preserved).

### `DELETE /pokemon/{id}` — deletePokemon

- Found → removes entry, **204** with empty body.
- Missing → 404.

### Health group

All three endpoints return hardcoded values (no real checks):

- `GET /health` → `{ status: "healthy", checkedAt: now, version: "1.0.0", components: { database: { status: "healthy", latencyMs: 1 } } }`
- `GET /health/live` → `{ status: "ok", uptime: <seconds since process start> }`
- `GET /health/ready` → same shape/values as `/health`.

## Error responses (current reality vs. contract)

The TypeSpec contract declares `ApiError { code, message, details? }` for error responses
and an **empty-body 404**, but the NestJS app actually returns Nest's default exception
bodies:

| Case | Current NestJS body | Contract says |
| --- | --- | --- |
| Validation failure | 400 with Zod issue array | (not modeled) |
| Not found | 404 `{ message, error, statusCode }` | 404, empty body |
| List parse failure | 500 `{ message: { name, message }, error, statusCode }` | `ApiError` |

**The Effect implementation is contract-correct, not bug-compatible**: empty 404s, `ApiError`
bodies for 500s, and the platform's structured 400 for schema violations.

## Parity decisions for the rewrite

| # | Behavior | Decision |
| --- | --- | --- |
| P1 | 10% random corrupt data in the repository | **Keep** as an explicit simulation (it exercises the typed error channel), but make the failure rate a `Config` value (`FLAKY_UPSTREAM_RATE`, default `0.1`) so tests can set it to `0` |
| P2 | Replace resets `encounterRate` to 50 for normal→normal | **Keep parity** (documented quirk); revisit once the API has real consumers |
| P3 | Non-contract Nest error bodies | **Drop** — be contract-correct (see table above) |
| P4 | ID sequence starting at 1026 | **Keep** |
| P5 | Seed data & timestamps | **Keep identical** |

## Open questions (Phase 7)

The rewrite is done and none of the decisions above changed. What follows is what Phase 7
learned about them while hardening the code — **nothing here has been acted on**, because each
item is a contract- or behavior-visible change that is a stakeholder call, not a refactor.

### P1 — the 10% flaky upstream

- **The default makes production flaky, not just the tests.** `FLAKY_UPSTREAM_RATE` defaults to
  `0.1`, so a deployed server fails one `GET /pokemon` in ten by design. The `Config` makes
  turning it off a deploy-time setting rather than a code change, but the default is the wrong
  way round for anything real: it should be `0`, with the test suites opting *in*. Flipping the
  default is a one-line change and is deliberately not made here.
- **It is the only reachable failure on the read path.** `PokemonDataParse` is the sole typed
  error `GET /pokemon` can produce; if P1 goes, the endpoint's `ApiError` 500 becomes
  unreachable from the implementation (a plain defect would still produce one — see
  `src/http/Defects.ts`). Whoever removes the simulation should decide whether the 500 stays in
  the contract.
- **It draws from `Math.random()`, not Effect's `Random` service.** So the only reproducible
  settings are `0` and `1`; there is no seeded middle. Moving it to `Random` would make a
  partial rate testable, which is the one thing the current design cannot express.
- Observability now makes a P1 failure legible end to end: it shows as a failed
  `PokemonRepository.fetchAll` span under `Pokedex.list`, and as a 500 in the request log line.

### P2 — `encounterRate` resets to 50 on replace

Adding the generated consumer client (`src/generated/Client.ts`) made the consumer-visible
consequence concrete, and it is worse than "the rate resets":

- **The contract cannot express the fix.** `UpdatePokemonRequest` carries base fields plus
  `classification` and nothing else — no `encounterRate`, no `evolvesInto`, no
  `legendaryGroup`. So a consumer doing the obvious read-modify-write (`GET /pokemon/{id}`,
  change a field, `PUT` it back) **silently loses** `encounterRate` *and* the collection extras
  (`evolvesInto`, `mascotForGames`), because there is no field on the request to carry them.
- Preserving the existing rate on normal → normal is therefore not a bug fix in
  `domain/Pokemon.ts` alone: it is either a `tsp/` change (accept the variant-specific fields
  on update, which makes `PUT` a true full replace), or a documented decision that `PUT` resets
  variant extras and consumers must not treat it as read-modify-write. The current code does
  the latter without saying so anywhere a consumer would look.
- `legendary`/`mythical` extras *are* carried over when the classification is unchanged, so the
  behavior is also inconsistent between variants — `normal` is the only one that resets.

### Two items Phase 6 deferred here — both now closed

- **`PokemonBaseStats` has no bounds — closed.** `hp: -1` used to be a valid request that got
  stored. Every stat now carries `@minValue(0)` in `tsp/`, so it is a 400 before the handler
  runs; 0 itself is allowed. This was a wire-visible change to a documented behavior and was
  taken as a stakeholder decision, not a silent fix. `test/PokedexApi.test.ts` pins both the
  rejection and the inclusive floor.
- **A created entry is listable but not addressable — closed.** Generated ids started at 1026
  (P4) while `GET /pokemon/{id}` capped `id` at 1025, so `GET /pokemon/{new id}` was a 400.
  The hardening pass dropped the path-parameter cap (decision D2), and the id space was then
  split in two: `id` is a surrogate key, uncapped and server-allocated, while the optional
  `nationalDexNumber` carries the real-world number and holds the 1–1025 bound. The cap was
  never wrong as a fact about Pokémon — it was only wrong as a limit on how many rows this
  store may hold.
