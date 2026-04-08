# Design System Specification: Technical Precision & Kinetic Blueprint

## 1. Creative North Star: The Sovereign Architect

This design system moves away from the "friendly" curves of modern SaaS to embrace a philosophy of **Sovereign Architecture**. It is a tribute to the uncompromising clarity of engineering blueprints and the raw efficiency of command-line interfaces.

By utilizing **0px border radii** and a strict adherence to **pure black and white**, we create a "Kinetic Blueprint"—a UI that feels like a live schematic. The system does not use shadows to imply depth; it uses tonal layering and mathematical spacing to imply structural integrity. We are not building a website; we are rendering a high-fidelity control terminal for Supply Chain Management.

---

## 2. Color & Tonal Architecture

### The Monochrome Mandate

This system operates on a binary of absolute contrast. Color is reserved exclusively for system status (Error/Warning).

#### Dark Mode (Technical Precision)

- **Core Background:** `#000000` (The Void)
- **Primary Surface:** `#131313` (The Slate)
- **On-Surface (Text):** `#FFFFFF`
- **Muted Text:** `#C6C6C6` (Secondary) / `#919191` (Outline)

#### Light Mode (Kinetic Blueprint)

- **Core Background:** `#FFFFFF` (The Sheet)
- **Primary Surface:** `#F5F5F5` (The Trace)
- **On-Surface (Text):** `#121212`
- **Muted Text:** `#474747` (Secondary) / `#919191` (Outline)

### The "No-Line" Rule (Dark Mode Only)

In Dark Mode, visual separation must be achieved through background shifts, not borders.

- **Nesting:** Place a `surface-container-high` (`#2A2A2A`) module inside a `surface` (`#131313`) background to define hierarchy.
- **Glassmorphism:** Use `surface-variant` (`#353535`) at 60% opacity with a `20px` backdrop-blur for floating command palettes.

### The "Blueprint" Exception (Light Mode Only)

In Light Mode, we embrace the "Kinetic Blueprint." Thin, hair-line borders are permitted but must use `outline-variant` (`#474747`) at 20% opacity. They should feel like pencil marks on a technical drawing.

---

## 3. Typography: The Editorial Grid

We utilize **Inter** for its neutral, neo-grotesque legibility. To achieve an editorial feel, all navigation and labels are forced to **UPPERCASE** with a `0.05em` letter-spacing.

| Level | Size | Weight | Case | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display LG** | `3.5rem` | `700` | Sentence | Hero Data Points |
| **Headline MD** | `1.75rem` | `600` | Sentence | Section Headers |
| **Title SM** | `1rem` | `500` | Sentence | Module Titles |
| **Label MD** | `0.75rem` | `600` | **UPPER** | Nav / Metadata Tags |
| **Body MD** | `0.875rem` | `400` | Sentence | Tabular Data / Logs |

**The Signature Look:** Always pair a `Display LG` value with a `Label SM` descriptor immediately below it to create a "Technical Spec" aesthetic.

---

## 4. Elevation & Depth: Tonal Stacking

Standard drop shadows are prohibited. Depth is achieved via **Tonal Layering**.

1. **Level 0 (Floor):** `surface-container-lowest` (`#0E0E0E`) - Used for the global canvas.
2. **Level 1 (Modules):** `surface` (`#131313`) - Standard content containers.
3. **Level 2 (Active):** `surface-container-high` (`#2A2A2A`) - Hover states or active selections.
4. **Floating Elements:** Semi-transparent `primary` (`#FFFFFF`) at 5% opacity over the background with a blur creates a "ghosting" effect that suggests elevation without standard shadows.

---

## 5. Component Logic

### Buttons: The Kinetic Trigger

- **Primary:** Solid `primary` background with `on-primary` text. **No rounding (0px).**
- **Secondary:** 1px `outline` border. No fill.
- **States:** On hover, the primary button shifts to `primary-container`. The transition must be instant (`0ms` or `50ms`) to mimic terminal responsiveness.

### Data Inputs: The Terminal Prompt

- **Style:** Bottom-border only (`2px`). No container fill.
- **Focus:** Border color shifts to `primary`. Helper text appears in `label-sm` uppercase.
- **Error:** Background shifts to `error-container` (`#93000A`) at 20% opacity. Text becomes `error`.

### Cards & Data Tables

- **Forbid Dividers:** Use vertical white space or a subtle shift from `surface` to `surface-container-low` to separate rows.
- **Monolith SCM Sizing:** High density. `8px` padding between data points.
- **Monolith Light Sizing:** Breathing room. `16px` padding to emphasize the "blueprint" aesthetic.

### Custom Component: The "Status Ribbon"

For SCM tracking, use a `4px` vertical bar on the extreme left of any module to indicate status (e.g., `error` for delay, `primary` for on-time). This replaces traditional icons.

---

## 6. Do’s and Don’ts

### Do

- **Embrace Asymmetry:** Align high-level stats to the left and navigational labels to the extreme right to create tension.
- **Use Strict Grids:** Every element must align to an `8px` baseline grid.
- **Maintain Density:** SCM users need data. Fill the screen, but use typography scale (not color) to direct the eye.

### Don’t

- **No Rounding:** Never use `border-radius`. Everything is a sharp 90-degree angle.
- **No Soft Grays:** Avoid mid-tone grays that muddy the contrast. Stick to the specified `surface` tiers.
- **No Illustrations:** Use technical icons (lines/strokes only) or character-based symbols (e.g., `->`, `[ ]`, `+`).

---

## 7. Implementation Tokens
