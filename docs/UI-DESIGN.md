---
summary: Visual design system for the dark archival Realm Sync interface.
read_when: [UI development, styling, component design, theme customization, colors, typography]
---

# UI Design System: Realm Sync

## 1. Aesthetic Direction

**Theme:** Dark Archival, Cozy Nook

- **Vibe:** Warm, inviting darkness, candlelit study, aged parchment, dusty archives.
- **Mascot:** **Vesper, the Archivist Moth**. A stylized silhouette in amber/gold, appearing as a guide and notifier throughout the interface.
- **Core Principle:** "Warmth in the shadows." Avoid sterile, cold grays. Use rich, deep oklch(60) hues.

---

## 2. Color Palette (Tailwind v4 OKLCH)

### Base Colors

```css
--background: oklch(0.12 0.02 60); /* Deep warm black */
--foreground: oklch(0.87 0.02 80); /* Warm off-white / parchment light */
--card: oklch(0.16 0.025 55); /* Raised study surface */
--card-foreground: oklch(0.87 0.02 80);
--popover: oklch(0.14 0.02 55);
--popover-foreground: oklch(0.87 0.02 80);
```

### Brand & Accents

```css
--primary: oklch(0.72 0.15 75); /* Moth-wing Amber */
--primary-foreground: oklch(0.15 0.02 60);
--secondary: oklch(0.25 0.03 50); /* Dusty Archive */
--secondary-foreground: oklch(0.75 0.02 70);
--accent: oklch(0.65 0.18 55); /* Candlelight Glow */
--accent-foreground: oklch(0.15 0.02 60);
```

### Semantic Colors

```css
--muted: oklch(0.22 0.02 55);
--muted-foreground: oklch(0.55 0.02 70);
--destructive: oklch(0.55 0.2 25); /* Aged Red Ink */
--success: oklch(0.55 0.15 145); /* Aged Green Ink */
--warning: oklch(0.65 0.15 85); /* Amber Warning */
```

### Entity Type Colors (Mapping to Lexicon)

- **Character:** `oklch(0.65 0.15 25)` — Warm Red
- **Location:** `oklch(0.60 0.12 145)` — Forest Green
- **Item:** `oklch(0.70 0.15 75)` — Amber Gold
- **Concept:** `oklch(0.60 0.18 280)` — Dusty Purple
- **Event:** `oklch(0.65 0.12 220)` — Slate Blue

---

## 3. Typography

### Font Stack

- **Display / Headings:** `'Crimson Pro'`, serif (Variable weight 200-900)
- **Body:** `'DM Sans Variable'`, sans-serif (Standard weight 400, Medium 500)
- **Mono / Code:** `'JetBrains Mono'`, monospace

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

- **Base Scale:** 4px (Tailwind standard)
- **Sidebar:** `280px` fixed width, left-aligned.
- **Main Content:** `max-w-4xl` centered for readability.
- **Cards:** `p-6`, `rounded-lg` (8px).
- **Gaps:** `gap-4` for standard spacing, `gap-8` for major sections.

---

## 5. Visual Textures & Effects

### Paper Grain Overlay

```css
.paper-grain {
  position: relative;
}
.paper-grain::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.03;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
```

### Vignette Effect

```css
.vignette {
  box-shadow: inset 0 0 100px oklch(0 0 0 / 0.4);
}
```

### Aged Border Style

```css
.border-aged {
  border: 1px solid var(--border);
  box-shadow:
    0 0 0 1px var(--background),
    0 0 0 2px var(--border);
}
```

---

## 6. Component Patterns

### Entity Cards

- **Structure:** `Icon` + `Name` + `Fact Count`
- **State:** Hover increases candlelight glow (`accent` shadow).
- **Border:** Soft `oklch` matching entity type at 20% opacity.

### Buttons

- **Primary:** Moth-wing Amber (`primary`), high contrast text.
- **Secondary:** Dusty Archive (`secondary`), subtle parchment feel.
- **Ghost:** Minimal, foreground text, `muted` hover background.
- **Destructive:** Aged Red Ink (`destructive`), used for deletions.

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
- **Stagger:** `50ms` delay between list items.
- **Vesper (Mascot):** Floating animation (sine wave path), soft glow pulse.

---

## 9. Accessibility

- **Contrast:** Maintain WCAG AAA color contrast (7:1) for all body text against the background.
- **Motion:** Full support for `prefers-reduced-motion` media queries. Disable non-essential Vesper animations when active.
- **Interactions:** Keyboard navigation requirements for all interactive elements (focus rings must be `oklch(0.72 0.15 75)`).
- **Semantics:** Proper ARIA labels for entity types and status indicators.

---

## 10. CSS Custom Properties (:root)

```css
@theme inline {
  --color-background: oklch(0.12 0.02 60);
  --color-foreground: oklch(0.87 0.02 80);

  --color-card: oklch(0.16 0.025 55);
  --color-card-foreground: oklch(0.87 0.02 80);

  --color-popover: oklch(0.14 0.02 55);
  --color-popover-foreground: oklch(0.87 0.02 80);

  --color-primary: oklch(0.72 0.15 75);
  --color-primary-foreground: oklch(0.15 0.02 60);

  --color-secondary: oklch(0.25 0.03 50);
  --color-secondary-foreground: oklch(0.75 0.02 70);

  --color-muted: oklch(0.22 0.02 55);
  --color-muted-foreground: oklch(0.55 0.02 70);

  --color-accent: oklch(0.65 0.18 55);
  --color-accent-foreground: oklch(0.15 0.02 60);

  --color-destructive: oklch(0.55 0.2 25);
  --color-destructive-foreground: oklch(0.98 0.02 80);

  --color-border: oklch(0.28 0.02 55);
  --color-input: oklch(0.2 0.02 55);
  --color-ring: oklch(0.72 0.15 75);

  /* Entity Types */
  --color-entity-character: oklch(0.65 0.15 25);
  --color-entity-location: oklch(0.6 0.12 145);
  --color-entity-item: oklch(0.7 0.15 75);
  --color-entity-concept: oklch(0.6 0.18 280);
  --color-entity-event: oklch(0.65 0.12 220);
}
```
