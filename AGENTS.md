# PorciGestion API - Agent Instructions

## Documentation Map
- `dev-docs/architecture.md` is the source of truth for layers, responsibilities, request/error flow, persistence boundaries, and transactions.
- `dev-docs/coding-philosophy.md` is the source of truth for code quality, abstraction, naming, control flow, documentation, TypeScript practices, and refactoring.

Read the relevant document before making architectural, implementation-style, or refactoring decisions. Keep `AGENTS.md` focused on rules that must remain visible across tasks.

## Core Rules
- Follow established repository patterns unless the project documentation defines a clearer target architecture to move toward.
- Ask the developer before making consequential assumptions when context is insufficient or multiple approaches materially affect architecture, domain behavior, API contracts, database behavior, or task scope.
- Do not make database schema, structure, or data-model changes, or run destructive database operations, without explicit developer approval.
- Do not hardcode reusable domain values or finite domain states. Search for existing shared constants first and derive types from them when appropriate.
- Keep Swagger/OpenAPI synchronized whenever the HTTP contract changes.
- Existing code may contain legacy deviations from the documented target architecture. Improve them when touched only when the change is safe, scoped, and beneficial. Do not perform repository-wide cleanup unless requested.
- The repository currently has no established automated test suite. Do not claim tests passed when none exist or introduce a testing framework without approval.

## Verification
Before completing a task:
1. Review the final diff and confirm the requested behavior.
2. Check for unrelated changes and architecture violations.
3. Review affected dependencies and Swagger when applicable.
4. Run relevant existing linting, compilation, build, or validation commands when available.
5. Remove unintended debug code, temporary logs, commented-out code, or incomplete implementation.
6. Clearly identify unresolved issues or required manual verification.

## Final Response
Match the response detail to the size and risk of the change.

For small, low-risk changes affecting one file or only a few lines, provide a concise explanation of what changed and any relevant verification.

Use the structured report when the change affects multiple files or layers, changes important behavior, introduces meaningful dependencies, carries material risk, or otherwise benefits from a complete implementation overview.

### Structured Report
- **Summary:** maximum 50 words.
- **Files Changed:** state the total and list files in this order: `Requires Review`, `High`, `Medium`, `Low`.
- **File:** use a clickable repository-relative Markdown link when supported.
- **Severity:** exactly one of `Requires Review`, `High`, `Medium`, `Low`.
- **Implemented Change:** maximum 20 words for Low, Medium, or High. For Requires Review, use at least 35 words explaining the change, impact, reason for review, and what should be verified.
- **Dependencies:** include only when the file directly depends on, is used by, or materially impacts another file; use clickable repository-relative links when supported.

Severity criteria:
- **Requires Review:** uncertainty, architectural or database implications, breaking behavior, significant domain changes, or material risk.
- **High:** substantial behavior changes affecting important workflows, multiple layers, or data writes.
- **Medium:** scoped functional changes with limited impact.
- **Low:** documentation, logging, small refactors, or other low-risk changes.