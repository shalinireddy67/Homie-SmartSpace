# Project Status: NESTORA

**Last Updated:** November 1, 2026  
**Current Phase:** Phase 2 — Store & Data Architecture Complete  
**Active Branch:** `feat/store` (Local branch, unpushed as per instructions)  
**Target Delivery:** 1-Month Frontend Cohort Evaluation (GitHub Repository + Loom/MP4 Walkthrough)

---

## 1. Environment & Workspace Health
- **Repository:** `boiled-egg` (`https://github.com/shalinireddy67/boiled-egg`)
- **Active Branch:** `feat/store`
- **Node.js Version:** `v20.18.0`
- **npm Version:** `10.8.2`
- **State Architecture:** Zustand 5.0.1 with 8 modular slices + schema-versioned LocalStorage persistence
- **PRNG Utility:** 32-bit Mulberry32 seeded generator for deterministic simulation
- **Testing:** Vitest 2.1.4, jsdom, React Testing Library (48 unit tests passing)
- **Linting & Strictness:** ESLint 8.57.1 (0 warnings), TypeScript strict mode (`noUncheckedIndexedAccess: true`, 0 `any` types)

---

## 2. Standing Architecture & Amendments Implemented
1. **Per-Field Rollback Fencing:** `deviceSlice` maintains a dedicated per-device per-field sequence map `{ [deviceId]: { [field]: sequence } }`. `canRollback(deviceId, field, sequence)` returns `true` if and only if that specific field has not been superseded by a newer sequence. Modifications to an unrelated field (e.g. `color`) do not invalidate an in-flight rollback for another field (e.g. `brightness`).
2. **Dynamic 10,000+ Event Generation:** The 10,000 historical events are deterministically synthesized on-the-fly from the PRNG seed (`seedData.ts`) and kept strictly in memory. They are **never written to LocalStorage**. Only user configuration, device states, rules, schedules, simulation settings, and theme are persisted.
3. **Automation Trigger Isolation:** Rules evaluate purely based on sensor/device thresholds and schedules. Automation execution events do not trigger cascading rule evaluations (3-hop cap maintained as backup safety).
4. **Ring Buffer Telemetry Boundaries:**
   - `liveTelemetry`: Capped at **300 points** (FIFO ring buffer; equivalent to 5 minutes at 1-second resolution).
   - `executionHistory`: Capped at **100 records**.
   - `anomalies`: Capped at **100 records**.
   - `events`: In-memory buffer capped at **15,000 records** (10,000 seeded + 5,000 runtime buffer).
   - `notifications`: Capped at **200 records**.
   - `toasts`: Capped at **5 concurrent items**.

---

## 3. Measured Metrics (Task 2)
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit`)
- **ESLint Validation:** 0 errors, 0 warnings (`--max-warnings 0`)
- **Unit Test Suite:** 48 tests passed across 8 test suites (`prng`, `seedData`, `store`, `persistence`, `theme`, `modal`, `navigation`, `responsive`) in 10.76s
- **Seed Generation Benchmark:** Synthesizes 10,000 unique, chronologically sorted events with structured details in **32.05 ms**
- **Production Build:** 15.21s compilation time
  - HTML: `dist/index.html` (1.16 kB)
  - CSS: `dist/assets/index-D30aBzfO.css` (21.81 kB, gzip: 4.76 kB)
  - JavaScript: `dist/assets/index-CILV9gFj.js` (209.25 kB, gzip: 65.90 kB)

---

## 4. Implementation Roadmap
| Task # | Task Name | Status | Key Deliverable |
|---|---|---|---|
| **Task 1** | Scaffold, Design System & Shell | ✅ Completed | Vite + TS strict + Tailwind 3.4 + Theme tokens + AppShell + 7 routes + UI primitives |
| **Task 2** | Store & Data Architecture | ✅ Completed | Zustand slices, Mulberry32 PRNG, 10,000 event generator, safe LocalStorage persistence & migration |
| **Task 3** | Rooms & Devices Page | ⏳ Up Next | Room filtering, device grid, thermostat dial, dimmer, color picker, locks, camera controls |
| **Task 4** | Simulation Engine & Overview | ⏹️ Pending | Decoupled tick loop, PRNG, clock injection, optimistic updates with rollback, Overview page |
| **Task 5** | Energy Analytics | ⏹️ Pending | Live power (W), historical energy (kWh), rolling baseline anomaly detection, theme charts |
| **Task 6** | Automations & Dry-Run Simulator | ⏹️ Pending | IF/THEN builder, edge trigger logic, loop prevention, schedule editor, isolated dry-run view |
| **Task 7** | Notifications & Event History | ⏹️ Pending | Persistent notification center, unread counters, toasts, virtualized 10k log with search/filter |
| **Task 8** | Polish, Accessibility, Testing & Docs | ⏹️ Pending | Vitest unit tests, a11y & responsive audits (375/768/1440px), README.md, DEMO.md |

---

## 5. Immediate Next Step
Awaiting user review and approval to proceed with **Task 3: Rooms & Devices Page**.
