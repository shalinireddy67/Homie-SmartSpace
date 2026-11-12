# Nestora Smart Home Design System (v2)

Design specification derived from the Dribbble reference (`docs/design/reference-2.png` / `https://dribbble.com/shots/26727815-Smart-Home-Dashboard`).

---

## 1. Reference Analysis

### Layout & Navigation
- **App Container:** Soft icy-blue outer canvas (`#C2D4E0` -> `#EEF4F4` workspace tint) framing a floating white/icy-tinted rounded app surface (`rounded-3xl`, `24px`).
- **Desktop Navigation:** Horizontal top pill bar centered inside the header:
  - Left: Minimalist geometric brand mark (`NESTORA`) + Home selector pill (`Lakeview Home`).
  - Center: Top pill navigation links (`Overview`, `Rooms & Devices`, `Automations`, `Energy Analytics`, `Event History`, `Notifications`, `Settings`). Active item sits inside a soft icy-blue rounded pill (`#CFE2E9`).
  - Right: Compact simulation controls (`Start/Pause`, `Speed`, `Fail Next`), theme toggle (`Light`/`Dark`), Notification Bell badge, and user avatar (`AM`).
- **Mobile Navigation (`< 768px`):** Sticky compact bottom tab bar (`>= 44px` touch targets) + slide-up "More" drawer covering all 7 routes.
- **Overview Grid (Asymmetric 2-Column Split on Desktop `lg:grid-cols-12`):**
  - **Left Column (8 cols):**
    1. Room selector horizontal pill bar (`All Rooms`, `Living Room`, `Primary Bedroom`, `Kitchen`, `Ensuite Bathroom`, `Outdoor Patio`) with circular room badges.
    2. **Hero Room Stage Card (`24px` radius):** Soft architectural interior vector stage with overlaid live telemetry pills (`Today's Energy kWh`, `Devices Count`), zone hotspot badges (`Lights`, `Climate`, `Cameras`), and a bottom-left floating frosted Lock quick-control card (`Locked`/`Unlocked` + toggle button).
    3. **Bottom 3-Card Quick Strip:** 3 side-by-side clean white/icy-white cards (`#F5F9FA`) for immediate control of a Thermostat (`°C` + step/status), a Smart Light (`%` + toggle Switch), and an active Schedule (`HH:MM` + toggle Switch).
  - **Right Column (4 cols, full-height panel `#F1F7F7`):**
    1. Active room header + stylized pendant lamp graphic + device sub-tabs (`Smart Light` / `Thermostat` / `Cameras`) with bottom underline indicator.
    2. **Semi-Circular Arc Gauge (`47% Intensity` style):** Crisp mint-teal radial arc gauge displaying live Smart Light brightness or Thermostat target setpoint, paired with interactive quick adjustment controls (`dispatchDeviceCommand`).
    3. **2×2 Pastel Metric Tiles Grid:** Warm Peach (Current Power `W`), Soft Lavender (Today's Energy `kWh`), Soft Ice Blue (Indoor Temp `°C`), and Soft Mint (Humidity `%`).
  - **Below Fold (Required Engine Observability & Acceptance Panels):**
    - Complete 8-metric summary strip (`Total Devices`, `Online`, `Offline`, `Active Automations`, `Current Power`, `Today's Energy`, `Indoor Temp`, `Humidity`), 7-Day Energy Bar Chart + Device Status Donut Chart, Device Overview Quick Grid, and Recent Events / Active Anomalies / Recent Automations panels.

### Typography, Spacing, Radii, Shadows & Icons
- **Font Family:** `Inter` bundled locally at `/fonts/inter-variable.woff2` (`@font-face`, 100–900 variable weight, offline-ready, system fallbacks). `tabular-nums` (`font-variant-numeric: tabular-nums`) enforced on all live figures, clocks, watts, kWh, and percentages.
- **Spacing:** 8px base rhythm (`gap-4` 16px, `gap-6` 24px, card padding `20px–24px`).
- **Corner Radii:** Pill chips `9999px` (`rounded-full`), inner tiles `16px` (`rounded-2xl`), outer stage/panel cards `24px` (`rounded-3xl`).
- **Elevation:** Soft ambient shadow (`0 4px 20px -4px rgba(14, 24, 28, 0.06)`) and crisp thin hairline borders (`border-border-subtle` on cards, $\ge 3:1$ `border` on interactive inputs/controls).
- **Icons:** Clean 1.75px stroke geometric line icons (`lucide-react`), always paired with explicit text labels for status/states (never color-only).

---

## 2. Color Tokens & Real Sampled Reference Palette

Pixel sampling from `media_1794500905367_371d9749.jpg` (`585x451`):
- `outer-backdrop`: `#C2D4E0`
- `header-surface`: `#FFFFFF`
- `app-canvas-tint`: `#EEF4F4`
- `active-nav-pill`: `#CFE2E9` / `#D5E5E5`
- `right-panel-bg`: `#F1F7F7`
- `bottom-card-bg`: `#F5F9FA`
- `mint-arc-active`: `#ADDBD0`
- `mint-arc-track`: `#DEEDEA`
- `tile-peach`: `#EDE1D1` (adjusted slightly lighter `#F2E4D3` for ink harmony)
- `tile-lavender`: `#E3D1EB` (`#EADCF2`)
- `tile-blue`: `#D0E3EA` (`#D6E7EE`)
- `tile-mint`: `#D1ECE7` (`#D5EFEA`)
- `darkest-ink-heading`: `#0E1213`

Because the Dribbble reference only shows **Light Mode**, **Dark Mode** is derived with the exact same cool slate-mint hierarchy: deep slate canvas (`#0F1416`), elevated card surfaces (`#161C1E`), soft panel (`#1D2528`), icy-mint active nav pill (`#203A3D`), glowing mint accent (`#5EC2AC`), and darkened saturated pastel tile surfaces (`#36291E`, `#2E2138`, `#1B313B`, `#19352F`) preserving identical semantic mapping.

### WCAG 2.1 AA Contrast Audit (Original Sampled vs Adjusted Final)

| Pair | Original (Sampled) | Final Adjusted | Final Ratio | Standard |
| :--- | :--- | :--- | :--- | :--- |
| Light primary text on `#FFFFFF` | `#0E1213` (18.84:1) | `#111618` | **18.23:1** | $\ge 4.5:1$ Pass |
| Light muted text on `#FFFFFF` | `#8E9DA4` (2.80:1 - Fail) | `#526066` | **6.51:1** | $\ge 4.5:1$ Pass |
| Light muted text on `#F5F9FA` card | `#8E9DA4` (2.64:1 - Fail) | `#526066` | **6.15:1** | $\ge 4.5:1$ Pass |
| Light muted text on `#F1F7F7` panel | `#8E9DA4` (2.58:1 - Fail) | `#4B585E` | **6.79:1** | $\ge 4.5:1$ Pass |
| Light accent & focus ring on `#FFFFFF` | `#7CC4B2` (2.02:1 - Fail) | `#1F6F60` | **6.00:1** | $\ge 4.5:1$ Pass |
| Light active nav text on `#CFE2E9` pill | `#0E1213` (14.09:1) | `#0E1213` | **14.09:1** | $\ge 4.5:1$ Pass |
| Light gauge arc & chart stroke on `#FFFFFF` | `#ADDBD0` (1.52:1 - Fail) | `#3C8D7B` | **3.97:1** | $\ge 3.0:1$ Pass |
| Light control border on `#F5F9FA` / `#FFFFFF` | `#DDECE9` (1.22:1 - Fail) | `#7E9397` | **3.07:1 / 3.26:1** | $\ge 3.0:1$ Pass |
| Light Peach / Lavender / Blue / Mint tiles | N/A | `#6E471B` / `#59336E` / `#1C4E63` / `#175245` | **6.52 / 7.54 / 7.12 / 7.45 :1** | $\ge 4.5:1$ Pass |
| Dark primary text `#EDF3F3` on `#161C1E` | Derived | `#EDF3F3` | **15.35:1** | $\ge 4.5:1$ Pass |
| Dark muted text `#96A6AA` on `#161C1E` | Derived | `#96A6AA` | **6.84:1** | $\ge 4.5:1$ Pass |
| Dark accent `#5EC2AC` on `#161C1E` | Derived | `#5EC2AC` | **8.03:1** | $\ge 4.5:1$ Pass |
| Dark control border `#586B70` on `#161C1E` | `#435458` (2.17:1) | `#586B70` | **3.08:1** | $\ge 3.0:1$ Pass |
| Dark Peach / Lavender / Blue / Mint tiles | Derived | `#F5D5B0` / `#E4C8F7` / `#BAE2F2` / `#B5ECE0` | **10.07 / 10.00 / 9.84 / 10.08 :1** | $\ge 4.5:1$ Pass |

---

## 3. Reference-to-Engine Mapping & `NOT BUILT` List

### Mapped Sections
- Top pill navigation bar -> `<Header />` primary desktop `<nav>` + `<BottomNav />` on mobile.
- Room filter pills -> `store.rooms` selector (`All Rooms` + 5 rooms).
- Room Stage Hero card -> Inline vector architectural room stage overlaid with live `selectTodayEnergyKWh`, `selectDeviceDistribution`, room climate, and frosted quick Lock card (`dispatchDeviceCommand`).
- Bottom 3 Quick-Widget cards -> Live `ThermostatDevice`, live `LightDevice`, and live `Schedule` (`toggleSchedule`).
- Right panel Pendant & Arc Dial -> Live selected-room `LightDevice` brightness arc (`dispatchDeviceCommand`) / `ThermostatDevice` target dial / `CameraDevice` status tabs.
- Right 2×2 Pastel Tiles -> Real selectors: Current Power (`W`), Today's Energy (`kWh`), Indoor Temp (`°C`), Humidity (`%`).

### `NOT BUILT` (Excluded because Engine/Store has No Support)
1. **Air Conditioner unit widget:** Engine only supports `thermostat` (target/current °C), not AC fan speed/swing modes. Replaced by real Thermostat quick card.
2. **Air Purifier / PM2.5 Air Quality widget:** Engine has no purifier device type or AQI/particulate sensor. Replaced by real Smart Light quick card.
3. **Solar Energy Production (`Produced 120 kw/h`):** Telemetry only tracks consumption (`powerWatts` / `kWh`), not solar generation. Replaced by real `Today's Energy` consumption tile.
4. **Wake-Up Alarm Clock (`Work 07.00`):** No alarm clock model; replaced by real `Schedule` quick toggle card (e.g., `06:30 Weekday Morning Warmup`).
5. **Global Header Search Omnibox:** Search icon triggers navigation/focus to dedicated search filters on Rooms & Event History rather than a non-existent global search engine.
6. **External Photorealistic Room Photos / Product PNGs:** Prohibited by offline-only rule; replaced with clean offline vector room artwork and geometric icons.
