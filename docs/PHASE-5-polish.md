---
summary: Focus on UI/UX refinement, Vesper mascot integration, onboarding, and post-MVP features.
read_when: [Vesper mascot, animations, keyboard shortcuts, export functionality, onboarding flow]
---

# Phase 5: Polish & Post-MVP - Realm Sync

## Overview
Phase 5 focuses on refining the user experience, fully integrating the **Vesper** mascot, and adding quality-of-life features that elevate Realm Sync from a functional tool to a polished product. This phase also lays the groundwork for advanced post-MVP features.

**Goal:** Refine UX, fully integrate Vesper mascot, and add quality-of-life features.
**Duration:** Ongoing
**Dependencies:** Phases 1-4 complete (core functionality working)

---

## 1. Objectives
- Full Vesper mascot integration (visual + voice).
- Implementation of meaningful animations and micro-interactions.
- Creation of a guided onboarding flow for new users.
- Addition of comprehensive keyboard shortcuts.
- Implementation of project and entity export functionality.
- Performance optimization across the stack.
- Research and groundwork for post-MVP features (Relationship Maps, Collaboration).

---

## 2. Vesper Mascot Integration

Vesper is the soul of the archive — a helpful, slightly formal, yet warm moth archivist.

### Visual Design
- **Silhouette:** Moth silhouette icon (stylized, minimalist).
- **Color Palette:** Warm amber and gold tones matching the theme.
- **Animations:** Subtle wing flutter on hover; glow effect when "speaking" or processing.
- **Placement:** 
    - Floating in the bottom-right corner by default.
    - Integrated into empty states (e.g., "This project is empty").
    - Expandable notification panel for system messages.

### Personality Expressions
- **Neutral:** Wings folded, soft ambient glow.
- **Alert:** Wings spread slightly, brighter gold glow.
- **Success:** Gentle pulse animation (breathing effect).
- **Thinking:** Subtle shimmer/sparkle effect.

### Voice & Messaging
All system feedback is delivered in Vesper's voice.
- **Tone:** Formal but warm, using first-person ("I found...", "I've catalogued...").
- **Themes:** Archival terminology, light/shadow metaphors, moth references.

**Message Examples:**
```typescript
const VESPER_MESSAGES = {
  welcome: "Welcome to your archive. I'm Vesper, and I'll help you keep track of your world.",
  firstDocument: "Your first entry! Shall I begin cataloging?",
  extractionComplete: "I've catalogued {count} new entries from {document}.",
  alertFound: "I noticed something that needs your attention in {document}.",
  noAlerts: "All clear. Your canon is consistent.",
  emptyProject: "This world awaits its first story. Add a document to begin.",
  emptyCanon: "Your archive is empty. Extract canon from your documents to populate it.",
  searchNoResults: "I couldn't find anything matching '{query}'. Perhaps try different terms?",
  mergeSuccess: "I've combined these entries. Their knowledge is now unified.",
  deleteConfirm: "This will remove {name} and all associated facts. Are you certain?",
}
```

---

## 3. Animation & Micro-interactions

Animations should be purposeful and respect user preferences.

### Page Transitions
- **Route Changes:** Subtle fade + 10px vertical slide.
- **Lists:** Staggered reveal for entity and document lists.
- **Async Content:** Smooth skeleton loaders for loading states.

### Interactive Elements
- **Buttons:** Subtle lift + amber outer glow on hover.
- **Cards:** Border glow and slight scale (1.02x) on hover.
- **Forms:** Animated ring focus transitions.
- **Success States:** Check mark animation with a tiny amber particle burst.
- **Error States:** Brief horizontal shake + red flash.

### Implementation Guidelines
- Use **Tailwind v4** transitions for simple hover/focus states.
- Use **Framer Motion** for complex sequences and route transitions.
- **Critical:** Wrap all motion components to respect `prefers-reduced-motion`.

---

## 4. Onboarding Flow

A guided experience for first-time users to ensure they understand the value of Realm Sync.

### Steps
1. **Welcome:** Modal with Vesper introduction and a brief explanation of "Canon Tracking."
2. **Project Creation:** Prompt to create the first project.
3. **Document Upload:** Walkthrough on adding the first text source.
4. **Extraction Demo:** Guided first extraction to show facts being generated.
5. **Canon Tour:** Tour of the Entity Browser and Fact lists.
6. **Continuity Explanation:** Briefly show how Vesper catches contradictions.

### Components
- `OnboardingModal`: Multi-step container.
- `FeatureTooltip`: Contextual "Vesper hints" pointing to UI elements.
- `ProgressIndicator`: Shows how close the user is to "Archive Ready" status.

---

## 5. Keyboard Shortcuts

Power users can navigate the archive without leaving the keyboard.

| Category | Shortcut | Action |
|----------|----------|--------|
| **Global** | `Cmd/Ctrl + K` | Open Command Palette / Search |
| | `Cmd/Ctrl + N` | Create new document |
| | `Cmd/Ctrl + E` | Trigger extraction on current doc |
| | `Cmd/Ctrl + /` | Show shortcut cheatsheet |
| **Editor** | `Cmd/Ctrl + S` | Save document |
| | `Cmd/Ctrl + Enter` | Save and trigger extraction |
| | `Escape` | Close editor / Cancel |
| **Browser** | `J / K` | Navigate up/down in lists |
| | `Enter` | Open selected entity/document |
| | `E` | Edit selected item |
| | `/` | Focus search input |

---

## 6. Export Functionality

Users should own their data. Exporting allows for external backups and wiki generation.

### Formats
- **JSON:** Complete structured data (projects, entities, facts, documents).
- **Markdown:** Wiki-style pages with cross-links between entities.
- **CSV:** Tabular format for entities and facts for spreadsheet analysis.

### Convex Implementation
```typescript
// convex/export.ts
export const exportProject = action({
  args: {
    projectId: v.id("projects"),
    format: v.union(v.literal("json"), v.literal("markdown"), v.literal("csv")),
  },
  handler: async (ctx, args) => {
    // 1. Gather all project data (entities, facts, documents)
    // 2. Format according to the requested type
    // 3. Return a signed URL or base64 blob for download
  },
})
```

---

## 7. Performance Optimization

### Database & Backend
- **Indexing:** Audit all Convex queries to ensure they hit defined indexes.
- **Pagination:** Implement `usePaginatedQuery` for entity lists exceeding 50 items.
- **Stats Denormalization:** Store `factCount` and `docCount` on project/entity records to avoid expensive counts.

### Frontend
- **Code Splitting:** Route-based splitting via TanStack Router.
- **Lazy Loading:** Use `React.lazy` for heavy components like the Relationship Map (future).
- **Memoization:** Wrap expensive list filtering and sorting in `useMemo`.

---

## 8. Post-MVP Feature Groundwork

### Relationship Map (V0.5)
- **Data Structure:** Prepare `relationships` table in schema linking entity A to entity B with a `type`.
- **Visualization:** Research `React Flow` or `D3` for node-edge diagrams.

### Unresolved Threads
- Add an `open_loop` fact type to track mysteries or questions left unanswered in the text.
- UI for tracking "Questions Vesper has" about the world.

### Collaboration
- Research Convex's optimistic updates and real-time syncing for multi-user editing.
- Design a basic permission model (`owner`, `editor`, `viewer`).

---

## 9. Testing & QA

- **Onboarding:** Verify the flow triggers only for new users and can be skipped.
- **Shortcuts:** Test every shortcut in different contexts (Editor vs. Browser).
- **Export Integrity:** Verify that exported JSON/Markdown contains all project facts.
- **Mascot Interaction:** Ensure Vesper's animations don't interfere with core UI interaction.
- **Stress Test:** Verify UI remains responsive with 100+ entities and 1,000+ facts.

---

## 10. Documentation Updates

- Update `README.md` with the full feature list.
- Add `CONTRIBUTING.md` for external contributors.
- Create a comprehensive `User Guide` (hosted in the app under "Help").
- Record a short "Vesper Walkthrough" demo video.
