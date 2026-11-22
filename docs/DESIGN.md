# Homie SmartSpace Design System (v3 Calm Polish)

Design specification for the **Calm & Warm Neutral** visual identity (`feat/ui-calm`), evolving from the initial reference analysis to eliminate generic "AI-generated" tropes, glare, and saturated pastel fills.

---

## 1. Core Visual Problems Solved

1. **Light mode glare and icy saturation:** Replaced cold icy-blue canvas (`#D7E5EB`) and blinding pure white surfaces (`#FFFFFF`) with warm neutral stone and canvas tones (`#F1EFEA` backdrop, `#F7F6F2` warm card surface, `#ECEAE4` secondary shell).
2. **Text contrast & readability:** Elevated body and label contrast ratios well beyond minimum WCAG requirements. Primary ink (`#1F1E1B`) reaches **15.41:1**, muted text (`#545049`) reaches **7.41:1** (WCAG AAA for body text), and interactive borders (`#8C867B`) reach **3.34:1** (WCAG 2.2 AA for non-text controls).
3. **Generic "AI-generated" appearance:**
   - Eradicated pastel rainbow fills (5 saturated colored tile squares) across Overview and metric panels in favor of structured neutral cards with single subtle accent glyphs.
   - Replaced ubiquitous `rounded-full` / `rounded-3xl` "pill-shaped everything" with a disciplined 8px (controls) / 12px (cards) / 16px (panels) radius scale.
   - Removed blurry floating drop shadows (`shadow-soft`, `shadow-lg`) and blurred glass header bars (`backdrop-blur-md`), replacing them with crisp 1px borders and solid surfaces.
   - Removed decorative sparkles, wavy decorative underlines, and centered cookie-cutter icon boxes.

---

## 2. Calm Warm Palette Specification

### Light Theme (Warm Stone & Deep Sage)
- **Outer Canvas (`--color-outer-canvas`):** `#F1EFEA` (rgb 241, 239, 234)
- **App Shell / Elevated Surfaces (`--color-surface-subtle`, `--color-surface-elevated`):** `#ECEAE4` (rgb 236, 234, 228)
- **Card Surfaces (`--color-surface`, `--color-surface-card`):** `#F7F6F2` (rgb 247, 246, 242) — Zero pure white `#FFFFFF` glare
- **Divider Borders (`--color-border-subtle`):** `#D9D6CE` (rgb 217, 214, 206)
- **Control Borders (`--color-border`):** `#8C867B` (rgb 140, 134, 123)
- **Primary Text (`--color-text`):** `#1F1E1B` (rgb 31, 30, 27)
- **Muted Text (`--color-text-muted`):** `#545049` (rgb 84, 80, 73)
- **Accent (`--color-accent`):** `#2E534C` (rgb 46, 83, 76) — Desaturated deep slate sage/teal
- **Accent Subtle (`--color-accent-subtle`):** `#DCE4E1` (rgb 220, 228, 225)
- **Arc Track (`--color-arc-track`):** `#DFDCD5` (rgb 223, 220, 213)
- **Semantic Status:**
  - Success: `#2A6846` (rgb 42, 104, 70)
  - Warning: `#8A5314` (rgb 138, 83, 20)
  - Danger: `#9E2A2B` (rgb 158, 42, 43)

### Dark Theme (Warm Deep Charcoal & Muted Sage)
- **Outer Canvas (`--color-outer-canvas`):** `#181816` (rgb 24, 24, 22) — Zero pure black `#000000`
- **App Shell (`--color-surface-subtle`):** `#1E1E1C` (rgb 30, 30, 28)
- **Card Surfaces (`--color-surface`, `--color-surface-card`):** `#212120` (rgb 33, 33, 32)
- **Elevated Surfaces (`--color-surface-elevated`):** `#2B2B28` (rgb 43, 43, 40)
- **Divider Borders (`--color-border-subtle`):** `#34332F` (rgb 52, 51, 47)
- **Control Borders (`--color-border`):** `#6E6D66` (rgb 110, 109, 102)
- **Primary Text (`--color-text`):** `#E8E6E1` (rgb 232, 230, 225)
- **Muted Text (`--color-text-muted`):** `#9E9C94` (rgb 158, 156, 148)
- **Accent (`--color-accent`):** `#7BAFA3` (rgb 123, 175, 163) — Muted sage
- **Accent Subtle (`--color-accent-subtle`):** `#253531` (rgb 37, 53, 49)
- **Arc Track (`--color-arc-track`):** `#32322E` (rgb 50, 50, 46)
- **Semantic Status:**
  - Success: `#68BA88` (rgb 104, 186, 136)
  - Warning: `#DDA15E` (rgb 221, 161, 94)
  - Danger: `#E06D6D` (rgb 224, 109, 109)

---

## 3. Contrast Comparison (Before vs After)

| Element Pair | Previous Ratio | Calm Ratio | Standard | Status |
| :--- | :--- | :--- | :--- | :--- |
| Light Primary Text on Card | 18.23:1 (on pure `#FFF`) | **15.41:1** (on warm `#F7F6F2`) | $\ge 4.5:1$ | Pass (AAA) |
| Light Muted Text on Card | 6.15:1 (on icy `#F5F9FA`) | **7.41:1** (on warm `#F7F6F2`) | $\ge 4.5:1$ | Pass (AAA) |
| Light Control Border on Card | 3.07:1 (thin icy `#7E9397`) | **3.34:1** (warm stone `#8C867B`) | $\ge 3.0:1$ | Pass (AA) |
| Light Accent on Card | 6.00:1 (mint `#1F6F60`) | **7.90:1** (deep sage `#2E534C`) | $\ge 4.5:1$ | Pass (AAA) |
| Light Success on Card | 6.57:1 (emerald) | **6.13:1** (calm forest) | $\ge 4.5:1$ | Pass (AA) |
| Light Warning on Card | 6.02:1 (amber) | **5.84:1** (warm ochre) | $\ge 4.5:1$ | Pass (AA) |
| Light Danger on Card | 6.46:1 (red) | **6.89:1** (warm crimson) | $\ge 4.5:1$ | Pass (AA) |
| Dark Primary Text on Card | 15.35:1 (on cold `#161C1E`) | **12.92:1** (on warm `#212120`) | $\ge 4.5:1$ | Pass (AAA) |
| Dark Muted Text on Card | 6.84:1 | **5.90:1** | $\ge 4.5:1$ | Pass (AA) |
| Dark Control Border on Card | 3.08:1 | **3.12:1** | $\ge 3.0:1$ | Pass (AA) |
| Dark Accent on Card | 8.03:1 | **6.53:1** | $\ge 4.5:1$ | Pass (AA) |

---

## 4. Typography & Radius Discipline

- **Corner Radius Scale:**
  - `sm` (`0.375rem` / 6px): Small indicators, micro-badges
  - `md` (`0.5rem` / 8px): Buttons, text inputs, switches, dropdowns, stepper controls
  - `lg` (`0.75rem` / 12px): Device cards, summary cards, chart wrappers, metric tiles
  - `2xl` (`1rem` / 16px): Dialog modals, slide-out notification drawer, room stage hero
  - `3xl` (`1.25rem` / 20px): Outer dashboard floating shell frame
  - `full` (`9999px`): Status dot indicators, room filter pills, top header active nav pill
- **Elevation & Borders:**
  - Removed blurry `shadow-soft` (`rgba(14,24,28,0.07)`) and `shadow-2xl`.
  - Replaced with crisp 1px borders (`border-border-subtle` / `border-border`) paired with subtle 1px surface shadow (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`).
- **Layout & Structure Preservation:**
  - Full structural alignment with `docs/design/reference-2a.png` and `reference-2b.png` retained: top pill navigation, room selector chips, asymmetric 8-col hero stage + 4-col right control arc panel, and bottom metric tiles.


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
