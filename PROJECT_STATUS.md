# Project Status: NESTORA

**Last Updated:** November 2, 2026  
**Current Phase:** Phase 2D — Complete Core Logic Engine (Automation, Dry-Run, Energy Analytics, Notifications, Event Filters)  
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
- **Testing:** Vitest 2.1.9, jsdom, React Testing Library (**122 unit tests passing across 15 test suites**)
- **Linting & Strictness:** ESLint 8.57.1 (0 errors, 0 warnings), TypeScript strict mode (`noUncheckedIndexedAccess: true`, 0 `any` types)
- **Production Build:** Passes cleanly (`tsc && vite build`) with zero chunk or bundling errors

---

## 2. Standing Architecture & Policies Implemented
1. **Rule Evaluation Engine (`src/engine/automation.ts`):**
   - Pure function `evaluateRule(rule, snapshot)`: takes a read-only snapshot (current time, sensor values, device states) with zero external state or side-effects.
   - Diagnostic breakdown per condition: `passed`, `actual`, `expected`, and human-readable `reason`.
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
   - Proven by unit tests to deep-freeze inputs, spy zero calls to `dispatchCommand`, and leave store state deep-equal before and after.
   - Uses the identical `evaluateRule` engine function as live execution.
4. **Energy Analytics Engine (`src/engine/energy.ts`):**
   - `detectAnomalies(series, options)`: Gaussian rolling baseline over previous N points (point excluded, minSamples 8, stdFloor 1.0, k threshold 3). Handles flat series without 0/0 and never flags early points.
   - `aggregateEnergy(readings, range, now, customRange?)`: Buckets high-frequency power data across 1h (60 1-min buckets), 24h (24 1-hr buckets), 7d (7 1-day buckets), 30d (30 1-day buckets), and custom ranges.
   - Mathematical invariant: Sum of device kWh equals total kWh, and sum of room kWh equals total kWh.
   - Empty/invalid ranges return structured `{ status: 'insufficient_data', ... }` state with 0 values, never `NaN`.
   - Deterministic seeded demo generator exported with `DEMO` label and reproducible anomalies.
5. **Notification Deduplication Engine (`src/engine/notifications.ts`):**
   - Dedupe key generation per `category:targetIdOrCondition`.
   - Injected virtual clock cooldown suppression: duplicate triggers within cooldown return `{ published: false, reason: 'cooldown_active' }`.
   - Ongoing condition lifecycle: raises exactly one notification until cleared via `clearOngoingCondition`.
   - Store persistence: Notification hub state and read/unread flags live in the central store, surviving component remounts and LocalStorage save/load cycles.
6. **High-Performance Event Filtering & Sorting (`src/engine/eventFilters.ts`):**
   - Precomputes lowercase compound index `_searchField` once for sub-millisecond querying over 10,000+ items.
   - Multi-criteria filtering combining text search, types, severities, room, device, and start/end dates using strict logical AND.
   - Non-mutating ascending and descending sorting by timestamp.

---

## 3. Measured Metrics
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit`)
- **ESLint Validation:** 0 errors, 0 warnings (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`)
- **Unit Test Suite:** 122 tests passed across 15 test suites in 10.60s:
  - `energy.test.ts`: 12 tests
  - `eventFilters.test.ts`: 11 tests
  - `notifications.test.ts`: 7 tests
  - `automation.test.ts`: 15 tests
  - `dryRun.test.ts`: 8 tests
  - `commands.test.ts`: 11 tests
  - `simulation.test.ts`: 9 tests
  - `persistence.test.ts`: 8 tests
  - `store.test.ts`: 7 tests
  - `seedData.test.ts`: 8 tests
  - `modal.test.tsx`: 5 tests
  - `theme.test.tsx`: 4 tests
  - `navigation.test.tsx`: 9 tests
  - `responsive.test.tsx`: 2 tests
  - `prng.test.ts`: 6 tests
- **Benchmarks (Measured Real Times):**
  - Synthesize 10,000 seeded events: **30.77 ms**
  - Precompute composite search index on 10,000 events: **30.74 ms**
  - Multi-field filter over 10,000 events down to 455 items: **30.93 ms**
  - Sort 10,000 events: **7.39 ms**
- **Task 5 Test Metrics:**
  - 19 test files, 175 tests passing (100% pass rate)
  - Unit & Integration suites covering controls (`DimmerSlider`, `ColorPicker`, `RadialDial`), device cards, confirm modals, offline handling, optimistic rollback, filter combinations, and memoization render counts
- **Production Build:** Built in 10.26s
  - `dist/index.html`: 1.16 kB (gzip: 0.62 kB)
  - `dist/assets/index-D_PuCJfT.css`: 29.52 kB (gzip: 5.75 kB)
  - `dist/assets/index-DMXvuG91.js`: 264.10 kB (gzip: 81.06 kB)

---

## 4. Implementation Roadmap
| Task # | Task Name | Status | Key Deliverable |
|---|---|---|---|
| **Task 1** | Scaffold, Design System & Shell | ✅ Completed | Vite + TS strict + Tailwind 3.4 + Theme tokens + AppShell + 7 routes + UI primitives |
| **Task 2** | Store & Data Architecture | ✅ Completed | Zustand slices, Mulberry32 PRNG, 10k event generator, safe LocalStorage persistence & migration |
| **Task 2B** | Command Dispatcher & Simulation | ✅ Completed | Injected dispatcher with rollback fencing, SimulationEngine with speed & StrictMode safety |
| **Task 3** | Automation Engine & Dry-Run | ✅ Completed | Edge-triggered evaluator, cooldown tracker, 3-hop depth cap, isolated dry-run simulator |
| **Task 4** | Energy, Notifications & Event Filters | ✅ Completed | Rolling baseline anomaly detector, multi-range aggregator, dedupe notifications, fast 10k event filters |
| **Task 5** | Rooms & Devices Page | ✅ Completed | Interactive device cards, dimmer slider, color picker, accessible radial dial, lock confirm modals, AND filters, memoization |
| **Task 6** | Overview & Energy Analytics UI | ⏳ Up Next | Live telemetry cards, status summaries, theme-aware Recharts power visualizations |
| **Task 7** | Automations & Dry-Run UI | ⏹️ Pending | IF/THEN builder, schedule editor, dry-run modal inspector |
| **Task 8** | Event History, Notifications & Polish | ⏹️ Pending | TanStack Virtual 10k event log, persistent notification center, DEMO.md script |

---

## 5. Immediate Next Step
Awaiting user review and approval to proceed with **Task 6: Overview & Energy Analytics UI** on a new feature branch.
