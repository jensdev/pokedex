# Agent Instructions: Nest Pokemon

This repository contains instructions for AI agents (like Gemini, Claude, or GitHub Copilot) to ensure they follow the project's architectural patterns and conventions.

## Documentation

- [AGENTS.md](./AGENTS.md): Core project instructions and conventions.
- [docs/patterns/boundaries.md](./docs/patterns/boundaries.md): Detailed architectural boundary rules (Domain Purity, Mappers, etc.).
- [.agents/README.md](./.agents/README.md): Information about agent-specific tooling and skills.

## Core Philosophy

- **Schema-First**: All API definitions MUST start in `tsp/` files. Never manually edit files in `src/generated/`.
- **Explicit Error Handling**: Business logic MUST NOT throw exceptions. Use the `Result` type from `@praha/byethrow` to return typed Success/Failure states.
- **Strict Validation**: All incoming data MUST be validated using the generated Zod schemas and `ZodPipe`.
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
- Run `npm run typespec:compile` to update `src/generated/`.
- Update implementation to match new generated types/interfaces.

### 2. Controllers
- Controllers MUST implement the generated interface from `src/generated/nestjs.gen.ts` (usually using `Pick`).
- Use `@Body(new ZodPipe(z...))` for request body validation.
- Use `ts-pattern` (`match`) to handle the `Result` returned by the application layer and map it to HTTP responses/exceptions.

### 3. Application Layer (Commands/Queries)
- Methods MUST return `Result.ResultAsync<T, E>`.
- Inject repository interfaces using `POKEMON_REPOSITORY_TOKEN`.

### 4. Domain Layer
- Entities MUST have a `create` static method for new instances and a `load` static method for reconstituting from DTOs.
- Use Value Objects for complex attributes (e.g., `Stats`, `Height`, `Weight`) to ensure domain invariants.

### 5. Infrastructure Layer
- Implement repository interfaces defined in the domain layer.
- Handle data persistence details here.

## Tooling

- **Quality Gate**: Run `npm run check` before considering a task complete.
- **Compile TypeSpec**: `npm run typespec:compile`
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Test**: `npm run test`

## Error Handling Pattern

```typescript
// Command/Query
handle(data): Result.ResultAsync<SuccessType, ErrorType> {
  // ... logic
  if (error) return Promise.resolve(R.fail(new SpecificError()));
  return Promise.resolve(R.succeed(result));
}

// Controller
const result = await this.command.handle(body);
return match(result)
  .with({ type: 'Success' }, ({ value }) => value)
  .with({ type: 'Failure' }, ({ error }) => {
    throw new NotFoundException(error.message);
  })
  .exhaustive();
```
