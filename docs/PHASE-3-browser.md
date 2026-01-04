---
summary: Implementation details for the Canon Browser UI, entity details, and search.
read_when:
  [
    UI development,
    navigation design,
    search implementation,
    timeline visualization,
  ]
---

# Phase 3: Canon Browser - Realm Sync

## Overview

Phase 3 focuses on the Canon Browser UI, allowing users to explore, search, and manage the extracted entities and facts. It transforms the structured data from Phase 2 into an intuitive, archival knowledge base.

**Goal:** Build the UI for browsing, searching, and exploring canon (entities and facts). **Duration:** 2 weeks **Dependencies:** Phase 2 complete (extraction pipeline working)

---

## Implementation Progress

| Sub-Phase | Status | PR | Notes |
| --- | --- | --- | --- |
| 3.1 Canon Browser Shell | ✅ Complete | #16 | Merged 2026-01-04 |
| 3.2 Entity Detail Page | ✅ Complete | #18 | Merged 2026-01-04 |
| 3.3 Full-Text Search | ✅ Complete | - | Search index + debounced input |
| 3.4 Entity Editing & Management | ✅ Complete | #18 | Inline + dedicated page editing |
| 3.5 Timeline View | ✅ Complete | - | Events by document order |
| 3.6 Relationship Visualization | 🔲 Pending | - | Backend functions missing |
| 3.7 Polish & Integration | 🔲 Pending | - | - |

### What's Implemented (from PR #16)

**Backend:**

- `entities.listByProjectWithStats` - Entities with fact counts + sorting

**Frontend:**

- Canon layout with Browse/Timeline/Search nav tabs
- Entity type filtering (All, Characters, Locations, Items, Concepts, Events)
- Grid/list view toggle + sort dropdown
- Entity detail Sheet (slide-over) with inline editing
- Three themes: Fireside (default), Twilight, Daylight

### What's Missing

**Backend functions needed:**

- ~~`entities.getWithDetails`~~ ✅ Implemented in PR #18
- ~~`entities.search`~~ ✅ Full-text search using search index
- ~~`entities.getRelationships`~~ ✅ Implemented via `getWithDetails.relatedEntities`
- `entities.getRelationshipGraph` - Nodes and edges for visualization

**Routes needed:**

- ~~`projects_.$projectId_.canon_.entities.$entityId.tsx`~~ ✅ Changed to `/entities/$entityId` (PR #18)
- ~~`projects_.$projectId_.canon.search.tsx`~~ ✅ Search with highlight + debounce
- ~~`projects_.$projectId_.canon.timeline.tsx`~~ ✅ Timeline with accuracy disclaimer

---

## Design Decisions

| Decision | Choice | Notes |
| --- | --- | --- |
| Route structure | Keep `/entities` + `/facts`, add `/canon/` as unified browser | Share logic where possible |
| Relationship viz | Basic D3 first, refactor to React Flow later | Sub-phase 3.6a (D3) → 3.6b (React Flow, post-MVP) |
| Search scope | Entities only (Phase 3) | Facts search deferred |
| Timeline ordering | Document order (`orderIndex`) | Add "may not be fully accurate" disclaimer |

---

## Sub-Phase Details

### 3.1 Canon Browser Shell

**Scope:** Create main Canon Browser page with entity type tabs, sorting, and grid/list toggle.

**Routes:**

- `projects_.$projectId_.canon.tsx` (layout with Outlet)
- `projects_.$projectId_.canon.index.tsx` (main browser page)

**Components:**

- `CanonBrowser` - Main container with state management
- `EntityTypeFilter` - Tab bar with type icons
- `EntityGrid` - Responsive grid/list toggle view
- Enhanced `EntityCard` - Add fact count display

**Backend:**

- `entities.listByProjectWithStats` - Add fact count and sorting options

---

### 3.2 Entity Detail Page

**Scope:** Build comprehensive entity detail view with facts, relationships, and appearances.

**Routes:**

- `projects_.$projectId_.canon_.entities.$entityId.tsx`

**Components:**

- `EntityHeader` - Name, type badge, aliases, edit dropdown
- `AttributeList` - Facts as "Attribute: Value" cards grouped by predicate
- `AppearanceTimeline` - Chronological document mentions
- `EvidencePanel` - Collapsible source quotes

**Backend:**

- `entities.getWithDetails` - Entity + facts + related entities + appearances
- `entities.getRelationships` - Facts linking to other entities

---

### 3.3 Full-Text Search

**Scope:** Implement real-time search using Convex search index.

**Routes:**

- `projects_.$projectId_.canon_.search.tsx`

**Components:**

- `SearchInput` - Command-K activated search bar
- `SearchResults` - List with type icons and snippets
- `SearchHighlight` - Term highlighting utility

**Backend:**

- `entities.search` - Query using `withSearchIndex('search_name')`

---

### 3.4 Entity Editing & Management

**Scope:** Modal-based editing, merging, and deletion with proper UX.

**Components:**

- `EntityEditDialog` - Edit name, description, aliases, type
- `EntityDeleteDialog` - Confirmation with impact summary
- Enhanced `EntityMergeDialog` - Search-select with preview

**Backend:**

- `entities.getImpact` - Deletion preview (fact/relationship counts)

---

### 3.5 Timeline View

**Scope:** Chronological visualization of events and entity appearances.

**Routes:**

- `projects_.$projectId_.canon_.timeline.tsx`

**Components:**

- `TimelineView` - Vertical timeline orchestrator with accuracy disclaimer
- `TimelineEvent` - Event card with date, context, involvement
- `TimelineFilter` - Filter by entity, date range

**Backend:**

- `entities.listEvents` - Events sorted by document `orderIndex`
- `facts.listByTemporalBound` - Facts with temporal info

**Note:** Ordering based on document order; include "Timeline ordering may not be fully accurate" disclaimer

---

### 3.6 Relationship Visualization (Basic D3)

**Scope:** Basic node-link visualization of entity connections using D3.

**Components:**

- `RelationshipGraph` - Basic D3 force-directed SVG diagram
- `RelationshipCard` - Connection type + evidence display

**Backend:**

- `entities.getRelationshipGraph` - Nodes (entities) and edges (relationship facts)

**Future:** Refactor to React Flow post-MVP for better interactivity (zoom, pan, click-to-navigate)

---

### 3.7 Polish & Integration

**Scope:** Empty states, keyboard navigation, Vellum personality, stats.

**Components:**

- Vellum empty state messages
- `QuickStats` - Entity/fact/coverage totals

**Backend:**

- `projects.getCanonStats` - Aggregated canon statistics

---

## 1. Objectives

- Create Canon Browser main page with entity type filters.
- Build Entity detail pages with facts and relationships.
- Implement full-text search across canon.
- Add timeline view for events.
- Build relationship visualization (basic).
- Create entity editing capabilities.

---

## 2. Route Structure

The browser follows a project-centric routing structure using TanStack Start's file-based routing with underscore escaping.

```
src/routes/
├── projects_.$projectId_.canon.tsx              # Canon layout (Outlet)
├── projects_.$projectId_.canon.index.tsx        # Canon browser main
├── projects_.$projectId_.canon_.search.tsx      # Search results
├── projects_.$projectId_.canon_.entities.$entityId.tsx  # Entity detail
└── projects_.$projectId_.canon_.timeline.tsx    # Timeline view
```

**URL Mapping:**

- `/projects/:projectId/canon` → Canon browser main
- `/projects/:projectId/canon/search?q=...` → Search results
- `/projects/:projectId/canon/entities/:entityId` → Entity detail
- `/projects/:projectId/canon/timeline` → Timeline view

---

## 3. Canon Browser Main Page

The main entry point for exploring the knowledge base of a project.

### Features

- **Entity Type Tabs:** All | Characters | Locations | Items | Concepts | Events.
- **Sort Options:** Name A-Z, Recently added, Most facts.
- **View Toggle:** Grid/List view toggle.
- **Quick Stats:** Total entities, facts, and coverage.
- **Empty State:** Vellum prompt for empty archives.

### Components

- **CanonBrowser:** Main container managing state for filters and sorting.
- **EntityTypeFilter:** Tab bar for filtering by entity type using Lucide icons.
- **EntityGrid:** Responsive grid layout for entity cards.
- **EntityCard:** Preview card showing name, type icon, fact count, and first appearance.

---

## 4. Entity Detail Page

A comprehensive view of a specific entity, showing its place in the canon.

### Sections

1. **Header:** Name, type badge, aliases, and primary description.
2. **Attributes:** Key-value facts (e.g., eye color, age) grouped by predicate.
3. **Relationships:** Links to related entities with relationship descriptions.
4. **Timeline:** Chronological list of appearances in documents.
5. **Evidence:** Collapsible panels showing supporting quotes with document links.
6. **Edit Actions:** Quick access to edit, merge, or delete the entity.

### Components

- **EntityHeader:** Name, type badge, and edit/actions dropdown.
- **AttributeList:** Displays facts as structured "Attribute: Value" cards.
- **RelationshipGraph:** Basic node-link visualization showing direct connections.
- **AppearanceTimeline:** Chronological list of document segments where the entity appears.
- **EvidencePanel:** Collapsible component for displaying verbatim source quotes.

---

## 5. Search Functionality

Real-time search across all entities and facts within a project.

### Implementation

- **Convex Search Index:** Uses `searchIndex` on the `entities` table (indexing `name` and `description`).
- **Filtering:** Scoped to the current `projectId`.
- **Highlighting:** Visual highlighting of matching terms in results.

### Components

- **SearchInput:** Command-K activated global search bar.
- **SearchResults:** List of matching entities with type icons and match snippets.
- **SearchHighlight:** Utility component for term highlighting in text.

---

## 6. Timeline View

A temporal overview of extracted events and entity appearances.

### Features

- **Vertical Timeline:** Chronological flow of events.
- **Entity Filtering:** Filter timeline to show only events involving specific entities.
- **Temporal Relations:** Visualization of "before/after" relationships.
- **Source Linking:** Direct links back to the source documents for each event.

### Components

- **TimelineView:** Orchestrator for the temporal layout.
- **TimelineEvent:** Event card with date, context, and involvement list.
- **TimelineFilter:** Controls for filtering by entity, date range, or event type.

---

## 7. Entity Editing & Management

Tools for refining and maintaining the integrity of the canon.

### Capabilities

- **Direct Edit:** Update name, description, aliases, and type.
- **Merge Entities:** Combine duplicate entities (e.g., "Jon Snow" and "Lord Snow"), merging all associated facts and evidence.
- **Cascade Delete:** Remove an entity and its associated facts (with confirmation).

### Components

- **EntityEditForm:** Modal/Dialog for editing entity properties.
- **EntityMergeDialog:** Search-and-select interface for choosing a merge target with a preview of the combined state.
- **EntityDeleteDialog:** Confirmation dialog with a summary of the impact (number of facts/relationships affected).

---

## 8. Convex Query Specifications

```typescript
// convex/entities.ts

/**
 * List entities with filtering and sorting
 */
export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    type: v.optional(v.string()),
    sortBy: v.optional(v.string()), // "name", "recent", "factCount"
  },
  handler: async (ctx, args) => {
    // Implementation for filtered/sorted listing
  },
});

/**
 * Get full entity details including facts and relationships
 */
export const getWithDetails = query({
  args: {entityId: v.id('entities')},
  handler: async (ctx, {entityId}) => {
    const entity = await ctx.db.get(entityId);
    if (!entity) return null;

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', entityId))
      .collect();

    // Fetch relationships and evidence...
    return {...entity, facts};
  },
});

/**
 * Full-text search across entities
 */
export const search = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('entities')
      .withSearchIndex('search_name', (q) =>
        q.search('name', args.query).eq('projectId', args.projectId)
      )
      .take(20);
  },
});
```

---

## 9. UI & Design Specifications

### Entity Type Icons (Lucide)

- **Character:** `User`
- **Location:** `MapPin`
- **Item:** `Package`
- **Concept:** `Lightbulb`
- **Event:** `Calendar`

### Visual Language

- **Card Design:** Parchment-like background (`oklch` archival colors), serif typography for names.
- **Interactions:** Subtle hover lifts and glow effects for entity cards.
- **Timeline Style:** Vertical archival line with nodes; current position marked by a Moth icon.
- **Vellum Integration:**
  - Empty Archives: "Your archive awaits its first entry. Add a document to begin cataloging."
  - No Search Results: "I couldn't find anything matching that query. Try different terms."
  - No Relationships: "This entity stands alone for now. Relationships will emerge as your canon grows."

---

## 10. Testing Scenarios

1. **Browse by Type:** Verify tabs correctly filter entities by their assigned type.
2. **Deep Search:** Search for an entity by name and verify highlighting in results.
3. **Timeline Flow:** Navigate the timeline and ensure events are chronologically ordered and link to source documents.
4. **Merge Integrity:** Merge two entities and verify that facts from both are now associated with the primary entity.
5. **Empty States:** Clear all entities and verify Vellum's "waiting" message appears.
