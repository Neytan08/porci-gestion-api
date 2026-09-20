# PorciGestion API Architecture

## Purpose
This document defines the target backend architecture and responsibility boundaries for PorciGestion API. Existing code may contain legacy deviations; do not turn a scoped task into a broad cleanup solely to make old code conform.

## Request Flow
Typical request flow:

`Route -> asyncHandler -> Controller -> Service -> Query or Command -> Rules / Queries / Errors -> Prisma`

Errors propagate through the centralized error middleware.

Simple read operations may flow from Service directly to Queries. Multi-step business operations should flow through Commands.

## Routes
Routes define HTTP endpoints and keep Swagger/OpenAPI documentation close to the endpoint definition.

Routes should:
- register the HTTP method and path;
- bind the correct controller method;
- wrap asynchronous handlers with the established `asyncHandler` pattern;
- document the HTTP contract with Swagger.

Do not place domain or persistence logic in routes.

## Middleware and Error Flow
`asyncHandler` forwards rejected async handlers to Express error middleware instead of requiring repetitive controller-level `try/catch`.

The global error handler is responsible for centralized error logging and consistent HTTP error responses, including known `ApiError` instances and recognized persistence/validation failures.

Local `try/catch` should be used only when code can meaningfully recover from, enrich, translate, or otherwise handle an error.

## Controllers
Controllers handle HTTP concerns and should remain easy to trace.

Controllers may:
- parse route/query parameters;
- validate request bodies with the appropriate request schema;
- throw entity-specific request errors;
- call the entity Service;
- log significant successful operations;
- build the HTTP response.

Controllers must not contain domain workflows or direct Prisma access.

## Services
Services are the public facade for entity operations.

Prefer thin pass-through methods that delegate:
- simple reads to Queries;
- business workflows and writes to Commands.

Do not place business rules or persistence logic in Services. Existing light response shaping may remain when it is part of a stable public contract, but new domain decisions should not be introduced here.

## Commands
Commands orchestrate business workflows.

They may coordinate:
- entity and cross-entity Queries;
- Rules;
- entity-specific Errors;
- transactions;
- state transitions and multi-step operations.

Commands decide how an operation is performed, but new persistence access should be delegated to Queries.

When a workflow spans multiple related writes, evaluate whether the operation must be atomic and use a transaction when it provides the clearest consistency guarantee.

## Queries
Queries are the persistence boundary for an entity.

All new Prisma access should be implemented in the appropriate Queries module, including:
- reads;
- creates;
- updates;
- deletes;
- existence checks;
- aggregate or relationship lookups.

Query functions that participate in transactions should accept the required Prisma transaction client rather than forcing Commands to duplicate persistence logic.

Some existing Commands still perform Prisma writes directly. Treat those as legacy deviations. When touched, move the affected persistence logic into Queries only when the refactor is safe, scoped, and clearly improves the implementation.

## Rules
Rules are the source of truth for reusable domain constraints and decisions.

Rules should:
- express whether an operation or transition is allowed;
- calculate or select resulting domain states when appropriate;
- centralize finite domain values and reusable domain decisions when they belong to that module;
- remain deterministic.

Rules must not:
- access Prisma;
- persist data;
- perform the main operation;
- introduce unrelated side effects.

Not every entity requires a Rules module.

## Errors
Use entity-specific error modules for known request, entity, and domain failures.

Prefer stable error codes and meaningful `ApiError` instances over generic `Error` objects when the failure belongs to a known operation.

Entity errors may define client-facing messages plus structured logging context. Reuse existing errors before introducing equivalent new ones.

## Validation
Use Zod for request-level structural validation:
- payload shape;
- required fields;
- types;
- basic formats and structural constraints.

Do not use Zod as the source of truth for business rules.

Domain eligibility, relationship constraints, state transitions, and operation permissions belong in Rules and/or Commands.

## Persistence and Database Changes
The application uses Prisma for persistence, but database structure is controlled separately by the developer.

Do not change the database schema, data model, migration state, or perform destructive database operations without explicit developer approval.

Before proposing a database change, explain the required change, why it is needed, affected behavior, risks, and relevant alternatives.

## Logging
Use structured logging for significant successful operations and useful diagnostic context.

Controllers are appropriate places for high-level success logs. Centralized error handling should own error logging unless a lower layer has unique context that cannot be preserved otherwise.

Include useful identifiers when appropriate. Avoid noisy step-by-step logs, sensitive information, and unnecessarily large payloads.

## Swagger
Keep Swagger/OpenAPI synchronized with the implemented HTTP contract.

Review documentation whenever changing:
- route or HTTP method;
- parameters or query values;
- request body;
- response shape;
- status codes;
- API error behavior.

Swagger should remain useful for both API documentation and manual testing.