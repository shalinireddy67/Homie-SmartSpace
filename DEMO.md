# Homie SmartSpace — Video Demo Script & Verification Walkthrough

**Target Evaluation:** 1-Month Frontend Cohort Evaluation (Loom 1080p / 60 FPS Walkthrough)  
**Live Application URL:** [https://homie-smartspace.vercel.app](https://homie-smartspace.vercel.app)  
**Repository:** [https://github.com/shalinireddy67/Homie-SmartSpace](https://github.com/shalinireddy67/Homie-SmartSpace)

---

## 1. Exact Starting State Setup

Before beginning the demo recording, initialize the application into a clean, reproducible state:
1. Navigate to the landing page at `/` or **Settings** (`/app/settings`).
2. If already in dashboard, click **Reset Demo Data** in Settings or use **Exit demo** in the top navigation to return to `/`.
3. In Settings (`/app/settings`), verify defaults:
   - **Simulation Speed:** `1x` (Real-time diurnal cycle)
   - **PRNG Seed:** `1234` (Predictable environmental drift and anomaly injection)
   - **Failure Probability:** `0%` (Commands succeed cleanly unless explicitly armed)
   - **Fail Next Command:** `OFF`
   - **Theme:** `Light` or `Dark` (as preferred for recording)
4. Ensure the banner at the top reads: `"All data is simulated. No real devices are connected."`

---

## 2. Timed 6-to-8 Minute Walkthrough Script

| Timestamp | Screen / Action | Spoken Script & Actions | Acceptance Criteria Demonstrated |
|:---|:---|:---|:---|
| **0:00 - 0:45** | **Public Landing (`/`) & Sign In (`/login`)** | *"Welcome to Homie SmartSpace. We start at the public landing page showcasing our modern smart home dashboard capabilities. With a single click on 'Try the live demo', an authenticated demo session is initialized, directing us seamlessly into `/app` without server friction or account setup."* | **1. Landing & Session**<br>• Public landing page<br>• One-click demo session |
| **0:45 - 1:30** | **Overview (`/app`) & Quick Controls** | *Demonstrate the Semi-Circular Arc Gauge:* adjust brightness slider and thermostat setpoint. Click the Lock quick action button. Observe immediate feedback and live energy breakdown tiles update in real time. | **2. Device Controls & Telemetry**<br>• Radial dial & Arc gauge<br>• Pastel metric tiles |
| **1:30 - 2:30** | **Rooms & Devices (`/app/rooms`)** | Filter by room (*Living Room*, *Primary Bedroom*) and device type (*Lights*, *Thermostats*, *Smart Locks*, *Cameras*). Use the search bar to query *"patio"*. Toggle a light switch. Show the camera privacy shutter tile with simulated status banner. Point out offline device card with clear reason banner. | **3. Rooms & Device Hierarchy**<br>• Multi-faceted filtering & search<br>• Distinct device cards & offline states |
| **2:30 - 3:30** | **Optimistic Updates & Rollback Fencing** | Switch to **Settings** (`/app/settings`), arm **Fail Next Command**. Return to **Rooms** (`/app/rooms`), toggle living room light. Show optimistic state change, immediate rollback highlight after simulated round-trip delay, and red failure toast notification. | **4. Optimistic Commands & Rollback**<br>• Rollback moment highlight<br>• Non-interfering field isolation |
| **3:30 - 4:45** | **Automations & Dry-Run (`/app/automations`)** | Open **Rule Builder Modal**. Construct a rule: *WHEN Living Room Motion is Active AND Ambient Lux < 100 THEN Turn Living Room Light ON*. Switch to the **Dry-Run Panel**. Explain: *"Our dry-run engine deep-freezes the current state and evaluates conditions against simulated values with zero side-effects on live hardware."* Test conditions, show pass/fail badges and proposed actions. View the **Schedules Tab** and **History Tab**. | **5. Automations & Dry-Run Simulator**<br>• Multi-condition builder<br>• Pure dry-run sandbox<br>• Next run computation |
| **4:45 - 5:45** | **Energy Analytics (`/app/energy`)** | Select segmented timeframes: `1h`, `24h`, `7d`, `30d`. Point out power consumption (W) and cumulative energy (kWh) charts. Identify the highlighted anomaly marker, hover for tooltip (timestamp, baseline, threshold). Toggle **View data as table** to demonstrate tabular accessibility. | **6. Energy Analytics & Anomalies**<br>• Gaussian anomaly detection<br>• Accessible table alternative |
| **5:45 - 6:45** | **Event History (`/app/events`)** | Explain the 10,000+ seeded event audit trail. Scroll through the virtualized list at 60 FPS using `@tanstack/react-virtual`. Filter by severity (*Critical*, *Warning*) and event type. Open the event inspector modal to review raw JSON payload and copy to clipboard. | **7. Virtualized Event History**<br>• 10k+ virtualized rows<br>• Sub-millisecond precomputed index<br>• Detailed audit modal |
| **6:45 - 7:30** | **Notifications, Theme & Exit Demo (`/app/notifications`, `/app/settings`)** | Open the slide-out **Notification Center Drawer**, review notifications grouped by time, and mark all as read. Navigate to **Settings**, toggle theme between Light, Dark, and System modes showing zero-flash persistence via `HOMIE_SMARTSPACE_THEME`. Click **Exit demo** in the header to safely return to `/`. | **8. Notifications & Theme System**<br>• Zero-flash LocalStorage persistence<br>• Demo session exit |
| **7:30 - 8:00** | **Accessibility, Responsive Wrap-up** | Conclude with keyboard navigation (Tab through focus rings, skip link) and highlight zero-axe-violation compliance across all routes. | **9. WCAG AA Accessibility**<br>• Accessible contrast & focus rings |

---

## 3. The 12 Acceptance Items Mapping

1. **Seven Functional Pages + 404 Route** — Shown at **0:00**, **1:30**, **3:30**, **4:45**, **5:45**, **6:45**.
2. **Design-v2 Theming & Layout** — Shown at **0:15** and **7:00** (Light/Dark parity, zero-flash).
3. **Rooms & Multi-Type Device Cards** — Shown at **1:45** (Lights, Thermostats, Locks, Cameras).
4. **Optimistic Updates & Rollback Recovery** — Shown at **2:45** (Fail next command armed, visual rollback highlight).
5. **Multi-Condition Automation Rule Builder** — Shown at **3:35** (AND/OR logic, time windows).
6. **Isolated Dry-Run Engine** — Shown at **4:05** (Pure simulation, zero store mutations).
7. **Schedule Engine with Next-Run Computation** — Shown at **4:30** (Recurrence, execution history).
8. **Energy Analytics with Anomaly Markers** — Shown at **4:55** (Power W, energy kWh, anomaly tooltips).
9. **10,000+ Virtualized Event Audit Log** — Shown at **5:50** (TanStack Virtual 60 FPS scroll).
10. **Notification Center Drawer & Page** — Shown at **6:45** (Unread badge, time grouping).
11. **Client Persistence & Migration** — Shown at **7:15** (`HOMIE_SMARTSPACE_V1_STATE` storage, JSON import/export).
12. **Full WCAG 2.1 AA Accessibility** — Shown throughout (**7:35**, 44px touch targets, focus rings).

---

## 4. Tips for Recording with Loom at 1080p

1. **Resolution & Scaling:** Set display scaling to 100% in Windows display settings and maximize the browser window on a 1920×1080 or larger monitor.
2. **Audio Quality:** Use an external microphone or headset; minimize background noise.
3. **Pacing:** Speak clearly and allow 1–2 seconds after clicks for animations and tooltips to be clearly visible on video.
4. **Mouse Cursor:** Enable cursor highlighting in Loom settings to make click interactions easy to follow.
