---
summary: Interactive tutorial system with guided tour and demo project.
read_when: [tutorial, guided tour, demo project, onboarding tour, react-joyride]
---

# Phase 6: Interactive Tutorial - Realm Sync

## Overview

Phase 6 builds on the onboarding modal from Phase 5 by adding an interactive guided tour. After completing the initial onboarding, users can optionally start a hands-on tutorial with a pre-seeded demo project that walks them through all major features.

**Goal:** Provide a hands-on tutorial experience with a demo project and guided UI tour. **Duration:** 1-2 weeks **Dependencies:** Phase 5 complete (onboarding modal working)

---

## Implementation Progress

| Sub-Phase              | Status  | Notes                                  |
| ---------------------- | ------- | -------------------------------------- |
| Demo Project Seeding   | Pending | Seed fantasy world with entities/facts |
| Tour Library Setup     | Pending | react-joyride or custom tooltips       |
| Tour Step Definitions  | Pending | Define steps for each feature          |
| Tour Trigger           | Pending | Offer tour after onboarding            |
| Tour State Persistence | Pending | Track completed steps in user record   |

---

## 1. Objectives

- Create a demo project with rich sample data (entities, facts, documents).
- Build an interactive tour system that highlights UI elements with tooltips.
- Guide users through: project overview, document viewing, canon browsing, and continuity alerts.
- Allow users to skip or restart the tour at any time.
- Track tour completion to avoid showing it repeatedly.

---

## 2. Demo Project

A pre-built "Vellum's Sample Archive" project that demonstrates all features with a fantasy world scenario.

### Seed Data Structure

```typescript
// convex/seed.ts - extend existing seedDemoData

const TUTORIAL_PROJECT = {
  name: 'The Verdant Realm',
  description: "A sample fantasy world to explore Realm Sync's features.",
  documents: [
    {
      title: 'Chapter 1: The Beginning',
      content: `In the northern reaches of the Verdant Realm, the city of Thornhaven 
stands as a beacon of civilization. Sir Aldric, the aging knight commander, 
watches over its walls with unwavering vigilance.`,
    },
    {
      title: 'Chapter 2: The Conflict',
      content: `The Dragon of Ashfall descends upon Thornhaven. Sir Aldric, now 
leading the defense, realizes the creature is not attacking but fleeing 
something far worse in the mountains.`,
    },
  ],
  entities: [
    {
      name: 'Sir Aldric',
      type: 'character',
      description: 'Knight commander of Thornhaven',
    },
    {
      name: 'Thornhaven',
      type: 'location',
      description: 'Northern city in the Verdant Realm',
    },
    {
      name: 'Dragon of Ashfall',
      type: 'character',
      description: 'Ancient dragon, not hostile',
    },
    {
      name: 'The Verdant Realm',
      type: 'location',
      description: 'The fantasy world setting',
    },
  ],
  facts: [
    {
      subject: 'Sir Aldric',
      predicate: 'commands',
      object: "Thornhaven's defenses",
    },
    {
      subject: 'Thornhaven',
      predicate: 'located in',
      object: 'northern Verdant Realm',
    },
    {
      subject: 'Dragon of Ashfall',
      predicate: 'flees from',
      object: 'something in the mountains',
    },
  ],
};
```

### Seeding Flow

1. User completes onboarding modal.
2. Modal offers: "Would you like a guided tour with a sample project?"
3. If accepted, call `seedTutorialProject` mutation.
4. Navigate to the demo project and start tour.

---

## 3. Tour System

### Library Options

| Option | Pros | Cons |
| --- | --- | --- |
| **react-joyride** | Feature-rich, widely used, good docs | Large bundle (~50KB) |
| **Custom Tooltips** | Lightweight, full control | More work to build |
| **Shepherd.js** | Robust, framework-agnostic | Slightly heavier setup |

**Recommendation:** Start with `react-joyride` for rapid development. Consider custom implementation if bundle size becomes critical.

### Tour Steps

```typescript
// src/components/TutorialTour.tsx

const TOUR_STEPS = [
  {
    target: '[data-tour="project-overview"]',
    title: 'Welcome to Your Project',
    content:
      'This is your project dashboard. Here you can see all your documents, entities, and alerts at a glance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="documents-list"]',
    title: 'Your Documents',
    content:
      'Documents are the source material for your world. Add chapters, notes, or any text you want Vellum to analyze.',
    placement: 'right',
  },
  {
    target: '[data-tour="entities-section"]',
    title: 'Canon Entities',
    content:
      'Entities are the characters, locations, items, and concepts in your world. Vellum extracts these automatically.',
    placement: 'left',
  },
  {
    target: '[data-tour="facts-section"]',
    title: 'Canon Facts',
    content:
      'Facts are what Vellum knows about your entities. Each fact is a piece of knowledge extracted from your documents.',
    placement: 'top',
  },
  {
    target: '[data-tour="alerts-section"]',
    title: 'Continuity Alerts',
    content:
      'When Vellum notices something inconsistent, it creates an alert. Review these to keep your canon clean.',
    placement: 'top',
  },
  {
    target: '[data-tour="vellum-mascot"]',
    title: 'Meet Vellum',
    content:
      "I'm Vellum, your archive assistant. I'll help you keep track of your world and catch any inconsistencies.",
    placement: 'left',
  },
];
```

### Data Attributes

Add `data-tour` attributes to key UI elements:

```tsx
// In project dashboard
<section data-tour="project-overview">...</section>
<div data-tour="documents-list">...</div>
<div data-tour="entities-section">...</div>
```

---

## 4. Tour State Management

### Schema Extension

```typescript
// convex/schema.ts - extend users table
users: defineTable({
  // ... existing fields
  tutorialState: v.optional(
    v.object({
      hasSeenTour: v.boolean(),
      completedSteps: v.array(v.string()),
      tourStartedAt: v.optional(v.number()),
      tourCompletedAt: v.optional(v.number()),
    })
  ),
});
```

### User Mutations

```typescript
// convex/users.ts

export const startTutorial = mutation({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await ctx.db.patch(userId, {
      tutorialState: {
        hasSeenTour: false,
        completedSteps: [],
        tourStartedAt: Date.now(),
      },
    });
  },
});

export const completeTutorialStep = mutation({
  args: { stepId: v.string() },
  handler: async (ctx, { stepId }) => {
    const user = await requireAuthUser(ctx);
    const currentSteps = user.tutorialState?.completedSteps ?? [];
    if (!currentSteps.includes(stepId)) {
      await ctx.db.patch(user._id, {
        tutorialState: {
          ...user.tutorialState,
          completedSteps: [...currentSteps, stepId],
        },
      });
    }
  },
});

export const completeTutorial = mutation({
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, {
      tutorialState: {
        ...user.tutorialState,
        hasSeenTour: true,
        tourCompletedAt: Date.now(),
      },
    });
  },
});
```

---

## 5. UI Components

### TutorialTour Component

```tsx
// src/components/TutorialTour.tsx
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function TutorialTour() {
  const user = useQuery(api.users.viewer);
  const completeTutorial = useMutation(api.users.completeTutorial);

  const showTour = user?.tutorialState && !user.tutorialState.hasSeenTour;

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      completeTutorial();
    }
  };

  if (!showTour) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'oklch(0.65 0.15 60)', // Amber accent
          zIndex: 10000,
        },
      }}
    />
  );
}
```

### Trigger from Onboarding

```tsx
// src/components/OnboardingModal.tsx - extend step 5

// After completing onboarding steps
<div className="flex gap-3">
  <Button
    onClick={() => {
      completeOnboarding();
      seedTutorialProject();
    }}
  >
    Start Tour with Demo Project
  </Button>
  <Button variant="ghost" onClick={completeOnboarding}>
    Skip Tour
  </Button>
</div>
```

---

## 6. Restart Tour

Allow users to restart the tour from settings or help menu.

```tsx
// In settings or help dropdown
<Button variant="ghost" onClick={() => startTutorial()}>
  <RefreshCcw className="mr-2 size-4" />
  Restart Tutorial
</Button>
```

---

## 7. Testing & QA

- **Tour Flow:** Verify all steps highlight correct elements.
- **Step Navigation:** Test next/back/skip functionality.
- **Completion:** Ensure tour doesn't repeat after completion.
- **Demo Data:** Verify seed data is consistent and demonstrates features.
- **Mobile:** Test tour tooltip positioning on smaller screens.
- **Accessibility:** Ensure tooltips are keyboard-navigable.

---

## 8. Project Sharing (DM/Player Collaboration)

Enable dungeon masters to share their world canon with players in a read-only or limited capacity.

### Use Cases

- **DM shares world lore** with players without revealing plot secrets
- **Players reference** character facts, location details, item descriptions
- **Collaborative worldbuilding** where players can suggest (but not directly edit) canon

### Permission Model

| Role       | Capabilities                                               |
| ---------- | ---------------------------------------------------------- |
| **Owner**  | Full access (create, edit, delete, share)                  |
| **Editor** | Add/edit documents, confirm entities (no delete, no share) |
| **Viewer** | Read-only access to confirmed canon (no pending items)     |

### Schema Extension

```typescript
// convex/schema.ts
projectShares: defineTable({
  projectId: v.id('projects'),
  sharedWithEmail: v.string(),
  role: v.union(v.literal('editor'), v.literal('viewer')),
  invitedBy: v.id('users'),
  acceptedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_project', ['projectId'])
  .index('by_email', ['sharedWithEmail']);
```

### Sharing UI

```typescript
// Project settings - Share tab
- Email invite input
- Role selector (Editor/Viewer)
- List of current shares with remove option
- Copy shareable link (generates invite token)
```

### Viewer Restrictions

- See only `status: 'confirmed'` entities and facts
- No access to pending extractions or alerts
- Cannot see document raw content (only entity/fact references)
- Read-only timeline and connections views

---

## 9. Future Enhancements

- **Contextual Tips:** Show feature-specific tips when users access features for the first time.
- **Video Snippets:** Add short video clips to tour steps.
- **Achievement System:** Reward users for completing tutorial milestones.
- **A/B Testing:** Track tour completion rates and optimize step content.
- **Public Sharing:** Generate public read-only links for world wikis.
- **Export for Players:** Generate player-facing PDF/markdown handouts.
