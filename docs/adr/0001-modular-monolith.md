# 0001. Modular monolith

- Status: accepted
- Date: 2026-10-07

## Context

A starter must be quick to understand and extend. Splitting into services or layering every feature
into domain, application and infrastructure packages adds files and indirection long before there is
a domain complex enough to need them.

## Decision

The API is one deployable NestJS application organised as feature modules.

- `src/modules/<feature>/` holds a controller, service, `dto/` and `entities/`. A module owns its
  tables and does not reach into another module's repositories.
- `src/infrastructure/` holds cross-cutting technical concerns: config, database, cache, logging and
  messaging.
- `src/common/` holds shared helpers: guards, decorators, pagination, utilities.
- TypeORM repositories are used directly in services. We do not wrap them in repository interfaces.
- Hexagonal style is used only at an external boundary where swapping the implementation is realistic:
  the `EventPublisher` port with its `KafkaEventPublisher` adapter (see
  [0005](0005-kafka-optional.md)).

## Consequences

- Adding a feature means adding one folder and one module import.
- Services depend on TypeORM, so unit tests use in-memory fakes of the repository calls they make and
  e2e tests cover the real database behaviour.
- Modules share a database, so cross-module consistency is a transaction, not a distributed problem.

## When to move to full Clean or Hexagonal architecture

Move when at least one of these becomes true, not before:

1. **The domain is complex.** Business rules span several entities and change often, so services have
   become long procedural scripts and the same rule is repeated in several places.
2. **There are several entry points.** The same use case is triggered by HTTP, a queue consumer, a
   scheduled job and a CLI, and controllers are starting to hold logic that must be shared.
3. **The domain must be tested without the framework.** Rules need fast tests that do not boot Nest or
   touch TypeORM, or the persistence technology may change.

What the migration involves, module by module:

1. Create `domain/` with plain classes holding the rules (no decorators, no TypeORM).
2. Create `application/` with one class per use case that depends on ports (interfaces).
3. Define repository ports next to the use cases; implement them in `infrastructure/` with TypeORM and
   map TypeORM entities to domain objects.
4. Keep controllers, consumers and jobs as thin adapters that call use cases.
5. Move one module at a time. The `vehicles` module is the template; `EventPublisher` already follows
   the port and adapter shape.
