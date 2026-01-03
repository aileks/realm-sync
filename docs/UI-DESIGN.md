---
summary: Visual design guidelines for the dark archival Realm Sync interface.
read_when: [UI development, styling, component design, theme customization]
---

# UI Design Guidelines

## Core Principles

### Aesthetic: Dark Archival

- **Vibe:** Candlelit study, aged parchment, dusty archives
- **Mascot:** Vellum, the Archivist Moth (amber/gold silhouette)
- **Mantra:** "Warmth in the shadows" — avoid sterile grays, use rich deep hues

### Anti-Generic Design

Reject template layouts. Strive for bespoke design that serves the archival narrative.

- No generic dashboard grids
- Every element should feel intentional, not copy-pasted
- If it looks like a SaaS template, redesign it

### Library Discipline (CRITICAL)

**YOU MUST USE shadcn/ui and Base UI components.**

- DO NOT build custom modals, dropdowns, buttons, or dialogs from scratch
- Check `src/components/ui/` before creating anything new
- Available primitives: AlertDialog, Badge, Button, Card, Combobox, DropdownMenu, Field, Input, Label, Select, Separator, Textarea

---

## Color System

All colors use OKLCH format. Source of truth: `src/styles.css`

### Three Themes

| Theme                    | Personality      | Primary      | Secondary   | Accent           |
| ------------------------ | ---------------- | ------------ | ----------- | ---------------- |
| **Default** (Ashen Tome) | Warm browns      | Amber        | Sage teal   | Terracotta       |
| **Twilight Study**       | Cool purples     | Violet       | Spirit teal | Candlelight gold |
| **Amber Archive**        | High-chroma warm | Bright amber | Slate blue  | Sealing wax red  |

### Color Harmony

Split-complementary: warm primary, cool secondary, warm accent. This creates visual interest without rainbow chaos.

### Entity Colors

Each entity type has a distinct hue for badges/tags:

- Character (red), Location (green), Item (amber), Concept (purple), Event (blue)

---

## Typography

| Role     | Font                    | Usage           |
| -------- | ----------------------- | --------------- |
| Headings | Aleo Variable (serif)   | h1-h6           |
| Body     | DM Sans Variable (sans) | Everything else |
| Code     | iA Writer Mono          | code, kbd, pre  |

---

## Accessibility (WCAG AAA)

All color pairings meet 7:1 contrast ratio.

- Focus rings: `outline-ring/80`
- Respect `prefers-reduced-motion`
- All interactive elements need ARIA labels

---

## Component Guidelines

### Buttons

Use shadcn Button variants:

- **Primary:** Main actions
- **Secondary:** Supporting actions (teal/blue tint)
- **Ghost:** Subtle actions
- **Destructive:** Delete/danger

### Cards

- Use `rounded-lg`, `p-6`
- Hover states should add subtle glow, not just color change

### Icons

Use Lucide React exclusively. Key mappings:

- Entity types: User, MapPin, Package, Lightbulb, Calendar
- Actions: Search, Sparkles, Plus, Pencil, Trash2

---

## Animation

- Duration: `200ms`
- Easing: `ease-out`
- Stagger lists: `50ms` delay between items
- Respect `prefers-reduced-motion`

---

## Theme Switching

```html
<div data-theme="twilight-study">...</div>
<div data-theme="amber-archive">...</div>
```

---

## Anti-Patterns

| Don't                   | Do Instead                               |
| ----------------------- | ---------------------------------------- |
| Build custom modal      | Use AlertDialog from shadcn              |
| Build custom dropdown   | Use DropdownMenu or Select               |
| Use generic grays       | Use theme's warm/cool palette            |
| Copy SaaS templates     | Design for the archival narrative        |
| Skip hover/focus states | Every interactive element needs feedback |
