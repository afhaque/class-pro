
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context
**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Hackathon Compliance Gates
- [ ] **Single File Architecture**: Feature can be implemented in minimal files (≤3 core files)
- [ ] **Next.js First**: Uses Next.js App Router, Server Components, or API routes appropriately
- [ ] **MVP Focus**: Feature delivers immediate user value, no nice-to-have elements
- [ ] **Rapid Prototyping**: Can be built with placeholder data and mock responses
- [ ] **Simple Deployment**: No complex infrastructure or external dependencies
- [ ] **Time Constraint**: Feature can be completed within 3-hour development window
- [ ] **Scope Limitation**: Feature is one of maximum 3 core features for the project

### Violation Justification
If any gate fails, document why the complexity is necessary and cannot be simplified:

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
<!--
  HACKATHON CONSTRAINT: Use minimal file structure. Prefer single files over
  complex directory structures. Focus on app/ directory for Next.js App Router.
-->
```
# Next.js App Router Structure (HACKATHON OPTIMIZED)
app/
├── page.tsx              # Main page (primary feature)
├── layout.tsx            # Root layout
├── globals.css           # Global styles
└── api/                  # API routes (if needed)
    └── route.ts

# Optional: Additional pages (keep minimal)
app/
├── feature/              # Secondary feature
│   └── page.tsx
└── about/                # Tertiary feature
    └── page.tsx

# Components (co-locate with pages when possible)
components/
├── FeatureComponent.tsx  # Only if reusable
└── ui/                   # Basic UI components
    ├── Button.tsx
    └── Input.tsx

# Utils (minimal)
lib/
└── utils.ts              # Single utility file
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Phase 0: Outline & Research (HACKATHON OPTIMIZED)
1. **Quick Technology Decisions** (15 minutes max):
   - Use Next.js App Router (default choice)
   - Use Tailwind CSS for styling (default choice)
   - Use TypeScript (already configured)
   - Use Vercel for deployment (default choice)

2. **Minimal Research Tasks**:
   ```
   - Research: "Next.js App Router patterns for {feature type}"
   - Research: "Tailwind CSS components for {UI needs}"
   - Research: "Simple state management in Next.js (useState/useReducer)"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen - keep simple]
   - Rationale: [why chosen - focus on speed]
   - Alternatives considered: [brief list, don't overthink]

**Output**: research.md with minimal viable decisions (no over-engineering)

## Phase 1: Design & Contracts (HACKATHON OPTIMIZED)
*Prerequisites: research.md complete*

1. **Simple Data Model** → `data-model.md`:
   - Entity name, basic fields only
   - No complex relationships
   - Use TypeScript interfaces (not classes)

2. **Minimal API Design** (if needed):
   - Use Next.js API routes (app/api/)
   - Simple REST endpoints only
   - No OpenAPI schemas (use TypeScript types)

3. **Skip Contract Tests** (hackathon constraint):
   - Focus on manual testing
   - Use browser dev tools for debugging
   - Test core user flow only

4. **Simple Test Scenarios**:
   - One happy path scenario
   - One error scenario
   - Quickstart = basic user journey

5. **Skip Agent File Updates** (hackathon constraint):
   - Focus on implementation over documentation
   - Use existing Next.js patterns

**Output**: data-model.md, basic API routes, simple quickstart.md

## Phase 2: Task Planning Approach (HACKATHON OPTIMIZED)
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate minimal tasks from Phase 1 design docs
- Focus on core functionality only
- Skip complex testing tasks
- Prioritize working prototype over perfect code

**Ordering Strategy**:
- Setup → Core Implementation → Basic Polish
- Skip TDD for hackathon (focus on working code)
- Mark [P] for parallel execution (different files)
- Maximum 15-20 tasks total

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
