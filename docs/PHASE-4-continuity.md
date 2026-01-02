---
summary: Implementation details for the continuity checking system (Conflict detection, Vellum alerts).
read_when: [continuity checking, conflict resolution, LLM alert generation, Vellum messaging]
---

# Phase 4: Continuity Checking - Realm Sync

## Overview

Phase 4 focuses on the continuity checking system, the "Archivist's Eye" that detects inconsistencies and conflicts within the canon. This system ensures that new documents remain faithful to established facts, flagging potential errors for user resolution.

**Goal:** Build the system that checks new documents against existing canon and flags inconsistencies. **Duration:** 1-2 weeks **Dependencies:** Phase 3 complete (canon browser working)

---

## 1. Objectives

- Design continuity check prompts with the **Vellum** persona.
- Build the check pipeline (gather canon → LLM analysis → alerts).
- Implement alert types: contradictions, timeline issues, and ambiguities.
- Create an Alerts Dashboard UI for project-wide monitoring.
- Build an alert resolution workflow (resolve, dismiss, update canon).
- Add an auto-check option on document save.

---

## 2. Alert Types

### Contradiction

- **Definition:** Two facts about the same entity that directly conflict.
- **Example:** "Marcus has blue eyes" (Ch.1) vs "Marcus's brown eyes narrowed" (Ch.5).
- **Severity:** Error

### Timeline Issue

- **Definition:** Events occurring in an impossible order or with conflicting timestamps.
- **Example:** A character is reported dead in Chapter 3 but appears as an active participant in Chapter 5.
- **Severity:** Error or Warning

### Ambiguity

- **Definition:** Unclear references, alias collisions, or potential identity confusion.
- **Example:** Two different characters both being referred to as "the Captain" in the same scene without clarification.
- **Severity:** Warning

---

## 3. Continuity Check Pipeline

The pipeline follows a structured flow triggered by document updates:

1. **Document Saved/Updated:** User saves changes to a document.
2. **Gather Relevant Canon:**
   - Extract entities mentioned in the new text.
   - Fetch all established facts for those entities.
   - Retrieve surrounding timeline context (events immediately before/after).
3. **Build Context Window:** Construct a structured prompt including the established canon and the new text.
4. **Call LLM:** Invoke the check action using the Vellum persona.
5. **Parse Response:** Receive structured JSON containing identified alerts.
6. **Create Alert Records:** Save alerts to the database, linked to the document and relevant entities/facts.
7. **Notify User:** Display alert notifications in the UI.

---

## 4. Vellum Check Prompt

```text
You are Vellum, the Archivist Moth. You are reviewing new text against established canon to identify inconsistencies.

ESTABLISHED CANON:
{canonContext}

NEW TEXT TO CHECK:
{documentContent}

TASK:
Identify any inconsistencies between the new text and established canon. For each issue found:
1. Classify the type: contradiction, timeline, ambiguity.
2. Quote the conflicting evidence from BOTH sources.
3. Explain the inconsistency clearly.
4. Suggest a possible resolution.
5. Assign severity: error (definite conflict) or warning (potential issue).

Only report REAL inconsistencies. Do not flag:
- New information that doesn't conflict.
- Intentional character development.
- Different perspectives on the same event.

OUTPUT: Return structured JSON matching the provided schema.
```

---

## 5. Check Response Schema

```typescript
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    alerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { enum: ['contradiction', 'timeline', 'ambiguity'] },
          severity: { enum: ['error', 'warning'] },
          title: { type: 'string' },
          description: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { enum: ['canon', 'new_document'] },
                quote: { type: 'string' },
                entityName: { type: 'string' },
              },
              required: ['source', 'quote'],
            },
          },
          suggestedFix: { type: 'string' },
          affectedEntities: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'severity', 'title', 'description', 'evidence'],
        additionalProperties: false,
      },
    },
    summary: {
      type: 'object',
      properties: {
        totalIssues: { type: 'number' },
        errors: { type: 'number' },
        warnings: { type: 'number' },
        checkedEntities: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  required: ['alerts', 'summary'],
  additionalProperties: false,
};
```

---

## 6. Canon Context Building

To maximize LLM efficiency and accuracy, the context is built dynamically:

**Strategy:**

1. **Entity Identification:** Identify entities in the new document (via NLP or regex).
2. **Fact Retrieval:** Query the `facts` table for all entities identified.
3. **Timeline Context:** Fetch events and temporal facts that overlap with the document's chronological scope.
4. **Token Management:** Limit the context to ~4,000 tokens to ensure the new document fits within the window.

**Context Format:**

```text
## Entity: Marcus Blackwood
Type: Character
Facts:
- Has blue eyes [Ch.1, confidence: 1.0]
- Age 34 at story start [Ch.1, confidence: 1.0]
- Carries silver dagger [Ch.2, confidence: 0.9]

## Entity: The Red Tower
Type: Location
Facts:
- Located in northern mountains [Ch.1]
- Destroyed in the Sundering [Ch.4]
```

---

## 7. Convex Functions

### Continuity Checks (`convex/checks.ts`)

- `runCheck` (internalAction): Orchestrates the pipeline (Gather context → LLM call → Schedule creation).
- `createAlerts` (internalMutation): Batch inserts alert records into the database.

### Alerts Management (`convex/alerts.ts`)

- `listByProject`: Fetch all alerts for a project (with filtering/sorting).
- `listByDocument`: Get alerts specific to a single document.
- `resolve`: Mutation to mark an alert as resolved or dismissed, with optional notes.

---

## 8. Alerts Dashboard UI

**Route:** `src/routes/projects/$projectId/alerts/index.tsx`

### Features

- **Global Filters:** Filter by Status (Open, Resolved, Dismissed), Type, and Severity.
- **Sorting:** Sort by Newest, Oldest, or Severity.
- **Bulk Actions:** "Resolve All" or "Dismiss All" capabilities for efficient management.

### Components

- **AlertsDashboard:** Main container and state manager.
- **AlertFilters:** Side or top bar for refining the alert list.
- **AlertList:** Scrollable list of `AlertCard` components.
- **AlertCard:** Preview showing type icon, title, severity badge, and a summary snippet.

---

## 9. Alert Resolution Flow

1. **Detail View:** Clicking an alert opens the `AlertDetailPanel`.
2. **Side-by-Side Comparison:** Evidence is shown visually (Canon vs. New Document).
3. **Action Selection:**
   - **Resolve:** User confirms they have fixed the document.
   - **Dismiss:** User flags the alert as intentional (e.g., character lie, unreliable narrator).
   - **Update Canon:** User chooses to override the existing fact with the new information.
   - **Edit Document:** Quick-link to jump directly to the editor at the conflicting line.
4. **Finalization:** Status is updated, and the alert is moved to the "Resolved" or "Dismissed" archive.

---

## 10. Vellum Messaging (UI Feedback)

Vellum provides personality-driven feedback throughout the process:

- **Alert Found:** "I noticed something in Chapter 5. Marcus's eye color seems to have changed since Chapter 1. Let me show you the evidence."
- **No Issues:** "I've reviewed the new text against your canon. Everything checks out — no inconsistencies found."
- **Multiple Alerts:** "I found 3 items that need your attention: 2 contradictions and 1 timeline question."

---

## 11. Testing Scenarios

1. **Clean Check:** Verify that a document with no conflicts returns a success message.
2. **Simple Contradiction:** Test detection of a character attribute change (e.g., eye color).
3. **Timeline Conflict:** Test detection of an event occurring before its prerequisites.
4. **Resolution Logic:** Ensure resolving an alert correctly updates its status and project stats.
5. **Dismissal Logic:** Verify that dismissed alerts are hidden from active views but retrievable.
6. **Auto-Check Trigger:** Ensure that saving a document triggers the extraction and check pipeline correctly.
