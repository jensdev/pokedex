# Toolchain & Generation Pipeline

```
tsp/*.tsp ──tsp compile──▶ tsp-output/openapi.yaml ──openapigen (httpapi)──▶ src/generated/Api.ts
```

The full pipeline has been **validated against this repo's actual spec** with
`@effect/openapi-generator@4.0.0-rc.110` (2026-08-31). One contract fix is required first —
see [Required contract fix](#required-contract-fix-discriminated-union).

## Target `package.json`

```jsonc
{
  "name": "effect-pokedex",
  "private": true,
  "type": "module",
  "scripts": {
    "typespec:compile": "tsp compile tsp/main.tsp --config tspconfig.yaml",
    "generate:api": "openapigen --spec tsp-output/openapi.yaml --format httpapi --name PokedexApi > src/generated/Api.ts && prettier --write src/generated/Api.ts",
    "generate": "npm run typespec:compile && npm run generate:api",
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run typecheck && npm run test"
  },
  "dependencies": {
    "@effect/platform-node": "4.0.0-rc.110",
    "effect": "4.0.0-rc.110"
  },
  "devDependencies": {
    "@effect/openapi-generator": "4.0.0-rc.110",
    "@effect/vitest": "4.0.0-rc.110",
    "@types/node": "^24.0.0",
    "@typespec/compiler": "^1.10.0",
    "@typespec/http": "^1.10.0",
    "@typespec/openapi": "^1.10.0",
    "@typespec/openapi3": "^1.10.0",
    "prettier": "^3.4.2",
    "tsx": "^4.19.0",
    "typescript": "^5.7.3",
    "vitest": "^3.0.0"
  }
}
```

Notes:

- **Pin exact `4.0.0-rc.110`** for all `effect` packages — it matches the vendored reference
  source in `repos/effect`. Bump all four together, then rerun `npm run generate && npm run check`.
- `openapigen` is the bin shipped by `@effect/openapi-generator`. It writes generated source
  to **stdout** (warnings go to stderr), hence the redirect.
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

## Required contract fix: discriminated union

**Problem (verified):** `tsp/models/pokemon.tsp` models variants with `extends Pokemon` +
`@discriminator`. TypeSpec emits each variant as sibling `properties` **plus**
`allOf: [$ref Pokemon]`. The generator turns `$ref`-with-siblings into an `allOf`
intersection, and the JSON-Schema → Effect-Schema conversion collapses those object
intersections to `Schema.Never`, producing:

```ts
export const PokemonVariant = Schema.Union([Schema.Never, Schema.Never, Schema.Never])
```

**Fix (verified):** compose with spread instead of inheritance. Each variant becomes a
self-contained object schema; the union generates a correct three-member discriminated union
with zero `Schema.Never`. The wire format of every payload is unchanged (the OpenAPI
`discriminator` metadata disappears, which no consumer of this API uses).

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
