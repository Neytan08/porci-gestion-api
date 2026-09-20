# PorciGestion Coding Philosophy

## Purpose
Code should be clear, modular, maintainable, and easy to reason about. Prefer explicit responsibilities and understandable control flow over cleverness, unnecessary abstraction, or minimizing line count.

## Responsibility Before Size
Create modules and functions around clear responsibilities, not arbitrary line limits.

Prefer small focused functions when they make behavior easier to name, document, test, reuse, or reason about. Do not split code merely to make functions shorter or create many trivial helpers with no meaningful responsibility.

Each function should have a responsibility that can be described clearly.

## Abstraction
Do not abstract merely because two pieces of code look similar.

Introduce an abstraction when it represents a meaningful reusable responsibility, reduces ambiguity or duplication, or makes the code easier to maintain.

Codex may introduce a reasonably scoped abstraction when it clearly improves the implementation, but it must explain what was abstracted and why.

Avoid speculative abstractions for possible future requirements.

## Large Files
When a source file exceeds roughly 500 lines, analyze whether it contains multiple responsibilities that should be separated.

Do not split or rename a large file automatically.

Before performing that structural refactor:
1. explain why separation is justified;
2. describe the responsibilities being separated;
3. propose the new file name(s);
4. state whether the existing file should be renamed;
5. describe dependency and import impact;
6. obtain developer approval.

File size is a signal to analyze responsibility, not a requirement to split.

## Naming
Prefer descriptive names that communicate purpose without becoming unnecessarily long.

Function, variable, type, and file names should agree with the responsibility documented and implemented.

Prefer names such as `getActiveFarrowingBySowId` over vague names such as `getActive` when the added context prevents ambiguity.

Avoid redundant words when the surrounding module already provides sufficient context.

## Control Flow
Prefer linear, easy-to-follow control flow.

Use early returns or guard clauses when they reduce nesting and make invalid or exceptional cases explicit.

Avoid nested `if/else` structures. A normal `if/else` is acceptable, but when conditionals begin nesting, look for a clearer design such as:
- guard clauses;
- focused helper or Rule functions;
- explicit lookup/mapping logic;
- a `switch` when it genuinely represents discrete cases;
- another structure that makes the decision model easier to understand.

Do not replace readable conditionals with clever or compressed expressions solely to reduce lines.

## TypeScript
Write strongly typed TypeScript.

For new or modified code:
- avoid introducing `any`;
- use meaningful domain types when they improve clarity;
- handle `null` and `undefined` intentionally;
- derive types from shared constants when appropriate;
- do not use type assertions only to silence the compiler;
- do not suppress legitimate TypeScript errors instead of addressing their cause.

Existing legacy typing may not fully follow these rules. Improve it when the correction is safe, local to the task, and clearly beneficial. Do not expand a task into repository-wide type cleanup unless requested.

## Domain Values
Do not hardcode reusable finite domain values such as statuses, pregnancy results, reproduction types, lifecycle states, or equivalent concepts.

Search for an existing shared constant before introducing a new value. Keep one source of truth and derive related types from it when appropriate.

## Documentation and Comments
Code should be understandable primarily through structure and naming, with documentation adding context rather than compensating for unclear code.

Give every function a brief, high-level comment that helps the reader understand its purpose before reading the implementation. A concise JSDoc summary is enough for a straightforward function. The comment should explain the responsibility or domain meaning rather than restate the function name or narrate the code.

Add more detail only when it clarifies:
- purpose or responsibility;
- domain behavior;
- non-obvious decisions;
- workflow implications;
- parameters or return values whose meaning is not obvious from names and types.

Do not add `@param` or `@returns` tags when they only repeat clear parameter names, TypeScript types, or an obvious return value.

Use inline comments for non-obvious reasoning or constraints, not to narrate what each line already states.

Avoid files dominated by comments. If extensive comments are required to understand a function, first evaluate whether its structure or naming should be improved.

## Refactoring
Refactoring is allowed when it provides a clear, scoped improvement in correctness, readability, maintainability, duplication, or ambiguity.

Before refactoring, consider behavior, dependencies, scope, and whether the change introduces additional complexity.

Do not perform unrelated cleanup or turn a small change into an architectural rewrite.

For normal scoped refactors, explain what was changed and why. For structural refactors that significantly increase scope, split responsibilities, rename files, or alter architecture, present the plan and obtain developer approval first.

## Maintainability
Prefer:
- explicit domain behavior;
- single, understandable responsibilities;
- reusable shared constants;
- predictable data flow;
- existing project patterns when they remain appropriate;
- the smallest solution that is still clear and maintainable.

Avoid:
- overengineering;
- unnecessary indirection;
- premature abstraction;
- hidden side effects;
- ambiguous names;
- duplication of domain rules or constants;
- solutions that are shorter but harder to understand.
