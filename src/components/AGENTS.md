---
read_when: working on app components (not UI primitives)
---

# src/components/

**Scope:** Application-level components (not UI primitives - see ui/AGENTS.md)

## STRUCTURE

```
components/
├── AppLayout.tsx        # Main app shell (sidebar + content area)
├── AppSidebar.tsx       # Navigation sidebar with project list - 491 lines
├── CommandPalette.tsx   # Cmd+K command palette for navigation
├── DocumentCard.tsx     # Document display card
├── DocumentForm.tsx     # Document creation/editing form
├── EmptyState.tsx       # Empty state placeholder component
├── EntityCard.tsx       # Entity display card (with type color)
├── EntityTypeFilter.tsx # Filter dropdown for entity types
├── FactCard.tsx         # Fact display card
├── KeyboardShortcuts.tsx # Global keyboard shortcut handling
├── LoadingState.tsx     # Loading spinner/skeleton
├── OnboardingModal.tsx  # New user onboarding modal
├── ProjectCard.tsx      # Project display card
├── ProjectForm.tsx      # Project creation/editing form
├── ReviewEntityCard.tsx # Entity card wrapper for merge review
├── TutorialTour.tsx     # Interactive tutorial overlay
├── VellumChat.tsx       # AI chat interface with streaming
└── ui/                  # UI primitives (17 Shadcn/Base components)
    └── AGENTS.md        # See ui/AGENTS.md for UI component patterns
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| App shell layout | `AppLayout.tsx` | Wraps all pages with sidebar |
| Navigation | `AppSidebar.tsx` | Project list + navigation links (491 lines) |
| Display cards | `*Card.tsx` | Document, Entity, Fact, Project, ReviewEntity cards |
| Filters | `*Filter.tsx` | EntityTypeFilter for entity filtering |
| Forms | `*Form.tsx` | DocumentForm, ProjectForm |
| UI primitives | `ui/` | Button, Card, Input, etc. |
| AI assistant | `VellumChat.tsx` | Streaming chat with context |
| Onboarding | `OnboardingModal.tsx`, `TutorialTour.tsx` | New user flow + guided tour |
| Keyboard | `KeyboardShortcuts.tsx`, `CommandPalette.tsx` | Global shortcuts + Cmd+K |

## CONVENTIONS

- **App components**: Named exports (not default)
- **UI primitives**: Use from `@/components/ui/*` (17 available)
- **Styling**: Tailwind classes with `cn()` utility for merging
- **Data fetching**: Convex `useQuery`/`useMutation` hooks
- **Loading**: `LoadingState` component or conditional rendering
- **Empty states**: `EmptyState` component when no data
- **Forms**: Direct mutation calls with validation

## COMPONENT PATTERNS

### Display Card Pattern

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EntityCardProps = {
  entity: Entity;
  className?: string;
};

export function EntityCard({ entity, className }: EntityCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <EntityColorBadge type={entity.type} />
      </CardHeader>
      <CardContent>{entity.name}</CardContent>
    </Card>
  );
}
```

### Form Component Pattern

```typescript
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

type DocumentFormProps = {
  projectId: Id<'projects'>;
  onSuccess?: () => void;
};

export function DocumentForm({ projectId, onSuccess }: DocumentFormProps) {
  const createDocument = useMutation(api.documents.create);

  const handleSubmit = async (data: FormData) => {
    await createDocument({ projectId, ...data });
    onSuccess?.();
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

### Error Handling Pattern

```typescript
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setError(null);
  setIsLoading(true);
  try {
    await mutation(data);
    toast.success('Success');
  } catch (err) {
    setError(formatError(err));
    toast.error(formatError(err));
  } finally {
    setIsLoading(false);
  }
};
```

## ENTITY TYPE COLORS

Entity types use predefined OKLCH colors (from styles.css):

| Type      | Color  | OKLCH                |
| --------- | ------ | -------------------- |
| character | red    | `oklch(0.5 0.2 20)`  |
| location  | green  | `oklch(0.5 0.2 140)` |
| item      | gold   | `oklch(0.5 0.2 60)`  |
| concept   | purple | `oklch(0.5 0.2 280)` |
| event     | blue   | `oklch(0.5 0.2 220)` |

Use these colors in `EntityCard` and entity-related components via CSS vars.

## ANTI-PATTERNS

| Forbidden                | Why                                  |
| ------------------------ | ------------------------------------ |
| Default exports          | Named exports only                   |
| Create new UI primitives | Use 17 existing in `ui/`             |
| Skip loading states      | Always show LoadingState or skeleton |
| Skip empty states        | Always show EmptyState when no data  |
| Direct class strings     | Use `cn()` for Tailwind merging      |

## COMPLEXITY HOTSPOTS

| File             | Lines | Notes                                      |
| ---------------- | ----- | ------------------------------------------ |
| `AppSidebar.tsx` | 491   | Consider extracting NavItem/ProjectNavItem |

## NOTES

- UI primitives are in `ui/` subdirectory (see `ui/AGENTS.md`)
- React Compiler enabled: no manual memoization needed
- Convex handles real-time updates via `useQuery` hooks
- Forms use Convex `useMutation` directly (no TanStack Query wrapper needed)
