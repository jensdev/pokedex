# Architectural Boundaries

This document defines the boundaries between different layers of our NestJS application. Our goal is to maintain a **pure domain** that is isolated from frameworks, external schemas, and infrastructure concerns.

## The Core Rule: Domain Purity

The **Domain Layer** (`src/*/domain/`) is the heart of the application. It must remain "clean" and free from framework pollution.

1.  **No NestJS in Domain**: Never use NestJS decorators (`@Injectable`, `@Controller`, etc.) inside domain entities or value objects.
2.  **No Persistence in Domain**: Domain entities are not database models. They should not contain ORM decorators or logic.
3.  **No External Schemas**: The domain should not depend on generated TypeSpec/Zod schemas. Use **Mappers** to convert between Domain Entities and DTOs.
4.  **POJO/Classes Only**: The domain should consist of pure TypeScript classes and Value Objects that enforce invariants.

## Boundary Map

| Layer | Responsibility | Allowed Dependencies |
| :--- | :--- | :--- |
| **Presentation** | HTTP/CLI entry points, Request/Response mapping | Application, Domain, Generated Schemas |
| **Application** | Orchestration, Use Cases, Transaction management | Domain, Infrastructure Interfaces |
| **Domain** | Business Logic, Entities, Value Objects | None (Pure TS) |
| **Infrastructure** | Persistence, External APIs, Adapters | Domain, External SDKs |

## Data Transformation (Mappers)

Data MUST be transformed at the boundaries. We do not let external "shapes" leak into our business logic.

### 1. Inbound (Presentation -> Domain)
Controllers receive DTOs (validated by Zod). These are passed to Application services, which use Domain factory methods to create/reconstitute entities.

```typescript
// Good: Reconstituting a domain entity from a validated DTO
const pokemon = Pokemon.load(dto); 
```

### 2. Outbound (Domain -> Presentation)
Domain entities should have a `.toDto()` or `.toJSON()` method to provide a clean, plain object representation for the presentation layer.

```typescript
// In Controller
const result = await this.query.handle(id);
return match(result)
  .with({ type: 'Success' }, ({ value }) => value.toDto()) // Boundary transformation
  .with({ type: 'Failure' }, handleErrors)
  .exhaustive();
```

## Dependency Inversion

We use **Interfaces** (and NestJS `Symbols` as tokens) to decouple the domain from infrastructure.

- **Define** the repository interface in `src/*/domain/`.
- **Implement** the repository in `src/*/infrastructure/`.
- **Inject** the implementation using the Token in the Application layer.

This allows us to change the database or external service without touching the business logic.

## Error Boundaries

We do not use exceptions for expected business failures.

1.  **Domain/Application**: Return a `Result` type (`@praha/byethrow`).
2.  **Presentation**: This is the **Error Boundary**. It catches the `Result` and maps it to the appropriate HTTP Exception (e.g., `NotFoundException`).

```typescript
// Presentation Layer (Controller)
return match(result)
  .with({ type: 'Failure', error: { name: 'PokemonNotFoundError' } }, () => {
    throw new NotFoundException(); // Map domain error to HTTP
  })
```

## Summary
By enforcing these boundaries, we ensure that our application is easy to test, maintain, and evolve. The business logic remains stable even if we change our framework (NestJS) or our database.
