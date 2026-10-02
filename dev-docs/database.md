# Database Management

## Ownership

The developer manages PostgreSQL structure directly. Prisma migrations are not the authoritative
deployment mechanism for this project. The current development database reported PostgreSQL 17.10
on October 1, 2026. Use PostgreSQL 17.x for equivalent environments unless another major version has
been deliberately validated.

`src/prisma/schema.prisma` is the application-side representation used to generate Prisma Client.
After an approved manual database change, run `npm run db:pull` and review the resulting schema,
then run `npm run generate`. Introspection must not be treated as authorization to change production
structure.

## Environment Preparation

A new environment must use a PostgreSQL version compatible with the current development database.
Create its tables, relationships, defaults, and indexes through the developer-approved database
process, configure `DATABASE_URL`, introspect the resulting structure, and compile the API before
serving requests.

The repository intentionally does not contain a migration history or a complete SQL schema. A new
environment is therefore not ready until its manually created structure has been compared with the
Prisma schema and the additional indexes below have been verified.

## Manually Managed Normalized Uniqueness

The API compares breed names and animal tags without casing or whitespace. PostgreSQL must enforce
the same normalization through unique expression indexes for:

- `breed.breed_name`;
- `boars.boar_tag_number`;
- `breedingsows.sow_tag_number`.

The required expression is equivalent to:

```sql
lower(regexp_replace(column_name, '[[:space:]]+', '', 'g'))
```

These indexes are not completely represented by Prisma models. Verify their presence and exact
definitions in each environment before enabling writes:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('breed', 'boars', 'breedingsows')
ORDER BY tablename, indexname;
```

Missing normalized unique indexes are a correctness problem: concurrent requests can otherwise
create values that the API considers duplicates.

## Change Procedure

Before a structural database change, document the reason, affected API behavior, deployment order,
and rollback approach. Apply and verify it in a non-production database first. After updating Prisma,
run `npm run generate`, `npm run check`, and `npm run build`.
