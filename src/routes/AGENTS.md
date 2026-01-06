---
read_when: adding routes or working on routing
---

# src/routes/

**Scope:** TanStack Start file-based routing with SSR

## STRUCTURE

```
routes/
├── __root.tsx                      # Root route + HTML shell + providers
├── auth.tsx                        # Auth pages (login/signup)
├── dev.chat.tsx                    # Dev chat route
├── entities.$entityId.tsx          # Entity detail page (complexity hotspot)
├── index.tsx                       # Home page
├── vellum.chat.tsx                 # Vellum chat page
├── projects.tsx                    # Projects layout (renders Outlet for children)
└── projects/
    ├── new.tsx                     # New project form → /projects/new
    └── $projectId/
        ├── index.tsx               # Project dashboard → /projects/:id
        ├── entities.tsx            # Entities list → /projects/:id/entities
        ├── facts.tsx               # Facts list → /projects/:id/facts
        ├── documents/
        │   ├── route.tsx           # Layout with Outlet
        │   ├── index.tsx           # Documents list → /projects/:id/documents
        │   ├── new.tsx             # New document → /projects/:id/documents/new
        │   └── $documentId.tsx     # Document detail → /projects/:id/documents/:docId
        ├── canon/
        │   ├── route.tsx           # Layout with nav tabs
        │   ├── index.tsx           # Canon index → /projects/:id/canon
        │   ├── search.tsx          # Canon search → /projects/:id/canon/search
        │   ├── timeline.tsx        # Canon timeline (D3 viz)
        │   └── connections.tsx     # Connections graph
        ├── review/
        │   ├── route.tsx           # Layout with Outlet
        │   ├── index.tsx           # Review index → /projects/:id/review
        │   └── $documentId.tsx     # Review document
        ├── alerts/
        │   ├── route.tsx           # Alerts with inline detail
        │   └── $alertId.tsx        # Alert detail
        └── notes/
            ├── index.tsx           # Notes list → /projects/:id/notes
            ├── new.tsx             # New note → /projects/:id/notes/new
            └── $noteId.tsx         # Note detail → /projects/:id/notes/:noteId
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add page route | `src/routes/` | Create `.tsx` file (e.g., `about.tsx` → `/about`) |
| Add nested route | `src/routes/folder/` | Use folder structure with `route.tsx` for layouts |
| Add index route | `folder/index.tsx` | `projects/$projectId/documents/index.tsx` → `/projects/:id/documents` |
| Add layout route | `folder/route.tsx` | Must render `<Outlet />` for children |
| Modify HTML shell | `__root.tsx` | Root layout, meta tags, provider chain |
| Route params | `Route.useParams()` | Type-safe params from route definition |

## ROUTE PATTERNS

```typescript
// Folder-based nested route
// File: src/routes/projects/$projectId/documents/index.tsx
export const Route = createFileRoute('/projects/$projectId/documents/')({
  component: DocumentsPage,
});

// Layout route (renders children via Outlet)
// File: src/routes/projects/$projectId/documents/route.tsx
export const Route = createFileRoute('/projects/$projectId/documents')({
  component: DocumentsLayout,
});

function DocumentsLayout() {
  return <Outlet />;
}

// Parent with conditional Outlet (e.g., projects.tsx)
function ProjectsLayout() {
  const matches = useMatches();
  const isExactMatch = matches[matches.length - 1]?.id === '/projects';
  if (!isExactMatch) return <Outlet />;
  return <ProjectsListPage />;
}
```

## CONVENTIONS

- **Folder structure**: Use folders for nested routes, `route.tsx` for layouts
- **Index routes**: `folder/index.tsx` for the default view
- **Params**: `$paramName` in folder/file names (e.g., `$projectId`)
- **Layouts**: Must render `<Outlet />` from `@tanstack/react-router`
- **Auto-generated**: `routeTree.gen.ts` - NEVER EDIT
- **Route component**: Export `Route` via `createFileRoute()`, not default export

## ANTI-PATTERNS

| Forbidden | Why |
| --- | --- |
| Edit `routeTree.gen.ts` | Auto-generated, overwritten on route change |
| Missing `<Outlet />` in layout | Child routes won't render |
| Default export of Route | Use `export const Route = createFileRoute(...)` |
| Direct `navigate()` to unknown paths | Use type-safe route paths |

## COMPLEXITY HOTSPOTS

| File                     | Notes                                         |
| ------------------------ | --------------------------------------------- |
| `entities.$entityId.tsx` | Entity detail + edit form; consider splitting |
| `canon/timeline.tsx`     | D3 visualization                              |
| `auth.tsx`               | Login/signup forms                            |

## NOTES

- TanStack Start auto-generates HTML via `__root.tsx` (no `index.html`)
- SSR enabled by default via Nitro
- Route params are type-safe via generated types
- Use `useNavigate()` for programmatic navigation
- Preload routes with `<Link to="..." preload />` for performance
- React Compiler enabled: no manual memoization needed
- Parent routes (like `projects.tsx`) must conditionally render `<Outlet />` or content
