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
- Available primitives: AlertDialog, Badge, Button, Card, Combobox, DropdownMenu, Empty, Field, Input, InputGroup, Label, Select, Separator, Sheet, Textarea, Tooltip, Toaster (Sonner)

---

## Color System

All colors use OKLCH format. Source of truth: `src/styles.css`

### Three Themes

| Theme | Vibe | Background | Accent |
| --- | --- | --- | --- |
| **Fireside** | Dark cozy library (default) | Warm charcoal slate | Amber/gold |
| **Twilight** | Deep navy night reading | Navy blue | Gold |
| **Daylight** | Sunlit reading room | Warm parchment | Forest green |

**Theme switching:**

```html
<div data-theme="twilight">...</div>
<div data-theme="daylight">...</div>
<!-- No attribute = Fireside (default) -->
```

### Scrollbar Styling

Scrollbars adapt to theme via CSS variables:

- **Thumb**: `--muted-foreground`
- **Hover**: `--foreground`
- **Track**: transparent

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

### Toast Notifications

Use Sonner (`src/components/ui/sonner.tsx`) for all user feedback:

```tsx
import {toast} from 'sonner';

// Success
toast.success('Extraction complete', {
  description: 'Found 5 entities and 12 facts.',
});

// Error
toast.error('Extraction failed', {
  description: error.message,
});

// Info
toast.info('Extraction started', {
  description: "You'll be notified when it finishes.",
});
```

**Placement:** Bottom-right, dark theme styling. Added via `<Toaster />` in `__root.tsx`.

---

## Vellum Chat UI

The dev chat (`/dev/chat`) showcases Vellum's personality:

- **Moth icon**: Custom SVG silhouette for Vellum avatar
- **Streaming indicator**: Animated cursor (▋) during response generation
- **Message bubbles**: User (right, primary tint) / Assistant (left, muted with border)
- **Loading dots**: Bouncing animation with staggered delays
- **Markdown rendering**: Full support via `react-markdown`

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
