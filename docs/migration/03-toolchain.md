# Toolchain & Generation Pipeline

```
tsp/*.tsp ──tsp compile──▶ tsp-output/openapi.yaml ──openapigen (httpapi)──▶ src/generated/Api.ts
```

The full pipeline has been **validated against this repo's actual spec** with
`@effect/openapi-generator@4.0.0-rc.112` (2026-08-31). It required one contract fix, applied
to `tsp/models/pokemon.tsp` in Phase 1 — see
[Required contract fix](#required-contract-fix-discriminated-union).

## Target `package.json`

```jsonc
{
  "name": "effect-pokedex",
  "private": true,
  "type": "module",
  "scripts": {
    "typespec:compile": "tsp compile tsp/main.tsp --config tspconfig.yaml",
    "generate:api": "openapigen --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi > src/generated/Api.ts && oxfmt src/generated/Api.ts",
    "generate": "npm run typespec:compile && npm run generate:api",
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint --type-aware src vitest.config.ts",
    "lint:fix": "oxlint --type-aware --fix src vitest.config.ts",
    "format": "oxfmt src vitest.config.ts",
    "format:check": "oxfmt --check src vitest.config.ts",
    "test": "vitest run",
    "check": "npm run lint && npm run format:check && npm run typecheck && npm run test"
  },
  "dependencies": {
    "@effect/platform-node": "4.0.0-rc.112",
    "effect": "4.0.0-rc.112"
  },
  "devDependencies": {
    "@effect/openapi-generator": "4.0.0-rc.112",
    "@effect/vitest": "4.0.0-rc.112",
    "@types/node": "^24.0.0",
    "@typespec/compiler": "^1.10.0",
    "@typespec/http": "^1.10.0",
    "@typespec/openapi": "^1.10.0",
    "@typespec/openapi3": "^1.10.0",
    "oxfmt": "0.65.0",
    "oxlint": "1.80.0",
    "oxlint-tsgolint": "7.0.2001",
    "tsx": "^4.19.0",
    "typescript": "^5.7.3",
    "vitest": "^4.1.0"
  }
}
```

Notes:

- **Pin exact `4.0.0-rc.112`** for all `effect` packages — it matches the vendored reference
  source in `repos/effect`. Bump all four together, then rerun `npm run generate && npm run check`.
- `openapigen` is the bin shipped by `@effect/openapi-generator`. It writes generated source
  to **stdout** (warnings go to stderr), hence the redirect. `oxfmt` then formats it in place.
- The `oxlint` / `oxfmt` / `oxlint-tsgolint` versions are **pinned exactly** — see
  [Linting & formatting](#linting--formatting-oxlint--oxfmt).
- `vitest` must be **`^4.1.0`** — `@effect/vitest@4.0.0-rc.112` declares
  `peer vitest ">=4.1.0 <5.0.0"`, so `npm install` fails on vitest 3.
- The generator accepts `.yaml` specs directly; no JSON conversion step is needed.
- `--patch` accepts RFC-6902 JSON patches (file or inline) applied to the spec before
  generation — the escape hatch if a contract construct ever generates poorly and the `.tsp`
  cannot change.

## `tspconfig.yaml`

Unchanged from today:

```yaml
emit:
  - "@typespec/openapi3"

options:
  "@typespec/openapi3":
    emitter-output-dir: "{project-root}/tsp-output"
    output-file: "openapi.yaml"
    file-type: "yaml"
    openapi-versions:
      - "3.0.0"
    omit-unreachable-types: true
```

## `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2023",
    "lib": ["es2023"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

(`tsconfig.build.json` extends it and excludes `test/`. Imports use NodeNext `.js`
specifiers; `tsx` handles them in dev.)

## `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

This file is **not optional**. With no explicit `include`, `vitest run` discovers the ~440
test files in the vendored `repos/effect` reference subtree and hangs.

Tests live in `test/` (see [02-target-architecture.md](02-target-architecture.md)), with
`src/**/*.test.ts` allowed for colocated unit tests. `tsconfig.json` therefore includes
`src`, `test`, and `vitest.config.ts` and sets `noEmit`, while `outDir`/`rootDir` live in
`tsconfig.build.json`, which excludes `test` and `**/*.test.ts` from `dist/`. Keeping
`rootDir: "src"` in the base config while including `test/` is a TS6059 error.

## Linting & formatting: oxlint + oxfmt

The project uses the [oxc](https://oxc.rs/) toolchain — `oxlint` for linting and `oxfmt` for
formatting. **eslint and prettier are gone**: `eslint.config.mjs` and `.prettierrc` were
deleted in Phase 2, along with `eslint-plugin-prettier`, `typescript-eslint`, and the rest of
the eslint dependency tree.

Config lives in `.oxlintrc.json` and `.oxfmtrc.json` (both generated with `oxlint --init` and
`oxfmt --migrate=prettier`, then adjusted).

```jsonc
// .oxlintrc.json
{
  "plugins": ["typescript", "unicorn", "oxc"],
  "categories": { "correctness": "error", "suspicious": "error", "pedantic": "warn" },
  "rules": { "typescript/no-floating-promises": "error" },
  "env": { "builtin": true, "node": true },
  "ignorePatterns": ["dist/**", "repos/**", "src/generated/**", "tsp-output/**"],
}

// .oxfmtrc.json — carried over from the old .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "sortPackageJson": false,
  "ignorePatterns": ["dist/**", "repos/**", "tsp-output/**"],
}
```

Things to know:

- **Always pass explicit paths** (`src vitest.config.ts`), never bare `oxlint` / `oxfmt`.
  `ignorePatterns` does **not** stop oxlint's nested-config discovery: a bare run finds
  `repos/effect/.oxlintrc.json` in the vendored subtree and dies on its missing
  `@effect/oxc/oxlint` JS plugin. Same class of trap as the vitest `include` above.
- **Type-aware rules need `oxlint-tsgolint`.** `--type-aware` fails with "Failed to find
  tsgolint executable" without it. This is what replaces the old eslint
  `recommendedTypeChecked` preset, and it is what makes `typescript/no-floating-promises`
  work — verified to fire on a probe file.
- **`printWidth` is 80, not the oxfmt default of 100.** `--migrate=prettier` carried over
  prettier's implicit default, and keeping it means the formatter swap left the 1374-line
  generated `src/generated/Api.ts` **byte-identical** — no reformat churn.
- **Versions are pinned exactly.** A minor `oxlint` bump can add rules to a category and turn
  `npm run check` red without a code change; `oxfmt` is still pre-1.0 (0.65.0) and its output
  can shift between releases. Bump deliberately, then rerun `npm run generate && npm run check`.
- **`oxfmt` only handles JS/TS.** Markdown and YAML — `README.md`, `docs/`, `tspconfig.yaml` —
  are no longer formatted by any tool. Keep them tidy by hand.
- `prettier` still appears in `package-lock.json` as a transitive dependency of
  `@typespec/compiler`. That is not ours and cannot be removed.
- `npm run check` is `lint && format:check && typecheck && test` — the lint and format gates
  were added once oxlint replaced the never-runnable eslint config.

## Required contract fix: discriminated union

**Problem (verified):** `tsp/models/pokemon.tsp` models variants with `extends Pokemon` +
`@discriminator`. TypeSpec emits each variant as sibling `properties` **plus**
`allOf: [$ref Pokemon]`. The generator turns `$ref`-with-siblings into an `allOf`
intersection, and the JSON-Schema → Effect-Schema conversion collapses those object
intersections to `Schema.Never`, producing:

```ts
export const PokemonVariant = Schema.Union([Schema.Never, Schema.Never, Schema.Never])
```

**Fix (applied in Phase 1):** compose with spread instead of inheritance. Each variant becomes a
self-contained object schema; the union generates a correct three-member discriminated union
with zero `Schema.Never`. The wire format of every payload is unchanged — verified by
expanding each variant's `allOf` before/after: identical `properties` and `required`, and
every other schema and path byte-identical. Two things do change in the emitted OpenAPI,
neither of them on the wire: the `discriminator` metadata disappears (no consumer of this
API uses it), and the now-unreachable `Pokemon` component is dropped by
`omit-unreachable-types`. `PokemonVariant` was already an `anyOf` of the three refs and
stays one.

```tsp
// BEFORE                                    // AFTER
@discriminator("classification")             model PokemonBase {
model Pokemon {                                // ...all shared fields, WITHOUT the
  // shared fields...                          // `classification: string` property
  classification: string;                    }
}
model NormalPokemon extends Pokemon {        model NormalPokemon {
  classification: "normal";                    ...PokemonBase;
  encounterRate: float32;                      classification: "normal";
  evolvesInto?: int32[];                       @minValue(0) @maxValue(100)
}                                              encounterRate: float32;
                                               evolvesInto?: int32[];
                                             }
// LegendaryPokemon / MythicalPokemon: same pattern

union PokemonVariant {                       // unchanged
  normal: NormalPokemon,
  legendary: LegendaryPokemon,
  mythical: MythicalPokemon,
}
```

## Expected generator warnings

Every operation reports `WARNING [default-response-remapped] ... Default response was
remapped to status 500` — this is correct behavior: the contract's catch-all `ApiError`
response becomes the endpoint's 500 error schema. Not a problem.

## Generated output shape (for orientation)

`src/generated/Api.ts` exports, per the validated run:

- One `Schema.Struct`/`Schema.Union` + `type` pair per component and per endpoint artifact
  (`ListPokemonQuery`, `GetPokemonByIdPathParams`, `ListPokemon200`, `ApiError`, …)
- `class HealthGroup extends HttpApiGroup.make("Health").add(HttpApiEndpoint.get("healthCheck", "/health", { success, error })...)`
- `class PokedexGroup extends HttpApiGroup.make("Pokedex").add(...)` — five endpoints;
  404s appear as `HttpApiSchema.Empty(404)`, create success as `.pipe(HttpApiSchema.status(201))`,
  delete success as `HttpApiSchema.Empty(204)`
- `export class PokedexApi extends HttpApi.make("PokedexApi").annotate(...).add(HealthGroup, PokedexGroup) {}`

Only `PokedexApi` is exported for groups/api; schemas are exported individually.
