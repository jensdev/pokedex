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
- `id` outside 1–1025 → rejected by validation (400) before lookup.

### `POST /pokemon` — createPokemon

- `id` = next sequence value; `createdAt` = `updatedAt` = now (ISO string).
- The request carries only base fields + `classification`; variant-specific fields are
  **defaulted**:
  - `normal` → `encounterRate: 50` (no `evolvesInto`)
  - `legendary` → `legendaryGroup: "Unknown"`, `isBoxLegendary: false`
  - `mythical` → `distributionMethod: "Unknown"`, `isCurrentlyDistributed: false`,
    `loreDescription: "A newly discovered Mythical Pokemon."`
- Returns **201** with the full variant.
- Value-object guards (negative stats, non-positive height/weight) throw uncaught exceptions
  → 500. In practice unreachable: Zod/contract validation (min 0) rejects first with 400.

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
