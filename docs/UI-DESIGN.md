---
summary: Visual design system for the dark archival Realm Sync interface.
read_when: [UI development, styling, component design, theme customization, colors, typography]
---

# UI Design System: Realm Sync

## 1. Aesthetic Direction

**Theme:** Dark Archival, Cozy Nook

- **Vibe:** Warm, inviting darkness, candlelit study, aged parchment, dusty archives.
- **Mascot:** **Vellum, the Archivist Moth**. A stylized silhouette in amber/gold, appearing as a guide and notifier throughout the interface.
- **Core Principle:** "Warmth in the shadows." Avoid sterile, cold grays. Use rich, deep hues with low chroma.

---

## 2. Color Palette (Tailwind v4 OKLCH)

Realm Sync ships with three theme variants. The **default** theme is applied via `:root`.

### Default Theme (`:root`)

```css
--background: oklch(0.13 0.015 70);
--foreground: oklch(0.88 0.02 75);

--card: oklch(0.16 0.015 70);
--card-foreground: oklch(0.88 0.02 75);
--popover: oklch(0.15 0.015 70);
--popover-foreground: oklch(0.88 0.02 75);

--primary: oklch(0.7 0.06 70);
--primary-foreground: oklch(0.12 0.02 70);
--secondary: oklch(0.25 0.03 70);
--secondary-foreground: oklch(0.8 0.02 75);

--muted: oklch(0.2 0.02 70);
--muted-foreground: oklch(0.71 0.03 70);
--accent: oklch(0.28 0.04 70);
--accent-foreground: oklch(0.9 0.02 75);

--destructive: oklch(0.46 0.2 25);
--destructive-foreground: oklch(0.98 0.02 80);
--border: oklch(0.25 0.02 70);
--input: oklch(0.2 0.02 70);
--ring: oklch(0.7 0.06 70);
```

### Twilight Study Theme (`[data-theme='twilight-study']`)

A cooler, purple-tinted variant:

```css
--background: oklch(0.12 0.03 280);
--foreground: oklch(0.9 0.01 280);

--card: oklch(0.16 0.03 280);
--card-foreground: oklch(0.9 0.01 280);
--popover: oklch(0.14 0.03 280);
--popover-foreground: oklch(0.9 0.01 280);

--primary: oklch(0.7 0.15 280);
--primary-foreground: oklch(0.15 0.03 280);
--secondary: oklch(0.25 0.04 280);
--secondary-foreground: oklch(0.8 0.02 280);

--muted: oklch(0.22 0.03 280);
--muted-foreground: oklch(0.71 0.03 280);
--accent: oklch(0.6 0.15 280);
--accent-foreground: oklch(0.95 0.01 280);

--border: oklch(0.28 0.03 280);
--input: oklch(0.22 0.03 280);
--ring: oklch(0.7 0.15 280);
```

### Amber Archive Theme (`[data-theme='amber-archive']`)

A warmer, high-chroma variant:

```css
--background: oklch(0.12 0.02 60);
--foreground: oklch(0.87 0.02 80);

--card: oklch(0.16 0.025 55);
--card-foreground: oklch(0.87 0.02 80);
--popover: oklch(0.14 0.02 55);
--popover-foreground: oklch(0.87 0.02 80);

--primary: oklch(0.72 0.15 75);
--primary-foreground: oklch(0.15 0.02 60);
--secondary: oklch(0.25 0.03 50);
--secondary-foreground: oklch(0.75 0.02 70);

--muted: oklch(0.22 0.02 55);
--muted-foreground: oklch(0.71 0.02 70);
--accent: oklch(0.65 0.18 55);
--accent-foreground: oklch(0.15 0.02 60);

--border: oklch(0.28 0.02 55);
--input: oklch(0.2 0.02 55);
--ring: oklch(0.72 0.15 75);
```

### Entity Type Colors

```css
--entity-character: oklch(0.7 0.15 25);
--entity-location: oklch(0.67 0.12 145);
--entity-item: oklch(0.7 0.15 75);
--entity-concept: oklch(0.7 0.18 280);
--entity-event: oklch(0.67 0.12 220);
```

### Sidebar Variables

Sidebar inherits from base theme:

```css
--sidebar: var(--background);
--sidebar-foreground: var(--foreground);
--sidebar-primary: var(--primary);
--sidebar-primary-foreground: var(--primary-foreground);
--sidebar-accent: var(--accent);
--sidebar-accent-foreground: var(--accent-foreground);
--sidebar-border: var(--border);
--sidebar-ring: var(--ring);
```

---

## 3. Typography

### Font Stack

```css
--font-sans: 'DM Sans Variable', sans-serif;
--font-serif: 'Aleo Variable', serif;
--font-mono: 'iA Writer Mono', monospace;
```

- **Headings (h1-h6):** Use `font-serif`
- **Body:** Use `font-sans`
- **Code (code, kbd, samp, pre):** Use `font-mono`

### Type Scale

| Size   | Value    | Usage                        |
| :----- | :------- | :--------------------------- |
| `xs`   | 0.75rem  | Metadata, small labels       |
| `sm`   | 0.875rem | Secondary text, input labels |
| `base` | 1rem     | Main body text               |
| `lg`   | 1.125rem | Section headers              |
| `xl`   | 1.25rem  | Subsection titles            |
| `2xl`  | 1.5rem   | Card titles                  |
| `3xl`  | 1.875rem | Page headers                 |
| `4xl`  | 2.25rem  | Hero / Large display         |

---

## 4. Spacing & Layout

### Border Radius

```css
--radius: 0.625rem; /* Base: 10px */
--radius-sm: calc(var(--radius) - 4px); /* 6px */
--radius-md: calc(var(--radius) - 2px); /* 8px */
--radius-lg: var(--radius); /* 10px */
--radius-xl: calc(var(--radius) + 4px); /* 14px */
--radius-2xl: calc(var(--radius) + 8px); /* 18px */
--radius-3xl: calc(var(--radius) + 12px); /* 22px */
--radius-4xl: calc(var(--radius) + 16px); /* 26px */
```

### Layout Guidelines

- **Base Scale:** 4px (Tailwind standard)
- **Sidebar:** `280px` fixed width, left-aligned
- **Main Content:** `max-w-4xl` centered for readability
- **Cards:** `p-6`, `rounded-lg`
- **Gaps:** `gap-4` for standard spacing, `gap-8` for major sections

---

## 5. Custom Utilities (Tailwind v4)

Custom utilities use the `@utility` directive (Tailwind v4 syntax). This enables automatic variant support (`hover:`, `lg:`, etc.).

### Vignette Effect

Adds depth with inset shadow:

```css
@utility vignette {
  box-shadow: inset 0 0 100px oklch(0 0 0 / 0.4);
}
```

### Text Effects

```css
@utility text-shadow-sm {
  text-shadow: 0 1px 2px oklch(0 0 0 / 0.1);
}

@utility glow-text {
  text-shadow: 0 0 15px var(--primary);
}
```

**Note:** Prefer Tailwind's built-in utilities and shadcn/ui components. Only add custom utilities for effects not achievable with the standard toolkit.

### Vignette Effect

Adds depth with inset shadow:

```css
.vignette {
  box-shadow: inset 0 0 100px oklch(0 0 0 / 0.4);
}
```

### Text Effects

```css
.text-shadow-sm {
  text-shadow: 0 1px 2px oklch(0 0 0 / 0.1);
}

.glow-text {
  text-shadow: 0 0 15px var(--primary);
}
```

---

## 6. Component Patterns

### Entity Cards

- **Structure:** `Icon` + `Name` + `Fact Count`
- **State:** Hover increases glow via `accent` shadow
- **Border:** Soft entity-type color at 20% opacity

### Buttons

- **Primary:** Uses `primary` background, high contrast text
- **Secondary:** Uses `secondary`, subtle feel
- **Ghost:** Minimal, foreground text, `muted` hover background
- **Destructive:** Uses `destructive`, for deletions

---

## 7. Icons (Lucide React)

### Entity Types

| Entity        | Icon        | Rationale                |
| :------------ | :---------- | :----------------------- |
| **Character** | `User`      | Person silhouette        |
| **Location**  | `MapPin`    | Geographic marker        |
| **Item**      | `Package`   | Physical object/artifact |
| **Concept**   | `Lightbulb` | Abstract idea            |
| **Event**     | `Calendar`  | Temporal occurrence      |

### Actions

| Action      | Icon       | Rationale               |
| :---------- | :--------- | :---------------------- |
| **Search**  | `Search`   | Standard search         |
| **Extract** | `Sparkles` | AI/magic extraction     |
| **Check**   | `Shield`   | Continuity verification |
| **Add**     | `Plus`     | Create new              |
| **Edit**    | `Pencil`   | Modify                  |
| **Delete**  | `Trash2`   | Remove                  |

### Navigation

| Section       | Icon         |
| :------------ | :----------- |
| **Home**      | `Home`       |
| **Projects**  | `FolderOpen` |
| **Documents** | `FileText`   |
| **Canon**     | `BookOpen`   |
| **Alerts**    | `Bell`       |

### Status

| Status      | Icon            |
| :---------- | :-------------- |
| **Success** | `Check`         |
| **Warning** | `AlertTriangle` |
| **Error**   | `XCircle`       |
| **Info**    | `Info`          |

---

## 8. Animation Specs

- **Default Duration:** `200ms`
- **Easing:** `ease-out` (cubic-bezier(0, 0, 0.2, 1))
- **Stagger:** `50ms` delay between list items
- **Vellum (Mascot):** Floating animation (sine wave path), soft glow pulse

---

## 9. Accessibility (WCAG AAA)

All color pairings are designed for WCAG AAA compliance (7:1 contrast ratio).

### Contrast Ratios (Default Theme)

| Pairing                                   | Ratio  | Status |
| ----------------------------------------- | ------ | ------ |
| `foreground` on `background`              | 14:1   | AAA    |
| `card-foreground` on `card`               | 13.5:1 | AAA    |
| `primary-foreground` on `primary`         | 7.5:1  | AAA    |
| `secondary-foreground` on `secondary`     | 8.6:1  | AAA    |
| `muted-foreground` on `background`        | 7:1    | AAA    |
| `accent-foreground` on `accent`           | 10.9:1 | AAA    |
| `destructive-foreground` on `destructive` | 7:1    | AAA    |
| Entity colors on `background`             | 7:1+   | AAA    |

### Guidelines

- **Focus Rings:** Use `outline-ring/80` for sufficient visibility (3:1 non-text contrast)
- **Motion:** Full support for `prefers-reduced-motion`. Disable non-essential animations when active
- **Semantics:** Proper ARIA labels for entity types and status indicators
- **Entity Colors:** Safe to use as text on dark backgrounds; for badges, use as backgrounds with `--primary-foreground` text

---

## 10. Theme Switching

To switch themes, add a `data-theme` attribute to a parent element:

```html
<!-- Default theme (no attribute needed) -->
<div>...</div>

<!-- Twilight Study -->
<div data-theme="twilight-study">...</div>

<!-- Amber Archive -->
<div data-theme="amber-archive">...</div>
```

---

## 11. Base Layer Styles

Applied globally via `@layer base`:

```css
* {
  @apply border-border outline-ring/50;
}
body {
  @apply bg-background text-foreground font-sans antialiased;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  @apply font-serif;
}
code,
kbd,
samp,
pre {
  @apply font-mono;
}
```
