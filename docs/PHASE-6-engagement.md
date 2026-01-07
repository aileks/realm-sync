---
summary: User engagement features including Vellum AI assistant, interactive tutorials, project sharing, project categories, notes, user profiles, and monetization.
read_when:
  [
    engagement,
    vellum,
    tutorial,
    sharing,
    polar,
    monetization,
    mascot,
    profile,
    avatar,
    email,
    password,
    categories,
    ttrpg,
    dm,
    fiction,
    fanfic,
    reveal,
    notes,
    annotations,
  ]
---

# Phase 6: Engagement & Collaboration - Realm Sync

## Overview

Phase 6 transforms Realm Sync from a tool into an experience. The Vellum moth mascot evolves from a static icon into an AI-powered archive assistant. Combined with interactive tutorials, project sharing, user profiles with avatar customization, and sustainable monetization via Polar.sh, this phase creates a cohesive, engaging platform.

**Goal:** Deepen user engagement through AI assistance, guided onboarding, collaboration features, and sustainable funding. **Duration:** 3-4 weeks **Dependencies:** Phase 5 complete (onboarding modal working)

---

## Implementation Progress

| Sub-Phase | Status | Notes |
| --- | --- | --- |
| Vellum AI Assistant | Complete | Streaming chat with personality (PR #35) |
| Chat History Persistence | Complete | `convex/chatHistory.ts`, `chatMessages` table |
| Demo Project Seeding | Complete | "The Verdant Realm" with 3 docs, 12 entities, 10 facts, 2 alerts |
| Tour Library Setup | Complete | Custom overlay tour with data-tour targets |
| Tour Step Definitions | Complete | Project overview, documents, entities, alerts, Vellum |
| Command Palette | Complete | Cmd+K navigation with fuzzy search |
| Keyboard Shortcuts | Complete | Global shortcuts with chord support |
| Onboarding Modal | Complete | New user welcome flow |
| Project Sharing | Removed | Simplified to owner-only; no collaboration for MVP |
| Project Categories | Complete | TTRPG/Fiction/Game Design/General modes + reveal mechanics (PR #42) |
| Notes | Complete | Project/entity notes with CRUD, UI routes, sidebar nav; tests pending |
| User Profiles | Complete | Name, bio, avatar uploads, email/password change (MVP flow) |
| Polar.sh Integration | Complete | Subscription tiers, webhook handler, limit enforcement (PR #TBD) |

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

A pre-built "The Verdant Realm" project demonstrating all features. Created via `seedTutorialProject` mutation in `convex/tutorial.ts`.

**Implementation Details:**

- **Schema:** Added `isTutorial: v.optional(v.boolean())` to projects table
- **Mutation:** `seedTutorialProject` creates complete tutorial project
- **OnboardingModal:** "Let's Begin" seeds project and navigates to it; "Skip" only marks onboarding complete
- **Idempotency:** Returns existing tutorial project if user already has one

**Content Created:**

| Type | Count | Examples |
| --- | --- | --- |
| Documents | 3 | Chapter 1: The Beginning, Chapter 2: The Conflict, Chapter 3: The Discovery |
| Entities | 12 | Sir Aldric, Lady Mira, Dragon of Ashfall, Thornhaven, The Emerald Crown, etc. |
| Facts | 10 | "commands", "daughter of", "guards", "forged by", "located in", etc. |
| Alerts | 2 | Age contradiction (error), Crown origin conflict (warning) |

**Entity Type Coverage:**

- Characters: Sir Aldric, Lady Mira, Dragon of Ashfall, Forest Spirit, Elara the First Queen
- Locations: Thornhaven, Thornwood Forest, The Ashen Peaks
- Items: The Emerald Crown
- Concepts: The Shadowbane, The Verdant Blessing
- Events: Festival of Green Leaves

**Alert Demonstrations:**

1. **Error - Age Contradiction:** Sir Aldric described as "60 winters old" in Chapter 1 but "50 winters old" in Chapter 2
2. **Warning - Origin Conflict:** The Emerald Crown described as "forged by ancient smiths" but also "gifted from Forest Spirit"

```typescript
// convex/tutorial.ts - Key exports
export const seedTutorialProject = mutation({...}); // Creates complete tutorial
export const hasTutorialProject = mutation({...});  // Checks if user has one

// Usage in OnboardingModal
const { projectId } = await seedTutorialProject();
await completeOnboarding();
navigate({ to: '/projects/$projectId', params: { projectId } });
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
    target: '[data-tour="alerts-nav"]',
    title: 'Continuity Alerts',
    content:
      'Alerts flag contradictions or timeline issues. Click Alerts to see how they work.',
  },
  {
    target: '[data-tour="alerts-list"]',
    title: 'Review an Alert',
    content:
      'Each alert shows evidence from the canon and the new document for fast review.',
  },
  {
    target: '[data-tour="alert-actions"]',
    title: 'Fix or Dismiss',
    content:
      'Resolve an alert after you fix the document, or dismiss it if the conflict is intentional.',
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

## 3. Project Sharing (REMOVED)

**Status:** Removed from MVP scope. Projects are owner-only.

The sharing feature was fully implemented but removed to simplify the MVP:

- Deleted `convex/projectShares.ts` and all sharing tests
- Simplified `convex/lib/projectAccess.ts` to owner-only checks
- Removed viewer filtering logic from entities/facts queries

**Future consideration:** May revisit sharing post-launch based on user feedback.

---

## 4. Project Categories (COMPLETE)

Project categories enable users to select what kind of projects they work on, with mode-specific features.

### Implementation Status

**Completed in PR #42:**

| Component | Status | Notes |
| --- | --- | --- |
| Schema changes | ✅ | `projectType` on projects, `revealedToViewers`/`revealedAt` on entities, `projectModes` on user settings |
| Backend mutations | ✅ | `revealToPlayers`, `hideFromPlayers` in `convex/entities.ts` |
| Project creation | ✅ | Type selector required in new project form |
| Entity reveal UI | ✅ | Toggle in entity list/detail for TTRPG projects |
| Manual entity/fact creation | ✅ | EntityForm, FactForm components with full CRUD |
| Tests | ✅ | 265 tests passing |

### Categories

| Category | Slug | Use Case |
| --- | --- | --- |
| **TTRPG / DM Mode** | `ttrpg` | Tabletop RPG game masters - hidden content, reveal mechanics |
| **Original Fiction** | `original-fiction` | Novels, short stories - timeline tracking |
| **Fanfiction** | `fanfiction` | Stories in existing universes |
| **Game Design** | `game-design` | Video games, board games - asset tracking |
| **General** | `general` | Default mode - wiki-style canon tracking |

### Data Model

#### Project Type (Optional)

```typescript
projects: defineTable({
  // ... existing fields
  projectType: v.optional(
    v.union(
      v.literal('ttrpg'),
      v.literal('original-fiction'),
      v.literal('fanfiction'),
      v.literal('game-design'),
      v.literal('general')
    )
  ),
  revealToPlayersEnabled: v.optional(v.boolean()), // TTRPG only: enable player reveal controls
});
```

#### Entity Reveal Fields (TTRPG only)

```typescript
entities: defineTable({
  // ... existing fields
  revealedToViewers: v.optional(v.boolean()), // default false = hidden
  revealedAt: v.optional(v.union(v.number(), v.null())), // timestamp or null when hidden
});
```

### TTRPG Mode: Reveal Mechanics

For TTRPG projects, entities have visibility control:

- **Hidden** (default): `revealedToViewers` is `false` or `undefined`
- **Revealed**: `revealedToViewers` is `true`, `revealedAt` has timestamp

#### UI Behavior

- Entity list shows 🔒/👁 badge for TTRPG projects (confirmed entities only)
- Entity detail page shows reveal/hide button for TTRPG project owners
- Badge only appears when `onReveal` or `onHide` callbacks are provided
- Project form prompts for player reveal setting when type is `ttrpg`

#### Mutations

```typescript
// convex/entities.ts
export const revealToPlayers = mutation({...}); // Sets revealedToViewers=true, revealedAt=now
export const hideFromPlayers = mutation({...}); // Sets revealedToViewers=false, revealedAt=null
```

### Manual Entity/Fact Creation

Users can now create entities and facts manually (not just via LLM extraction):

- **EntityForm**: Name, type, description, aliases
- **FactForm**: Subject (entity or text), predicate, object (entity or text), evidence
- Forms show entity/document names in dropdowns with "None" option for deselection
- Different deletion warnings for manual vs LLM-extracted entities

---

## 5. Notes

Private notes for project-level and entity-level annotations. Owner-only visibility.

### Use Cases

| Use Case           | Example                                                 |
| ------------------ | ------------------------------------------------------- |
| Session notes      | DM session prep, post-session recap                     |
| Writing notes      | Plot outlines, character backstory drafts               |
| World notes        | Lore ideas not ready for documents                      |
| Entity annotations | Private notes attached to specific characters/locations |

### Data Model

#### Project Notes

General notes within a project:

```typescript
notes: defineTable({
  projectId: v.id('projects'),
  userId: v.id('users'),
  title: v.string(),
  content: v.string(),
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_project', ['projectId', 'updatedAt'])
  .index('by_user', ['userId'])
  .searchIndex('search_content', {
    searchField: 'content',
    filterFields: ['projectId'],
  });
```

#### Entity Notes

Annotations attached to specific entities:

```typescript
entityNotes: defineTable({
  entityId: v.id('entities'),
  projectId: v.id('projects'),
  userId: v.id('users'),
  content: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_entity', ['entityId', 'updatedAt'])
  .index('by_project', ['projectId']);
```

### Backend Functions

#### Project Notes

```typescript
// convex/notes.ts
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await requireAuth(ctx);
    await verifyProjectOwnership(ctx, projectId, userId);

    return ctx.db
      .query('notes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await verifyProjectOwnership(ctx, args.projectId, userId);

    return ctx.db.insert('notes', {
      ...args,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('notes'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) {
      throw new Error('Note not found');
    }

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) {
      throw new Error('Note not found');
    }

    await ctx.db.delete(id);
  },
});

export const search = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
  },
  handler: async (ctx, { projectId, query }) => {
    const userId = await requireAuth(ctx);
    await verifyProjectOwnership(ctx, projectId, userId);

    return ctx.db
      .query('notes')
      .withSearchIndex('search_content', (q) =>
        q.search('content', query).eq('projectId', projectId)
      )
      .take(20);
  },
});
```

#### Entity Notes

```typescript
// convex/entityNotes.ts
export const list = query({
  args: { entityId: v.id('entities') },
  handler: async (ctx, { entityId }) => {
    const userId = await requireAuth(ctx);
    const entity = await ctx.db.get(entityId);
    if (!entity) return [];

    await verifyProjectOwnership(ctx, entity.projectId, userId);

    return ctx.db
      .query('entityNotes')
      .withIndex('by_entity', (q) => q.eq('entityId', entityId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: {
    entityId: v.id('entities'),
    content: v.string(),
  },
  handler: async (ctx, { entityId, content }) => {
    const userId = await requireAuth(ctx);
    const entity = await ctx.db.get(entityId);
    if (!entity) throw new Error('Entity not found');

    await verifyProjectOwnership(ctx, entity.projectId, userId);

    return ctx.db.insert('entityNotes', {
      entityId,
      projectId: entity.projectId,
      userId,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('entityNotes'),
    content: v.string(),
  },
  handler: async (ctx, { id, content }) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) {
      throw new Error('Note not found');
    }

    await ctx.db.patch(id, { content, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('entityNotes') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(id);
    if (!note || note.userId !== userId) {
      throw new Error('Note not found');
    }

    await ctx.db.delete(id);
  },
});
```

### Frontend Components

#### Routes

```
src/routes/
├── projects_.$projectId_.notes.tsx        # Notes list
├── projects_.$projectId_.notes.$noteId.tsx # Note detail/edit
└── projects_.$projectId_.notes.new.tsx     # New note
```

#### Components

```
src/components/
├── NoteCard.tsx          # Note preview card
├── NoteEditor.tsx        # Markdown editor for notes
├── NotesList.tsx         # Paginated notes list with search
├── EntityNotesPanel.tsx  # Collapsible panel on entity detail page
└── TagFilter.tsx         # Filter notes by tags
```

#### Entity Detail Integration

Add notes panel to entity detail page (`entities.$entityId.tsx`):

```typescript
function EntityDetail() {
  // ... existing code

  return (
    <div>
      {/* Existing entity info */}
      <EntityInfo entity={entity} />

      {/* Notes panel */}
      <EntityNotesPanel entityId={entity._id} />
    </div>
  );
}
```

### UX Design

#### Project Notes List

```
┌─────────────────────────────────────────────────┐
│ Notes                              [+ New Note] │
├─────────────────────────────────────────────────┤
│ 🔍 Search notes...          [session] [plot] ▼ │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Session 5 Prep                              │ │
│ │ Dragon encounter, reveal crown location... │ │
│ │ #session #prep         Updated 2 hours ago │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Aldric Backstory Draft                      │ │
│ │ Born in the eastern provinces, trained...  │ │
│ │ #character #backstory   Updated yesterday  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

#### Entity Notes Panel

Collapsible section on entity detail:

```
┌─────────────────────────────────────────────────┐
│ ▼ Notes (2)                         [+ Add]    │
├─────────────────────────────────────────────────┤
│ "Remember to foreshadow his betrayal in Ch 4"  │
│                              — Jan 5, 2026     │
│ ─────────────────────────────────────────────── │
│ "Voice: gruff, formal, slight accent"          │
│                              — Jan 3, 2026     │
└─────────────────────────────────────────────────┘
```

### Implementation Order

1. **Schema** - Add `notes` and `entityNotes` tables
2. **Backend** - CRUD mutations for both note types
3. **Project notes UI** - List, create, edit, delete, search
4. **Entity notes UI** - Panel on entity detail page
5. **Navigation** - Add Notes to project sidebar

### Testing Strategy

**Backend:**

- Only project owner can CRUD notes
- Notes cascade delete when project deleted
- Entity notes cascade delete when entity deleted
- Search returns matching notes

**Frontend:**

- Notes list renders with search/filter
- Create/edit form saves correctly
- Entity notes panel shows on entity detail
- Tags filter works

---

## 6. User Profiles (COMPLETE)

Enable users to manage their account settings, profile information, and security credentials. Users can update their email, password, display name, bio, and profile picture using Convex's built-in file storage.

### Implementation Status

**Completed in PR #45:**

| Component | Status | Notes |
| --- | --- | --- |
| Schema changes | ✅ | `bio`, `avatarStorageId` on users table |
| Profile mutations | ✅ | `updateProfile`, `updateAvatar`, `removeAvatar` |
| Email change | ✅ | Direct update (MVP - no email verification) |
| Password change | ✅ | `changePassword` action with current password verification |
| Settings UI | ✅ | Profile tab (avatar, name, bio, categories) + Security tab (email, password) |
| Tests | ✅ | Profile, avatar, email, password tests passing |

### Architecture

**Single-Layer Approach (MVP):**

- **Profile Fields**: Name, bio, avatar via standard `patch` mutations on `users` table
- **Email Change**: Direct update after uniqueness check (no OTP verification - no email service configured)
- **Password Change**: Requires current password verification via `@convex-dev/auth` `retrieveAccount`

**Avatar Storage Pattern:**

- Store file reference as `avatarStorageId: v.id('_storage')` in user schema
- Use existing `convex/storage.ts` functions: `generateUploadUrl`, `getFileUrl`, `deleteFile`
- Server-side validation: content type (JPG/PNG/WebP) and size (max 5MB)
- Delete old file on avatar replacement to prevent storage bloat

### Schema

```typescript
users: defineTable({
  // ... existing fields ...
  bio: v.optional(v.string()),
  avatarStorageId: v.optional(v.id('_storage')),
});
```

**Avatar Display Logic:**

```typescript
const avatarUrl =
  user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null;
```

### Backend Functions

#### Profile Query

```typescript
export const viewerProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const avatarUrl =
      user.avatarStorageId ?
        await ctx.storage.getUrl(user.avatarStorageId)
      : null;

    return { ...user, avatarUrl };
  },
});
```

#### Profile Mutations

```typescript
export const updateProfile = mutation({...}); // Name + bio with validation
export const updateAvatar = mutation({...});  // Validates type/size, deletes old
export const removeAvatar = mutation({...});  // Removes and deletes from storage
```

#### Email Change (MVP)

```typescript
export const updateEmail = mutation({
  args: { newEmail: v.string() },
  handler: async (ctx, { newEmail }) => {
    const user = await requireAuthUser(ctx);
    const normalized = newEmail.toLowerCase().trim();

    // Zod email validation
    // Uniqueness check via by_email index
    // Direct update (no OTP - no email service)

    await ctx.db.patch(user._id, { email: normalized });
    return user._id;
  },
});
```

**Note:** Two-step email verification (OTP) is documented below but not implemented. Requires email service integration. Current MVP allows direct email change after uniqueness check.

#### Password Change

```typescript
export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { currentPassword, newPassword }) => {
    // Validate new password (8-128 chars)
    // Verify current password via retrieveAccount
    // Update via modifyAccountCredentials
    // Note: Only works for password-based accounts
  },
});
```

### Frontend Components

#### Settings Page (`src/routes/settings.tsx`)

Two tabs:

- **Profile Tab**: Avatar upload, name/bio form, project categories
- **Security Tab**: Email change (with confirmation modal), password change

#### Component Structure

```
ProfileTab
├── AvatarSection      # Upload/remove avatar
├── ProfileFieldsForm  # Name + bio
└── ProjectModesSection # Category preferences

SecurityTab
├── EmailChangeCard    # Current email, new email input, confirm dialog
└── PasswordChangeCard # Current + new password
```

### Validation Rules

| Field    | Rules                                   |
| -------- | --------------------------------------- |
| Name     | Trim, max 80 chars                      |
| Bio      | Trim, max 500 chars                     |
| Email    | Zod email validation, lowercase, unique |
| Password | Min 8, max 128 chars                    |
| Avatar   | JPG/PNG/WebP only, max 5MB              |

### Security Considerations

- **Server-side validation**: Never trust client for avatar type/size
- **Password verification**: Current password required before change
- **Uniqueness enforcement**: Email checked via database index
- **File cleanup**: Old avatars deleted on replace/remove

### Future Enhancements

When email service is configured, implement two-step verification:

1. `requestEmailChange` - Sets pending email, sends OTP
2. `confirmEmailChange` - Verifies OTP, updates email, invalidates sessions

Schema fields for future use:

```typescript
pendingEmail: v.optional(v.string()),
pendingEmailSetAt: v.optional(v.number()),
```

---

## 7. Polar.sh Monetization (COMPLETE)

Integrated [Polar.sh](https://polar.sh) for sustainable subscription-based monetization.

### Implementation Status

| Component | Status | Notes |
| --- | --- | --- |
| Schema changes | ✅ | `subscriptionTier`, `subscriptionStatus`, `polarCustomerId`, `polarSubscriptionId`, `trialEndsAt`, `usage` object on users |
| Tier system | ✅ | Free (limited) vs Unlimited ($5/month) with 7-day trial |
| Limit helpers | ✅ | `convex/lib/limits.ts`, `convex/lib/subscription.ts` |
| Subscription functions | ✅ | Queries + mutations in `convex/subscription.ts` |
| Limit enforcement | ✅ | projects, documents, entities, LLM extractions, chat |
| Polar webhook | ✅ | `/webhooks/polar` in `convex/http.ts` |
| Frontend components | ✅ | TierBadge, UpgradePrompt, Settings subscription tab |
| Tests | ✅ | 47 subscription tests passing |

### Pricing Model

| Tier | Price | Limits |
| --- | --- | --- |
| **Free** | $0 | 3 projects, 10 docs/project, 50 entities/project, 20 extractions/month, 50 chat/month |
| **Realm Unlimited** | $5/month | Unlimited everything |

**Trial:** 7-day free trial of Unlimited tier.

### Data Model

```typescript
// Users table additions
subscriptionTier: v.optional(v.union(v.literal('free'), v.literal('unlimited'))),
subscriptionStatus: v.optional(v.union(
  v.literal('active'),
  v.literal('canceled'),
  v.literal('past_due'),
  v.literal('trialing')
)),
polarCustomerId: v.optional(v.string()),
polarSubscriptionId: v.optional(v.string()),
trialEndsAt: v.optional(v.number()),
usage: v.optional(v.object({
  llmExtractionsThisMonth: v.number(),
  chatMessagesThisMonth: v.number(),
  usageResetAt: v.number(),
})),
```

### Backend Functions

#### Queries

- `getSubscription` - Returns tier, status, limits, trial info
- `getUsageStats` - Returns current usage with limits and percentages

#### Mutations

- `startTrial` - Starts 7-day trial for free users
- `handleSubscriptionActivated` - Called by webhook on subscription.activated
- `handleSubscriptionCanceled` - Called by webhook on subscription.canceled

#### Internal Functions (for limit checks)

- `checkExtractionLimit` / `incrementExtractionUsage`
- `checkChatLimit` / `incrementChatUsage`

### Limit Enforcement

| Resource | Check Location | Error |
| --- | --- | --- |
| Projects | `convex/projects.ts` create | "Project limit reached" |
| Documents | `convex/documents.ts` create | "Document limit reached" |
| Entities | `convex/entities.ts` create | "Entity limit reached" |
| Extractions | `convex/llm/extract.ts` chunkAndExtract | "Monthly extraction limit reached" |
| Chat | `convex/chat.ts` sendMessage | "Monthly chat limit reached" |

### Webhook Handler

```typescript
// convex/http.ts - /webhooks/polar
// Verifies HMAC signature with POLAR_WEBHOOK_SECRET
// Handles events:
// - subscription.created (no-op, wait for activated)
// - subscription.activated → handleSubscriptionActivated
// - subscription.canceled → handleSubscriptionCanceled
// - subscription.revoked → handleSubscriptionCanceled
```

### Frontend Components

#### TierBadge

Shows "Free" (muted) or "Realm Unlimited" (gold/amber) badge.

#### UpgradePrompt

Modal showing:

- Current usage vs limits
- Benefits of upgrading
- "Upgrade - $5/month" button → Polar checkout
- "Start 7-day Free Trial" button

#### Settings Subscription Tab

- Current tier with badge
- Usage progress bars (extractions, chat)
- Start trial / Upgrade buttons

### Environment Variables

```
# Server
POLAR_WEBHOOK_SECRET=whsec_...

# Client
VITE_POLAR_CHECKOUT_URL=https://polar.sh/realm-sync/subscribe
```

---

## 8. Testing & QA

- **Vellum Chat:** Test context loading, response quality, error handling
- **Tour Flow:** Verify all steps highlight correct elements
- **Sharing:** Test invite flow, role permissions, viewer restrictions
- **User Profiles:** Test profile updates, avatar uploads, email/password changes
- **Polar.sh:** Verify webhook handling, sponsor status sync
- **Accessibility:** Keyboard navigation, screen reader support

---

## 9. Future Enhancements

- **Vellum Voice:** Text-to-speech for Vellum's responses
- **Vellum Proactive:** Vellum suggests actions based on project state
- **Public Sharing:** Generate public read-only links for world wikis
- **Export for Players:** Generate player-facing PDF/markdown handouts
- **Achievement System:** Reward users for completing milestones
- **A/B Testing:** Track engagement and optimize experience
- **Route Flattening:** Deeply nested routes (e.g., `projects_.$projectId_.documents.tsx`) should be migrated to folder-based structure for maintainability
