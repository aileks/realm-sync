---
read_when: working on app components (not UI primitives)
---

# src/components/

**Scope:** Application-level components (not UI primitives - see ui/AGENTS.md)

## STRUCTURE

```
components/
├── AppLayout.tsx        # Main app shell (sidebar + content area)
├── AppSidebar.tsx       # Navigation sidebar with project list
├── DocumentCard.tsx      # Document display card
├── DocumentForm.tsx      # Document creation/editing form
├── EmptyState.tsx        # Empty state placeholder component
├── EntityCard.tsx       # Entity display card (with type color)
├── FactCard.tsx         # Fact display card
├── LoadingState.tsx      # Loading spinner/skeleton
├── ProjectCard.tsx       # Project display card
└── ui/                  # UI primitives (15 Shadcn/Base components)
    └── AGENTS.md        # See ui/AGENTS.md for UI component patterns
```

## WHERE TO LOOK

| Task             | Location         | Notes                                 |
| ---------------- | ---------------- | ------------------------------------- |
| App shell layout | `AppLayout.tsx`  | Wraps all pages with sidebar          |
| Navigation       | `AppSidebar.tsx` | Project list + navigation links       |
| Display cards    | `*Card.tsx`      | Document, Entity, Fact, Project cards |
| Forms            | `*Form.tsx`      | DocumentForm, ProjectForm             |
| UI primitives    | `ui/`            | Button, Card, Input, etc.             |

## CONVENTIONS

- **App components**: Named exports (not default)
- **UI primitives**: Use from `@/components/ui/*` (15 available)
- **Styling**: Tailwind classes with `cn()` utility for merging
- **Data fetching**: Convex `useQuery`/`useMutation` hooks
- **Loading**: `LoadingState` component or conditional rendering
- **Empty states**: `EmptyState` component when no data
- **Forms**: Direct mutation calls with validation

## COMPONENT PATTERNS

### Display Card Pattern

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type EntityCardProps = {
  entity: Entity
  className?: string
}

export function EntityCard({ entity, className }: EntityCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <EntityColorBadge type={entity.type} />
      </CardHeader>
      <CardContent>
        {entity.name}
      </CardContent>
    </Card>
  )
}
```

### Form Component Pattern

```typescript
import { useMutation } from '@tanstack/react-query-ssr'
import { api } from '@convex/_generated/api'

export function DocumentForm({ projectId, onSuccess }: Props) {
  const { mutate: createDocument, isPending } = useMutation({
    mutationFn: (data) => api.documents.create({ projectId, ...data }),
    onSuccess,
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); createDocument(formData); }}>
      {/* Form fields */}
    </form>
  )
}
```

## ENTITY TYPE COLORS

Entity types use predefined OKLCH colors:

- **character**: red (`oklch(0.5 0.2 20)`)
- **location**: green (`oklch(0.5 0.2 140)`)
- **item**: gold (`oklch(0.5 0.2 60)`)
- **concept**: purple (`oklch(0.5 0.2 280)`)
- **event**: blue (`oklch(0.5 0.2 220)`)

Use these colors in `EntityCard` and entity-related components.

## ANTI-PATTERNS

| Forbidden                | Why                                  |
| ------------------------ | ------------------------------------ |
| Default exports          | Named exports only                   |
| Create new UI primitives | Use 15 existing in `ui/`             |
| Skip loading states      | Always show LoadingState or skeleton |
| Skip empty states        | Always show EmptyState when no data  |
| Direct class strings     | Use `cn()` for Tailwind merging      |

## NOTES

- UI primitives are in `ui/` subdirectory (see `ui/AGENTS.md`)
- React Compiler enabled: no manual memoization needed
- Convex handles real-time updates via `useQuery` hooks
- Forms use TanStack Query `useMutation` for optimistic updates
