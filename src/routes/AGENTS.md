---
read_when: adding routes or working on routing
---

# src/routes/

**Scope:** TanStack Start file-based routing with SSR

## STRUCTURE

```
routes/
├── __root.tsx              # Root route + HTML shell + providers
├── auth.tsx               # Auth pages (login/signup)
├── dev.chat.tsx           # Dev chat route
├── index.tsx              # Home page
├── projects.tsx           # Projects list
├── projects_.new.tsx       # New project form
├── projects_.$projectId.tsx # Project detail
├── projects_.$projectId_.alerts.tsx       # Alerts page
├── projects_.$projectId_.documents.tsx      # Documents list
├── projects_.$projectId_.documents.index.tsx # Documents index
├── projects_.$projectId_.documents.$documentId.tsx # Document detail
├── projects_.$projectId_.documents.new.tsx # New document
├── projects_.$projectId_.entities.tsx      # Entities list
├── projects_.$projectId_.facts.tsx         # Facts list
├── projects_.$projectId_.review.tsx         # Review list
├── projects_.$projectId_.review.index.tsx   # Review index
└── projects_.$projectId_.review.$documentId.tsx # Review detail
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add page route | `src/routes/` | Create `.tsx` file (e.g., `about.tsx` → `/about`) |
| Add nested route | `src/routes/` | Underscore-escape: `projects_.$projectId.tsx` → `/projects/:projectId` |
| Add index route | `*.index.tsx` | `projects_.$projectId_.documents.index.tsx` → `/projects/:id/documents/` |
| Modify HTML shell | `__root.tsx` | Root layout, meta tags, provider chain |
| Route params | `useParams()` | TanStack Router hook from `@tanstack/react-router` |

## ROUTE NAMING PATTERNS

```typescript
// Simple route
index.tsx          → /

// Parameter route (single underscore)
projects.$projectId.tsx  → /projects/:projectId

// Nested parameter (double underscore)
projects_.$projectId_.documents.$documentId.tsx
→ /projects/:projectId/documents/:documentId

// Index route (trailing .index)
projects_.$projectId_.documents.index.tsx
→ /projects/:projectId/documents/

// Custom static route
projects.new.tsx    → /projects/new
```

## CONVENTIONS

- **Underscore escape**: Use `_.` to prevent folder nesting in URL structure
- **File naming**: Dotted segments with `$` for params
- **Params**: Access via `useParams()` hook from TanStack Router
- **Auto-generated**: `routeTree.gen.ts` - NEVER EDIT (overwritten on route change)
- **Route component**: Export default component with loader/action as needed

## ROUTE COMPONENT STRUCTURE

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query-ssr';

// Simple route
export const Route = createFileRoute('/projects_.$projectId')({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  // ...
}

// With data loading
export const Route = createFileRoute('/projects_.$projectId')({
  loader: ({ params }) => fetchProject(params.projectId),
  component: ProjectDetail,
});
```

## ANTI-PATTERNS

| Forbidden                      | Why                                             |
| ------------------------------ | ----------------------------------------------- |
| Edit `routeTree.gen.ts`        | Auto-generated, overwritten on route change     |
| Folder nesting for routes      | Use underscore escape pattern instead           |
| Default export of Route object | Use `export const Route = createFileRoute(...)` |
| Direct routing to functions    | Use TanStack Router's navigate()                |

## NOTES

- TanStack Start auto-generates HTML via `__root.tsx` (no `index.html`)
- SSR enabled by default via Nitro
- Route params are type-safe via generated types
- Use `useNavigate()` for programmatic navigation
- Preload routes with `<Link to="..." preload />` for performance
