# Take-home assessments

Three independent submissions:

1. **01-sticky-notes** — React/TypeScript sticky-notes application. Includes all required drag interactions, selected small extras, tests, `ARCHITECTURE.md`, and build instructions.
2. **02-hierarchy** — Kotlin `Hierarchy.filter()` with its original interface and focused unit tests. The Gradle project separates production code and tests; `Hierarchy.kt` is also provided as one file.
3. **03-simple-cache-review** — Kotlin cache code review with production risks, impact, and recommended fixes.

The frontend follows a simple component/reducer/model split, rather than either a single large component or an elaborate sync framework. The Kotlin solution and review use the same approach: cover the meaningful cases, but keep the implementation and explanation focused on what the task asks for.

## Verification

- Frontend: 17/17 model and storage tests passed with Node 22; pure TypeScript modules passed strict checking; TSX syntax diagnostics passed.
- Kotlin: 11/11 test cases passed in a local Kotlin test runner and the solution compiled.
- Full Vite build and browser interaction testing were not completed because npm registry access was unavailable in the validation environment. Run `npm install`, `npm test`, and `npm run build` locally before submitting.
