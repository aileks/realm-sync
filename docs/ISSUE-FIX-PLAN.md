---
summary: Plan for remaining security issue fixes (#51, #58).
read_when: planning or executing remaining security issue fixes
---

# Remaining Security Fix Plan

## Guardrails

- Branch per issue (`fix/storage-access`, `fix/markdown-sanitize`).
- PR summary: issue link + file paths in backticks + why change.
- Keep changes tight; add regression tests where feasible.

## Issue #50: Make subscription/webhook helpers internal

- Status: done (branch `fix/subscription-webhooks`; PR pending).
- Changes:
  - Converted `listByEmail`, `getByPolarCustomerId` -> `internalQuery`.
  - Converted `updateSubscription` -> `internalMutation`.
  - Updated Polar webhook handlers in `convex/http.ts` to call `internal.users.*`.
- Tests:
  - Added coverage in `convex/__tests__/subscription.test.ts` for internal updates/queries.

## Issue #51: Restrict storage file access + deletes

- Goal: enforce ownership for storage URL/metadata/delete.
- Files: `convex/storage.ts`, `convex/documents.ts`, `convex/schema.ts`, new helper.
- Plan:
  - Add index on documents by `storageId` (already in schema? add if missing).
  - Add helper `getStorageOwner` (new `convex/lib/storageAccess.ts` or inline) that:
    - requires auth
    - allows if storageId matches user `avatarStorageId`
    - or if storageId belongs to document in a project owned by user
  - `getFileUrl`/`getFileMetadata`: require auth + ownership; return null or throw on unauthorized (prefer throw for clear error).
  - `deleteFile`: require auth + ownership; consider clearing `avatarStorageId`/document `storageId` if delete is allowed (decide in implementation).
- Tests:
  - New `convex/__tests__/storage.test.ts`:
    - owner can get url/metadata/delete
    - other user denied
    - unauth denied

## Issue #58: Sanitize markdown rendering in review/dev chat

- Goal: remove XSS vector in markdown rendering; remove dev chat route.
- Files: `src/routes/projects/$projectId/review/$documentId.tsx`, `src/routes/dev.chat.tsx`, `src/components/VellumChat.tsx` (optional helper), new helper/test.
- Plan:
  - Delete `src/routes/dev.chat.tsx` (route auto-removed).
  - Add `src/lib/markdown.ts` with `marked` + `DOMPurify` sanitization (return safe HTML).
  - Update review page to render sanitized HTML from helper.
  - Optionally reuse helper in `VellumChat` for consistency.
- Tests:
  - Add `src/__tests__/markdown.test.ts` to assert `<script>` stripped.
  - Optional UI smoke via existing tests if needed.
