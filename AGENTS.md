# Agent Instructions: Nest Pokemon

This repository contains instructions for AI agents (like Gemini, Claude, or GitHub Copilot) to ensure they follow the project's architectural patterns and conventions.

## Documentation

- [AGENTS.md](./AGENTS.md): Core project instructions and conventions.
- [docs/patterns/boundaries.md](./docs/patterns/boundaries.md): Detailed architectural boundary rules (layer dependencies, mappers, error boundaries).

## Core Philosophy

- **Schema-First**: All API definitions MUST start in `tsp/` files. Never manually edit files in `src/generated/`.
- **Explicit Error Handling**: Business logic MUST NOT throw exceptions. Use the `Result` type from `@praha/byethrow` to return typed Success/Failure states.
- **Strict Validation**: All incoming data MUST be validated using the generated Zod schemas passed to the route decorator's native `schema` option (e.g. `@Body({ schema: z... })`). Zod schemas are Standard Schema-compatible, so NestJS 12 validates them natively — no custom pipe.
- **Clean Architecture**: Maintain strict separation between Presentation, Application, Domain, and Infrastructure layers.

## Project Structure

- `tsp/`: TypeSpec API definitions.
- `src/generated/`: Code generated from TypeSpec (Types, NestJS Interfaces, Zod schemas).
- `src/pokemon/`: Pokemon module following CQRS.
  - `presentation/controllers/`: NestJS controllers, implementing generated interfaces.
  - `application/`: Commands and Queries (Business Logic).
  - `domain/`: Entities, Value Objects, and Repository Interfaces.
  - `infrastructure/`: Persistence implementations and external adapters.

## Conventions & Rules

### 1. API Changes
- Modify `.tsp` files in `tsp/`.
- Run `npm run generate` to recompile the OpenAPI spec and regenerate `src/generated/`.
- Update implementation to match new generated types/interfaces.

### 2. Controllers
- Controllers MUST implement the generated interface from `src/generated/nestjs.gen.ts` (usually using `Pick`).
- Use the native Standard Schema option for validation: `@Body({ schema: z... })`, `@Query({ schema: z... })`, `@Param({ schema: z... })` with the generated Zod schemas.
- Use `ts-pattern` (`match`) to handle the `Result` returned by the application layer: return the success value, and delegate failures to the shared error boundary (`presentation/http-error.mapper.ts`), which exhaustively maps every domain error to an HTTP exception.

### 3. Application Layer (Commands/Queries)
- Methods that can fail MUST return `Result.ResultAsync<T, E>` — compose the happy path with byethrow combinators (`R.pipe`, `R.do()` + `R.bind` for accumulating value objects, `R.andThen`, `R.map`) instead of imperative `isFailure` early-returns.
- Infallible queries (e.g. health checks) may return a plain `Promise<T>`; don't wrap code that cannot fail in `Result` ceremony.
- Inject repository interfaces using `POKEMON_REPOSITORY_TOKEN`.

### 4. Domain Layer
- Entities MUST have a `create` static method for new instances and a `load` static method for reconstituting from DTOs.
- Use Value Objects for complex attributes (e.g., `Stats`, `Height`, `Weight`) to ensure domain invariants.

### 5. Infrastructure Layer
- Implement repository interfaces defined in the domain layer. The port speaks domain language (entities in/out, async, `Result` where failure is expected).
- Handle data persistence details here — including validating untrusted source data with the generated Zod schemas. Raw external shapes never cross this boundary.

## Tooling

- **Quality Gate**: Run `npm run check` before considering a task complete.
- **Compile TypeSpec**: `npm run typespec:compile`
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Test**: `npm run test`

## Error Handling Pattern

```typescript
// Command/Query: railway-oriented composition with byethrow
handle(body: CreateRequest): Result.ResultAsync<Dto, DomainError> {
  return R.pipe(
    R.do(),
    R.bind('stats', () => Stats.create(body.baseStats)), // each bind can fail
    R.andThen(async (vos) => R.succeed(Entity.create({ ...body, ...vos }))),
    R.map((entity) => entity.toDto()),
  );
}

// Controller: success value out, failures to the shared error boundary
const result = await this.command.handle(body);
return match(result)
  .with({ type: 'Success' }, ({ value }) => value)
  .with({ type: 'Failure' }, ({ error }) => throwHttpException(error))
  .exhaustive();
```
