---
read_when: working on UI components or adding new UI primitives
---

# src/components/ui/

**Scope:** 17 Shadcn-style primitives built on @base-ui/react + CVA

## STRUCTURE

```
ui/
├── alert-dialog.tsx   # Modal dialogs (confirm/cancel)
├── badge.tsx          # Status indicators
├── button.tsx         # Primary interactive element
├── card.tsx           # Content containers
├── combobox.tsx       # Searchable select with autocomplete
├── dropdown-menu.tsx  # Action menus
├── empty.tsx          # Empty state placeholder
├── field.tsx          # Form field system (10 sub-components)
├── input-group.tsx    # Input with prefix/suffix slots
├── input.tsx          # Text input
├── label.tsx          # Form labels
├── select.tsx         # Dropdown select
├── separator.tsx      # Visual dividers
├── sheet.tsx          # Slide-over panels
├── sonner.tsx         # Toast notifications (Sonner wrapper)
├── textarea.tsx       # Multi-line text
└── tooltip.tsx        # Hover hints
```

## PATTERN

All components follow identical structure:

```typescript
// 1. Import base primitive + CVA
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 2. Define variants with cva()
const buttonVariants = cva('base-classes...', {
  variants: {
    variant: { default: '...', outline: '...', ghost: '...' },
    size: { default: '...', sm: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

// 3. Named function component (NOT arrow, NOT default export)
function Button({ className, variant, size, ...props }: Props) {
  return (
    <ButtonPrimitive
      data-slot="button"           // Always add data-slot
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

// 4. Named exports at bottom
export { Button, buttonVariants };
```

## CONVENTIONS

| Rule               | Example                                  |
| ------------------ | ---------------------------------------- |
| Named exports only | `export { Button }` not `export default` |
| Always `data-slot` | `data-slot="button"` on root element     |
| Always `cn()`      | `className={cn(variants(), className)}`  |
| Variants via CVA   | Define all variants in `cva()` call      |
| Props spread last  | `{...props}` after explicit props        |
| Base UI primitives | Import from `@base-ui/react/*`           |

## FIELD SYSTEM

`field.tsx` exports 10 composable sub-components:

| Component | Purpose |
| --- | --- |
| `Field` | Wrapper with orientation (vertical/horizontal/responsive) |
| `FieldLabel` | Label with checkbox/radio support |
| `FieldTitle` | Non-label title text |
| `FieldDescription` | Help text below input |
| `FieldError` | Error message display (accepts `errors` array) |
| `FieldGroup` | Group multiple fields |
| `FieldSet` | Native fieldset wrapper |
| `FieldLegend` | Fieldset legend |
| `FieldContent` | Content area for complex fields |
| `FieldSeparator` | Divider with optional text |

## DATA-SLOT SELECTORS

Target components in CSS via `data-slot`:

```css
/* Tailwind v4 */
[data-slot="button"] { ... }
[data-slot="field-error"] { ... }

/* In components */
has-data-[slot=field]:rounded-xl
group-data-[disabled=true]/field:opacity-50
```

## ANTI-PATTERNS

| Forbidden            | Why                              |
| -------------------- | -------------------------------- |
| `export default`     | Named exports only               |
| Direct class strings | Use `cn()` always                |
| Custom primitives    | Use existing 17 components       |
| Inline styles        | Tailwind classes only            |
| Skip `data-slot`     | Required for CSS targeting       |
| Create new UI file   | Extend existing or propose in PR |

## ADDING VARIANTS

```typescript
// Add to existing cva() variants object
const buttonVariants = cva('...', {
  variants: {
    variant: {
      default: '...',
      outline: '...',
      // Add here:
      warning: 'bg-warning text-warning-foreground',
    },
  },
});
```

## NOTES

- Tailwind v4 CSS-first (OKLCH colors from `styles.css`)
- No barrel `index.ts`—import directly from component files
- React Compiler enabled: no manual memoization
- Field system handles 90% of form patterns
