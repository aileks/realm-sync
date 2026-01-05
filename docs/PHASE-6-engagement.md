---
summary: User engagement features including Vellum AI assistant, interactive tutorials, project sharing, and monetization.
read_when: [engagement, vellum, tutorial, sharing, polar, monetization, mascot]
---

# Phase 6: Engagement & Collaboration - Realm Sync

## Overview

Phase 6 transforms Realm Sync from a tool into an experience. The Vellum moth mascot evolves from a static icon into an AI-powered archive assistant. Combined with interactive tutorials, project sharing, and sustainable monetization via Polar.sh, this phase creates a cohesive, engaging platform.

**Goal:** Deepen user engagement through AI assistance, guided onboarding, collaboration features, and sustainable funding. **Duration:** 3-4 weeks **Dependencies:** Phase 5 complete (onboarding modal working)

---

## Implementation Progress

| Sub-Phase             | Status  | Notes                                  |
| --------------------- | ------- | -------------------------------------- |
| Vellum AI Assistant   | Pending | Contextual AI chat, tips, guided help  |
| Demo Project Seeding  | Pending | Seed fantasy world with entities/facts |
| Tour Library Setup    | Pending | react-joyride or custom tooltips       |
| Tour Step Definitions | Pending | Define steps for each feature          |
| Project Sharing       | Pending | DM/Player collaboration with roles     |
| Polar.sh Integration  | Pending | Sponsorship, funding, premium features |

---

## 1. Vellum AI Assistant

Transform the Vellum mascot from a tip-displaying sidebar button into an intelligent archive assistant that helps users throughout their workflow.

### Current State

The `VellumButton` component (in `src/components/Vellum.tsx`) currently:

- Opens a sheet with static welcome message
- Shows a random tip from a predefined list
- Displays empty state messages throughout the app

### Vision

Vellum becomes a contextual AI assistant that:

- Answers questions about the user's world/canon
- Suggests entity connections and relationships
- Helps resolve continuity conflicts
- Provides writing prompts based on existing lore
- Guides new users through features

### Implementation Plan

#### 1.1 Chat Interface

```typescript
// src/components/VellumChat.tsx
type VellumChatProps = {
  projectId: Id<'projects'>;
};

export function VellumChat({ projectId }: VellumChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // AI SDK streaming chat
  const { append, isLoading } = useChat({
    api: '/api/vellum/chat',
    body: { projectId },
  });

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => append({ content: input, role: 'user' })}
        disabled={isLoading}
      />
    </div>
  );
}
```

#### 1.2 Context-Aware Responses

Vellum has access to:

- Project entities and facts
- Document content and metadata
- User's current page/context
- Recent alerts and conflicts

```typescript
// convex/vellum.ts
export const getContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .take(50);

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .take(100);

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_project_status', (q) =>
        q.eq('projectId', projectId).eq('status', 'open')
      )
      .take(10);

    return { entities, facts, alerts };
  },
});
```

#### 1.3 Contextual Tips (Smart)

Instead of random tips, Vellum provides contextual guidance:

| Context | Tip |
| --- | --- |
| Empty project | "Add your first document to begin building your archive." |
| First extraction | "I found {count} entities! Review them in the Canon Browser." |
| Open alerts | "You have {count} continuity issues. Want me to explain them?" |
| Duplicate entities | "I notice {name} appears twice. Should I merge them?" |
| Long document | "This chapter is quite long. Consider splitting it for better extraction." |

#### 1.4 Personality & Voice

Vellum's personality:

- **Tone:** Helpful, slightly whimsical, knowledgeable
- **Metaphor:** An ancient moth who has read countless manuscripts
- **Quirks:** Occasionally references "the archives" or "scrolls I've catalogued"
- **Limits:** Admits when uncertain, suggests where to look

Example responses:

- "Ah, I remember cataloguing this one. Sir Aldric first appears in Chapter 1..."
- "I've noticed a discrepancy in the timeline. Shall I show you?"
- "My wings are still unfurling on this one—I'm not certain. Check the source document?"

---

## 2. Interactive Tutorial

### Demo Project

A pre-built "The Verdant Realm" project demonstrating all features.

```typescript
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
  ],
  facts: [
    {
      subject: 'Sir Aldric',
      predicate: 'commands',
      object: "Thornhaven's defenses",
    },
    {
      subject: 'Dragon of Ashfall',
      predicate: 'flees from',
      object: 'something in the mountains',
    },
  ],
};
```

### Tour Steps

```typescript
const TOUR_STEPS = [
  {
    target: '[data-tour="project-overview"]',
    title: 'Welcome to Your Project',
    content:
      'This is your project dashboard. Here you can see all your documents, entities, and alerts.',
  },
  {
    target: '[data-tour="documents-list"]',
    title: 'Your Documents',
    content:
      'Documents are the source material for your world. Add chapters, notes, or any text.',
  },
  {
    target: '[data-tour="entities-section"]',
    title: 'Canon Entities',
    content:
      'Entities are the characters, locations, items, and concepts. Vellum extracts these automatically.',
  },
  {
    target: '[data-tour="vellum-mascot"]',
    title: 'Meet Vellum',
    content:
      "I'm Vellum, your archive assistant. Ask me anything about your world!",
  },
];
```

### Tour State

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

---

## 3. Project Sharing

Enable dungeon masters to share their world canon with players.

### Permission Model

| Role       | Capabilities                                               |
| ---------- | ---------------------------------------------------------- |
| **Owner**  | Full access (create, edit, delete, share)                  |
| **Editor** | Add/edit documents, confirm entities (no delete, no share) |
| **Viewer** | Read-only access to confirmed canon (no pending items)     |

### Schema

```typescript
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

### Viewer Restrictions

- See only `status: 'confirmed'` entities and facts
- No access to pending extractions or alerts
- Cannot see document raw content (only entity/fact references)
- Read-only timeline and connections views

---

## 4. Polar.sh Monetization

Integrate [Polar.sh](https://polar.sh) for sustainable open-source funding.

### Why Polar.sh

- **GitHub-native:** Seamless integration with existing workflow
- **Flexible:** Sponsorships, subscriptions, and one-time payments
- **Transparent:** Open-source friendly, community-focused
- **Low friction:** Users can sponsor directly from GitHub

### Integration Points

#### 4.1 Sponsorship Tiers

| Tier           | Price  | Benefits                               |
| -------------- | ------ | -------------------------------------- |
| **Supporter**  | $5/mo  | Early access to features, Discord role |
| **Patron**     | $15/mo | Priority bug fixes, vote on roadmap    |
| **Benefactor** | $50/mo | Direct feature requests, 1:1 support   |

#### 4.2 Premium Features (Future)

Potential sponsor-only features:

- **Extended AI chat:** More Vellum conversations per month
- **Advanced exports:** PDF world bibles, player handouts
- **Team workspaces:** Shared projects with role management
- **Custom themes:** Beyond the 3 default themes
- **Priority extraction:** Faster AI processing queue

#### 4.3 Implementation

```typescript
// src/routes/sponsors.tsx
export function SponsorsPage() {
  return (
    <div className="container py-12">
      <h1>Support Realm Sync</h1>
      <p>Help keep the archives open for all worldbuilders.</p>

      {/* Polar.sh embed or link */}
      <a
        href="https://polar.sh/realm-sync"
        className={buttonVariants({ variant: 'default' })}
      >
        Become a Sponsor
      </a>

      {/* Sponsor wall */}
      <SponsorWall />
    </div>
  );
}
```

#### 4.4 Sponsor Recognition

- **In-app badge:** Sponsors get a visual indicator on their profile
- **Sponsor wall:** Public recognition page listing all sponsors
- **Release notes:** Sponsors mentioned in changelogs
- **Vellum's gratitude:** Special Vellum message for sponsors

```typescript
// Vellum greeting for sponsors
const SPONSOR_GREETING =
  'Ah, a patron of the archives! Your support keeps these old wings fluttering. How may I assist you today?';
```

---

## 5. Testing & QA

- **Vellum Chat:** Test context loading, response quality, error handling
- **Tour Flow:** Verify all steps highlight correct elements
- **Sharing:** Test invite flow, role permissions, viewer restrictions
- **Polar.sh:** Verify webhook handling, sponsor status sync
- **Accessibility:** Keyboard navigation, screen reader support

---

## 6. Future Enhancements

- **Vellum Voice:** Text-to-speech for Vellum's responses
- **Vellum Proactive:** Vellum suggests actions based on project state
- **Public Sharing:** Generate public read-only links for world wikis
- **Export for Players:** Generate player-facing PDF/markdown handouts
- **Achievement System:** Reward users for completing milestones
- **A/B Testing:** Track engagement and optimize experience
