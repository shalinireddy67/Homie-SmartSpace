# Project Status: NESTORA

**Last Updated:** November 1, 2026  
**Current Phase:** Phase 2B — Command Dispatcher & Central Simulation Engine Complete  
**Active Branch:** `feat/engine` (Local branch, unpushed as per instructions)  
**Target Delivery:** 1-Month Frontend Cohort Evaluation (GitHub Repository + Loom/MP4 Walkthrough)

---

## 1. Environment & Workspace Health
- **Repository:** `boiled-egg` (`https://github.com/shalinireddy67/boiled-egg`)
- **Active Branch:** `feat/engine`
- **Node.js Version:** `v20.18.0`
- **npm Version:** `10.8.2`
- **Core Engine Architecture:** Pure TypeScript (`src/engine/`), zero React imports, full dependency injection (`Clock`, `Scheduler`, `PRNG`, `StoreAccessor`)
- **Thermostat Standards:** Celsius defaults across seed and domain models (min 16°C, max 30°C, target 22°C)
- **Testing:** Vitest 2.1.4, jsdom, React Testing Library (**68 unit tests passing across 10 test suites**)
- **Linting & Strictness:** ESLint 8.57.1 (0 warnings), TypeScript strict mode (`noUncheckedIndexedAccess: true`, 0 `any` types)

---

## 2. Standing Architecture & Amendments Implemented
1. **Thermostat Default Unit to Celsius:** All thermostat models, rooms, rules, schedules, and test assertions standardized on Celsius with range [16°C, 30°C] and default target 22°C.
2. **Zero Storage of Telemetry & 10,000 Events:** Fully verified by automated unit tests that `localStorage.getItem('NESTORA_V1_STATE')` contains zero occurrences of `"events"`, `"liveTelemetry"`, or `"initialTelemetry"`. Only user configuration and state are persisted.
3. **Command Dispatcher (`src/engine/commands.ts`):**
   - Injected side-effects (`Clock`, `Scheduler`, `StoreAccessor`, `PRNG`). Zero direct `Date.now()` or `setTimeout()`.
   - Comprehensive validation: rejects unknown devices; rejects offline devices with descriptive status reason; rejects invalid brightness; rejects out-of-range thermostat targets without clamping.
   - Domain logic coupling: brightness 0 switches light `on: false`; turning light on at brightness 0 sets `brightness: 100`.
   - Per-field sequence versioning with rollback fencing: older failed commands never overwrite newer successful state on the same field; unrelated fields still roll back safely.
   - Deterministic failure debugging: consumes `simulationSlice.failNextCommand` flag once, or applies seeded PRNG with `failureProbability`. Never `Math.random()`.
   - Failure side-effects: pushes danger toast, notification to hub, and audit event.
4. **Simulation Engine (`src/engine/simulation.ts`):**
   - Idempotent lifecycle: `start()` called multiple times maintains exactly 1 timer; `stop()` clears timer; fully resilient to React Strict Mode double-mounting.
   - Virtual time scaling: `setSpeed(1 | 2 | 5 | 10)` modulates virtual time delta without changing real hardware tick rate.
   - Deterministic `step(virtualDtMs)`: gradual temperature drift toward online thermostat targets, bounded humidity (20%–80%), power recalculation where total watts equals sum of online devices and offline devices draw 0 W.
   - Seeded reproducible anomalies and network ping dropouts.
   - Clean listener subscription with guaranteed unsubscription removal.

---

## 3. Measured Metrics (Task 2B)
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit`)
- **ESLint Validation:** 0 errors, 0 warnings (`--max-warnings 0`)
- **Unit Test Suite:** 68 tests passed across 10 test suites (`commands`, `simulation`, `prng`, `seedData`, `store`, `persistence`, `theme`, `modal`, `navigation`, `responsive`) in 12.27s
- **Seed Generation Benchmark:** Synthesizes 10,000 unique events with structured payloads and sorted timestamps in **30.25 ms**
- **Production Build:** 9.51s compilation time
  - HTML: `dist/index.html` (1.16 kB)
  - CSS: `dist/assets/index-D30aBzfO.css` (21.81 kB, gzip: 4.76 kB)
  - JavaScript: `dist/assets/index-BYoIxcMR.js` (209.26 kB, gzip: 65.90 kB)

---

## 4. Implementation Roadmap
| Task # | Task Name | Status | Key Deliverable |
|---|---|---|---|
| **Task 1** | Scaffold, Design System & Shell | ✅ Completed | Vite + TS strict + Tailwind 3.4 + Theme tokens + AppShell + 7 routes + UI primitives |
| **Task 2** | Store & Data Architecture | ✅ Completed | Zustand slices, Mulberry32 PRNG, 10,000 event generator, safe LocalStorage persistence & migration |
| **Task 2B** | Core Engine & Command Dispatcher | ✅ Completed | Pure TypeScript command pipeline with rollback fencing, SimulationEngine with speed & StrictMode safety |
| **Task 3** | Automation Engine & Rules Logic | ⏳ Up Next | Edge-triggered rule evaluator, cooldown tracker, 3-hop depth cap, isolated dry-run simulator |
| **Task 4** | Energy Analytics Engine | ⏹️ Pending | Rolling-baseline computation, statistical anomaly markers, aggregation buckets |
| **Task 5** | Rooms & Devices Page | ⏹️ Pending | Tactile device cards, radial dial with keyboard support, light dimmer & color picker, lock modals |
| **Task 6** | Overview & Energy Pages | ⏹️ Pending | Live telemetry cards, status summaries, theme-aware Recharts visualization |
| **Task 7** | Automations & Dry-Run UI | ⏹️ Pending | IF/THEN builder, schedule editor, dry-run modal inspector |
| **Task 8** | Notifications, Event History & Polish | ⏹️ Pending | TanStack Virtual 10k event log, persistent notification center, DEMO.md script |

---

## 5. Immediate Next Step
Awaiting user review and approval to proceed with the next logic milestone (**Automation Engine & Rules Logic** or UI as directed).
