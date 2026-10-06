# Testing Strategy

## Purpose

Define the conventions for automated tests in the PorciGestion API.
Tests must remain isolated, reproducible, and suitable for local and CI execution.

When a testing decision is not covered here and would introduce a new
architectural convention, report it instead of assuming one.

## Test Types

Use unit tests for isolated business behavior.

Rules should normally be unit tested.
Commands should be unit tested when they contain domain behavior or state changes.
Services are tested when they contain meaningful orchestration or decisions.
Simple Prisma queries do not require isolated unit tests.
Routes and thin controllers do not require isolated unit tests.

Use integration tests for important API behavior involving multiple application
layers, Prisma, or persistence.

Integration endpoint tests use Supertest.

## Test Database

Unit tests do not use PostgreSQL.

Integration tests use a dedicated test database with the same schema as the
application database.

Never run automated tests against development or production data.

Tests create their own required data and must not depend on records already
existing in the test database.

## Isolation and Cleanup

Tests must not depend on execution order or data created by another test.

Use a centralized database cleanup mechanism so integration tests begin from a
known clean state.

Database preparation and cleanup must be automatic.

## Test Data and Helpers

Use Prisma directly to prepare or verify integration-test data when appropriate.

Create reusable helpers for repeated, complex, or meaningful domain setup.

Inline Prisma setup is acceptable when the setup is simple and specific to one
test.

Domain-specific helpers stay with their domain.
Shared infrastructure remains shared.

Do not introduce abstractions only for consistency or symmetry.

## Test Structure

Keep automated tests under:

tests/
  unit/
  integration/
  helpers/

Organize deeper by domain only when needed.

The test structure should remain traceable to the application without blindly
mirroring every source folder.

## Mocking

Unit tests may mock Prisma and other dependencies when isolation is needed.

Integration tests use the real Prisma client and dedicated PostgreSQL test
database for behavior involving persistence.

Do not mock internal layers when doing so would prevent the integration test from
exercising the behavior it exists to verify.

## Test Coverage and Discovery

Tests are derived from meaningful application behavior, business rules, risk, and
the current implementation rather than from a predefined scenario list.

When adding tests for existing functionality, inspect the relevant domain and
available project documentation to identify behavior that requires coverage.
Consider business rules, validation, API contracts, state transitions, persistence,
error conditions, and interactions with related domains.

Cover meaningful successful behavior, rejected or invalid behavior, important state
changes, and relevant edge cases. Do not mechanically create a test for every
function, branch, file, or layer.

Do not create isolated unit tests for trivial pass-through code, simple route wiring,
thin controllers, basic getters, or other code with no meaningful logic when the
behavior is already covered by a higher-level test. Add isolated tests when a
component contains meaningful branching, transformation, validation, orchestration,
or domain behavior that benefits from independent verification.

When an implementation change introduces, modifies, or fixes testable behavior,
the corresponding tests are part of that implementation. Identify the affected
behavior, create or update the tests needed to protect it, and run the relevant
tests before completing the task.

Do not create tests solely to increase test count or duplicate the same confidence
at multiple layers. Prefer tests that protect business rules, API contracts,
validation behavior, state transitions, persistence behavior, regressions, and
meaningful cross-domain interactions.

If documented business behavior conflicts with the current implementation, report
the discrepancy instead of treating the implementation as automatically correct.

## CI

Tests must run without manual database preparation and behave consistently
locally and in GitHub Actions.

A failed test must cause the test command and CI job to fail.

## Codex Guidelines

Follow this strategy when creating or modifying tests. Derive coverage according
to the Test Coverage and Discovery section whenever behavior is introduced,
modified, fixed, or found to lack meaningful coverage.

Do not:
- use production or development data;
- rely on test execution order;
- duplicate shared cleanup behavior;
- create unnecessary test abstractions;
- introduce new testing libraries or structural conventions without a clear need.

When a change requires a new testing decision that is not covered here, flag it
for review.