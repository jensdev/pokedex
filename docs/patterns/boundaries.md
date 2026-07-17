# Architectural Boundaries

This document defines the boundaries between different layers of our NestJS application. Our goal is to maintain a **pure domain** that is isolated from frameworks, external schemas, and infrastructure concerns.

## The Core Rule: Domain Purity

The **Domain Layer** (`src/*/domain/`) is the heart of the application. It must remain free from framework and runtime-infrastructure pollution.

1.  **No NestJS in Domain**: Never use NestJS decorators (`@Injectable`, `@Controller`, etc.) inside domain entities or value objects.
2.  **No Persistence in Domain**: Domain entities are not database models. They should not contain ORM decorators or logic.
3.  **No runtime schemas in Domain**: The domain must not import the generated **Zod** schemas (`zod.gen.ts`) or run validation itself. It *may* reference generated **types** (`types.gen.ts`) at compile time to describe its DTO shape — e.g. `Pokemon` wraps a `PokemonVariant` as its internal state. This is a pragmatic trade-off: the discriminated-union shape is authored once in TypeSpec, and re-declaring it by hand in the domain would only invite drift. Runtime validation happens at the *edges*: the presentation boundary (incoming HTTP data) and the infrastructure boundary (untrusted source data).
4.  **Invariants in the domain**: Entities and Value Objects (`Stats`, `Height`, `Weight`, `PokemonId`) enforce business invariants at construction. Expected failures are returned as a `Result` (see *Error Boundaries*); only true programming invariants (e.g. a non-positive `PokemonId` that was already validated upstream) may throw.

## Boundary Map

| Layer | Responsibility | Allowed Dependencies |
| :--- | :--- | :--- |
| **Presentation** | HTTP/CLI entry points, Request/Response mapping | Application, Domain, Generated Schemas |
| **Application** | Orchestration, Use Cases, Transaction management | Domain, Infrastructure Interfaces |
| **Domain** | Business Logic, Entities, Value Objects | Generated *types* (compile-time only), `Result` helpers |
| **Infrastructure** | Persistence, External APIs, Adapters | Domain, External SDKs |

## Data Transformation (Mappers)

Data MUST be transformed at the boundaries. We do not let external "shapes" leak into our business logic.

### 1. Inbound (Presentation -> Domain)
Controllers receive DTOs (validated by Zod). These are passed to Application services, which use Domain factory methods to create/reconstitute entities.

```typescript
// Good: Reconstituting a domain entity from a validated DTO
const pokemon = Pokemon.load(dto); 
```

### 1b. Inbound (Infrastructure -> Domain)
Repository adapters are the boundary for *stored/external* data. The port
(`IPokemonRepository`) speaks domain language — entities in, entities out —
and the adapter validates untrusted source data with the generated Zod
schemas before it constructs entities. A malformed payload becomes a typed
failure, never raw data leaking upward.

```typescript
// In the infrastructure adapter
async findAll(): Result.ResultAsync<Pokemon[], PokemonDataParseError> {
  return R.pipe(
    R.parse(z.array(zPokemonVariant), await this.fetchRaw()),
    R.mapError(() => new PokemonDataParseError()),
    R.map((items) => items.map((item) => Pokemon.load(item))),
  );
}
```

### 2. Outbound (Domain -> Presentation)
Domain entities expose a `.toDto()` method that returns a clean, plain object (`PokemonVariant`). The **Application layer** performs this boundary transformation, so its `Result` already carries a DTO — the controller just returns the success value.

```typescript
// In Command/Query (Application layer)
return Promise.resolve(R.succeed(entity.toDto())); // Boundary transformation

// In Controller (Presentation layer)
const result = await this.query.get(id);
return match(result)
  .with({ type: 'Success' }, ({ value }) => value)
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
