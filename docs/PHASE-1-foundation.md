---
summary: Implementation details for the foundation phase (Schema, Auth, CRUD).
read_when: [database setup, authentication implementation, core project structure]
---

# Phase 1: Foundation - Realm Sync

## Overview

Establish the core data model, authentication, and basic CRUD operations for projects, documents, and notes. This phase sets the stage for advanced tracking and analysis in later phases.

**Goal:** Establish data model, authentication, and basic CRUD for projects/documents/notes. **Duration:** 1-2 weeks **Dependencies:** None (starting point)

## Deliverables Checklist

- [x] **Convex Schema Implementation**: All tables (users, projects, documents, notes, entities, facts, alerts, llmCache) defined with proper indexes.
- [x] **Authentication Integration**: Convex Auth configured with Google OAuth and Email/Password providers.
- [x] **Project Management**: CRUD operations for projects including real-time stats tracking.
- [x] **Document Management**: CRUD for documents supporting text, markdown, and file uploads (>1MB).
- [x] **Notes Management**: CRUD for notes including markdown/text support, tags, pinning, and search.
- [x] **File Storage**: Convex storage integration for large document handling.
- [x] **Frontend Foundation**: Route structure established and base layout components built.
- [x] **Dark Archival UI**: Design tokens (OKLCH) and typography applied across the application.

---

## 1. Convex Schema

> **See [SCHEMA.md](./SCHEMA.md) for complete schema reference.**

Phase 1 establishes all 8 tables: `users`, `projects`, `documents`, `notes`, `entities`, `facts`, `alerts`, `llmCache`.

Key tables for Phase 1:

| Table       | Purpose                       | Key Indexes                       |
| ----------- | ----------------------------- | --------------------------------- |
| `users`     | Extended from Convex Auth     | `by_email`                        |
| `projects`  | User-owned project containers | `by_user` (userId, updatedAt)     |
| `documents` | Source text with processing   | `by_project`, `by_project_status` |

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
- `updateProcessingStatus`: Update document extraction state.
- `search`: Full-text search within project documents.

### Storage (`convex/storage.ts`)

- `generateUploadUrl`: Get a signed URL for client-side uploads.
- `getFileUrl`: Retrieve the public URL for a storage item.
- `deleteFile`: Remove file from storage.
- `getFileMetadata`: Get file size and content type.

### Notes (`convex/notes.ts`)

- `list`: Get all notes in a project, ordered by pinned status and updatedAt.
- `get`: Get full note content and metadata.
- `create`: Add new note with title, content, tags, and optional pin.
- `update`: Edit note title, content, tags, or pin status.
- `togglePin`: Toggle note pin status for quick access.
- `remove`: Delete note.
- `search`: Full-text search within project notes.

---

## 3. Frontend Route Structure

TanStack Start uses file-based routing with underscore-escaping (`_.` escapes folder nesting).

```
src/routes/
├── __root.tsx                              # Root layout
├── index.tsx                               # / (Dashboard)
├── auth.tsx                                # /auth
├── dev.chat.tsx                            # /dev/chat (Vellum chat)
├── projects.tsx                            # /projects (list)
├── projects_.new.tsx                       # /projects/new
├── projects_.$projectId.tsx                # /projects/:projectId (layout)
├── projects_.$projectId_.documents.tsx     # /projects/:projectId/documents (layout)
├── projects_.$projectId_.documents.index.tsx    # /projects/:projectId/documents
├── projects_.$projectId_.documents.new.tsx      # /projects/:projectId/documents/new
├── projects_.$projectId_.documents.$documentId.tsx  # /projects/:projectId/documents/:documentId
├── projects_.$projectId_.entities.tsx      # /projects/:projectId/entities
├── projects_.$projectId_.facts.tsx         # /projects/:projectId/facts
├── projects_.$projectId_.notes.tsx          # /projects/:projectId/notes (layout)
├── projects_.$projectId_.notes.index.tsx     # /projects/:projectId/notes
├── projects_.$projectId_.notes.new.tsx       # /projects/:projectId/notes/new
├── projects_.$projectId_.notes.$noteId.tsx     # /projects/:projectId/notes/:noteId
├── projects_.$projectId_.review.tsx        # /projects/:projectId/review (layout)
├── projects_.$projectId_.review.index.tsx  # /projects/:projectId/review
├── projects_.$projectId_.review.$documentId.tsx  # /projects/:projectId/review/:documentId
└── projects_.$projectId_.alerts.tsx        # /projects/:projectId/alerts
```

---

## 4. UI Components

- **Layout**: `AppShell` (Root structure), `Sidebar` (Navigation), `Header` (User profile/context).
- **Project**: `ProjectCard` (Summary), `ProjectForm` (Modal/Page for CRUD), `ProjectDashboard` (Stats overview).
- **Document**: `DocumentList` (Draggable list), `DocumentCard` (File info), `DocumentForm` (Tabs for Paste/Upload/Editor), `DocumentEditor` (Rich text/Markdown editor), `FileUploader` (Drag-and-drop zone).
- **Notes**: `NoteList` (Grid/list view with pinned section), `NoteCard` (Preview with tags and pin indicator), `NoteForm` (Markdown/text editor with tag input), `NoteEditor` (Rich text/Markdown editor).

---

## 5. Design Foundation (Dark Archival)

### OKLCH Color Tokens (Default Theme)

- **Background**: `oklch(0.13 0.015 70)` (Deep warm black)
- **Foreground**: `oklch(0.88 0.02 75)` (Warm off-white)
- **Primary**: `oklch(0.7 0.06 70)` (Moth-wing amber)
- **Accent**: `oklch(0.28 0.04 70)` (Candlelight glow)

See `docs/UI-DESIGN.md` for full theme system including `amber-archive` and `twilight-study` variants.

### Typography

- **Body**: DM Sans (`@fontsource-variable/dm-sans`)
- **Headings**: Aleo (Archive feel)
- **Code**: iA Writer Mono (Technical precision)

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
