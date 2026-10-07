---
description: Scaffold a NestJS feature module that follows this repo's conventions
argument-hint: <module-name, singular kebab-case, e.g. invoice>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm *)
---

Create the feature module `$ARGUMENTS` in `apps/api/src/modules/`.

1. Read `.claude/rules/api-nestjs.md` and use `modules/vehicles/` as the reference for layout, DTOs,
   pagination, ownership checks, Swagger decorators and the service spec.
2. Create `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/<name>.dto.ts` and
   `entities/<name>.entity.ts`. Only add routes and fields the user asked for; ask if unclear.
3. Register the entity with `TypeOrmModule.forFeature` and import the module in `app.module.ts`.
4. Add a `<name>.service.spec.ts` covering success, not-found and permission cases.
5. Generate the migration with `/new-migration add-<name>`; do not hand-write SQL.
6. Run `/verify` and report the result.
