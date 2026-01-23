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

- Status: done (branch `fix/storage-access`; PR pending).
- Changes:
  - Added `documents` index `by_storage` and storage access helper.
  - Gate `getFileUrl`, `getFileMetadata`, `deleteFile` on ownership (avatar or document project owner).
  - Clear `avatarStorageId`/document `storageId` on delete.
- Tests:
  - Added `convex/__tests__/storage.test.ts` for owner/other/unauth cases.

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
