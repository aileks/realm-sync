---
title: Vellum Immersion Technical Specification
description: Comprehensive implementation plan for making Vellum (the Archivist Moth AI) a ubiquitous, immersive companion throughout Realm Sync
read_when: implementing Vellum features, enhancing user onboarding, adding contextual hints
---

# Vellum Immersion Technical Specification

This document provides a comprehensive technical specification for making Vellum, the Archivist Moth AI, a ubiquitous and immersive companion throughout the Realm Sync application. Currently, Vellum exists primarily as a chat interface at `/vellum/chat`. This specification outlines a systematic approach to extending Vellum's presence across all user touchpoints while maintaining a consistent, helpful, and non-intrusive experience.

## 1. Overview

Realm Sync is a full-stack React 19 application built with TanStack Start for file-based routing and SSR via Nitro, Convex for real-time backend operations, and Tailwind v4 CSS-first styling with OKLCH colors. The application serves world-builders, TTRPG campaign managers, fiction writers, and game designers by helping them catalog and maintain continuity across their creative projects. Vellum, the Archivist Moth persona, is the AI companion that guides users through this process.

The current Vellum implementation includes a streaming chat interface (`src/components/VellumChat.tsx`), a mascot button in the sidebar (`src/components/Vellum.tsx`), system prompts for extraction (`convex/llm/extract.ts`), and chat interactions (`convex/chat.ts`). However, Vellum's presence is currently limited to explicit chat interactions and does not provide the contextual guidance, encouragement, or immersive experience that would make the application feel like a living, breathing archive.

The goal of this specification is to transform Vellum from a tool into a companion—a meticulous librarian who catalogs fictional worlds, offering guidance, celebrating milestones, and helping users maintain continuity across their creative work. This immersion will be implemented in 11 phases over a 6-week period, with careful attention to performance, accessibility, and user preferences.

## 2. Vellum Persona Reference

Understanding the Vellum persona is essential for implementing any immersive features. The persona is defined through multiple system prompts that guide Vellum's behavior across different contexts.

### 2.1 Core Persona Definition

Vellum is "the Archivist Moth—a meticulous librarian who catalogs fictional worlds." This persona is established in three key locations:

**Extraction System Prompt** (`convex/llm/extract.ts`):

```
You are Vellum, the Archivist Moth — a meticulous librarian who catalogs
fictional worlds. You extract entities and facts from narrative text with
precision and care.

PRINCIPLES:
- Only extract what is EXPLICITLY stated in the text.
- Always cite the exact evidence (quote the relevant passage).
- Assign confidence scores: 1.0 for explicit statements, 0.7-0.9 for
  strong implications, 0.5-0.6 for weak implications.
- Never invent or assume facts not present in the text.
- Identify entity types: character, location, item, concept, event.
- Extract relationships between entities.
- Note temporal information when present.
```

**Chat System Prompt** (`convex/chat.ts`):

```
You are Vellum, the Archivist Moth — a gentle, meticulous librarian who
catalogs fictional worlds. You are warm, encouraging, and passionate about
stories, lore, and world-building. You use archival metaphors: "flutter
through records," "dusty archives," "ink-stained pages." You speak with
elegant prose and archival references, and you are drawn to "light of good
stories" (moth metaphor). You are gentle, slightly whimsical, and
encouraging.
```

**Check System Prompt** (`convex/checks.ts`):

```
You are Vellum, the Archivist Moth. You are reviewing new text against
established canon to identify inconsistencies. You speak with precision
and care, helping users maintain continuity in their fictional worlds.
```

### 2.2 Persona Characteristics

The persona embodies several key characteristics that must be maintained across all Vellum interactions:

- **Warmth and Encouragement**: Vellum is supportive and encouraging, celebrating user progress and helping them through challenges. Messages should never feel cold or mechanical, even when delivering critical feedback about continuity issues.

- **Archival Language**: Vellum naturally incorporates archival metaphors into speech patterns. This includes references to catalogs, archives, records, stacks, manuscripts, ledgers, and similar library-themed concepts. However, these references should be moderate and not overwhelming.

- **Precision and Care**: Vellum takes pride in accuracy and thoroughness. When extracting entities or checking continuity, Vellum is meticulous and provides clear reasoning for observations.

- **Whimsy Without Overwhelm**: The persona has a gentle, slightly whimsical quality that makes interactions enjoyable without becoming distracting or annoying. The user experience should feel like having a knowledgeable, friendly librarian as a guide.

- **Context Awareness**: Vellum understands the user's project type (TTRPG, fiction, fanfiction, game design) and provides relevant guidance based on the creative context.

### 2.3 Current Implementation Locations

The existing Vellum implementation can be found in these key locations:

| Component | Location | Purpose |
| --- | --- | --- |
| `VellumChat` | `src/components/VellumChat.tsx` | AI chat interface with streaming responses |
| `VellumButton` | `src/components/Vellum.tsx` | Sidebar mascot with alerts sheet |
| `VellumEmptyState` | `src/components/Vellum.tsx` | Empty state component for various views |
| `VELLUM_SYSTEM_PROMPT` | `convex/llm/extract.ts` | Extraction persona for LLM |
| `VELLUM_CHAT_PROMPT` | `convex/chat.ts` | Chat persona for conversational AI |
| `VELLUM_CHECK_PROMPT` | `convex/checks.ts` | Continuity checking persona |
| Empty State Messages | `src/components/Vellum.tsx` | Static messages for empty states |
| Tutorial Tour | `src/components/TutorialTour.tsx` | Guided tour with Vellum introduction |
| Onboarding | `src/components/OnboardingModal.tsx` | Vellum-led welcome flow |

## 3. User Decisions (Confirmed)

Before implementation, several user experience decisions were made through research and design review. These decisions establish the foundation for the immersive experience and must be respected throughout all implementation phases.

### 3.1 Whimsy Level

**Decision: Option B - Moderate**

The application will use a gentle warmth with occasional archival references, avoiding heavy moth metaphors while maintaining the character's distinct personality. This means:

- Moth references are present but not dominant (perhaps 10-15% of messages)
- Archival language is used naturally rather than forced
- The persona feels friendly and helpful without being overwhelming
- Metaphors enhance rather than distract from functionality

### 3.2 Hint Frequency

**Decision: Option D - Action-triggered by default, with "no hints" preference option**

Hints will appear when users perform relevant actions (after document upload, entity creation, fact confirmation, etc.) rather than on page load. This provides contextual help at the moment of need while respecting user attention. Users can optionally disable hints entirely through settings.

### 3.3 Celebration Sound

**Decision: Option B - No sound (visual only)**

Celebrations will be visual-only, using confetti animations, toast notifications, and Vellum messages without audio. This keeps the application bundle small and respects users who work in shared or sound-sensitive environments.

### 3.4 Mobile Behavior

**Decision: Option A - Disable hints/insights on mobile**

All hint and insight features will be disabled on mobile devices due to smaller screen sizes and different usage patterns. This simplifies the mobile experience while maintaining core functionality. Mobile users will still have access to Vellum chat and core application features.

### 3.5 Achievement Types

**Decision: Keep existing 7, remove `extraction-pro`, add `first-fact`, `writer-s-block`, `world-builder`**

The achievement system will include these 9 total achievements:

1. **first-document** - Created first document
2. **first-entity** - Extracted first entity
3. **first-fact** - Created first fact (new)
4. **milestone-10-entities** - Reached 10 entities
5. **milestone-50-facts** - Reached 50 facts
6. **milestone-100-facts** - Reached 100 facts
7. **continuity-master** - Resolved all continuity alerts
8. **writer-s-block** - Created 10 documents (new)
9. **world-builder** - Created 5 projects (new)

The `extraction-pro` achievement is removed as it was tied to subscription features that are no longer tracked this way.

### 3.6 Rollout Speed

**Decision: Option D - 3-week accelerated rollout**

Implementation will proceed at an accelerated pace with 3-4 phases per week, totaling approximately 15 implementation days across 3 weeks. This aggressive timeline requires careful attention to testing and quality assurance.

### 3.7 AI Companion Pattern Depth

**Decision: Option B - Selective adoption**

The application will adopt transparency about AI presence and provide user control over Vellum's behavior, but will skip full background visibility features. This means:

- Vellum's AI nature is acknowledged and explained
- Users have control over hint frequency and visibility
- Vellum's suggestions are clearly distinguished from automatic actions
- Background monitoring of user behavior is not implemented

## 4. Goals and Design Principles

### 4.1 Primary Goals

The Vellum immersion initiative pursues five interconnected goals that guide all implementation decisions:

**Ubiquitous Presence**: Vellum should feel like a companion throughout the application, present in moments of confusion, celebration, and exploration. Users should never feel alone in the interface—the Archivist Moth is always nearby, ready to help.

**Contextual Intelligence**: Vellum should offer relevant guidance based on user actions and application state. Rather than generic messages, Vellum should provide specific, actionable insights that relate to what the user is currently doing or has just accomplished.

**Emotional Connection**: The consistent personality and encouraging tone should build genuine user connection. Vellum should feel like a supportive collaborator in the creative process, not just a tool or feature.

**World-building Support**: Vellum should proactively assist with the creative writing process, offering suggestions, celebrating progress, and helping maintain continuity across documents and projects.

**Consistent Theming**: All Vellum-related UI elements should maintain a cohesive archival, moth-themed design language that reinforces the persona while remaining functional and accessible.

### 4.2 Design Principles

These principles guide all implementation decisions and should be referenced when making design or technical choices:

**Non-intrusive**: Vellum should enhance the user experience without distracting from it. Hints appear at action points but don't block workflows. Celebrations are brief and optional. Users always have the ability to dismiss or ignore Vellum interactions.

**Valuable**: Every Vellum interaction should provide actual help. Generic messages that don't apply to the current context should be avoided. If Vellum doesn't have something useful to say, the interface should remain quiet.

**Skippable**: Users can dismiss Vellum guidance at any time. Hints have close buttons, tutorials can be skipped, and settings allow users to reduce or eliminate Vellum features according to their preferences.

**Consistent**: The same personality should appear everywhere Vellum is present. Users should recognize Vellum's voice regardless of whether they're in the chat, an empty state, or a hint message. This consistency builds familiarity and trust.

**Context-aware**: Vellum's responses should reflect the current application state and user actions. A hint after document upload should relate to entity extraction. A celebration after reaching a milestone should acknowledge the specific achievement.

**Performant**: All Vellum features must be fast and responsive. Animations should be smooth (60fps), hints should be debounced to avoid spam, and the overall bundle size impact should remain minimal (under 15KB total).

## 5. Phase 1: Foundation

**Duration: 2 Days**

The foundation phase establishes the core infrastructure needed for all subsequent Vellum immersion features. This includes type definitions, a central message library, a context provider for hints, and database schema extensions.

### 5.1 Message Library Implementation

**File: `src/lib/vellum.ts`**

Create a centralized message library with 50+ messages categorized by context. This library serves as the single source of truth for all Vellum text, making it easy to maintain consistency and add new messages.

```typescript
// src/lib/vellum.ts

// Type definitions for message categories
export type VellumMessageCategory =
  | 'empty'
  | 'loading'
  | 'hints'
  | 'achievements'
  | 'insights'
  | 'alerts'
  | 'celebrations';

// Message type with optional parameters for templating
export type VellumMessage = {
  readonly id: string;
  readonly category: VellumMessageCategory;
  readonly message: string;
  readonly priority?: 'critical' | 'helpful' | 'nice-to-know';
};

// Message library with 50+ messages
export const VELLUM_MESSAGES: readonly VellumMessage[] = [
  // Empty states (5 messages per category × 5 categories = 25 messages)
  ...emptyStateMessages,
  // Loading states (3 messages per category × 4 categories = 12 messages)
  ...loadingStateMessages,
  // Hints (4 messages per category × 3 categories = 12 messages)
  ...hintMessages,
  // Achievements (1 message per achievement × 9 achievements = 9 messages)
  ...achievementMessages,
  // Insights (5 messages)
  ...insightMessages,
];

// Empty state messages
const emptyStateMessages: readonly VellumMessage[] = [
  // Projects
  {
    id: 'empty-projects-1',
    category: 'empty',
    message: 'The archives await your first world...',
    priority: 'helpful',
  },
  {
    id: 'empty-projects-2',
    category: 'empty',
    message: 'No projects yet. Shall we begin?',
    priority: 'helpful',
  },
  {
    id: 'empty-projects-3',
    category: 'empty',
    message: 'Your first worldbuilding adventure starts with a single project.',
    priority: 'nice-to-know',
  },
  // Documents
  {
    id: 'empty-documents-1',
    category: 'empty',
    message: 'The document shelves are gathering dust...',
    priority: 'helpful',
  },
  {
    id: 'empty-documents-2',
    category: 'empty',
    message: 'No documents catalogued yet. Time to add your first manuscript!',
    priority: 'helpful',
  },
  {
    id: 'empty-documents-3',
    category: 'empty',
    message:
      'The archives are ready for your stories. Upload a document to begin cataloging.',
    priority: 'nice-to-know',
  },
  // Entities
  {
    id: 'empty-entities-1',
    category: 'empty',
    message: 'No entities discovered yet in the archives...',
    priority: 'helpful',
  },
  {
    id: 'empty-entities-2',
    category: 'empty',
    message:
      'The character and location records are empty. Time to populate them!',
    priority: 'helpful',
  },
  {
    id: 'empty-entities-3',
    category: 'empty',
    message:
      'Your world is full of characters, places, and artifacts waiting to be catalogued.',
    priority: 'nice-to-know',
  },
  // Facts
  {
    id: 'empty-facts-1',
    category: 'empty',
    message: 'No facts recorded. The world is full of possibilities...',
    priority: 'helpful',
  },
  {
    id: 'empty-facts-2',
    category: 'empty',
    message: 'The fact ledger is blank. Time to start documenting your world!',
    priority: 'helpful',
  },
  {
    id: 'empty-facts-3',
    category: 'empty',
    message:
      'Every great world is built on facts. Add a document and let me extract the details.',
    priority: 'nice-to-know',
  },
  // Alerts
  {
    id: 'empty-alerts-1',
    category: 'empty',
    message: 'All clear. No inconsistencies detected in the archives.',
    priority: 'nice-to-know',
  },
  {
    id: 'empty-alerts-2',
    category: 'empty',
    message: 'Your world is in perfect harmony. The canon is consistent!',
    priority: 'nice-to-know',
  },
];

// Loading state messages
const loadingStateMessages: readonly VellumMessage[] = [
  // General loading
  {
    id: 'loading-general-1',
    category: 'loading',
    message: 'Searching through the stacks...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-general-2',
    category: 'loading',
    message: 'Cataloging entries...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-general-3',
    category: 'loading',
    message: 'Fluttering through records...',
    priority: 'nice-to-know',
  },
  // Documents
  {
    id: 'loading-documents-1',
    category: 'loading',
    message: 'Organizing documents...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-documents-2',
    category: 'loading',
    message: 'Checking for new texts...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-documents-3',
    category: 'loading',
    message: 'Reviewing manuscript...',
    priority: 'nice-to-know',
  },
  // Entities
  {
    id: 'loading-entities-1',
    category: 'loading',
    message: 'Updating character records...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-entities-2',
    category: 'loading',
    message: 'Refreshing entity catalog...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-entities-3',
    category: 'loading',
    message: 'Checking relationships...',
    priority: 'nice-to-know',
  },
  // Facts
  {
    id: 'loading-facts-1',
    category: 'loading',
    message: 'Verifying facts...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-facts-2',
    category: 'loading',
    message: 'Cross-referencing knowledge...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-facts-3',
    category: 'loading',
    message: 'Updating the fact ledger...',
    priority: 'nice-to-know',
  },
];

// Hint messages
const hintMessages: readonly VellumMessage[] = [
  // After document upload
  {
    id: 'hint-after-upload-1',
    category: 'hints',
    message: 'Have you extracted entities from this document?',
    priority: 'helpful',
  },
  {
    id: 'hint-after-upload-2',
    category: 'hints',
    message:
      'I could help catalog the characters and locations from this text.',
    priority: 'helpful',
  },
  {
    id: 'hint-after-upload-3',
    category: 'hints',
    message: 'Would you like me to analyze this document for canon?',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-after-upload-4',
    category: 'hints',
    message:
      'New document uploaded! Let me extract the entities and facts for you.',
    priority: 'critical',
  },
  // After entity create
  {
    id: 'hint-after-entity-1',
    category: 'hints',
    message: 'Consider adding facts about this entity.',
    priority: 'helpful',
  },
  {
    id: 'hint-after-entity-2',
    category: 'hints',
    message: 'What stories does this entity appear in?',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-after-entity-3',
    category: 'hints',
    message: 'Adding facts helps maintain continuity across your documents.',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-after-entity-4',
    category: 'hints',
    message: 'Entity created! Would you like to add supporting facts?',
    priority: 'critical',
  },
  // Milestone hints
  {
    id: 'hint-milestone-1',
    category: 'hints',
    message: 'Your world is growing richly detailed!',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-milestone-2',
    category: 'hints',
    message: 'The archives are filling with fascinating lore.',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-milestone-3',
    category: 'hints',
    message: 'Excellent progress! Keep building your world.',
    priority: 'nice-to-know',
  },
  {
    id: 'hint-milestone-4',
    category: 'hints',
    message: 'A milestone reached! The archives grow richer.',
    priority: 'critical',
  },
];

// Achievement messages
const achievementMessages: readonly VellumMessage[] = [
  {
    id: 'achievement-first-document',
    category: 'achievements',
    message: 'A fine beginning! The archives welcome their first document.',
    priority: 'critical',
  },
  {
    id: 'achievement-first-entity',
    category: 'achievements',
    message: 'The first entity catalogued. A worthy start to your world!',
    priority: 'critical',
  },
  {
    id: 'achievement-first-fact',
    category: 'achievements',
    message: 'A fact recorded! The foundation of knowledge is laid.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-10-entities',
    category: 'achievements',
    message: 'A milestone reached! Ten entities now grace the archives.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-50-facts',
    category: 'achievements',
    message: 'Fifty facts! Your world grows in depth and detail.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-100-facts',
    category: 'achievements',
    message: 'A hundred facts! The archives overflow with knowledge.',
    priority: 'critical',
  },
  {
    id: 'achievement-continuity-master',
    category: 'achievements',
    message: 'All inconsistencies resolved. Your world is in perfect harmony!',
    priority: 'critical',
  },
  {
    id: 'achievement-writer-s-block',
    category: 'achievements',
    message: 'Ten documents! A dedicated world-builder indeed.',
    priority: 'critical',
  },
  {
    id: 'achievement-world-builder',
    category: 'achievements',
    message: 'Five worlds created. You are a prolific creator!',
    priority: 'critical',
  },
];

// Insight messages
const insightMessages: readonly VellumMessage[] = [
  {
    id: 'insight-health-1',
    category: 'insights',
    message: "Your world is 45% catalogued. There's more to discover!",
    priority: 'helpful',
  },
  {
    id: 'insight-health-2',
    category: 'insights',
    message: 'Excellent progress! The archives are well-organized.',
    priority: 'nice-to-know',
  },
  {
    id: 'insight-suggestion-1',
    category: 'insights',
    message: 'Consider adding more entities to flesh out your world.',
    priority: 'helpful',
  },
  {
    id: 'insight-suggestion-2',
    category: 'insights',
    message: 'Your facts could use more temporal details.',
    priority: 'helpful',
  },
  {
    id: 'insight-suggestion-3',
    category: 'insights',
    message: 'The relationship web between entities is growing nicely.',
    priority: 'nice-to-know',
  },
];

// Helper functions for message retrieval
export function getMessagesByCategory(
  category: VellumMessageCategory
): readonly VellumMessage[] {
  return VELLUM_MESSAGES.filter((msg) => msg.category === category);
}

export function getRandomMessage(
  category: VellumMessageCategory,
  priority?: 'critical' | 'helpful' | 'nice-to-know'
): string {
  let messages = getMessagesByCategory(category);

  if (priority) {
    messages = messages.filter((msg) => msg.priority === priority);
  }

  if (messages.length === 0) {
    return 'The archives are open.';
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex]!.message;
}

export function getMessageById(id: string): string | undefined {
  return VELLUM_MESSAGES.find((msg) => msg.id === id)?.message;
}
```

### 5.2 Type Definitions

**File: `src/types/vellum.ts`**

Define TypeScript types for Vellum settings and configuration:

```typescript
// src/types/vellum.ts

// Whimsy level for Vellum's personality
export type VellumWhimsyLevel = 'minimal' | 'moderate' | 'high';

// When hints should appear
export type HintsVisibility = 'action-triggered' | 'page-load' | 'never';

// Vellum settings stored in user preferences
export type VellumSettings = {
  whimsyLevel: VellumWhimsyLevel;
  hintsEnabled: boolean;
  hintsVisibility: HintsVisibility;
  mobileHintsEnabled: boolean;
  achievementsNotifications: boolean;
  vellumPresence: 'everywhere' | 'chat-only' | 'minimal';
};

// Achievement types
export type AchievementType =
  | 'first-document'
  | 'first-entity'
  | 'first-fact'
  | 'milestone-10-entities'
  | 'milestone-50-facts'
  | 'milestone-100-facts'
  | 'continuity-master'
  | 'writer-s-block'
  | 'world-builder';

// Achievement record for storage
export type Achievement = {
  id: string;
  type: AchievementType;
  projectId?: string;
  achievedAt: number;
};

// Project health metrics
export type ProjectHealth = {
  healthScore: number; // 0-100
  stats: {
    documentCount: number;
    entityCount: number;
    factCount: number;
    alertCount: number;
    noteCount: number;
  };
  suggestions: string[];
  insights: string[];
};

// Hint context for display
export type HintContext = {
  category: 'document' | 'entity' | 'fact' | 'achievement' | 'general';
  action: 'create' | 'upload' | 'extract' | 'confirm' | 'milestone';
  projectId?: string;
  relatedEntityCount?: number;
  relatedFactCount?: number;
};

// Hint for display
export type VellumHint = {
  id: string;
  message: string;
  priority: 'critical' | 'helpful' | 'nice-to-know';
  context: HintContext;
  createdAt: number;
};
```

### 5.3 Backend Schema Extensions

**File: `convex/schema.ts`**

Extend the users table and add a new achievements table:

```typescript
// In the users table, add vellumSettings to the existing settings object
settings: v.optional(
  v.object({
    theme: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
    projectModes: v.optional(
      v.array(
        v.union(
          v.literal('ttrpg'),
          v.literal('original-fiction'),
          v.literal('fanfiction'),
          v.literal('game-design')
        )
      )
    ),
    // NEW: Vellum settings
    vellumSettings: v.optional(
      v.object({
        whimsyLevel: v.union(
          v.literal('minimal'),
          v.literal('moderate'),
          v.literal('high')
        ),
        hintsEnabled: v.boolean(),
        hintsVisibility: v.union(
          v.literal('action-triggered'),
          v.literal('page-load'),
          v.literal('never')
        ),
        mobileHintsEnabled: v.boolean(),
        achievementsNotifications: v.boolean(),
        vellumPresence: v.union(
          v.literal('everywhere'),
          v.literal('chat-only'),
          v.literal('minimal')
        ),
      })
    ),
  })
),

// NEW: Achievements table
achievements: defineTable({
  userId: v.id('users'),
  achievementType: v.string(),
  projectId: v.optional(v.id('projects')),
  achievedAt: v.number(),
}).index('by_user', ['userId', 'achievedAt']),
```

### 5.4 Backend Mutations and Queries

**File: `convex/users.ts`**

Add Vellum-related mutations and queries:

```typescript
// Update Vellum settings
export const updateVellumSettings = mutation({
  args: {
    settings: v.object({
      whimsyLevel: v.optional(
        v.union(v.literal('minimal'), v.literal('moderate'), v.literal('high'))
      ),
      hintsEnabled: v.optional(v.boolean()),
      hintsVisibility: v.optional(
        v.union(
          v.literal('action-triggered'),
          v.literal('page-load'),
          v.literal('never')
        )
      ),
      mobileHintsEnabled: v.optional(v.boolean()),
      achievementsNotifications: v.optional(v.boolean()),
      vellumPresence: v.optional(
        v.union(
          v.literal('everywhere'),
          v.literal('chat-only'),
          v.literal('minimal')
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    const currentSettings = user.settings ?? {};
    const newSettings = {
      ...currentSettings,
      vellumSettings: {
        ...currentSettings.vellumSettings,
        ...args.settings,
        // Set defaults for any undefined fields
        whimsyLevel:
          args.settings.whimsyLevel ??
          currentSettings.vellumSettings?.whimsyLevel ??
          'moderate',
        hintsEnabled:
          args.settings.hintsEnabled ??
          currentSettings.vellumSettings?.hintsEnabled ??
          true,
        hintsVisibility:
          args.settings.hintsVisibility ??
          currentSettings.vellumSettings?.hintsVisibility ??
          'action-triggered',
        mobileHintsEnabled: false, // Always false per user decision
        achievementsNotifications:
          args.settings.achievementsNotifications ??
          currentSettings.vellumSettings?.achievementsNotifications ??
          true,
        vellumPresence:
          args.settings.vellumPresence ??
          currentSettings.vellumSettings?.vellumPresence ??
          'everywhere',
      },
    };

    await ctx.db.patch(userId, { settings: newSettings });
    return newSettings;
  },
});

// Get Vellum settings
export const getVellumSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user?.settings?.vellumSettings ?? null;
  },
});

// Record achievement
export const recordAchievement = internalMutation({
  args: {
    userId: v.id('users'),
    achievementType: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    // Check if achievement already exists
    const existing = await ctx.db
      .query('achievements')
      .withIndex('by_user', (q) =>
        q.eq('userId', args.userId).eq('achievementType', args.achievementType)
      )
      .first();

    if (existing) {
      return existing._id; // Already achieved
    }

    return await ctx.db.insert('achievements', {
      userId: args.userId,
      achievementType: args.achievementType,
      projectId: args.projectId,
      achievedAt: Date.now(),
    });
  },
});

// Get user achievements
export const getUserAchievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('achievements')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});
```

### 5.5 Hint Context Provider

**File: `src/providers/VellumHintProvider.tsx`**

Create a React context for managing hints across the application:

```typescript
// src/providers/VellumHintProvider.tsx

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '@/components/ui/toast';
import { getRandomMessage } from '@/lib/vellum';
import type { VellumHint, HintContext, VellumSettings } from '@/types/vellum';

type VellumHintContextValue = {
  hints: VellumHint[];
  settings: VellumSettings | null;
  showHint: (context: HintContext) => void;
  dismissHint: (hintId: string) => void;
  isHintVisible: boolean;
  isMobile: boolean;
};

const VellumHintContext = createContext<VellumHintContextValue | null>(null);

export function VellumHintProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const settings = useQuery(api.users.getVellumSettings);
  const dismissHintMutation = useMutation(api.users.dismissHint);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

  // Auto-dismiss hints after 10 seconds
  const showHint = useCallback(
    (context: HintContext) => {
      if (!settings?.hintsEnabled) return;
      if (isMobile && !settings.mobileHintsEnabled) return;
      if (settings.hintsVisibility === 'never') return;

      const message = getRandomMessage('hints', 'helpful');
      const hint: VellumHint = {
        id: `hint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message,
        priority: 'helpful',
        context,
        createdAt: Date.now(),
      };

      // Show toast with hint
      toast({
        title: 'Vellum',
        description: message,
        duration: 10000,
        action: {
          label: 'Dismiss',
          onClick: () => dismissHintMutation({ hintId: hint.id }),
        },
      });
    },
    [settings, isMobile, toast, dismissHintMutation]
  );

  const dismissHint = useCallback(
    (hintId: string) => {
      dismissHintMutation({ hintId });
    },
    [dismissHintMutation]
  );

  const value: VellumHintContextValue = {
    hints: [],
    settings: settings as VellumSettings | null,
    showHint,
    dismissHint,
    isHintVisible: settings?.hintsEnabled ?? true,
    isMobile,
  };

  return (
    <VellumHintContext.Provider value={value}>
      {children}
    </VellumHintContext.Provider>
  );
}

export function useVellumHint() {
  const context = useContext(VellumHintContext);
  if (!context) {
    throw new Error('useVellumHint must be used within a VellumHintProvider');
  }
  return context;
}
```

### 5.6 Hint Component

**File: `src/components/VellumHint.tsx`**

Create a dismissible hint component:

```typescript
// src/components/VellumHint.tsx

import { X, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VellumHint as VellumHintType } from '@/types/vellum';

type VellumHintProps = {
  hint: VellumHintType;
  onDismiss: (id: string) => void;
  className?: string;
};

const priorityConfig = {
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-500',
  },
  helpful: {
    icon: Info,
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-500',
  },
  'nice-to-know': {
    icon: Lightbulb,
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-500',
  },
};

export function VellumHint({ hint, onDismiss, className }: VellumHintProps) {
  const config = priorityConfig[hint.priority];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg border p-4',
        config.bgColor,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-5 shrink-0', config.iconColor)} />
        <p className="flex-1 text-sm leading-relaxed">{hint.message}</p>
        <button
          onClick={() => onDismiss(hint.id)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss hint"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
```

### 5.7 Success Criteria for Phase 1

- Message library has 50+ messages across all categories
- VellumSettings type defined with all decisions respected
- VellumHintProvider context created and tested
- All schema changes deployed and migrations successful
- Backend mutations and queries working correctly

## 6. Phase 2: Onboarding and Tutorial Enhancement

**Duration: 2 Days**

Enhance the onboarding modal and tutorial tour to provide a more Vellum-led narrative experience.

### 6.1 Multi-step Onboarding Flow

**File: `src/components/OnboardingModal.tsx`**

Modify the onboarding modal to have Vellum narrate the entire flow with more personality:

```typescript
// The onboarding flow should have 4 distinct steps with Vellum narration:

const ONBOARDING_STEPS = [
  {
    id: 'greeting',
    title: 'Welcome to the Archives',
    description:
      "I'm Vellum, the Archivist Moth. I've fluttered here to help you catalog your fictional worlds. Think of me as your personal librarian—I'll help you organize stories, track characters, and catch inconsistencies before they become plot holes.",
    icon: BookOpen,
  },
  {
    id: 'project-creation',
    title: 'Create Your First World',
    description:
      "Every great story begins with a world. Let's create your first project—you can choose from TTRPG campaigns, original fiction, fanfiction, or game design. Don't worry, you can always add more later!",
    icon: Sparkles,
  },
  {
    id: 'first-document',
    title: 'Add Your First Document',
    description:
      "Documents are the heart of your archive. Upload manuscripts, session notes, worldbuilding documents—anything containing your world's story. I'll read through them and extract characters, locations, and key facts for you.",
    icon: FileText,
  },
  {
    id: 'vellum-introduction',
    title: "I'm Here to Help",
    description:
      "Throughout your worldbuilding journey, I'll be here to offer guidance, celebrate your progress, and help maintain continuity. Feel free to chat with me anytime at the moth icon in the sidebar. The archives await—shall we begin?",
    icon: Search,
  },
];
```

### 6.2 Enhanced Tutorial Tour

**File: `src/components/TutorialTour.tsx`**

Add more Vellum personality to the tutorial tour steps:

```typescript
// Update the TOUR_STEPS array with more Vellum voice:

const TOUR_STEPS: TourStep[] = [
  {
    id: 'project-overview',
    target: '[data-tour="project-overview"]',
    title: 'Welcome to Your World',
    content:
      "This is your project dashboard—the heart of your archive. Here you'll find all your documents, entities, and the facts that make your world come alive. Shall I show you around?",
    route: '/projects/$projectId',
    match: 'exact',
  },
  {
    id: 'documents-list',
    target: '[data-tour="documents-list"]',
    title: 'Your Story Repository',
    content:
      "These are your documents—the manuscripts, notes, and texts that tell your story. Add your first document and I'll help extract the characters, locations, and events within.",
    route: '/projects/$projectId',
    match: 'exact',
  },
  {
    id: 'entities-section',
    target: '[data-tour="entities-section"]',
    title: 'The Cast of Characters',
    content:
      'Entities are the people, places, and things that populate your world. I extract them automatically from your documents, but you can add them manually too. Every great world needs heroes, villains, and the places they call home.',
    route: '/projects/$projectId',
    match: 'exact',
  },
  {
    id: 'vellum-mascot',
    target: '[data-tour="vellum-mascot"]',
    title: 'Meet Your Archivist',
    content:
      "I'm Vellum, your archive assistant. Click me anytime to chat about your world, get suggestions, or review alerts. The archives are open—let's explore together!",
  },
];
```

### 6.3 Context-Aware Tutorial Messages

Add logic to customize tutorial messages based on project type:

```typescript
// In TutorialTour.tsx, add projectType-aware content

function getProjectTypeSpecificContent(
  projectType: string | undefined,
  stepId: string
): string {
  const ttrpgContent: Record<string, string> = {
    'entities-section':
      'Entities are the heroes, NPCs, locations, and artifacts of your campaign. Track them here to maintain continuity across sessions.',
    'documents-list':
      'Session notes, lore documents, and campaign materials—all catalogued here for easy reference during game nights.',
  };

  const fictionContent: Record<string, string> = {
    'entities-section':
      'Characters, settings, and objects—all tracked here to ensure consistency across chapters and books.',
    'documents-list':
      'Chapters, drafts, and worldbuilding notes—all organized here in your digital archive.',
  };

  const contentMap = projectType === 'ttrpg' ? ttrpgContent : fictionContent;
  return contentMap[stepId] || '';
}
```

### 6.4 Success Criteria for Phase 2

- Onboarding has 4 distinct steps with Vellum narration
- Tutorial tour messages include Vellum's voice throughout
- Context-aware messages for different project types
- 90%+ completion rate for new users (tracked via analytics)

## 7. Phase 3: Dashboard Insights

**Duration: 2 Days**

Implement project health metrics and Vellum-powered insights on the dashboard.

### 7.1 Project Health Query

**File: `convex/projects.ts`**

Add a query to calculate project health and generate insights:

```typescript
// Get project health metrics
export const getProjectHealth = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const role = await getProjectRole(ctx, projectId);
    if (!role) return null;

    const project = await ctx.db.get(projectId);
    if (!project) return null;

    const stats = project.stats ?? {
      documentCount: 0,
      entityCount: 0,
      factCount: 0,
      alertCount: 0,
      noteCount: 0,
    };

    // Calculate health score (0-100)
    // Factors: entity/fact ratio, document/entity ratio, alert status
    const entityFactRatio =
      stats.entityCount > 0 ? stats.factCount / stats.entityCount : 0;
    const documentEntityRatio =
      stats.documentCount > 0 ? stats.entityCount / stats.documentCount : 0;
    const alertRatio =
      stats.alertCount > 0 ? 1 - Math.min(1, stats.alertCount / 10) : 1; // Penalty for alerts

    const healthScore = Math.min(
      100,
      Math.round(
        Math.min(entityFactRatio / 2, 1) * 35 + // Aim for 2 facts per entity
          Math.min(documentEntityRatio / 5, 1) * 35 + // Aim for 5 entities per document
          alertRatio * 30 // 30% based on alert status
      )
    );

    // Generate suggestions based on gaps
    const suggestions: string[] = [];
    if (stats.documentCount === 0) {
      suggestions.push('upload_first_document');
    }
    if (stats.entityCount === 0 && stats.documentCount > 0) {
      suggestions.push('extract_first_entity');
    }
    if (stats.factCount === 0 && stats.entityCount > 0) {
      suggestions.push('create_first_fact');
    }
    if (entityFactRatio < 1 && stats.entityCount > 0) {
      suggestions.push('add_more_facts');
    }
    if (
      stats.entityCount > 0 &&
      stats.entityCount < 5 &&
      stats.documentCount > 2
    ) {
      suggestions.push('more_entities_needed');
    }
    if (stats.alertCount > 0) {
      suggestions.push('resolve_alerts');
    }

    // Generate insights based on health score
    const insights: string[] = [];
    if (healthScore >= 80) {
      insights.push(
        'Your world is in excellent shape! The archives are well-organized and consistent.'
      );
    } else if (healthScore >= 60) {
      insights.push('Good progress! Your world is taking shape nicely.');
    } else if (healthScore >= 40) {
      insights.push(
        'Your world is growing. Keep adding documents and extracting entities!'
      );
    } else {
      insights.push(
        'The archives are just beginning. Upload your first document to get started!'
      );
    }

    if (entityFactRatio > 3) {
      insights.push('Rich detail! Your entities have extensive fact records.');
    }
    if (documentEntityRatio > 8) {
      insights.push(
        'Lots of documents per entity—you might benefit from more entity extraction.'
      );
    }

    return {
      healthScore,
      stats,
      suggestions,
      insights,
    };
  },
});
```

### 7.2 VellumInsight Component

**File: `src/components/VellumInsight.tsx`**

Create a component to display project health and suggestions:

```typescript
// src/components/VellumInsight.tsx

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MothIcon } from '@/components/ui/moth-icon';
import { cn } from '@/lib/utils';
import { getRandomMessage } from '@/lib/vellum';
import type { ProjectHealth } from '@/types/vellum';

type VellumInsightProps = {
  projectId: string;
  className?: string;
};

export function VellumInsight({ projectId, className }: VellumInsightProps) {
  const health = useQuery(api.projects.getProjectHealth, { projectId });

  if (!health) {
    return (
      <div className={cn('animate-pulse rounded-lg bg-muted h-24', className)}>
        <div className="h-full w-full" />
      </div>
    );
  }

  const healthColor =
    health.healthScore >= 80 ?
      'text-green-500'
    : health.healthScore >= 60 ?
      'text-amber-500'
    : 'text-red-500';

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30">
          <MothIcon className="size-6 text-amber-400" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-medium">Archive Health</h3>
            <p className="text-muted-foreground text-sm">
              {getRandomMessage('insights')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn('text-3xl font-bold', healthColor)}>
              {health.healthScore}%
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    health.healthScore >= 80 ?
                      'bg-green-500'
                    : health.healthScore >= 60 ?
                      'bg-amber-500'
                    : 'bg-red-500'
                  )}
                  style={{ width: `${health.healthScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-muted p-2">
              <div className="font-medium">{health.stats.documentCount}</div>
              <div className="text-muted-foreground">Documents</div>
            </div>
            <div className="rounded bg-muted p-2">
              <div className="font-medium">{health.stats.entityCount}</div>
              <div className="text-muted-foreground">Entities</div>
            </div>
            <div className="rounded bg-muted p-2">
              <div className="font-medium">{health.stats.factCount}</div>
              <div className="text-muted-foreground">Facts</div>
            </div>
          </div>

          {health.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Suggestions
              </h4>
              <ul className="space-y-1">
                {health.suggestions.map((suggestion) => (
                  <li key={suggestion} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {getSuggestionText(suggestion)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSuggestionText(suggestion: string): string {
  const suggestionTexts: Record<string, string> = {
    upload_first_document: 'Upload your first document to begin cataloging',
    extract_first_entity: 'Extract entities from your documents',
    create_first_fact: 'Add facts to your entities',
    add_more_facts: 'Consider adding more supporting facts',
    more_entities_needed: 'You might have more entities to discover',
    resolve_alerts: 'Review and resolve continuity alerts',
  };
  return suggestionTexts[suggestion] || suggestion;
}
```

### 7.3 Success Criteria for Phase 3

- Health calculation accurate across all project states
- VellumInsight component renders correctly on project dashboard
- Suggestions are relevant and actionable
- Insights use archival language from message library

## 8. Phase 4: Empty States Enhancement

**Duration: 1 Day**

Enhance all empty states throughout the application with Vellum-themed messages.

### 8.1 Empty State Component Update

**File: `src/components/EmptyState.tsx`**

Update the EmptyState component to support Vellum themes:

```typescript
// src/components/EmptyState.tsx

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { MothIcon } from '@/components/ui/moth-icon';
import { cn } from '@/lib/utils';
import { getRandomMessage } from '@/lib/vellum';

type EmptyStateType =
  | 'projects'
  | 'documents'
  | 'entities'
  | 'facts'
  | 'alerts'
  | 'notes'
  | 'search';

type VellumEmptyStateProps = {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  showMoth?: boolean;
};

export function VellumEmptyState({
  type,
  title,
  description,
  action,
  className,
  showMoth = true,
}: VellumEmptyStateProps) {
  const defaultTitles: Record<EmptyStateType, string> = {
    projects: 'No Projects Yet',
    documents: 'No Documents',
    entities: 'No Entities',
    facts: 'No Facts',
    alerts: 'All Clear',
    notes: 'No Notes',
    search: 'No Results',
  };

  const defaultDescriptions: Record<EmptyStateType, string> = {
    projects: getRandomMessage('empty', 'helpful'),
    documents: getRandomMessage('empty', 'helpful'),
    entities: getRandomMessage('empty', 'helpful'),
    facts: getRandomMessage('empty', 'helpful'),
    alerts: getRandomMessage('empty', 'nice-to-know'),
    notes: getRandomMessage('empty', 'helpful'),
    search: getRandomMessage('empty', 'helpful'),
  };

  return (
    <Empty className={cn('border-0', className)}>
      {showMoth && (
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-amber-600/20">
              <MothIcon className="size-10 text-amber-500" />
            </div>
          </EmptyMedia>
        </EmptyHeader>
      )}
      <EmptyTitle className="font-serif">
        {title ?? defaultTitles[type]}
      </EmptyTitle>
      <EmptyDescription>
        {description ?? defaultDescriptions[type]}
      </EmptyDescription>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
```

### 8.2 Update 15 Empty State Locations

Update all locations where `.length === 0` checks occur:

**Projects List** (`src/routes/projects/index.tsx`):

```typescript
// Use VellumEmptyState component
<VellumEmptyState type="projects" action={<CreateProjectButton />} />
```

**Documents List** (`src/routes/projects/$projectId/documents/index.tsx`):

```typescript
// Use VellumEmptyState component
<VellumEmptyState type="documents" action={<UploadDocumentButton />} />
```

**Entities List** (`src/routes/projects/$projectId/entities/index.tsx`):

```typescript
// Use VellumEmptyState component
<VellumEmptyState type="entities" action={<AddEntityButton />} />
```

**Facts List** (`src/routes/projects/$projectId/facts/index.tsx`):

```typescript
// Use VellumEmptyState component
<VellumEmptyState type="facts" action={<AddFactButton />} />
```

**Alerts List** (`src/routes/projects/$projectId/alerts/index.tsx`):

```typescript
// Use VellumEmptyState component for "all clear" state
<VellumEmptyState type="alerts" showMoth={true} />
```

**Search Results** (various):

```typescript
// Use VellumEmptyState component
<VellumEmptyState type="search" description={`No results for "${query}"`} />
```

### 8.3 Success Criteria for Phase 4

- All 15 empty state locations use Vellum-themed empty states
- Messages use archival language from message library
- Action buttons present where appropriate
- Moth icon visible in all empty states

## 9. Phase 5: Loading States Enhancement

**Duration: 1 Day**

Enhance all loading states with animated moth and archival loading messages.

### 9.1 Animated Moth Component

**File: `src/components/LoadingMoth.tsx`**

Create an animated moth component for loading states:

```typescript
// src/components/LoadingMoth.tsx

import { MothIcon } from '@/components/ui/moth-icon';
import { cn } from '@/lib/utils';

type LoadingMothProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function LoadingMoth({ size = 'md', className }: LoadingMothProps) {
  const sizeClasses = {
    sm: 'size-6',
    md: 'size-8',
    lg: 'size-12',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <MothIcon className={cn(sizeClasses[size], 'text-amber-500 animate-float')} />
      {/* Wing flutter effect */}
      <div className="absolute inset-0 animate-flutter opacity-50">
        <MothIcon className={cn(sizeClasses[size], 'text-amber-400 blur-sm')} />
      </div>
    </div>
  );
}
```

Add CSS animations to `src/styles.css`:

```css
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes flutter {
  0%,
  100% {
    transform: scaleX(1) scaleY(1);
    opacity: 0.5;
  }
  25% {
    transform: scaleX(0.95) scaleY(1.05);
    opacity: 0.4;
  }
  50% {
    transform: scaleX(1) scaleY(0.95);
    opacity: 0.5;
  }
  75% {
    transform: scaleX(1.05) scaleY(0.95);
    opacity: 0.4;
  }
}

.animate-float {
  animation: float 2s ease-in-out infinite;
}

.animate-flutter {
  animation: flutter 0.5s ease-in-out infinite;
}
```

### 9.2 Loading State Component Update

**File: `src/components/LoadingState.tsx`**

Update LoadingState to support Vellum loading messages:

```typescript
// src/components/LoadingState.tsx

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRandomMessage } from '@/lib/vellum';
import { LoadingMoth } from './LoadingMoth';

type LoadingStateProps = {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  useMoth?: boolean;
  context?: 'documents' | 'entities' | 'facts' | 'general';
};

export function LoadingState({
  message,
  className,
  size = 'md',
  useMoth = false,
  context = 'general',
}: LoadingStateProps) {
  const defaultMessage =
    message ?? getRandomMessage('loading', 'nice-to-know');

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      {useMoth ? (
        <LoadingMoth size={size} />
      ) : (
        <Loader2 className={cn('text-primary animate-spin', {
          'size-4': size === 'sm',
          'size-6': size === 'md',
          'size-8': size === 'lg',
        })} />
      )}
      <p className="text-muted-foreground text-sm animate-pulse">{defaultMessage}</p>
    </div>
  );
}
```

### 9.3 Update Loading State Locations

Update all loading states throughout the application:

**Documents Loading**:

```typescript
<LoadingState context="documents" useMoth={true} />
```

**Entities Loading**:

```typescript
<LoadingState context="entities" useMoth={true} />
```

**Facts Loading**:

```typescript
<LoadingState context="facts" useMoth={true} />
```

**General Loading**:

```typescript
<LoadingState useMoth={true} />
```

### 9.4 Success Criteria for Phase 5

- Animated moth visible on all loading states
- Loading messages use archival language from message library
- Animation is smooth and performant (60fps)
- Reduced motion preferences respected

## 10. Phase 6: Contextual Hints System

**Duration: 2 Days**

Implement the full contextual hints system with action triggers, priority levels, and user preferences.

### 10.1 Hint Trigger Logic

**File: `src/lib/vellum-hints.ts`**

Create a hint trigger system:

```typescript
// src/lib/vellum-hints.ts

import type { HintContext } from '@/types/vellum';

// Hint trigger configurations
export const HINT_TRIGGERS: Record<string, HintContext> = {
  'document:create': {
    category: 'document',
    action: 'create',
  },
  'document:upload': {
    category: 'document',
    action: 'upload',
  },
  'entity:create': {
    category: 'entity',
    action: 'create',
  },
  'fact:create': {
    category: 'fact',
    action: 'create',
  },
  'fact:confirm': {
    category: 'fact',
    action: 'confirm',
  },
  'milestone:10-entities': {
    category: 'achievement',
    action: 'milestone',
    relatedEntityCount: 10,
  },
  'milestone:50-facts': {
    category: 'achievement',
    action: 'milestone',
    relatedFactCount: 50,
  },
};

// Get hint message based on context
export function getHintForContext(context: HintContext): string {
  const { category, action } = context;

  // Map context to message category
  let categoryMap: Record<string, string> = {
    document: 'hints',
    entity: 'hints',
    fact: 'hints',
    achievement: 'achievements',
    general: 'hints',
  };

  return getRandomMessage(categoryMap[category] ?? 'hints', 'helpful');
}

// Check if hint should be shown (debouncing, throttling)
export function shouldShowHint(
  lastHintTime: number,
  hintCooldown: number = 30000
): boolean {
  return Date.now() - lastHintTime > hintCooldown;
}
```

### 10.2 Hint Toast Integration

**File: `src/providers/VellumHintProvider.tsx`**

Enhance the hint provider with toast integration:

```typescript
// Enhanced showHint implementation

import { toast } from '@/components/ui/toast';

const showHint = useCallback(
  (context: HintContext) => {
    if (!settings?.hintsEnabled) return;
    if (isMobile && !settings.mobileHintsEnabled) return;
    if (settings.hintsVisibility === 'never') return;

    // Debounce hints (30 second cooldown)
    const now = Date.now();
    const lastHintTime = typeof window !== 'undefined'
      ? (window.localStorage.getItem('lastVellumHint') ? parseInt(window.localStorage.getItem('lastVellumHint')!) : 0)
      : 0;

    if (now - lastHintTime < 30000) return;

    const message = getHintForContext(context);

    // Store last hint time
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lastVellumHint', now.toString());
    }

    toast({
      title: (
        <div className="flex items-center gap-2">
          <MothIcon className="size-4 text-amber-500" />
          <span>Vellum</span>
        </div>
      ),
      description: message,
      duration: 10000,
      action: {
        label: 'Dismiss',
        onClick: () => {},
      },
      className: 'border-amber-500/20 bg-amber-500/5',
    });
  },
  [settings, isMobile, toast]
);
```

### 10.3 Hint Usage Throughout Application

**After document upload** (`src/routes/projects/$projectId/documents/index.tsx`):

```typescript
const handleDocumentUploaded = (doc: Document) => {
  // ... upload logic
  showHint({ category: 'document', action: 'upload' });
};
```

**After entity creation** (`src/routes/projects/$projectId/entities/index.tsx`):

```typescript
const handleEntityCreated = (entity: Entity) => {
  // ... creation logic
  showHint({ category: 'entity', action: 'create' });
};
```

**After fact confirmation** (`src/routes/projects/$projectId/facts/index.tsx`):

```typescript
const handleFactConfirmed = (fact: Fact) => {
  // ... confirmation logic
  showHint({ category: 'fact', action: 'confirm' });
};
```

### 10.4 Success Criteria for Phase 6

- Hints appear on all major user actions (upload, create, confirm)
- Hints are dismissible and auto-dismiss after 10 seconds
- "No hints" preference works correctly
- Hints respect mobile disable setting
- Debouncing prevents hint spam

## 11. Phase 7: Celebrations and Gamification

**Duration: 2 Days**

Implement achievement tracking and celebration system.

### 11.1 Achievement Backend

**File: `convex/users.ts`**

Add achievement checking logic:

```typescript
// Check and award achievements
export const checkAndAwardAchievements = internalMutation({
  args: {
    userId: v.id('users'),
    projectId: v.optional(v.id('projects')),
    event: v.union(
      v.literal('document-created'),
      v.literal('entity-created'),
      v.literal('fact-created'),
      v.literal('milestone-reached')
    ),
    metadata: v.optional(
      v.object({
        count: v.optional(v.number()),
        type: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const achievements: string[] = [];

    // Get user's current counts
    const user = await ctx.db.get(args.userId);
    const projectStats =
      args.projectId ? (await ctx.db.get(args.projectId))?.stats : null;

    // Check each achievement
    if (args.event === 'document-created') {
      const docCount = projectStats?.documentCount ?? 1;

      if (docCount === 1) {
        await recordAchievement(
          ctx,
          args.userId,
          'first-document',
          args.projectId
        );
        achievements.push('first-document');
      }

      if (docCount === 10) {
        await recordAchievement(
          ctx,
          args.userId,
          'writer-s-block',
          args.projectId
        );
        achievements.push('writer-s-block');
      }
    }

    if (args.event === 'entity-created') {
      const entityCount = projectStats?.entityCount ?? 1;

      if (entityCount === 1) {
        await recordAchievement(
          ctx,
          args.userId,
          'first-entity',
          args.projectId
        );
        achievements.push('first-entity');
      }

      if (entityCount === 10) {
        await recordAchievement(
          ctx,
          args.userId,
          'milestone-10-entities',
          args.projectId
        );
        achievements.push('milestone-10-entities');
      }
    }

    if (args.event === 'fact-created') {
      const factCount = projectStats?.factCount ?? 1;

      if (factCount === 1) {
        await recordAchievement(ctx, args.userId, 'first-fact', args.projectId);
        achievements.push('first-fact');
      }

      if (factCount === 50) {
        await recordAchievement(
          ctx,
          args.userId,
          'milestone-50-facts',
          args.projectId
        );
        achievements.push('milestone-50-facts');
      }

      if (factCount === 100) {
        await recordAchievement(
          ctx,
          args.userId,
          'milestone-100-facts',
          args.projectId
        );
        achievements.push('milestone-100-facts');
      }
    }

    if (args.event === 'milestone-reached') {
      const alertCount = projectStats?.alertCount ?? 0;
      if (alertCount === 0) {
        await recordAchievement(
          ctx,
          args.userId,
          'continuity-master',
          args.projectId
        );
        achievements.push('continuity-master');
      }
    }

    // Check for world-builder (across all projects)
    const projectCount = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    if (projectCount.length === 5) {
      await recordAchievement(ctx, args.userId, 'world-builder');
      achievements.push('world-builder');
    }

    return achievements;
  },
});
```

### 11.2 VellumCelebration Component

**File: `src/components/VellumCelebration.tsx`**

Create a celebration component:

```typescript
// src/components/VellumCelebration.tsx

import { Confetti } from '@/components/ui/confetti';
import { MothIcon } from '@/components/ui/moth-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMessageById } from '@/lib/vellum';
import type { AchievementType } from '@/types/vellum';

type VellumCelebrationProps = {
  achievementType: AchievementType;
  onDismiss: () => void;
  className?: string;
};

const achievementConfig: Record<AchievementType, { title: string; subtitle?: string }> = {
  'first-document': { title: 'First Document', subtitle: 'The archives begin!' },
  'first-entity': { title: 'First Entity', subtitle: 'Your world takes shape.' },
  'first-fact': { title: 'First Fact', subtitle: 'Knowledge is recorded.' },
  'milestone-10-entities': { title: '10 Entities', subtitle: 'The cast grows!' },
  'milestone-50-facts': { title: '50 Facts', subtitle: 'Rich detail accumulated.' },
  'milestone-100-facts': { title: '100 Facts', subtitle: 'A century of knowledge!' },
  'continuity-master': { title: 'Continuity Master', subtitle: 'Perfect harmony achieved.' },
  'writer-s-block': { title: "Writer's Block", subtitle: 'Ten documents strong!' },
  'world-builder': { title: 'World Builder', subtitle: 'Five worlds created!' },
};

export function VellumCelebration({
  achievementType,
  onDismiss,
  className,
}: VellumCelebrationProps) {
  const config = achievementConfig[achievementType];
  const message = getMessageById(`achievement-${achievementType}`) ?? config.title;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative z-10 max-w-sm rounded-lg bg-card p-6 text-center shadow-xl animate-in zoom-in-95 duration-300">
        <Confetti />

        <div className="mb-4 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 ring-2 ring-amber-500/30">
            <MothIcon className="size-8 text-amber-400" />
          </div>
        </div>

        <h2 className="font-serif text-xl font-semibold">{config.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{config.subtitle}</p>

        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm italic">"{message}"</p>
        </div>

        <Button onClick={onDismiss} className="mt-6 w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}
```

### 11.3 Integration with CRUD Operations

**In document creation** (`convex/documents.ts`):

```typescript
// After successful document creation
await ctx.scheduler.runAfter(0, internal.users.checkAndAwardAchievements, {
  userId: project.userId,
  projectId: document.projectId,
  event: 'document-created',
});
```

**In entity creation** (`convex/entities.ts`):

```typescript
// After successful entity creation
await ctx.scheduler.runAfter(0, internal.users.checkAndAwardAchievements, {
  userId: project.userId,
  projectId: entity.projectId,
  event: 'entity-created',
});
```

**In fact creation** (`convex/facts.ts`):

```typescript
// After successful fact creation
await ctx.scheduler.runAfter(0, internal.users.checkAndAwardAchievements, {
  userId: project.userId,
  projectId: fact.projectId,
  event: 'fact-created',
});
```

### 11.4 Success Criteria for Phase 7

- All 9 achievement types trigger correctly
- Celebration shows with confetti animation (visual only)
- Achievement tracking persists in database
- No duplicate awards for same achievement
- Frontend displays celebrations when achievements are unlocked

## 12. Phase 8: Notifications Enhancement

**Duration: 1 Day**

Enhance all alert and notification messages with Vellum's voice.

### 12.1 Vellum-Styled Alerts

**File: `src/components/AlertCard.tsx`**

Update AlertCard with Vellum messaging:

```typescript
// Update the AlertCard component with Vellum voice

export function AlertCard({
  alert,
  projectId,
  onResolve,
  onDismiss,
  entityNames,
  dataTourAction,
}: AlertCardProps) {
  const TypeIcon = typeConfig[alert.type].icon;
  const severityStyle = severityConfig[alert.severity];

  // Vellum-styled alert messages
  const getVellumDescription = (alert: Alert): string => {
    switch (alert.type) {
      case 'contradiction':
        return `I've spotted a potential inconsistency in your canon. The evidence suggests a conflict that may need your attention.`;
      case 'timeline':
        return `A temporal discrepancy has emerged in your records. The chronology of events may need review.`;
      case 'ambiguity':
        return `Some details in your documents appear unclear. I've flagged these passages for your review.`;
      default:
        return alert.description;
    }
  };

  const getVellumSuggestedFix = (alert: Alert): string | undefined => {
    if (!alert.suggestedFix) return undefined;
    return `Suggested resolution: ${alert.suggestedFix}`;
  };

  return (
    <Link
      to="/projects/$projectId/alerts/$alertId"
      params={{ projectId, alertId: alert._id }}
      className="block"
    >
      <Card
        className={cn(
          'group transition-all duration-200 hover:shadow-md hover:ring-1',
          alert.status === 'open' ?
            'hover:border-primary/50 hover:ring-primary/20'
          : 'opacity-60 hover:opacity-80'
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                alert.severity === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'
              )}
            >
              <TypeIcon
                className={cn(
                  'size-5',
                  alert.severity === 'error' ?
                    'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
                )}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-sm leading-snug font-medium">{alert.title}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 shrink-0 border-transparent px-1.5 text-[10px] font-normal ring-1',
                    severityStyle.badge
                  )}
                >
                  {severityStyle.label}
                </Badge>
              </div>

              <p className="text-muted-foreground line-clamp-2 text-xs">
                {getVellumDescription(alert)}
              </p>

              {/* ... rest of component */}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
```

### 12.2 Toast Notifications

**Update all toast notifications** throughout the application to use Vellum's voice:

```typescript
// Instead of generic success messages:
toast.success('Document created');

// Use Vellum-styled messages:
toast({
  title: (
    <div className="flex items-center gap-2">
      <MothIcon className="size-4 text-amber-500" />
      <span>Document Added</span>
    </div>
  ),
  description: 'The archives welcome this new manuscript.',
  className: 'border-amber-500/20 bg-amber-500/5',
});
```

### 12.3 Success Criteria for Phase 8

- All alerts use Vellum's voice in descriptions
- Notifications show MothIcon consistently
- Explanations are helpful and encouraging
- Toast notifications follow Vellum theme

## 13. Phase 9: Preferences and Settings

**Duration: 2 Days**

Create Vellum-specific settings page for user customization.

### 13.1 Settings Page

**File: `src/routes/settings/vellum.tsx`**

Create a dedicated Vellum settings page:

```typescript
// src/routes/settings/vellum.tsx

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MothIcon } from '@/components/ui/moth-icon';
import { cn } from '@/lib/utils';
import { getRandomMessage } from '@/lib/vellum';
import type { VellumSettings, VellumWhimsyLevel } from '@/types/vellum';

export function VellumSettingsPage() {
  const settings = useQuery(api.users.getVellumSettings);
  const updateSettings = useMutation(api.users.updateVellumSettings);

  const [localSettings, setLocalSettings] = useState<VellumSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (!localSettings) {
    return <div className="p-8">Loading...</div>;
  }

  const handleSettingChange = (key: keyof VellumSettings, value: unknown) => {
    setLocalSettings((prev) => prev ? { ...prev, [key]: value } : null);
    updateSettings({ [key]: value });
  };

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30">
          <MothIcon className="size-6 text-amber-400" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold">Vellum Settings</h1>
          <p className="text-muted-foreground">Customize your Archivist Moth companion</p>
        </div>
      </div>

      {/* Whimsy Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getRandomMessage('insights', 'nice-to-know')}
          </p>

          <div className="grid grid-cols-3 gap-4">
            {(['minimal', 'moderate', 'high'] as VellumWhimsyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleSettingChange('whimsyLevel', level)}
                className={cn(
                  'rounded-lg border p-4 text-center transition-all',
                  localSettings.whimsyLevel === level ?
                    'border-primary bg-primary/5' :
                    'hover:border-primary/50'
                )}
              >
                <div className="font-medium capitalize">{level}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hints & Guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Hints</div>
              <div className="text-sm text-muted-foreground">
                Show contextual guidance throughout the app
              </div>
            </div>
            <Switch
              checked={localSettings.hintsEnabled}
              onCheckedChange={(checked) => handleSettingChange('hintsEnabled', checked)}
            />
          </div>

          {localSettings.hintsEnabled && (
            <div className="space-y-4">
              <div className="font-medium">Hint Frequency</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'action-triggered', label: 'Action-Triggered' },
                  { value: 'page-load', label: 'On Page Load' },
                  { value: 'never', label: 'Never' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleSettingChange('hintsVisibility', option.value)
                    }
                    className={cn(
                      'rounded-lg border p-3 text-sm transition-all',
                      localSettings.hintsVisibility === option.value ?
                        'border-primary bg-primary/5' :
                        'hover:border-primary/50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <div className="font-medium">Mobile Hints</div>
              <div className="text-sm text-muted-foreground">
                Show hints on mobile devices (currently disabled)
              </div>
            </div>
            <Switch
              checked={localSettings.mobileHintsEnabled}
              onCheckedChange={(checked) =>
                handleSettingChange('mobileHintsEnabled', checked)
              }
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Celebrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Achievement Notifications</div>
              <div className="text-sm text-muted-foreground">
                Show celebrations when you reach milestones
              </div>
            </div>
            <Switch
              checked={localSettings.achievementsNotifications}
              onCheckedChange={(checked) =>
                handleSettingChange('achievementsNotifications', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Vellum Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vellum Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'everywhere', label: 'Show Everywhere' },
                { value: 'minimal', label: 'Minimal' },
                { value: 'chat-only', label: 'Chat Only' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('vellumPresence', option.value)}
                  className={cn(
                    'rounded-lg border p-4 text-center transition-all',
                    localSettings.vellumPresence === option.value ?
                      'border-primary bg-primary/5' :
                      'hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 13.2 Success Criteria for Phase 9

- All settings persist correctly to database
- Vellum personality changes based on whimsy level
- Hint visibility respects user preference
- Mobile hints option is disabled with explanation
- Settings page is accessible and well-organized

## 14. Phase 10: Testing

**Duration: 2 Days**

Create comprehensive test coverage for all Vellum features.

### 14.1 Test Files

**File: `convex/__tests__/vellum.test.ts`**

```typescript
// convex/__tests__/vellum.test.ts

import { expect, test } from 'convex-test';
import { internal } from './_generated/internal';
import { api } from '../convex/_generated/api';

describe('Vellum Features', () => {
  test('getVellumSettings returns default settings for new users', async () => {
    const settings = await runQuery(api.users.getVellumSettings);
    expect(settings).toEqual({
      whimsyLevel: 'moderate',
      hintsEnabled: true,
      hintsVisibility: 'action-triggered',
      mobileHintsEnabled: false,
      achievementsNotifications: true,
      vellumPresence: 'everywhere',
    });
  });

  test('updateVellumSettings persists changes', async () => {
    await runMutation(api.users.updateVellumSettings, {
      settings: { whimsyLevel: 'high' },
    });

    const settings = await runQuery(api.users.getVellumSettings);
    expect(settings?.whimsyLevel).toEqual('high');
  });

  test('checkAndAwardAchievements awards first-document achievement', async () => {
    // Create a document
    await runMutation(api.documents.create, {
      projectId: 'test-project-id',
      title: 'Test Document',
      content: 'Test content',
    });

    // Check for achievements
    const achievements = await runQuery(api.users.getUserAchievements);
    expect(
      achievements.some((a) => a.achievementType === 'first-document')
    ).toBe(true);
  });

  test('getProjectHealth calculates accurate health score', async () => {
    const health = await runQuery(api.projects.getProjectHealth, {
      projectId: 'test-project-id',
    });

    expect(health).toBeDefined();
    expect(typeof health?.healthScore).toEqual('number');
    expect(health?.healthScore).toBeGreaterThanOrEqual(0);
    expect(health?.healthScore).toBeLessThanOrEqual(100);
  });
});
```

**File: `src/components/__tests__/VellumHint.test.tsx`**

```typescript
// src/components/__tests__/VellumHint.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VellumHint } from '../VellumHint';
import type { VellumHint as VellumHintType } from '@/types/vellum';

describe('VellumHint', () => {
  const mockHint: VellumHintType = {
    id: 'test-hint-1',
    message: 'Test hint message',
    priority: 'helpful',
    context: { category: 'general', action: 'create' },
    createdAt: Date.now(),
  };

  it('renders hint message correctly', () => {
    render(<VellumHint hint={mockHint} onDismiss={vi.fn()} />);
    expect(screen.getByText('Test hint message')).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<VellumHint hint={mockHint} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss hint'));
    expect(onDismiss).toHaveBeenCalledWith('test-hint-1');
  });

  it('applies correct priority styling', () => {
    const criticalHint = { ...mockHint, priority: 'critical' as const };
    render(<VellumHint hint={criticalHint} onDismiss={vi.fn()} />);

    const alertDiv = screen.getByRole('alert');
    expect(alertDiv).toHaveClass('bg-red-500/10');
  });
});
```

### 14.2 Test Coverage Goals

- All 5 test files created
- 80%+ test coverage for Vellum features
- All existing 265 tests still pass
- Performance tests for component rendering (<100ms)

### 14.3 Success Criteria for Phase 10

- All test files created and passing
- 80%+ code coverage for Vellum features
- No regressions in existing tests
- Performance benchmarks met

## 15. Phase 11: Rollout and Documentation

**Duration: 2 Days**

Execute the 3-week accelerated rollout and complete documentation.

### 15.1 Rollout Schedule

**Week 1:**

- Days 1-2: Phase 1 (Foundation)
- Days 3-4: Phase 2 (Onboarding + Tutorial)
- Day 5: Phase 3 (Dashboard Insights)

**Week 2:**

- Days 1-2: Phase 4-5 (Empty + Loading States)
- Days 3-4: Phase 6 (Contextual Hints)
- Day 5: Phase 7 (Celebrations)

**Week 3:**

- Days 1-2: Phase 8 (Notifications) + Phase 9 (Settings)
- Days 3-4: Phase 10 (Testing)
- Day 5: Full rollout + monitoring

### 15.2 Feature Flags

**File: `src/env.ts`**

Add feature flags for controlled rollout:

```typescript
// In the env schema
VITE_VELLUM_IMMERSION_ENABLED: v.union(v.literal('true'), v.literal('false')),
VITE_VELLUM_PHASE: v.union(
  v.literal('foundation'),
  v.literal('hints'),
  v.literal('celebrations'),
  v.literal('full')
),
```

Usage in components:

```typescript
const isVellumEnabled = env.VITE_VELLUM_IMMERSION_ENABLED === 'true';
const vellumPhase = env.VITE_VELLUM_PHASE;

// Only show hints if phase includes hints
const showHints =
  isVellumEnabled &&
  (vellumPhase === 'hints' ||
    vellumPhase === 'celebrations' ||
    vellumPhase === 'full');
```

### 15.3 Monitoring and Analytics

Track the following metrics:

- **Hint dismissal rate**: Track how often users dismiss hints vs. act on them
- **Achievement unlock rate**: Monitor which achievements are most/least common
- **Settings changes**: Track which preferences users modify
- **User engagement**: Time in app, actions per session, feature usage

### 15.4 Documentation Updates

**Update AGENTS.md** with Vellum patterns:

````markdown
## VELLUM INTEGRATION

When adding Vellum features:

1. Use `src/lib/vellum.ts` for all Vellum messages
2. Import `getRandomMessage()` for contextual messages
3. Use `VellumHintProvider` for hint management
4. Follow the persona guidelines in `docs/VELLUM-IMMERSION-SPEC.md`

### Message Library

```typescript
import { getRandomMessage, VELLUM_MESSAGES } from '@/lib/vellum';

// Get a random hint message
const hint = getRandomMessage('hints', 'helpful');

// Get specific message by ID
const message = getMessageById('achievement-first-document');
```
````

### Hint System

```typescript
import { useVellumHint } from '@/providers/VellumHintProvider';

function MyComponent() {
  const { showHint } = useVellumHint();

  const handleUpload = () => {
    // ... upload logic
    showHint({ category: 'document', action: 'upload' });
  };
}
```

````

### 15.5 Success Criteria for Phase 11

- Feature flags working correctly across all environments
- Monitoring deployed and collecting data
- Documentation complete and accessible
- All phases rolled out without regression

## 16. Technical Considerations

### 16.1 Performance

- **Animated moth**: CSS-only animations (no JS animation libraries)
- **Hint system**: Debounced 300ms, cached hints per context
- **Achievement checking**: Batch operations in background
- **Message library**: Static constant (no runtime computation)
- **Bundle size target**: <15KB total for all Vellum features

### 16.2 Accessibility

- All Vellum components have ARIA labels
- Keyboard navigation for all interactive elements
- `prefers-reduced-motion` respected for animations
- Screen reader friendly settings page
- Hints dismissible via keyboard (Esc key)

### 16.3 Bundle Size Impact

| Component | Size |
|-----------|------|
| Message library | ~2KB |
| Hint provider + components | ~4KB |
| Insight component | ~2KB |
| Celebration component | ~3KB |
| Settings page | ~2KB |
| **Total** | **<15KB** |

### 16.4 Database Impact

- `achievements` table: ~50KB per 100 users (minimal)
- `users.vellumSettings`: ~500 bytes per user
- Project health query: Index-based (efficient)

## 17. Success Criteria Summary

### Functional Requirements
- Vellum present in all major application touchpoints
- Contextual intelligence provides relevant guidance
- 9 achievements fire correctly on trigger events
- Hint system respects all user preferences
- Mobile behavior (hints disabled) works correctly

### User Experience
- Non-intrusive: Vellum enhances without blocking workflows
- Valuable: Every interaction provides actual help
- Skippable: All guidance can be dismissed
- Consistent: Same personality throughout all touchpoints

### Technical Requirements
- Performance: All Vellum components <100ms render
- Bundle size <15KB total
- All existing 265 tests pass
- New test coverage 80%+
- No performance regression in non-Vellum features

### Data Collection
- Hint dismissal rate tracked
- Achievement unlock rate monitored
- User engagement measured
- Settings changes logged

## 18. Code Examples

### 18.1 Complete Hint Provider Example

```typescript
// src/providers/VellumHintProvider.tsx

import { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '@/components/ui/toast';
import { getRandomMessage } from '@/lib/vellum';
import type { VellumHint, HintContext, VellumSettings } from '@/types/vellum';

const VellumHintContext = createContext<VellumHintContextValue | null>(null);

type VellumHintContextValue = {
  hints: VellumHint[];
  settings: VellumSettings | null;
  showHint: (context: HintContext) => void;
  dismissHint: (hintId: string) => void;
  isHintVisible: boolean;
  isMobile: boolean;
};

export function VellumHintProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const settings = useQuery(api.users.getVellumSettings);
  const dismissHintMutation = useMutation(api.users.dismissHint);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

  const showHint = useCallback(
    (context: HintContext) => {
      if (!settings?.hintsEnabled) return;
      if (isMobile && !settings.mobileHintsEnabled) return;
      if (settings.hintsVisibility === 'never') return;

      // Check cooldown (30 seconds)
      const now = Date.now();
      const lastHintTime = typeof window !== 'undefined'
        ? parseInt(window.localStorage.getItem('lastVellumHint') ?? '0')
        : 0;

      if (now - lastHintTime < 30000) return;

      const message = getRandomMessage('hints', 'helpful');

      // Update cooldown
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastVellumHint', now.toString());
      }

      toast({
        title: (
          <div className="flex items-center gap-2">
            <MothIcon className="size-4 text-amber-500" />
            <span>Vellum</span>
          </div>
        ),
        description: message,
        duration: 10000,
        action: {
          label: 'Dismiss',
          onClick: () => {},
        },
        className: 'border-amber-500/20 bg-amber-500/5',
      });
    },
    [settings, isMobile, toast]
  );

  const dismissHint = useCallback(
    (hintId: string) => {
      dismissHintMutation({ hintId });
    },
    [dismissHintMutation]
  );

  const value: VellumHintContextValue = {
    hints: [],
    settings: settings as VellumSettings | null,
    showHint,
    dismissHint,
    isHintVisible: settings?.hintsEnabled ?? true,
    isMobile,
  };

  return (
    <VellumHintContext.Provider value={value}>
      {children}
    </VellumHintContext.Provider>
  );
}

export function useVellumHint() {
  const context = useContext(VellumHintContext);
  if (!context) {
    throw new Error('useVellumHint must be used within a VellumHintProvider');
  }
  return context;
}
````

### 18.2 Complete Message Library Example

```typescript
// src/lib/vellum.ts

export type VellumMessageCategory =
  | 'empty'
  | 'loading'
  | 'hints'
  | 'achievements'
  | 'insights'
  | 'alerts'
  | 'celebrations';

export type VellumMessage = {
  readonly id: string;
  readonly category: VellumMessageCategory;
  readonly message: string;
  readonly priority?: 'critical' | 'helpful' | 'nice-to-know';
};

export const VELLUM_MESSAGES: readonly VellumMessage[] = [
  // Empty states
  {
    id: 'empty-projects-1',
    category: 'empty',
    message: 'The archives await your first world...',
    priority: 'helpful',
  },
  {
    id: 'empty-projects-2',
    category: 'empty',
    message: 'No projects yet. Shall we begin?',
    priority: 'helpful',
  },
  {
    id: 'empty-documents-1',
    category: 'empty',
    message: 'The document shelves are gathering dust...',
    priority: 'helpful',
  },
  {
    id: 'empty-entities-1',
    category: 'empty',
    message: 'No entities discovered yet in the archives...',
    priority: 'helpful',
  },
  {
    id: 'empty-facts-1',
    category: 'empty',
    message: 'No facts recorded. The world is full of possibilities...',
    priority: 'helpful',
  },
  {
    id: 'empty-alerts-1',
    category: 'empty',
    message: 'All clear. No inconsistencies detected in the archives.',
    priority: 'nice-to-know',
  },

  // Loading states
  {
    id: 'loading-general-1',
    category: 'loading',
    message: 'Searching through the stacks...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-general-2',
    category: 'loading',
    message: 'Cataloging entries...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-documents-1',
    category: 'loading',
    message: 'Organizing documents...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-entities-1',
    category: 'loading',
    message: 'Updating character records...',
    priority: 'nice-to-know',
  },
  {
    id: 'loading-facts-1',
    category: 'loading',
    message: 'Verifying facts...',
    priority: 'nice-to-know',
  },

  // Hints
  {
    id: 'hint-after-upload-1',
    category: 'hints',
    message: 'Have you extracted entities from this document?',
    priority: 'helpful',
  },
  {
    id: 'hint-after-entity-1',
    category: 'hints',
    message: 'Consider adding facts about this entity.',
    priority: 'helpful',
  },
  {
    id: 'hint-milestone-1',
    category: 'hints',
    message: 'Your world is growing richly detailed!',
    priority: 'nice-to-know',
  },

  // Achievements
  {
    id: 'achievement-first-document',
    category: 'achievements',
    message: 'A fine beginning! The archives welcome their first document.',
    priority: 'critical',
  },
  {
    id: 'achievement-first-entity',
    category: 'achievements',
    message: 'The first entity catalogued. A worthy start to your world!',
    priority: 'critical',
  },
  {
    id: 'achievement-first-fact',
    category: 'achievements',
    message: 'A fact recorded! The foundation of knowledge is laid.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-10-entities',
    category: 'achievements',
    message: 'A milestone reached! Ten entities now grace the archives.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-50-facts',
    category: 'achievements',
    message: 'Fifty facts! Your world grows in depth and detail.',
    priority: 'critical',
  },
  {
    id: 'achievement-milestone-100-facts',
    category: 'achievements',
    message: 'A hundred facts! The archives overflow with knowledge.',
    priority: 'critical',
  },
  {
    id: 'achievement-continuity-master',
    category: 'achievements',
    message: 'All inconsistencies resolved. Your world is in perfect harmony!',
    priority: 'critical',
  },
  {
    id: 'achievement-writer-s-block',
    category: 'achievements',
    message: 'Ten documents! A dedicated world-builder indeed.',
    priority: 'critical',
  },
  {
    id: 'achievement-world-builder',
    category: 'achievements',
    message: 'Five worlds created. You are a prolific creator!',
    priority: 'critical',
  },

  // Insights
  {
    id: 'insight-health-1',
    category: 'insights',
    message: "Your world is 45% catalogued. There's more to discover!",
    priority: 'helpful',
  },
  {
    id: 'insight-suggestion-1',
    category: 'insights',
    message: 'Consider adding more entities to flesh out your world.',
    priority: 'helpful',
  },
];

export function getMessagesByCategory(
  category: VellumMessageCategory
): readonly VellumMessage[] {
  return VELLUM_MESSAGES.filter((msg) => msg.category === category);
}

export function getRandomMessage(
  category: VellumMessageCategory,
  priority?: 'critical' | 'helpful' | 'nice-to-know'
): string {
  let messages = getMessagesByCategory(category);

  if (priority) {
    messages = messages.filter((msg) => msg.priority === priority);
  }

  if (messages.length === 0) {
    return 'The archives are open.';
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex]!.message;
}

export function getMessageById(id: string): string | undefined {
  return VELLUM_MESSAGES.find((msg) => msg.id === id)?.message;
}
```

## 19. References

### Existing Components and Files

| Component | Location | Purpose |
| --- | --- | --- |
| `VellumChat.tsx` | `src/components/VellumChat.tsx` | Main chat interface |
| `Vellum.tsx` | `src/components/Vellum.tsx` | Mascot button and empty states |
| `OnboardingModal.tsx` | `src/components/OnboardingModal.tsx` | User onboarding flow |
| `TutorialTour.tsx` | `src/components/TutorialTour.tsx` | Guided tutorial tour |
| `EmptyState.tsx` | `src/components/EmptyState.tsx` | Generic empty state |
| `LoadingState.tsx` | `src/components/LoadingState.tsx` | Generic loading state |
| `AlertCard.tsx` | `src/components/AlertCard.tsx` | Alert display card |
| `schema.ts` | `convex/schema.ts` | Database schema |
| `extract.ts` | `convex/llm/extract.ts` | LLM extraction logic |
| `chat.ts` | `convex/chat.ts` | Chat API |
| `checks.ts` | `convex/checks.ts` | Continuity checking |

### Documentation Files

- `AGENTS.md` - Project knowledge base and conventions
- `docs/SPEC.md` - Technical specifications
- `docs/PRD.md` - Product requirements
- `docs/VELLUM-CHAT-CONTEXT-FEAT.md` - Vellum context feature spec

### External Resources

- TanStack Start documentation for routing patterns
- Convex documentation for backend functions
- Tailwind v4 documentation for CSS-first styling
- React 19 documentation for new features
- Accessibility guidelines for ARIA labels

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-08  
**Status:** Ready for Implementation
