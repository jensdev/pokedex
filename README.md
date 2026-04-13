# Nest Pokemon

A **contract-first** NestJS Pokédex API built with [TypeSpec](https://typespec.io/), [OpenAPI](https://www.openapis.org/), and [@hey-api/openapi-ts](https://heyapi.dev/).

The API is defined in TypeSpec, compiled to an OpenAPI 3.0 spec, and then used to generate TypeScript types, Zod schemas, NestJS controller interfaces, and an SDK — keeping the implementation and documentation in sync by design.

## Architecture

```
tsp/              TypeSpec source files
  └─► tsp compile
tsp-output/       OpenAPI 3.0 YAML
  └─► @hey-api/openapi-ts
src/generated/    Types · Zod schemas · NestJS interfaces · SDK
  └─► implements
src/**            NestJS controllers & services
```

### Key concepts

| Concept                   | How it works                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Contract-first**        | The API contract is authored in TypeSpec (`tsp/`). All generated code derives from it.                                  |
| **Type-safe controllers** | Controllers `implement` the generated `*ControllerMethods` interfaces, so the compiler catches any drift from the spec. |
| **Runtime validation**    | A custom `ZodPipe` validates incoming request params/body against the generated Zod schemas.                            |
| **Typed error handling**  | Services return `Result` types (`@praha/byethrow`) and controllers pattern-match on them with `ts-pattern`.             |

## Project structure

```
├── tsp/                    # TypeSpec definitions
│   ├── main.tsp            #   Service metadata & imports
│   ├── health.tsp           #   Health-check endpoints
│   ├── pokedex.tsp          #   Pokédex CRUD endpoints
│   └── models/              #   Shared models (Pokemon, pagination, etc.)
├── tsp-output/
│   └── openapi.yaml        # Generated OpenAPI 3.0 spec
├── openapi-ts.config.ts    # @hey-api/openapi-ts config
├── src/
│   ├── generated/          # Auto-generated code (do not edit)
│   │   ├── types.gen.ts    #   TypeScript types
│   │   ├── zod.gen.ts      #   Zod validation schemas
│   │   ├── nestjs.gen.ts   #   NestJS controller interfaces
│   │   └── sdk.gen.ts      #   API client SDK
│   ├── health/             # Health module
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   └── health.module.ts
│   ├── pokemon/            # Pokemon module
│   │   ├── pokemon.controller.ts
│   │   ├── pokemon.service.ts
│   │   ├── pokemon.errors.ts
│   │   ├── pokemon.constants.ts
│   │   └── pokemon.module.ts
│   ├── zod.pipe.ts         # Generic ZodPipe for request validation
│   ├── app.module.ts
│   └── main.ts
├── patches/                # patch-package patches
├── tspconfig.yaml          # TypeSpec compiler config
└── tsconfig.json
```

## Prerequisites

- **Node.js** ≥ 18
- **npm**

## Getting started

```bash
# Install dependencies
npm install

# Compile the TypeSpec definitions into an OpenAPI spec
npm run typespec:compile

# Generate types, schemas, and NestJS interfaces from the OpenAPI spec
npx openapi-ts

# Start the dev server (watch mode)
npm run start:dev
```

The API will be available at **http://localhost:3000**.

## Notable libraries

| Library                                                    | Purpose                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@typespec/compiler`](https://typespec.io/)               | API-first contract definition language                            |
| [`@hey-api/openapi-ts`](https://heyapi.dev/)               | Generate types, Zod schemas, NestJS interfaces & SDK from OpenAPI |
| [`zod`](https://zod.dev/)                                  | Runtime request validation via generated schemas                  |
| [`@praha/byethrow`](https://github.com/praha-inc/byethrow) | Type-safe `Result` monad for error handling                       |
| [`ts-pattern`](https://github.com/gvergnaud/ts-pattern)    | Exhaustive pattern matching on `Result` types                     |

## License

UNLICENSED
