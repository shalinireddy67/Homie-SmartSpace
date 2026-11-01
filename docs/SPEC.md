# NESTORA - Smart Home / IoT Control Dashboard
## Project Specification

### Project Overview
NESTORA is an advanced Smart Home / IoT Control Dashboard designed as a responsive web application where a homeowner can view devices by room, control them, watch simulated live sensor data, analyse energy use, build automation rules, and review a large event history.

Everything is simulated. No real devices, no MQTT, no backend, no paid APIs or keys. It must run locally with `npm install` and `npm run dev`. The product name must be easy to change (one constant).

This project is an advanced one-month frontend cohort project evaluated by a GitHub repository and a Loom/MP4 demo walkthrough.

---

### Tech Stack
- **Framework**: React (v18 or v19)
- **Language**: TypeScript (strict mode enabled)
- **Bundler & Build Tool**: Vite
- **Styling**: Tailwind CSS (with dark/light theme support)
- **State Management**: Zustand
- **Charting**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router (v6/v7)
- **List Virtualization**: TanStack Virtual
- **Testing**: Vitest, React Testing Library

---

### Mandatory Features

#### 1. Seven Pages
- **Overview**: High-level status cards, quick room summaries, live sensor telemetry, active alerts, quick device actions, simulated data notice.
- **Rooms & Devices**: Multi-room device grid, per-room filtering, room stats, device cards with individual controls, online/offline status tags, offline reason indicators.
- **Automations**: Rule list, execution statistics, trigger/action builder, dry-run simulator panel, schedule manager.
- **Energy Analytics**: Live power metrics (Watts), historical energy charts (kWh), dynamic time filters (1h, 24h, 7d, 30d, custom), room/device breakdowns, rolling baseline anomaly detection.
- **Event History**: 10,000+ virtualized event logs, full-text search, multi-facet filtering (severity, device, room, event type, date range), sorting, slide-out details inspection panel.
- **Notifications**: Dedicated persistent notification center, unread indicators, mark-as-read controls, category filtering, toast notification integration.
- **Settings**: App preferences, theme toggle (dark/light), simulation engine controls (speed, tick interval, seed, pause/play), fail-next-command debugging toggle, data export/reset.

#### 2. Theme & Design System
- Dark and light theme support with persistent local storage.
- Zero-flash initial theme script execution.
- Charts dynamically adjust colors and grid lines according to the active theme.
- Minimalist, premium, commercial-grade aesthetic: restrained elevation/shadows, curated palette, visible focus states, accessibility compliance, and reduced-motion respect.

#### 3. Rooms & Device Hierarchy
- Rooms: **Living Room**, **Bedroom**, **Kitchen**, **Bathroom**, **Outdoor**.
- Supported device types: **Lights**, **Thermostats**, **Smart Locks**, **Cameras**.
- Realistic online/offline states: at least one device starts offline out-of-the-box.
- Offline devices disable interactive controls and visibly communicate reason (e.g., "Network Timeout", "Firmware Updating", "Battery Depleted").

#### 4. Device Controls
- **Lights**: On/off toggle, dimmer slider (0–100%), color temperature/RGB picker.
- **Thermostat**: Interactive radial dial controller with keyboard accessibility (arrow keys) and bounded min/max setpoint constraints.
- **Smart Lock**: Secure lock/unlock action with confirmation modal/prompt.
- **Camera**: Simulated surveillance controls (motion detection toggle, night vision, privacy shutter, status feed without fake media video).
- **Graceful Error Handling**: Disabled controls with clear explanatory badges for offline hardware.

#### 5. Schedule Editor
- Create, read, update, and delete (CRUD) recurring scheduled actions.
- Target device selection, action payload (e.g., set brightness, lock door, adjust temperature), execution time, and recurrence by weekdays.
- Comprehensive form validation, calculated next run time indicator, and persistent storage.

#### 6. Central Simulation Engine
- Completely decoupled from UI component lifecycles (no rogue component `setInterval`).
- Generates realistic ambient temperature fluctuations, humidity shifts, energy draw changes, simulated online/offline ping drops, command delays, and anomalies.
- Global simulation controls: Start/Pause, playback speed multiplier (1x, 2x, 5x, 10x), seeded pseudo-random number generator (PRNG) for reproducibility, injectable virtual clock.
- Strict Mode resilient, memory-bounded circular history buffer, and prominent "Simulated data" banner.

#### 7. Optimistic Updates with Rollback
- Immediate optimistic UI state change upon user interaction.
- Asynchronous command dispatch pipeline with synthetic latency.
- Rollback mechanism: on simulated failure, revert target device to exact pre-dispatch state, trigger toast notification, and log an error event in the audit log.
- Timestamp/version fencing: outdated failed commands never overwrite newer successful state transitions.
- Dedicated **"Fail Next Command"** debug toggle for deterministic demo verification.

#### 8. Energy Analytics & Anomaly Detection
- Live power consumption monitoring (W) and cumulative energy consumption (kWh).
- Time horizons: 1 hour, 24 hours, 7 days, 30 days, and custom range.
- Breakdown visualization: by room and by individual device type.
- Statistical rolling-baseline anomaly detection (spikes/surges) highlighted via markers on chart lines, synchronized tooltips, and legends.
- Realistic pre-seeded demo dataset clearly tagged as simulated.

#### 9. Automation Rule Builder
- Trigger conditions: IF sensor threshold, time window, device state, or day-of-week criteria met (supporting both AND/OR grouping logic).
- Action targets: THEN execute device commands (e.g., "Turn off living room lights", "Set thermostat to 68°F").
- Rule evaluation engine semantics: edge-triggered (false to true transition), configurable cooldown period, debounce prevention, loop prevention, and graceful offline target handling.
- Execution audit history logged per automation.

#### 10. Dry-Run Simulator
- Evaluates rules against hypothetical or current system states using identical rule engine logic.
- Visual step-by-step breakdown showing condition-by-condition pass/fail evaluation, descriptive matching rationale, and simulated output actions.
- Strictly isolated: never mutates live store state, dispatches hardware commands, or appends production execution records. Clearly branded as "Simulation Mode".

#### 11. Toast Notifications & Notification Center
- Ephemeral toast notifications for real-time events (command failures, high energy alerts, automation triggers).
- Persistent Notification Center drawer/page with read/unread tracking, badge counters, multi-level severity badges (info, success, warning, alert), mark all read, and alert deduplication with cooldown intervals.

#### 12. Virtualized Event History
- Pre-seeded with 10,000+ realistic audit log events.
- Smooth 60fps scrolling powered by TanStack Virtual.
- Multi-dimensional filtering: keyword search, event category, severity level, room, device, and timestamp interval.
- Column sorting and slide-out / modal event detail inspection drawer.

#### 13. Robust Persistence Layer
- Schema-versioned LocalStorage persistence.
- Safe serialization/deserialization with schema validation and sanitization.
- Automated migration and graceful fallback/recovery on corrupted local storage state.

#### 14. Accessibility, Responsiveness & Documentation
- Responsive layouts calibrated for 375px (mobile), 768px (tablet), and 1440px (desktop).
- Full keyboard navigation, visible focus indicators, ARIA attributes for custom widgets (radial thermostat dial, sliders).
- Comprehensive test suite for critical business logic (simulation engine, optimistic rollback, automation evaluation, persistence recovery).
- Clear `README.md` and detailed `DEMO.md` video script.

---

### Non-Functional & Cohort Constraints
- Single constant product configuration (`src/constants/config.ts` or similar) to allow effortless branding customization.
- 100% client-side execution — zero backend dependencies, zero paid keys.
- Production-grade code hygiene: TypeScript strict mode with no implicit `any`, linting, and automated unit tests.

