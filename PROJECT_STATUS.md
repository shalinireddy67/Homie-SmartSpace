# Project Status: NESTORA

**Last Updated:** November 2, 2026  
**Current Phase:** Phase 2C — Automation Engine & Isolated Dry-Run Simulator Complete  
**Active Branch:** `feat/logic` (Local branch, unpushed as per instructions)  
**Target Delivery:** 1-Month Frontend Cohort Evaluation (GitHub Repository + Loom/MP4 Walkthrough)

---

## 1. Environment & Workspace Health
- **Repository:** `boiled-egg` (`https://github.com/shalinireddy67/boiled-egg`)
- **Active Branch:** `feat/logic`
- **Node.js Version:** `v20.18.0`
- **npm Version:** `10.8.2`
- **Core Engine Architecture:** Pure TypeScript (`src/engine/`), zero React imports, full dependency injection (`Clock`, `Scheduler`, `PRNG`, `StoreAccessor`)
- **Thermostat Standards:** Celsius defaults across seed and domain models (min 16°C, max 30°C, target 22°C)
- **Testing:** Vitest 2.1.9, jsdom, React Testing Library (**87 unit tests passing across 12 test suites**)
- **Linting & Strictness:** ESLint 8.57.1 (0 errors, 0 warnings), TypeScript strict mode (`noUncheckedIndexedAccess: true`, 0 `any` types)
- **Production Build:** Passes cleanly (`tsc && vite build`) with zero chunk or bundling errors

---

## 2. Standing Architecture & Policies Implemented
1. **Rule Evaluation Engine (`src/engine/automation.ts`):**
   - Pure function `evaluateRule(rule, snapshot)`: takes a read-only snapshot (current time, sensor values, device states) with zero external state or side-effects.
   - Per-condition evaluation with exact `passed`, `actual`, `expected`, and diagnostic `reason`.
   - Condition kinds: `temperature_above/below`, `humidity_above/below`, `device_on/off`, `lock_locked/unlocked`, `device_online/offline`, `power_above`, and `time_window`.
   - Offline device safety: Any state condition evaluated against an offline device evaluates to `false` with reason `"Device offline"`. Only explicit `device_online/offline` checks can pass on offline devices.
   - Time window handling: Start-inclusive, end-exclusive; supports windows spanning midnight using normalized minute-of-day math; empty weekday array defaults to running every day.
2. **Edge-Triggered Execution & Guardrails (`decideExecution`):**
   - **False-to-True Edge Triggering:** Rules fire strictly when eligibility transitions from `false` to `true`. Continuously true rules do not re-fire on subsequent ticks.
   - **Cooldown Management:** State tracks `lastFiredTimestamp`; suppresses firing if elapsed virtual time is below cooldown interval.
   - **Loop Guarding:** When `context.causedByAutomation` is true, further rule triggering is blocked; backed up by a 3-hop depth cap.
   - **Deterministic Conflict Resolution:** If multiple rules issue conflicting actions on the same device field during one tick, the last rule in priority order (array index) wins; skipped actions log an explicit skipped reason.
   - **Offline Target Safety:** Actions targeting offline devices are skipped with diagnostic logging and recorded as skipped executions.
3. **Isolated Dry-Run Simulator (`src/engine/dryRun.ts`):**
   - Pure function `dryRunRule(rule, snapshot)` providing instant feedback for the rule builder UI.
   - Evaluates rule against real or simulated snapshots without executing commands or mutating state.
   - Returns `{ simulation: true, eligible, conditionResults, plannedActions, skippedActions, timeWindowPassed, weekdaysPassed }`.
4. **Command Dispatcher & Simulation Engine (`src/engine/commands.ts`, `src/engine/simulation.ts`):**
   - Per-field rollback fencing map `{ [deviceId]: { [field]: sequence } }`.
   - Domain rules: Brightness 0 switches light off; switching light on at brightness 0 resets brightness to 100.
   - StrictMode idempotency with virtual time scaling (`1x`, `2x`, `5x`, `10x`).

---

## 3. Measured Metrics (Task 3)
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit`)
- **ESLint Validation:** 0 errors, 0 warnings (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`)
- **Unit Test Suite:** 87 tests passed across 12 test suites in 7.64s execution time:
  - `automation.test.ts`: 15 tests
  - `dryRun.test.ts`: 4 tests
  - `commands.test.ts`: 11 tests
  - `simulation.test.ts`: 9 tests
  - `persistence.test.ts`: 8 tests
  - `store.test.ts`: 7 tests
  - `seedData.test.ts`: 7 tests
  - `modal.test.tsx`: 5 tests
  - `theme.test.tsx`: 4 tests
  - `navigation.test.tsx`: 9 tests
  - `responsive.test.tsx`: 2 tests
  - `prng.test.ts`: 6 tests
- **Seed Benchmark:** 10,000 unique events generated in **23.76 ms**
- **Production Build:** Built in 34.36s
  - `dist/index.html`: 1.16 kB (gzip: 0.62 kB)
  - `dist/assets/index-D30aBzfO.css`: 21.81 kB (gzip: 4.76 kB)
  - `dist/assets/index-BYoIxcMR.js`: 209.26 kB (gzip: 65.90 kB)

---

## 4. Implementation Roadmap
| Task # | Task Name | Status | Key Deliverable |
|---|---|---|---|
| **Task 1** | Scaffold, Design System & Shell | ✅ Completed | Vite + TS strict + Tailwind 3.4 + Theme tokens + AppShell + 7 routes + UI primitives |
| **Task 2** | Store & Data Architecture | ✅ Completed | Zustand slices, Mulberry32 PRNG, 10,000 event generator, safe LocalStorage persistence & migration |
| **Task 2B** | Core Engine & Command Dispatcher | ✅ Completed | Pure TypeScript command pipeline with rollback fencing, SimulationEngine with speed & StrictMode safety |
| **Task 3** | Automation Engine & Rules Logic | ✅ Completed | Edge-triggered rule evaluator, cooldown tracker, 3-hop depth cap, isolated dry-run simulator |
| **Task 4** | Energy Analytics Engine | ⏳ Up Next | Rolling-baseline computation, statistical anomaly markers, aggregation buckets |
| **Task 5** | Rooms & Devices Page | ⏹️ Pending | Tactile device cards, radial dial with keyboard support, light dimmer & color picker, lock modals |
| **Task 6** | Overview & Energy Pages | ⏹️ Pending | Live telemetry cards, status summaries, theme-aware Recharts visualization |
| **Task 7** | Automations & Dry-Run UI | ⏹️ Pending | IF/THEN builder, schedule editor, dry-run modal inspector |
| **Task 8** | Notifications, Event History & Polish | ⏹️ Pending | TanStack Virtual 10k event log, persistent notification center, DEMO.md script |

---

## 5. Immediate Next Step
Awaiting user review and approval to proceed with **Task 4: Energy Analytics Engine** (pure TypeScript domain analytics, rolling-baselines, anomaly detection, aggregation) or UI pages.
