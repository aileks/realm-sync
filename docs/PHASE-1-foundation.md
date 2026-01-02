---
summary: Implementation details for the foundation phase (Schema, Auth, CRUD).
read_when: [database setup, authentication implementation, core project structure]
---

# Phase 1: Foundation - Realm Sync

## Overview

Establish the core data model, authentication, and basic CRUD operations for projects and documents. This phase sets the stage for advanced tracking and analysis in later phases.

**Goal:** Establish data model, authentication, and basic CRUD for projects/documents. **Duration:** 1-2 weeks **Dependencies:** None (starting point)

## Deliverables Checklist

- [ ] **Convex Schema Implementation**: All tables (users, projects, documents, entities, facts, alerts, llmCache) defined with proper indexes.
- [ ] **Authentication Integration**: Convex Auth configured with Google OAuth and Email/Password providers.
- [ ] **Project Management**: CRUD operations for projects including real-time stats tracking.
- [ ] **Document Management**: CRUD for documents supporting text, markdown, and file uploads (>1MB).
- [ ] **File Storage**: Convex storage integration for large document handling.
- [ ] **Frontend Foundation**: Route structure established and base layout components built.
- [ ] **Dark Archival UI**: Design tokens (OKLCH) and typography applied across the application.

---

## 1. Convex Schema

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Users (extended from Convex Auth)
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    settings: v.optional(
      v.object({
        theme: v.optional(v.string()),
        notifications: v.optional(v.boolean()),
      })
    ),
  }).index('by_email', ['email']),

  // Projects
  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    stats: v.optional(
      v.object({
        documentCount: v.number(),
        entityCount: v.number(),
        factCount: v.number(),
        alertCount: v.number(),
      })
    ),
  }).index('by_user', ['userId', 'updatedAt']),

  // Documents
  documents: defineTable({
    projectId: v.id('projects'),
    title: v.string(),
    content: v.optional(v.string()), // Inline content ≤1MB
    storageId: v.optional(v.id('_storage')), // File reference >1MB
    contentType: v.union(v.literal('text'), v.literal('markdown'), v.literal('file')),
    orderIndex: v.number(),
    wordCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    processedAt: v.optional(v.number()),
    processingStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
  })
    .index('by_project', ['projectId', 'orderIndex'])
    .index('by_project_status', ['projectId', 'processingStatus'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['projectId'],
    }),

  // Entities (Placeholder for Phase 2)
  entities: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    type: v.union(
      v.literal('character'),
      v.literal('location'),
      v.literal('item'),
      v.literal('concept'),
      v.literal('event')
    ),
    description: v.optional(v.string()),
    aliases: v.array(v.string()),
    firstMentionedIn: v.optional(v.id('documents')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId', 'type'])
    .index('by_name', ['projectId', 'name'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['projectId'],
    }),

  // Facts (Placeholder for Phase 2)
  facts: defineTable({
    projectId: v.id('projects'),
    entityId: v.id('entities'),
    documentId: v.id('documents'),
    subject: v.string(),
    predicate: v.string(),
    object: v.string(),
    confidence: v.number(),
    evidenceSnippet: v.string(),
    evidencePosition: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    temporalBound: v.optional(
      v.object({
        type: v.union(v.literal('point'), v.literal('range'), v.literal('relative')),
        value: v.string(),
      })
    ),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('rejected')),
    createdAt: v.number(),
  })
    .index('by_entity', ['entityId', 'status'])
    .index('by_document', ['documentId'])
    .index('by_project', ['projectId', 'status']),

  // Alerts (Placeholder for Phase 4)
  alerts: defineTable({
    projectId: v.id('projects'),
    documentId: v.id('documents'),
    factIds: v.array(v.id('facts')),
    entityIds: v.array(v.id('entities')),
    type: v.union(v.literal('contradiction'), v.literal('timeline'), v.literal('ambiguity')),
    severity: v.union(v.literal('error'), v.literal('warning')),
    title: v.string(),
    description: v.string(),
    evidence: v.array(
      v.object({
        snippet: v.string(),
        documentId: v.id('documents'),
        documentTitle: v.string(),
      })
    ),
    suggestedFix: v.optional(v.string()),
    status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId', 'status'])
    .index('by_document', ['documentId']),

  // LLM Cache
  llmCache: defineTable({
    inputHash: v.string(),
    promptVersion: v.string(),
    modelId: v.string(),
    response: v.string(), // Stringified JSON
    tokenCount: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index('by_hash', ['inputHash', 'promptVersion']),
});
```

---

## 2. Convex Functions

### Projects (`convex/projects.ts`)

- `list`: Get all projects for the current user.
- `get`: Get details for a specific project.
- `create`: Create a new project with initialized stats.
- `update`: Update project metadata.
- `remove`: Delete project and associated documents/entities.

### Documents (`convex/documents.ts`)

- `list`: Get all documents in a project, ordered by `orderIndex`.
- `get`: Get full document content and metadata.
- `create`: Add document via paste, upload, or editor.
- `update`: Update document title or content.
- `remove`: Delete document and clean up storage.
- `reorder`: Batch update `orderIndex` for a project's documents.

### Storage (`convex/storage.ts`)

- `generateUploadUrl`: Get a signed URL for client-side uploads.
- `getFileUrl`: Retrieve the public URL for a storage item.

---

## 3. Frontend Route Structure

```
src/routes/
├── __root.tsx           # Layout with auth check
├── index.tsx            # Landing/Dashboard
├── auth/
│   └── index.tsx        # Sign in/up
├── projects/
│   ├── index.tsx        # Project list
│   ├── new.tsx          # Create project
│   └── $projectId/
│       ├── index.tsx    # Project dashboard
│       └── documents/
│           ├── index.tsx      # Document list
│           ├── new.tsx        # Add document
│           └── $documentId.tsx # Editor
```

---

## 4. UI Components

- **Layout**: `AppShell` (Root structure), `Sidebar` (Navigation), `Header` (User profile/context).
- **Project**: `ProjectCard` (Summary), `ProjectForm` (Modal/Page for CRUD), `ProjectDashboard` (Stats overview).
- **Document**: `DocumentList` (Draggable list), `DocumentCard` (File info), `DocumentForm` (Tabs for Paste/Upload/Editor), `DocumentEditor` (Rich text/Markdown editor), `FileUploader` (Drag-and-drop zone).

---

## 5. Design Foundation (Dark Archival)

### OKLCH Color Tokens

- **Background**: `oklch(0.12 0.02 60)` (Near-black warm)
- **Foreground**: `oklch(0.87 0.02 80)` (Warm off-white)
- **Primary**: `oklch(0.72 0.15 75)` (Moth-wing amber)
- **Accent**: `oklch(0.65 0.18 55)` (Candlelight glow)

### Typography

- **Body**: DM Sans (`@fontsource-variable/dm-sans`)
- **Headings**: Crimson Pro (Archive feel)
- **Code**: JetBrains Mono (Technical precision)

### Visual Textures

- Paper grain overlay
- Vignette effect
- Aged borders (low-opacity gold/sepia)

---

## 6. Testing Scenarios

1. **Authentication**: Verify Google OAuth and Email/Password flows and persistence.
2. **Project CRUD**: Create, view, edit, and delete projects. Ensure stats initialize at 0.
3. **Document Ingestion**:
   - Paste large text blocks (up to 1MB).
   - Upload text/markdown files (using Convex storage for >1MB).
   - Direct editing in `DocumentEditor`.
4. **Reordering**: Test drag-and-drop document reordering within a project.

---

## 7. Environment Variables

```env
# Server
CONVEX_DEPLOYMENT=...
OPENROUTER_API_KEY=...

# Client
VITE_CONVEX_URL=...
```

---

## 8. Next Phase Preparation

- Phase 2 will focus on **Entity Extraction** and **Knowledge Graph** construction.
- Document processing status should be monitored to trigger LLM workflows.
