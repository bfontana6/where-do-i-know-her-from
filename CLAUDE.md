# what-do-i-know-them-from — Project Context

**What it does:** Mobile-first PWA — user photographs their TV screen, app identifies the actor via Gemini Vision, then shows which titles from their Netflix watch history that actor appeared in. Watch history is imported once as a Netflix `ViewingActivity.csv`. No accounts; one profile per device (UUID in localStorage). Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Supabase, `gemini-2.5-pro`, TMDB. Env vars in `.env.local.example`.

## Critical Constraints

- **Supabase schema is `app_moviefaces`, not `public`.** Missing this in `createClient` silently queries the wrong schema — no error, just empty results.
- **RLS silently returns `[]` instead of an error** when blocking a query. Empty watch history reads may be RLS, not truly empty data. The `watchHistory_{profileId}` localStorage cache exists for exactly this reason.
- **`TMDB_ACCESS_TOKEN` is a v4 bearer token, not a v3 API key.** `tmdb-ts` passes it as a Bearer header automatically. Do not rename it or switch to query-param style.
- **Tailwind v4 has no `tailwind.config.js`.** Config-free — all customization in `globals.css` via `@theme inline`. Adding a config file breaks the build.
- **`gemini-2.5-pro` + `thinkingBudget: 5000` is load-bearing.** TV screen photos are low-quality, skewed, and partial-frame. Flash/Lite models degrade recognition materially. Don't downgrade without measuring on real samples.
- **Two-step pipeline (`/api/recognize` → `/api/cross-reference`) is intentional.** Separate so each can fail independently and so `/api/cast-lookup` can bypass Gemini entirely. Collapsing them breaks the fallback path.
- **The localStorage cache is a performance invariant.** App renders from cache immediately; Supabase hydrates in background. The stale window is intentional — removing the cache makes load feel broken.
- **AbortController (15s) covers the full pipeline, not per-step.** Any added API call or retry must fit within this budget or it silently times out.
- **Client-side image resize (canvas, max 1024px, JPEG 0.85) must stay client-side.** Moving it server-side adds a pre-Gemini round-trip; removing it inflates token costs.
- **Do not use Next.js `<Image>` for TMDB photos.** `image.tmdb.org` is not in `next.config.ts`. Use raw `<img>` tags.
- **`extractTitles()` in `src/lib/titles.ts` intentionally double-emits.** "Show: Season X" produces both the base title and the full string. Do not deduplicate at parse time.
- **Gemini 429s have a non-standard error shape** — check `error.error.status === 'RESOURCE_EXHAUSTED'`, not the HTTP status. Surface "wait 30 seconds" to the user; do not retry in the same request.
- **No test suite exists.** If Maia is invoked: Vitest + jsdom, mock `@google/genai` and `tmdb-ts`. Best first targets: `extractTitles()` and the canvas resize utility.

---

# myArchitecture Project Instructions

This project implements a **9-persona AI agent system** for spec-driven development using ADA (Architecture Domain Alignment) patterns and EARS (Easy Approach to Requirements Syntax).

## Agent System

When working on spec-driven development workflows, use the Agent tool to spawn the appropriate specialist agent from `.claude/agents/`.

### Available Agents

| Agent | File | Role | When to Invoke |
|-------|------|------|----------------|
| **myArchitecture** | `.claude/agents/myArchitecture.md` | Orchestrator/router | Entry point for all spec-driven workflows; routes `/shaping` and `/knowledge` commands |
| **Soren** | `.claude/agents/Soren.md` | Delivery Owner | Constitution, requirements, task breakdown; **orchestrates shaping (Phase 0)**, validates shaping gates, manages sprint planning |
| **Paulo** | `.claude/agents/Paulo.md` | Solutions Architect | Design, ADRs, architecture decisions; **leads architecture scope during shaping** (design-spec, cross-spec blueprints) |
| **Maia** | `.claude/agents/Maia.md` | Quality Manager | Test planning, test specs, validation; rubric grading (`/rubric`) |
| **Axel** | `.claude/agents/Axel.md` | Software Engineer | Code implementation, TDD, code review; **SME implementability review during shaping** |
| **Nora** | `.claude/agents/Nora.md` | UX Designer | Personas, journeys, accessibility; **UX input during shaping** (persona mapping, journey sketches) |
| **Zoya** | `.claude/agents/Zoya.md` | Product Manager | Product vision, stakeholders; **leads product scope during shaping** (product-brief, functional-spec) |
| **Enzo** | `.claude/agents/Enzo.md` | Code Archaeologist | Brownfield analysis, legacy code mapping |
| **Lina** | `.claude/agents/Lina.md` | Operations | Deployment, monitoring, incident response |

### Skills (Slash Commands)

Workflow skills are invoked as `/command` and provide direct entry points to spec phases:

| Skill | Command | Purpose |
|-------|---------|---------|
| **myArchitecture** | `/myArchitecture` | Full workflow entry point (routes to agents) |
| **requirements** | `/requirements` | EARS requirements gathering (→ Soren) |
| **design** | `/design` | Architecture design + ADRs (→ Paulo) |
| **create-tasks** | `/create-tasks` | Task breakdown from design (→ Soren) |
| **execute-task** | `/execute-task` | TDD implementation (→ Axel) |
| **test-spec** | `/test-spec` | Gherkin test specifications (→ Maia) |
| **test-plan** | `/test-plan` | Comprehensive test planning (→ Maia) |
| **test-execution** | `/test-execution` | Run tests and track results (→ Maia) |
| **decision-record** | `/decision-record` | Create ADR/PDR/CDR (→ Paulo) |
| **archaeology** | `/archaeology` | Brownfield code analysis (→ Enzo) |
| **validation-package** | `/validation-package` | Final acceptance report with traceability, test summary, and sign-off (→ Soren) |
| **commit** | `/commit` | Professional Git commits |
| **pr-review** | `/pr-review` | Pull request code review |
| **retrodoc** | `/retrodoc` | Reverse-document a codebase |
| **init-governance** | `/init-governance` | Initialize .myArchitecture scaffolding |
| **learning-loop** | `/learning-loop` | Post-execution learning capture |
| **create-hooks** | `/create-hooks` | Create Claude Code hooks |
| **new-spec** | `/new-spec` | Create spec folder with context-aware next steps |
| **approve** | `/approve` | Human approval gate for phases and decision records |
| **dashboard** | `/dashboard` | Dashboard view of all specs, shaping, sprint, decision records with ACTION NEEDED callouts |
| **critique** | `/critique` | Standalone adversarial review for any artifact |
| **shaping** | `/shaping` | Interactive shaping V3: 5 entry paths, step-file-driven, discovery-first (-> Soren orchestrates) |
| **rubric** | `/rubric` | Spec quality rubric grading (10 dimensions, A-F) (-> Maia) |
| **sprint** | `/sprint` | Sprint planning and delivery plan management (-> Soren) |
| **retro** | `/retro` | Sprint retrospectives with per-agent observations (-> Soren) |
| **knowledge** | `/knowledge` | Domain knowledge gateway (ADA, Method One, Cloud) |
| **figma** | `/figma` | Connect Figma designs to Claude Code via MCP. Guides authentication, generates .mcp.json, updates settings.json with enabledMcpjsonServers, and stores Figma screen URLs in the active spec (→ Nora) |

Skills are defined in `.claude/skills/<name>/SKILL.md`.

### Hooks

Phase gate validation runs automatically as a PostToolUse hook on Write/Edit operations targeting `.myArchitecture/specs/` files. The hook script is at `.claude/hooks/validate-gates.mjs` and enforces:
- status.yaml and .meta.json must exist
- requirements.md must precede design.md
- design.md must precede test-plan.md and tasks.md
- Phase ordering cannot be skipped

---

## Active Spec Detection

When agents need to work with specifications, detect the active spec by scanning the file system:

1. **List specs:** Read `.myArchitecture/specs/` directory for available spec folders
2. **Check status:** Read `status.yaml` in each spec folder to find `active: true` and `current_phase`
3. **Check metadata:** Read `.meta.json` for spec metadata (mode, phase, status)

**If an active spec exists:**
- Use it immediately -- do NOT ask "which spec should I use?"
- Reference the spec path when creating/modifying files: `.myArchitecture/specs/<slug>/`
- Mention the current phase naturally in responses

**If no active spec exists:**
- Guide the user to: create a new spec, select an existing spec, or list available specs
- Do NOT create spec files without identifying a spec first

**If multiple specs exist:**
- If only one has `active: true` in status.yaml, use that one
- If multiple are active, ask the user which one to work on

---

## Coding Standards

### General Principles

1. **Self-Documenting Code** -- Clear, descriptive names. No abbreviations. Names reveal intent.
2. **Small Functions** -- Max 20 lines per function. Each function does one thing.
3. **SOLID Principles** -- Single responsibility, open-closed, Liskov substitution, interface segregation, dependency inversion.
4. **No Dead Code** -- Remove unused imports, variables, functions. Do not comment out code.
5. **Fail Fast** -- Validate inputs at boundaries. Return early on error conditions.

### Documentation Standards

- **Public APIs:** Add JSDoc (TS/JS), docstrings (Python), XML docs (C#), Javadoc (Java)
- **Traceability Tags:** Include `@REQ-XXX` tags linking code to requirements
- **Complex Logic:** Inline comments only where intent is not obvious from the code

### Testing Standards (TDD)

1. **RED:** Write a failing test first (Maia creates test specs)
2. **GREEN:** Write the minimum code to pass (Axel implements)
3. **REFACTOR:** Improve code quality without changing behavior

**Coverage Targets:**
- Unit tests: 80%+ line coverage
- Integration tests: Cover all API endpoints and data flows
- E2E tests: Cover critical user journeys from requirements.md

**Test Naming:** `test_<unit>_<scenario>_<expected_result>`

### Language-Specific Standards

**TypeScript/JavaScript:** Strict mode, ESLint+Prettier, async/await, prefer `interface` for objects
**Python:** Black (line 88), Ruff/mypy, snake_case functions, PascalCase classes
**Java:** Google Java Style, `Optional<T>` over null, SLF4J logging
**C#/.NET:** .editorconfig, PascalCase public, `_camelCase` private, `async Task`

### Test Framework Detection

| Framework | Detection | Run Command |
|-----------|-----------|-------------|
| Vitest | `vitest.config.*` | `npx vitest run --coverage` |
| Jest | `jest.config.*` | `npx jest --coverage` |
| pytest | `pyproject.toml [tool.pytest]` | `pytest -v --cov` |
| dotnet test | `*.csproj` | `dotnet test --collect:"XPlat Code Coverage"` |

---

## Error Recovery Protocol

If you detect you are off-track (wrong spec, skipped phase gate, contradicted project artifacts):

### Step 1: STOP
Do NOT continue producing output. Do NOT fix silently.

### Step 2: Acknowledge
State what went wrong clearly.

### Step 3: Re-Read Current State
- Read `status.yaml` to confirm current phase
- Scan `.myArchitecture/specs/` for active spec
- Check which artifacts actually exist on disk

### Step 4: Confirm with User
```
I detected an issue: [describe what went wrong]

Current state:
- Active spec: [name or "none"]
- Current phase: [phase from status.yaml]
- Missing prerequisite: [what's missing]

How would you like to proceed?
1. Backtrack and complete the missing step
2. Override the gate and continue (with documented justification)
3. Start over from [suggested phase]
```

### Step 5: Document Recovery
If a gate was overridden, add a note to `status.yaml`:
```yaml
recovery:
  - date: YYYY-MM-DD
    issue: "Skipped design phase gate"
    resolution: "User approved override - design will be retroactively documented"
```

---

## Project Initialization

### Always Detect Project Type First

When starting a new project or spec, ask:

1. **Greenfield** (no existing code) -- Route to Soren for constitution -> requirements -> design
2. **Brownfield** (existing codebase) -- Route to Enzo for archaeology -> then Soren for requirements
3. **Hybrid** (new features + legacy) -- Route to Enzo for selective archaeology -> then Soren

### Detection Patterns

| Signal | Type | First Agent |
|--------|------|-------------|
| "new project", "from scratch", "greenfield" | Greenfield | Soren |
| "existing codebase", "legacy", "modernize", "brownfield" | Brownfield | Enzo |
| "integrate with", "extend existing", "hybrid" | Hybrid | Enzo (selective) |
| Ambiguous | Ask explicitly | -- |

### Anti-Patterns

- Starting requirements without constitution
- Skipping archaeology on brownfield
- Running archaeology on greenfield (empty project)
- Not asking project type when unclear

---

## Spec Creation Rules

### Mandatory Behaviors (All Agents)

1. **ALWAYS create actual files** using the Edit/Write tools -- never respond with file content in chat only
2. **ALWAYS check constitution first** -- `.myArchitecture/steering/constitution.md` must exist before creating specs
3. **ALWAYS use Agent tool for delegation** -- spawn specialist agents, don't try to do their work
4. **ALWAYS create .meta.json and status.yaml** when creating a new spec
5. **ALWAYS follow EARS syntax** for requirements (must contain SHALL, end with period)
6. **ALWAYS update status.yaml** when phases change or artifacts are created

### Workflow Sequence (Do Not Skip Steps)

0. **BRANCH** -- Create `spec/<slug>` branch (per constitution §7)
1. **SETUP** -- Constitution creation (Soren orchestrates with Zoya + Paulo)
2. **ARCHAEOLOGY** -- Optional, brownfield only (Enzo)
3. **REQUIREMENTS** -- EARS-formatted FR/NFR (Soren, with Nora for UX)
4. **DESIGN** -- Architecture + ADRs (Paulo, minimum 1 ADR per spec)
5. **TEST PLANNING** -- Test cases mapped to requirements (Maia)
6. **TASKS** -- Epic/story/task breakdown (Soren)
7. **IMPLEMENTATION** -- TDD code (Axel)
8. **VALIDATION** -- Quality verification (Maia/Lina)

### Phase Gate Enforcement

Before advancing to the next phase, verify:
- Previous phase status is "completed" in status.yaml
- Required artifacts exist on disk
- If gate fails, BLOCK with clear error message

| Phase | Required Artifact |
|-------|-------------------|
| Requirements | `requirements.md` |
| Design | `design.md` + at least 1 ADR |
| Test-Spec | `tests.md` or `test-plan.md` |
| Tasks | `tasks.md` |

---

## Templates

All templates are stored at `.claude/templates/`:

**Spec templates:** `.claude/templates/spec-templates/`
- status.yaml, requirements.md, design.md, tasks.md, tests.md, .meta.json, CHECKLIST.md, and more

**Steering templates:** `.claude/templates/steering-templates/`
- constitution.md, decision-records.yaml, adr-template/, pdr-template/, cdr-template/

When creating documents, reference the central template and replace placeholder variables.

---

## Traceability

### ID Formats (Never Renumber)

| Type | Format | Example |
|------|--------|---------|
| Requirement | `REQ-###` or `REQ-F-###` / `NFR-###` | REQ-001, REQ-F-001 |
| Epic | `EPIC-##` | EPIC-01 |
| Story | `STORY-##.##` | STORY-01.01 |
| Task | `TASK-###` | TASK-001 |
| Test Case | `TC-###` | TC-001 |
| Architecture Decision | `ADR-###` | ADR-001 |
| Process Decision | `PDR-###` | PDR-001 |
| Code Decision | `CDR-###` | CDR-001 |

### Trace Tags in Code
```
// TRACE: REQ-F-001 (User Authentication)
// TRACE: TASK-003 (Implement Email Validation)
```

---

## EARS Requirements Syntax

| Pattern | Template | Use When |
|---------|----------|----------|
| **Ubiquitous** | The system SHALL [action]. | Always true |
| **Event-Driven** | WHEN [trigger] THEN the system SHALL [action]. | Response to event |
| **State-Driven** | WHILE [state] the system SHALL [action]. | During condition |
| **Optional** | WHERE [condition] the system SHALL [action]. | Configurable |
| **Unwanted** | IF [condition] THEN the system SHALL [action]. | Error handling |

Every requirement MUST: contain "SHALL" (uppercase), end with a period, start with WHEN/IF/WHERE/WHILE/"The system".

---

## Folder Structure

```
.myArchitecture/
  specs/
    <feature>/
      .meta.json              # Spec metadata
      status.yaml             # Phase tracking
      CHECKLIST.md            # Progress tracker
      requirements.md         # EARS requirements
      design.md               # Architecture design
      tasks.md                # Task breakdown
      tests.md                # Test specifications
      estimation.md           # Hybrid SP+token estimation (V2)
  steering/
    constitution.md           # Project governance
    decision-records.yaml     # Decision registry
    adr/                      # Architecture Decision Records
    pdr/                      # Process Decision Records
    cdr/                      # Context/Agent Decision Records (machine-readable)
  archaeology/                # Brownfield analysis (optional)
  shaping/                    # Shaping packages — Phase 0 (V3)
    Shaping-<initiative>/
      product-brief.md        # Zoya leads, Nora input
      functional-spec.md      # Zoya leads, Nora + Paulo input
      design-spec.md          # Paulo leads, Axel SME review (includes blueprints)
      planning-package.md     # Soren leads, Zoya + Paulo input
      ux-brief.md             # Path 1 only: Nora leads
      ddd/                    # Path 2 only
        event-storming-capture.md  # Zoya leads, Paulo input
        domain-model.md            # Zoya leads, Paulo input
      capability-map.md       # Path 3 only: Paulo leads
      document-ingestion.md   # Path 4 only: Soren leads
      requirements-analysis.md # Path 4 only: Zoya leads
      hypothesis-definition.md # Path 5 only: Soren leads
      impact-backlog.md       # Created on first cross-document concern
      status.yaml             # Step-based state machine with context_summaries
      .meta.json
  planning/                   # Sprint plans and retrospectives (V2)
    DELIVERY_PLAN.md          # Sprint backlog, work items, velocity
    SPRINT_HISTORY.md         # Sprint archive
    retrospectives/           # Per-sprint retrospectives
  metrics/                    # Estimation tracking data (V2)
    sessions/                 # Per-session logs
    summaries/                # Weekly/monthly rollups
    estimates/                # Per-spec estimate vs actual
    baselines/
      reference-stories.json  # Calibration reference stories
```

```
.claude/
  knowledge/                  # Domain knowledge files (V2)
    knowledge-manifest.yaml   # Topic-to-file index (~2K tokens)
    archimethod/              # ADA + Method One knowledge (~20 files)
    multilayerperson/         # Cloud architecture knowledge (~10 files)
  docs/                       # Operational HOW-TO guides (V2)
    GETTING-STARTED.md        # V2 workflow overview
    HOW-TO-SHAPING.md         # Full/Light ADA shaping workflow
    HOW-TO-ESTIMATE.md        # SP + token hybrid estimation
    HOW-TO-SCRUM.md           # Sprint ceremony integration
    HOW-TO-SAFE.md            # SAFe PI planning alignment
    HOW-TO-POC.md             # Proof of concept workflow
    HOW-TO-BROWNFIELD.md      # Archaeology-first brownfield
    HOW-TO-DDD.md             # DDD with event storming
```

---

## Facilitation Principles

- **NEVER generate content without user input** -- facilitate, don't dictate
- **Engage in collaborative dialogue**, not command-response
- **Walk through specifications systematically**, section by section
- **After completing a phase**, suggest context-aware next steps (`/critique`, `/approve`, next workflow skill)
- **Write for dual audience**: humans AND AI agents (high information density)
- **Maintain full traceability**: every design, task, and test references requirements

### Phase Completion Pattern

After completing a phase, agents set `ready_for_approval` and suggest context-aware next steps (plural). No interactive menus. Mid-section, agents continue without checkpoints.

Example (end of requirements):
```
✓ requirements.md saved to .myArchitecture/specs/<slug>/requirements.md

Status: ready_for_approval

Next steps:
  /critique requirements   — adversarial review before approval
  /approve requirements    — approve and unlock next phase
  /design                  — proceed to architecture design
```

The specific next skills depend on workflow position. `/approve` is only shown when the phase is `ready_for_approval`.

---

## Shaping (Phase 0) — V3

Shaping is an optional pre-requirements phase for structuring product initiatives before spec creation. It is **recommended for L/XL initiatives (>13 SP)** and optional for S/M work. V3 replaces batch-style scaffolding with interactive, document-by-document authoring through 5 entry paths.

### Workflow

```
/shaping new <name> [--full | --light]
  → Discovery: "What do you want to design?" → keyword scoring → path recommendation
  → Mode selection: Full ADA or Light ADA (or --full/--light flag)
  → Incremental scaffolding: folder + status.yaml + .meta.json only
  → Step-by-step document authoring via step files
  → Each step: lead agent asks questions → writes document → context_summary → approval
  → Output: planning-package with epics, stories, estimates, roadmap
  → /new-spec <epic-name> per epic → normal spec lifecycle
```

### 5 Entry Paths

| Path | Name | First Document(s) | Lead Agent | Use When |
|------|------|-------------------|------------|----------|
| 1 | UX Driven | ux-brief.md | Nora | UX-first, personas and journeys lead |
| 2 | Domain Driven | event-storming-capture.md, domain-model.md | Zoya + Paulo | Domain-first, event-storming and bounded contexts |
| 3 | Capability Driven | capability-map.md | Paulo | Start with capability map, derive architecture |
| 4 | Requirements Driven | document-ingestion.md, requirements-analysis.md | Soren + Zoya | Analyze existing documents (RFP, SOW, etc.) |
| 5 | Proof of Concept | hypothesis-definition.md | Soren | Time-boxed hypothesis validation |

All paths converge on: `product-brief → functional-spec → design-spec → planning-package`

### Modes

| Mode | Command | Architecture in design-spec.md | Use When |
|------|---------|-------------------------------|----------|
| **Full ADA** | `/shaping new <name> --full` | Formal Conceptual + Logical Architecture sections | Enterprise initiatives, multi-system integration, complex architecture |
| **Light ADA** | `/shaping new <name> --light` | Concise Architecture Summary section | Smaller cross-spec work, clear scope, limited architectural complexity |

### Shaping Commands

| Command | Purpose |
|---------|---------|
| `/shaping new <name>` | Discovery flow → path selection → mode selection → create package |
| `/shaping next` | Resume current step or advance to next step |
| `/shaping status` | Display status of all shaping packages with step-level progress |
| `/shaping plan <name>` | Gate 1 validation → generate planning package → Gate 2 validation |

### Architecture

- **Step files** (`.claude/skills/shaping/steps/`) define per-document question strategies
- **Templates** (`.claude/templates/shaping-templates/`) provide document scaffolds
- **Context handoff** via `context_summary` blocks in status.yaml (ADR-018)
- **Gates**: Gate 1 (5 criteria after functional-spec), Gate 2 (7 criteria after planning-package)
- **V2 backward compatibility**: packages without `path` field treated as legacy (NFR-006)

---

## Estimation Framework — V2

Specs use a **hybrid estimation model** with three dimensions:

| Dimension | Scale | Purpose |
|-----------|-------|---------|
| **Story Points (SP)** | Fibonacci (1, 2, 3, 5, 8, 13, 21) | Relative effort measurement |
| **Token Budgets** | Forecasted tokens per phase | Agent consumption forecasting |
| **Confidence Ratings** | Low / Medium / High | Estimation certainty indicator |

### Progressive Refinement

| Level | Accuracy | When | Who |
|-------|----------|------|-----|
| Shaping | +/-50% | Before specs exist | Zoya + Paulo estimate at epic level |
| Requirements | +/-30% | After EARS requirements | Soren refines per-story |
| Tasks | +/-15% | After task breakdown | Soren estimates per-task |
| Actuals | Exact | After completion | `/learning-loop` captures measured values |

### Health Signals (displayed by `/dashboard`)

| Signal | Condition |
|--------|-----------|
| **On Track** | Actual tokens/SP within 25% of estimate |
| **At Risk** | 25-50% above estimate |
| **Off Track** | >50% above estimate |
| **Ahead** | >20% below estimate |

When `/new-spec` creates a spec, it includes an `estimation.md` template with SP per phase, token budgets, confidence ratings, and an actual-vs-planned tracking table.

---

## Knowledge Integration — V2

The `/knowledge` skill provides controlled access to ~30 curated domain knowledge files covering ADA Framework, Method One, and Cloud Architecture (AWS, Azure, multi-cloud).

**How it works:**
1. Reads `knowledge-manifest.yaml` (~2K tokens) to index topics to file paths
2. Matches query keywords against manifest topics
3. Reads top 2 files (max 4K each = 8K total per invocation)
4. Returns structured response with source attribution

**Budget constraint:** A single `/knowledge` invocation loads no more than 8K tokens of knowledge content (NFR-005).

**Usage:** Agents invoke `/knowledge <topic>` when domain knowledge is needed. Phase-specific suggestions are documented in `_shared-behaviors.md` S5.

---

## Shared Behaviors Reference — V2

The `_shared-behaviors.md` file (`.claude/agents/_shared-behaviors.md`) defines cross-cutting agent behaviors in 7 sections:

| Section | Title | Type |
|---------|-------|------|
| S1 | Mandatory Startup Ritual | Required |
| S2 | Approval Lifecycle (5 states) | Required |
| S3 | Phase Completion Behavior | Required |
| S4 | Status Reporting | Required |
| S5 | Session Lifecycle and Context Management | Advisory (V2) |
| S6 | Anti-Fabrication Protocol | Non-negotiable (V2) |
| S7 | Collaboration Triggers | Advisory (V2) |

S5-S7 were added as part of the V2 upgrade. S6 (Anti-Fabrication) is a hard gate -- agents MUST NOT fabricate test results, spec completion, or confidence levels.
