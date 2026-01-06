---
summary: User engagement features including Vellum AI assistant, interactive tutorials, project sharing, project categories, user profiles, and monetization.
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
| Project Sharing (Backend) | Complete | `projectShares.ts`, `projectAccess.ts`, role-based access |
| Project Sharing (UI) | Pending | ShareProjectDialog, shared projects list |
| Project Categories | Pending | TTRPG/Fiction/Game Design/General modes + reveal mechanics |
| User Profiles | Pending | Email/password change, bio, avatar uploads via Convex storage |
| Polar.sh Integration | Pending | Sponsorship, funding, premium features |

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
  sharedWithUserId: v.optional(v.id('users')), // Set when user accepts
  role: v.union(v.literal('editor'), v.literal('viewer')),
  invitedBy: v.id('users'),
  acceptedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_project', ['projectId'])
  .index('by_email', ['sharedWithEmail'])
  .index('by_user', ['sharedWithUserId']);
```

### Implementation

**Backend (Complete):**

- `convex/projectShares.ts` - invite, accept, revoke, list queries/mutations
- `convex/lib/projectAccess.ts` - getProjectRole, canReadProject, canEditProject helpers
- All data queries (entities, facts, documents) updated to respect role permissions
- Viewers only see `status: 'confirmed'` entities and facts
- 21 tests covering all permission scenarios

### Viewer Restrictions

- See only `status: 'confirmed'` entities and facts
- No access to pending extractions or alerts
- Cannot see document raw content (only entity/fact references)
- Read-only timeline and connections views

---

## 4. Project Categories

Enable users to select what kind of projects they work on, with mode-specific features.

### Problem Statement

Different users have different needs:

- **TTRPG DMs** need hidden content players can't see until revealed
- **Fiction writers** need timeline tracking and character arcs
- **Game designers** need asset tracking and lore bibles
- **General worldbuilders** need standard canon tracking

### Categories

| Category | Slug | Use Case | Key Features |
| --- | --- | --- | --- |
| **TTRPG / DM Mode** | `ttrpg` | Tabletop RPG game masters | Hidden content, player handouts, reveal mechanics |
| **Original Fiction** | `original-fiction` | Novels, short stories | Timeline tracking, character arcs, plot threads |
| **Fanfiction** | `fanfiction` | Stories in existing universes | Canon vs headcanon, source tracking |
| **Game Design** | `game-design` | Video games, board games | Asset tracking, lore bibles, design docs |
| **General** | `general` | Wiki-style, collaborative | Standard canon tracking (default) |

### Data Model

#### User Preferences

Add to `users.settings`:

```typescript
settings: v.optional(v.object({
  theme: v.optional(v.string()),
  notifications: v.optional(v.boolean()),
  projectModes: v.optional(v.array(v.union(
    v.literal('ttrpg'),
    v.literal('original-fiction'),
    v.literal('fanfiction'),
    v.literal('game-design'),
    v.literal('general')
  ))),
})),
```

#### Project Type

Add to `projects` table:

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
});
```

**Default behavior:** New projects use user's first preference, or `general` if none set.

### TTRPG Mode: Reveal Mechanics

For TTRPG projects, entities need visibility control for the DM/player dynamic.

#### Schema Extension

Add to `entities` table:

```typescript
entities: defineTable({
  // ... existing fields
  revealedToViewers: v.optional(v.boolean()), // default false = hidden from players
  revealedAt: v.optional(v.number()), // timestamp of reveal
});
```

#### Viewer Filtering (Extended)

Current viewer filtering:

```typescript
// Viewers see only confirmed content
if (access.isViewer) {
  entities = entities.filter((e) => e.status === 'confirmed');
}
```

Extended for TTRPG projects:

```typescript
// TTRPG viewers see only confirmed AND revealed content
if (access.isViewer && project.projectType === 'ttrpg') {
  entities = entities.filter(
    (e) => e.status === 'confirmed' && e.revealedToViewers === true
  );
}
```

#### Reveal Mutation

```typescript
export const revealToPlayers = mutation({
  args: {
    entityId: v.id('entities'),
  },
  handler: async (ctx, { entityId }) => {
    const userId = await requireAuth(ctx);
    const entity = await ctx.db.get(entityId);
    if (!entity) throw new Error('Entity not found');

    // Only project owner can reveal
    const project = await ctx.db.get(entity.projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Not authorized');
    }

    // Only TTRPG projects have reveal mechanics
    if (project.projectType !== 'ttrpg') {
      throw new Error('Reveal is only available for TTRPG projects');
    }

    await ctx.db.patch(entityId, {
      revealedToViewers: true,
      revealedAt: Date.now(),
    });
  },
});

export const hideFromPlayers = mutation({
  args: {
    entityId: v.id('entities'),
  },
  handler: async (ctx, { entityId }) => {
    // Similar auth checks...
    await ctx.db.patch(entityId, {
      revealedToViewers: false,
      revealedAt: undefined,
    });
  },
});
```

### UX Flow

#### Onboarding

After signup, ask "What are you building?" with multi-select:

```
┌─────────────────────────────────────────────────┐
│ What are you building?                          │
│ (Select all that apply)                         │
│                                                 │
│ ☐ TTRPG Campaigns (D&D, Pathfinder, etc.)      │
│ ☐ Original Fiction (novels, short stories)     │
│ ☐ Fanfiction                                   │
│ ☐ Game Design (video games, board games)       │
│ ☐ General Worldbuilding                        │
│                                                 │
│                            [Continue]           │
└─────────────────────────────────────────────────┘
```

Stored in `users.settings.projectModes`.

Also mention the command palette (Cmd+K / Ctrl+K) for quick navigation during onboarding.

#### Project Creation

Default to user's first preference. Allow override:

```
Project Type: [TTRPG Campaign ▼]
```

#### Settings Page

Users can update their preferences anytime in `/settings`.

#### TTRPG Entity List

For TTRPG projects, entity rows show reveal status:

| Entity            | Type      | Status    | Visible to Players |
| ----------------- | --------- | --------- | ------------------ |
| Dragon of Ashfall | character | confirmed | 🔒 Hidden          |
| Thornhaven        | location  | confirmed | 👁 Revealed        |
| The Emerald Crown | item      | pending   | —                  |

Toggle via row action menu: "Reveal to Players" / "Hide from Players"

### Implementation Order

1. **Schema changes** - Add `projectType` to projects, `revealedToViewers` to entities, `projectModes` to user settings
2. **Backend mutations** - `revealToPlayers`, `hideFromPlayers`, update entity queries for TTRPG filtering
3. **Onboarding step** - Project mode selection in OnboardingModal
4. **Project creation** - Type selector in new project form
5. **Entity reveal UI** - Toggle in entity list/detail for TTRPG projects
6. **Settings page** - Preferences management

### Testing Strategy

**Backend:**

- Reveal/hide mutations require project ownership
- TTRPG viewers only see revealed entities
- Non-TTRPG projects ignore reveal fields
- Reveal persists across sessions

**Frontend:**

- Onboarding saves preferences
- Project type selector works
- Reveal toggle appears only for TTRPG projects
- Viewers don't see hidden entities

---

## 5. User Profiles

Enable users to manage their account settings, profile information, and security credentials. This feature allows users to update their email, password, display name, bio, and profile picture using Convex's built-in file storage.

### Current State Analysis

**Existing User Schema (from `convex/schema.ts`):**

```typescript
users: defineTable({
  // Identity fields (from Convex Auth)
  name: v.optional(v.string()),          // ✅ Display name exists
  email: v.optional(v.string()),         // ✅ Email field exists
  emailVerificationTime: v.optional(v.float64()),
  image: v.optional(v.string()),         // ✅ Avatar URL (for OAuth)
  isAnonymous: v.optional(v.boolean()),

  // App-specific fields
  createdAt: v.number(),
  onboardingCompleted: v.optional(v.boolean()),

  // Tutorial state (nested object)
  tutorialState: v.optional(v.object({
    hasSeenTour: v.boolean(),
    completedSteps: v.array(v.string()),
    tourStartedAt: v.optional(v.number()),
    tourCompletedAt: v.optional(v.number()),
  })),

  // User preferences (nested object)
  settings: v.optional(v.object({
    theme: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
  })),
}).index('by_email', ['email']),
```

**Auth Functions Available (from `convex/lib/auth.ts`):**

- `getAuthUserId()` - Get user ID (null if not authenticated)
- `requireAuth()` - Require authenticated user ID
- `getCurrentUser()` - Get full user object (null if not authenticated)
- `requireAuthUser()` - Require and return full user object

**Existing User Functions (from `convex/users.ts`):**

- `viewer` - Query to get current user
- `completeOnboarding` - Complete onboarding
- Tutorial-related mutations only

**Critical Gaps Identified:**

| Feature | Status | Notes |
| --- | --- | --- |
| Password update mutations | ❌ NOT IMPLEMENTED | No `changePassword` function exists |
| Email update mutations | ❌ NOT IMPLEMENTED | No `updateEmail` function exists |
| Profile update mutations | ❌ NOT IMPLEMENTED | Only onboarding/tutorial mutations exist |
| Bio field | ❌ NOT IMPLEMENTED | Not in user schema |
| Avatar upload flow | ❌ NOT IMPLEMENTED | Only has `image` string field for OAuth |

### Architecture

**Two-Layer Approach:**

1. **Profile Layer** - Public profile fields (name, bio, avatar) via standard `patch` mutations on `users` table
2. **Credentials Layer** - Sensitive data (email, password) via `@convex-dev/auth` server APIs + verification + session invalidation

**Avatar Storage Pattern:**

- Store file reference as `storageId: v.id('_storage')` in user schema
- Use existing `convex/storage.ts` functions: `generateUploadUrl`, `getFileUrl`, `deleteFile`
- Follow `DocumentForm.tsx` pattern: upload URL → direct POST → store `storageId` → derive URL
- Delete old file on avatar replacement to prevent storage bloat

### Schema Changes

Add to `convex/schema.ts` in the `users` table:

```typescript
users: defineTable({
  // ... existing fields ...

  // Profile fields (NEW)
  bio: v.optional(v.string()), // User bio/about section
  avatarStorageId: v.optional(v.id('_storage')), // Convex file storage reference

  // Email change verification (NEW, for secure email updates)
  pendingEmail: v.optional(v.string()), // Awaiting verification
  pendingEmailSetAt: v.optional(v.number()), // When email change requested
});
```

**Migration:** No backfill required. All new fields are `optional`, so existing users remain unaffected.

**Avatar Display Logic:**

```typescript
// Prefer uploaded avatar, fallback to OAuth URL
const avatarUrl =
  user.avatarStorageId ?
    await ctx.storage.getUrl(user.avatarStorageId)
  : (user.image ?? null);
```

### Backend Mutations

#### 4.1 Profile Queries

**File:** `convex/users.ts` (extend existing file or create `convex/profile.ts`)

```typescript
// Extend or replace existing `viewer` query
export const viewerProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    // Compute avatar URL from storage
    const avatarUrl =
      user.avatarStorageId ?
        await ctx.storage.getUrl(user.avatarStorageId)
      : (user.image ?? null);

    return {
      ...user,
      avatarUrl,
      // Don't leak sensitive fields
    };
  },
});
```

#### 4.2 Profile Fields Mutation

```typescript
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, { name, bio }) => {
    const user = await requireAuthUser(ctx);

    // Build updates object only for provided fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    if (Object.keys(updates).length === 0) {
      throw new Error('No fields to update');
    }

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});
```

#### 4.3 Avatar Mutations

Uses existing `convex/storage.ts` functions:

```typescript
// Validate and set avatar from uploaded file
export const updateAvatar = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const user = await requireAuthUser(ctx);

    // Server-side validation of uploaded file
    const meta = await ctx.db.system.get(storageId);
    if (!meta) {
      throw new Error('File not found');
    }

    // Enforce avatar constraints
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(meta.contentType)) {
      await ctx.storage.delete(storageId); // Cleanup invalid file
      throw new Error('Invalid file type. Use JPG, PNG, or WebP.');
    }

    if (meta.size > maxSize) {
      await ctx.storage.delete(storageId); // Cleanup oversized file
      throw new Error('File too large. Maximum size is 5MB.');
    }

    // Delete old avatar file if exists
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }

    // Update user with new avatar
    await ctx.db.patch(user._id, { avatarStorageId: storageId });
    return storageId;
  },
});

// Remove avatar and revert to OAuth image
export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
      await ctx.db.patch(user._id, { avatarStorageId: undefined });
    }

    return user._id;
  },
});
```

#### 4.4 Password Change Mutation

Requires `@convex-dev/auth` server APIs:

```typescript
import {
  modifyAccountCredentials,
  invalidateSessions,
} from '@convex-dev/auth/server';

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const user = await requireAuthUser(ctx);

    // NOTE: Password verification should be done on client via re-auth flow
    // (signIn with current password) before calling this mutation.
    // Backend can optionally enforce "recent session" if tracked.

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Update credential via convex-auth
    // NOTE: You must align with your password provider configuration
    const accountId = user.email; // Or however password accounts are identified
    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: {
        id: accountId,
        secret: newPassword,
      },
    });

    // Invalidate all sessions (force re-login)
    await invalidateSessions(ctx, { userId: user._id });

    return user._id;
  },
});
```

**Client Flow:**

1. User enters current password → click "Change Password"
2. Client calls `signIn('password', { flow: 'signIn', email, password: currentPassword })` to re-auth
3. On success, call `changePassword({ currentPassword, newPassword })` mutation
4. Redirect to login page with toast: "Password changed. Please sign in again."

#### 4.5 Email Change Mutations

Two-step verification flow (recommended for security):

```typescript
// Step 1: Request email change
export const requestEmailChange = mutation({
  args: { newEmail: v.string() },
  handler: async (ctx, { newEmail }) => {
    const user = await requireAuthUser(ctx);

    // Normalize email
    const normalized = newEmail.toLowerCase().trim();

    // Check email format
    if (!normalized.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Check email uniqueness
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .first();

    if (existing && existing._id !== user._id) {
      throw new Error('Email already in use');
    }

    // Set pending email
    await ctx.db.patch(user._id, {
      pendingEmail: normalized,
      pendingEmailSetAt: Date.now(),
    });

    // Trigger verification email via convex-auth Password provider
    // (Configure OTP flow in `convex/auth.ts` if not already set up)

    return user._id;
  },
});

// Step 2: Confirm email change with verification code
export const confirmEmailChange = mutation({
  args: { newEmail: v.string(), code: v.string() },
  handler: async (ctx, { newEmail, code }) => {
    const user = await requireAuthUser(ctx);

    // Verify code (via convex-auth OTP flow)
    // This should be handled by calling `signIn` from client with verification code
    // The mutation finalizes the change after successful verification

    // Verify pending email matches
    if (user.pendingEmail !== newEmail) {
      throw new Error('Email verification expired or invalid');
    }

    // Update email
    await ctx.db.patch(user._id, {
      email: newEmail,
      pendingEmail: undefined,
      pendingEmailSetAt: undefined,
    });

    // Update convex-auth account identifier if needed
    // (Depends on your auth provider configuration)

    // Invalidate sessions (force re-login)
    await invalidateSessions(ctx, { userId: user._id });

    return user._id;
  },
});
```

**Client Flow (Email Change):**

1. User enters new email → click "Send Verification Code"
2. Call `requestEmailChange({ newEmail })` mutation
3. Receive verification code in email
4. Enter code → call `confirmEmailChange({ newEmail, code })` mutation
5. Redirect to login page with toast: "Email updated. Please sign in again."

**MVP Alternative (Simpler, Less Secure):**

Skip OTP verification, require current password + immediate change:

- Add `password: v.string()` arg to `updateEmail` mutation
- Verify password via convex-auth (or skip verification)
- Update email immediately
- Invalidate sessions

### Validation Rules

**Name:**

- Trim whitespace
- Min 1, max 80 characters
- Allow Unicode letters and common punctuation

**Bio:**

- Trim whitespace
- Max 500 characters
- Support plain text (or markdown with sanitization)

**Email:**

- Valid email format (client: Zod `email()`, server: basic validation)
- Enforce uniqueness via `by_email` index
- Normalize: lowercase, trim

**Password:**

- Min 8 characters (recommend 12)
- Max 128 characters (DoS protection)
- Optionally: Require 3 of 4: lowercase, uppercase, number, symbol
- No common passwords (optional)

**Avatar:**

- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Max size: 5MB
- Server-side validation in `updateAvatar` (never trust client)

### Frontend Components

#### Route

Add `src/routes/settings.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <div className="grid gap-8">
        <ProfileSection />
        <AvatarSection />
        <EmailSection />
        <PasswordSection />
      </div>
    </div>
  );
}
```

#### Component Structure

Create `src/components/profile/`:

```
src/components/profile/
├── ProfileSettingsPage.tsx   # Container (or use route component)
├── ProfileFieldsForm.tsx      # Name + bio form
├── AvatarPicker.tsx           # Upload/remove avatar
├── EmailChangeForm.tsx        # Email update with verification
└── PasswordChangeForm.tsx     # Password update
```

**Example: AvatarPicker.tsx**

```typescript
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function AvatarPicker() {
  const user = useQuery(api.users.viewerProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const removeAvatar = useMutation(api.users.removeAvatar);

  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(file: File) {
    // Client-side validation
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Invalid file type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file directly
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Step 3: Update user with storageId
      await updateAvatar({ storageId });
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>

      <div className="flex items-center gap-6">
        {/* Avatar preview */}
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold">
              {user?.name?.charAt(0) || '?'}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <label className="btn btn-primary">
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              disabled={uploading}
            />
          </label>

          {user?.avatarStorageId && (
            <button
              className="btn btn-ghost"
              onClick={() => removeAvatar()}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Security Considerations

**Session Invalidation:**

- Always call `invalidateSessions()` after email/password changes
- Force users to re-login to prevent session hijacking

**Reauthentication Requirement:**

- Password/email changes require recent authentication
- Implement UI flow: re-sign-in → show settings → allow change
- Optionally track "last auth time" and enforce max age (e.g., 15 min)

**Never Store Passwords:**

- Use `@convex-dev/auth` backing tables only
- Never add `password` field to `users` schema

**Server-Side Validation:**

- Never trust client-side validation for avatars
- Validate `contentType` and `size` in `updateAvatar` mutation
- Delete invalid uploads to prevent storage bloat

**Email Verification:**

- Prove control of new email before changing (OTP/link)
- Otherwise account takeover via session theft is too easy
- Use convex-auth Password provider's OTP flow if configured

**Rate Limiting (Optional):**

- Store timestamps in user doc
- Reject too-frequent password/email attempts (e.g., max 1 per minute)

### Testing Strategy

#### Backend Tests (`convex-test`)

**Profile Tests:**

- Unauthenticated `updateProfile` → AUTH_ERROR
- Update name trims whitespace and persists
- Bio max length enforcement (500 chars)

**Avatar Tests:**

- Unauthenticated `updateAvatar` → AUTH_ERROR
- Rejects invalid `contentType` (mock `_storage` system doc)
- Rejects oversized files
- Deletes old avatar on replace (assert delete called)

**Email Tests:**

- Uniqueness check rejects already-used email
- `pendingEmail` set / cleared appropriately
- Confirm flow invalidates sessions

**Password Tests:**

- Password policy rejects weak password (< 8 chars)
- Successful change triggers `invalidateSessions`

#### Frontend Tests (Vitest)

**Component Tests:**

- `AvatarPicker` calls `generateUploadUrl` → `fetch` → `updateAvatar`
- Forms show validation errors (Zod)
- Successful submit shows success toast / disables button while loading

**E2E Tests (Optional):**

- Full avatar upload flow (file select → upload → display)
- Password change flow (re-auth → update → redirect to login)

### Effort Estimate

| Scope | Duration | Notes |
| --- | --- | --- |
| **Minimum** | 1-2 days | Profile fields + avatar + password change (skip email verification) |
| **Full** | 3-4 days | Add verified email change + re-auth UX + comprehensive tests |

### Dependencies

- `@convex-dev/auth` server APIs (`modifyAccountCredentials`, `invalidateSessions`)
- Existing `convex/storage.ts` functions
- Pattern: `DocumentForm.tsx` upload flow
- Zod for client validation (already installed)

---

## 5. Polar.sh Monetization

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

## 6. Testing & QA

- **Vellum Chat:** Test context loading, response quality, error handling
- **Tour Flow:** Verify all steps highlight correct elements
- **Sharing:** Test invite flow, role permissions, viewer restrictions
- **User Profiles:** Test profile updates, avatar uploads, email/password changes
- **Polar.sh:** Verify webhook handling, sponsor status sync
- **Accessibility:** Keyboard navigation, screen reader support

---

## 7. Future Enhancements

- **Vellum Voice:** Text-to-speech for Vellum's responses
- **Vellum Proactive:** Vellum suggests actions based on project state
- **Public Sharing:** Generate public read-only links for world wikis
- **Export for Players:** Generate player-facing PDF/markdown handouts
- **Achievement System:** Reward users for completing milestones
- **A/B Testing:** Track engagement and optimize experience
