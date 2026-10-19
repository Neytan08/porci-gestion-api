# Automated tests

Vitest runs isolated unit tests and Supertest endpoint tests against the real Express app. All test files live in `unit/` or `integration/`. Shared infrastructure lives in `helpers/`; entity creation helpers remain in named domain modules there and can be imported by any suite.

## Commands

- `npm run test:unit`: unit tests, without PostgreSQL or `.env.test`.
- `npm run test:integration`: all integration tests, including controlled concurrency tests.
- `npm test`: both suites; a missing test database is a failure, not a skipped success.
- `npm run typecheck:tests`: type-check test code and configuration.
- `npm run check`: application/test type checks and repository lint.
- `npm run build`: normal production compilation and OpenAPI generation.

Use Node.js 22.19 or newer in the Node 22 line, matching the development runtime.
The configuration uses [Vitest projects](https://vitest.dev/guide/projects) to keep database setup out of the unit suite.

## Dedicated PostgreSQL database

The developer creates and initializes a **separate PostgreSQL 17.x database**, using the existing `src/prisma/schema.prisma` and the approved database process in `dev-docs/database.md`.
Tests reuse the generated application Prisma Client. They never run migrations, `db push`, introspection, schema reset, or create a second Prisma schema.
Set a complete `DATABASE_URL` in the ignored `.env.test`, following `.env.test.example`. `DB_HOST`, `DB_NAME`, and similar separate settings do not replace that URL.
The database name must end in `_test`, its schema must be `public`, and the connection pool must allow at least four concurrent connections (the example uses five).
The application connection is always taken from this file, never inherited from `.env` or the shell.

Initialization must include the five tables used by the implemented API, their relationships/defaults, and the normalized unique indexes for breed names, boar tags, and sow tags described in the database docs.
The preflight checks database identity, tables, and the required expression indexes before cleanup.
The integration lifecycle then automatically prepares each test's data using Prisma helpers.

## Isolation and cleanup

The runner requires test mode, an explicit `_test` URL, and a matching database/schema identity reported by PostgreSQL before cleanup. It deletes application rows in foreign-key order inside a transaction before each test and after each file; sequences are deliberately not reset.
Tests assert returned identifiers rather than assuming the next generated ID.
Files run serially. A dedicated one-connection Prisma client holds a PostgreSQL advisory lock for the run, rejecting another cooperating test runner against the same database. Do not use `it.concurrent` for tests sharing this database. Concurrency scenarios start their own simultaneous HTTP requests inside a single test and inspect PostgreSQL lock waiters before releasing barriers.
No application layers are mocked in integration tests.

## CI

The `API Checks` workflow in `.github/workflows/tests.yml` has two jobs:

- `unit` (displayed as **Fast Checks**): installs dependencies, generates Prisma Client,   checks application/test types, runs lint and unit tests, and builds the application.
- `integration`: runs the integration suite after the fast checks succeed.

| Event | Fast checks | Integration tests |
| --- | --- | --- |
| Push to a branch other than `master` | Yes | No |
| PR opened, reopened, or updated into `master` | Yes | Yes |
| Push or merge into `master` | Yes | Yes |
| Manual run | Yes | Selected option; enabled by default |

There are no file filters: documentation changes follow the same rules as code changes.
A push to a branch with an open PR into `master` triggers both push and PR workflows,
so fast checks run twice; integration tests run only in the PR workflow. This duplication is accepted to keep the configuration simple. Tag pushes do not trigger the workflow.

### Database connection

Set the `TEST_DATABASE_URL` repository secret to an initialized, CI-reachable dedicated test database. The workflow writes it into `.env.test` without printing it and uses the same preflight and cleanup as local runs. Keep `.env.test` ignored. For Neon, use a direct connection with TLS so the reservation lock remains on the same database session throughout the run.
CI does not create tables, run migrations, or reset the schema.
Missing credentials or an invalid database fail the integration job. In particular, fork PRs and Dependabot runs normally cannot access this Actions secret, so their integration job will fail at connection configuration unless an appropriate trusted setup is provided. Do not use `pull_request_target` to give unreviewed PR code access to database credentials.

### Shared database and review

Integration jobs share a concurrency group so only one can use the test database at a time.
A newer run does not cancel an active run. GitHub can replace an older pending run with a newer one, so this is not a queue that guarantees execution of every intermediate commit.
The database reservation lock also prevents a cooperating local runner from overlapping CI.