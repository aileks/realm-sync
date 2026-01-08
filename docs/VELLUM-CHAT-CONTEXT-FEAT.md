---
summary: Technical specification for giving Vellum AI context about user projects
read_when:
  [
    implementing project context feature,
    modifying chat APIs,
    updating VellumChat component,
  ]
---

# Vellum Project Context Integration

## Overview

This specification details the implementation of project context awareness for Vellum, the AI chat assistant in Realm Sync. Currently, Vellum operates without knowledge of a user's projects, limiting its ability to provide relevant assistance about their fictional worlds. This feature enables Vellum to:

- Automatically detect when a user mentions a project by name
- Retrieve and inject relevant project context into the system prompt
- Provide intelligent responses about entities, facts, and documents
- Give users manual control over project context via a switcher UI

## Goals

### Primary Goals

1. **Contextual Intelligence**: Vellum should have full context of the user's project when discussing it
2. **Automatic Detection**: Detect project mentions with high accuracy (90%+ success rate)
3. **Performance**: Maintain fast response times (<2s for typical projects)
4. **Access Control**: Respect project permissions—users only see their own project data
5. **Graceful Degradation**: Work seamlessly when no project is detected or context is unavailable

### Secondary Goals

1. **Cache Efficiency**: Achieve >70% cache hit rate for project context
2. **Zero Regression**: No performance impact on non-project chat conversations
3. **Bundle Size**: Limit frontend increase to <10KB

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  VellumChat.tsx                                                             │
│  ├── projectId state (current context)                                      │
│  ├── detectedProject state (auto-detected)                                  │
│  ├── projectSwitcher UI (dropdown)                                          │
│  └── debounced detection (300ms)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ projectId
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Backend API Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  chat.ts                                                                    │
│  ├── detectProject(message) → { projectId, confidence }                     │
│  ├── getProjectContext(projectId) → Formatted context                       │
│  ├── getCachedProjectContext(projectId) → Cached or null                    │
│  ├── cacheProjectContext(projectId, context) → TTL 1hr                      │
│  └── createStreamingChat(messages, projectId) → Inject context              │
│                                                                              │
│  chatHistory.ts                                                             │
│  ├── send(message, projectId) → Store with projectId                        │
│  └── list(limit, projectId) → Filter by projectId                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ projectId
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Access Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Access Control                    Cache Pattern                             │
│  ├── getProjectRole()              ├── checkCache()                          │
│  ├── canReadProject()              ├── saveToCache()                         │
│  └── isProjectOwner()              └── invalidateCache()                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Database Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  chatMessages                    projects                                    │
│  ├── userId                       ├── _id                                    │
│  ├── projectId (NEW)              ├── name                                   │
│  ├── role                         ├── userId (owner)                         │
│  ├── content                      └── stats                                  │
│  └── createdAt                                                         │
│                                                                              │
│  entities                         facts                                      │
│  ├── projectId                    ├── projectId                              │
│  ├── name                         ├── entityId                                │
│  ├── type                         ├── subject                                 │
│  ├── status                       ├── predicate                               │
│  └── aliases                      ├── object                                  │
│                                    └── status                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User submits message**: VellumChat captures input
2. **Project detection**: Debounced call to `detectProject()`
3. **Context retrieval**: If project detected, call `getCachedProjectContext()`
   - Cache hit: Return cached context
   - Cache miss: Call `getProjectContext()`, then `cacheProjectContext()`
4. **Chat creation**: `createStreamingChat()` prepends context to system prompt
5. **Message persistence**: `send()` stores message with `projectId`
6. **Streaming response**: `streamChat()` generates and streams response

---

## Phase 1: Backend Foundation

### 1.1 Schema Migration

**File**: `convex/schema.ts`

Add `projectId` field to `chatMessages` table with new index for project-scoped queries.

```typescript
// Current chatMessages definition (lines 212-218)
chatMessages: defineTable({
  userId: v.id('users'),
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
  createdAt: v.number(),
}).index('by_user', ['userId', 'createdAt']),

// Updated chatMessages definition
chatMessages: defineTable({
  userId: v.id('users'),
  projectId: v.optional(v.id('projects')), // NEW: optional for backward compatibility
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
  createdAt: v.number(),
})
  .index('by_user', ['userId', 'createdAt'])
  .index('by_project', ['projectId', 'createdAt']), // NEW: for project-scoped queries
```

**Migration Notes**:

- Existing messages have `projectId: null` (backward compatible)
- No data migration required
- Run `npx convex dev`—Convex auto-detects schema changes

---

### 1.2 Project Detection Function

**File**: `convex/chat.ts` (NEW function: `detectProject`)

Detects which project a user is asking about based on message content.

**Detection Strategy**:

1. **Exact match (case-insensitive)**: Check if project name appears verbatim
2. **Fuzzy partial match**: If no exact match, check for 50%+ word overlap
3. **User scope**: Only return projects the user owns
4. **Confidence scoring**: Return `high` for exact, `medium` for fuzzy

```typescript
export const detectProject = query({
  args: {
    message: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, { message, userId }) => {
    // Fetch user's projects
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    if (projects.length === 0) return null;

    const normalizedMessage = message.toLowerCase();

    // Phase 1: Exact match (case-insensitive)
    for (const project of projects) {
      if (project.name.toLowerCase() === normalizedMessage) {
        return { projectId: project._id, confidence: 'high' as const };
      }
    }

    // Phase 2: Fuzzy partial match (50% word threshold)
    const messageWords = normalizedMessage
      .split(/\s+/)
      .filter((w) => w.length > 2);

    for (const project of projects) {
      const projectNameWords = project.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const matchingWords = messageWords.filter((word) =>
        projectNameWords.some(
          (projectWord) =>
            projectWord.includes(word) || word.includes(projectWord)
        )
      );

      const matchRatio = matchingWords.length / projectNameWords.length;
      if (matchRatio >= 0.5) {
        return { projectId: project._id, confidence: 'medium' as const };
      }
    }

    return null;
  },
});
```

**Edge Cases**:

- Empty `projects` array → return `null`
- Project names with special characters → handled by string comparison
- Common words (the, a, and) → filtered out (length > 2)
- Multiple matches → return first match (deterministic order)

---

### 1.3 Context Aggregation Function

**File**: `convex/chat.ts` (NEW function: `getProjectContext`)

Aggregates all relevant project data: entities, facts, and documents.

**Limits**:

- Max 100 entities (fetched), top 50 by fact count (used)
- Max 10 facts per entity
- Max 10 most recent documents

**Access Control**: Uses `getProjectRole()` to verify user has access to the project.

```typescript
export const getProjectContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    // Access check
    const role = await getProjectRole(ctx, projectId);
    if (role === null) return null; // User doesn't have access

    // Fetch project metadata
    const project = await ctx.db.get(projectId);
    if (!project) return null;

    // Fetch confirmed entities (all with pagination if needed)
    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project_status', (q) =>
        q.eq('projectId', projectId).eq('status', 'confirmed')
      )
      .collect();

    // Limit to 100, then sort by fact count for top 50
    const entityIds = entities.slice(0, 100).map((e) => e._id);

    // Fetch fact counts per entity
    const entitiesWithCounts = await Promise.all(
      entityIds.map(async (entityId) => {
        const facts = await ctx.db
          .query('facts')
          .withIndex('by_entity', (q) =>
            q.eq('entityId', entityId).eq('status', 'confirmed')
          )
          .collect();

        return {
          entity: entities.find((e) => e._id === entityId)!,
          facts: facts.slice(0, 10), // Max 10 facts per entity
          factCount: facts.length,
        };
      })
    );

    // Sort by fact count, take top 50
    const topEntities = entitiesWithCounts
      .sort((a, b) => b.factCount - a.factCount)
      .slice(0, 50);

    // Fetch recent documents (by orderIndex descending)
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const recentDocuments = documents
      .sort((a, b) => b.orderIndex - a.orderIndex)
      .slice(0, 10);

    // Format context for LLM
    return {
      project: {
        name: project.name,
        description: project.description,
        projectType: project.projectType,
      },
      entities: topEntities.map(({ entity, facts }) => ({
        name: entity.name,
        type: entity.type,
        description: entity.description,
        aliases: entity.aliases,
        facts: facts.map((f) => ({
          subject: f.subject,
          predicate: f.predicate,
          object: f.object,
          evidenceSnippet: f.evidenceSnippet,
        })),
      })),
      documents: recentDocuments.map((d) => ({
        title: d.title,
        wordCount: d.wordCount,
      })),
    };
  },
});
```

**Format Output**:

```typescript
{
  project: {
    name: string;
    description?: string;
    projectType?: 'ttrpg' | 'original-fiction' | 'fanfiction' | 'game-design' | 'general';
  };
  entities: Array<{
    name: string;
    type: 'character' | 'location' | 'item' | 'concept' | 'event';
    description?: string;
    aliases: string[];
    facts: Array<{
      subject: string;
      predicate: string;
      object: string;
      evidenceSnippet?: string;
    }>;
  }>;
  documents: Array<{
    title: string;
    wordCount: number;
  }>;
}
```

---

### 1.4 Context Caching

**File**: `convex/chat.ts` (NEW functions: `getCachedProjectContext`, `cacheProjectContext`)

Reuses the existing `llmCache` pattern from `convex/llm/cache.ts`.

**Cache Strategy**:

- Cache key: `projectContext:${projectId}`
- TTL: 1 hour (user-confirmed)
- Invalidation: On project update/delete

```typescript
const PROJECT_CONTEXT_CACHE_VERSION = 'v1';
const PROJECT_CONTEXT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export const getCachedProjectContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const cacheKey = `projectContext:${projectId}`;

    // Use existing llmCache checkCache pattern
    const cached = await ctx.runQuery(internal.llmExtract.checkCache, {
      inputHash: cacheKey,
      promptVersion: PROJECT_CONTEXT_CACHE_VERSION,
    });

    if (cached) return cached;
    return null;
  },
});

export const cacheProjectContext = mutation({
  args: {
    projectId: v.id('projects'),
    context: v.any(),
  },
  handler: async (ctx, { projectId, context }) => {
    const cacheKey = `projectContext:${projectId}`;
    const modelId = 'context-cache';

    await ctx.runMutation(internal.llmExtract.saveToCache, {
      inputHash: cacheKey,
      promptVersion: PROJECT_CONTEXT_CACHE_VERSION,
      modelId,
      response: context,
    });
  },
});

// Invalidation helper (call this on project update/delete)
export const invalidateProjectContextCache = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const cacheKey = `projectContext:${projectId}`;

    await ctx.runMutation(internal.llmExtract.invalidateCache, {
      promptVersion: PROJECT_CONTEXT_CACHE_VERSION,
      inputHash: cacheKey,
    });
  },
});
```

**Invalidation Points** (call `invalidateProjectContextCache`):

- Entity created/updated/deleted
- Fact created/updated/deleted
- Document created/updated/deleted
- Project updated/deleted

---

### 1.5 Updated Chat API

**File**: `convex/chat.ts` (update `createStreamingChat`)

Accept optional `projectId`, inject context into system prompt.

```typescript
export const createStreamingChat = mutation({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal('user'),
          v.literal('assistant'),
          v.literal('system')
        ),
        content: v.string(),
      })
    ),
    projectId: v.optional(v.id('projects')), // NEW
  },
  handler: async (ctx, { messages, projectId }) => {
    let contextContent = '';

    if (projectId) {
      // Try cache first
      const cached = await ctx.runQuery(internal.chat.getCachedProjectContext, {
        projectId,
      });

      if (cached) {
        contextContent = formatContextForPrompt(cached);
      } else {
        // Fetch and cache
        const context = await ctx.runQuery(internal.chat.getProjectContext, {
          projectId,
        });
        if (context) {
          contextContent = formatContextForPrompt(context);
          await ctx.runMutation(internal.chat.cacheProjectContext, {
            projectId,
            context,
          });
        }
      }
    }

    // Inject context into system prompt
    const systemPromptWithContext =
      contextContent ?
        `${VELLUM_CHAT_PROMPT}\n\n--- PROJECT CONTEXT ---\n${contextContent}`
      : VELLUM_CHAT_PROMPT;

    const messagesWithContext = [
      { role: 'system' as const, content: systemPromptWithContext },
      ...messages,
    ];

    const streamId = await streaming.createStream(ctx);
    return { streamId, messages: messagesWithContext };
  },
});

function formatContextForPrompt(
  context: Awaited<ReturnType<typeof getProjectContext>>
): string {
  if (!context) return '';

  let prompt = `# ${context.project.name}\n`;

  if (context.project.description) {
    prompt += `${context.project.description}\n\n`;
  }

  if (context.project.projectType) {
    prompt += `Type: ${context.project.projectType}\n\n`;
  }

  if (context.entities.length > 0) {
    prompt += `## Entities (${context.entities.length})\n`;
    for (const entity of context.entities) {
      prompt += `\n### ${entity.name} (${entity.type})\n`;
      if (entity.description) {
        prompt += `${entity.description}\n`;
      }
      if (entity.aliases.length > 0) {
        prompt += `Known as: ${entity.aliases.join(', ')}\n`;
      }
      if (entity.facts.length > 0) {
        prompt += `Facts:\n`;
        for (const fact of entity.facts) {
          prompt += `- ${fact.subject} ${fact.predicate} ${fact.object}`;
          if (fact.evidenceSnippet) {
            prompt += ` (${fact.evidenceSnippet})`;
          }
          prompt += '\n';
        }
      }
    }
    prompt += '\n';
  }

  if (context.documents.length > 0) {
    prompt += `## Recent Documents (${context.documents.length})\n`;
    for (const doc of context.documents) {
      prompt += `- ${doc.title} (${doc.wordCount} words)\n`;
    }
  }

  return prompt;
}
```

**File**: `convex/chatHistory.ts` (update `send` and `list`)

Accept optional `projectId`, verify access, store/filter by project.

```typescript
export const list = query({
  args: {
    limit: v.optional(v.number()),
    projectId: v.optional(v.id('projects')), // NEW
  },
  handler: async (ctx, { limit = 50, projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (projectId) {
      // Verify access to project
      const role = await getProjectRole(ctx, projectId);
      if (role === null) return []; // No access

      // Filter by project
      return await ctx.db
        .query('chatMessages')
        .withIndex('by_project', (q) =>
          q.eq('projectId', projectId).eq('userId', userId)
        )
        .order('asc')
        .take(limit);
    }

    // Original: all messages
    return await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('asc')
      .take(limit);
  },
});

export const send = mutation({
  args: {
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    projectId: v.optional(v.id('projects')), // NEW
  },
  handler: async (ctx, { role, content, projectId }) => {
    const userId = await requireAuth(ctx);

    if (projectId) {
      // Verify access to project
      const accessRole = await getProjectRole(ctx, projectId);
      if (accessRole === null) {
        throw new Error('Access denied to project');
      }
    }

    return await ctx.db.insert('chatMessages', {
      userId,
      projectId: projectId ?? null, // Convert undefined to null
      role,
      content,
      createdAt: Date.now(),
    });
  },
});
```

---

## Phase 2: Frontend Changes

### 2.1 VellumChat Component Updates

**File**: `src/components/VellumChat.tsx`

Add project detection, context indicator, and project switcher.

**State Additions**:

```typescript
const [projectId, setProjectId] = useState<Id<'projects'> | null>(null);
const [detectedProject, setDetectedProject] = useState<{
  projectId: Id<'projects'>;
  projectName: string;
  confidence: 'high' | 'medium';
} | null>(null);
const [isDetecting, setIsDetecting] = useState(false);
```

**Debounced Detection** (using `useDebouncedCallback` from `use-debounce`):

```typescript
import { useDebouncedCallback } from 'use-debounce';

const detectProject = useMutation(api.chat.detectProject);
const [debouncedDetect] = useDebouncedCallback(async (message: string) => {
  if (!message.trim()) {
    setDetectedProject(null);
    return;
  }

  setIsDetecting(true);
  try {
    const result = await detectProject({ message, userId: currentUserId });
    if (result) {
      setDetectedProject({
        projectId: result.projectId,
        projectName: '', // Fetch project name separately if needed
        confidence: result.confidence,
      });
    } else {
      setDetectedProject(null);
    }
  } catch (error) {
    console.error('Project detection failed:', error);
    setDetectedProject(null);
  } finally {
    setIsDetecting(false);
  }
}, 300); // 300ms debounce
```

**Updated handleSubmit** (pass projectId to API):

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputValue.trim() || isLoading) return;

  setError(null);
  const userContent = inputValue.trim();
  const userMessageId = generateId();
  const userMessage: Message = {
    id: userMessageId,
    role: 'user',
    content: userContent,
  };

  setLocalMessages((prev) => [...prev, userMessage]);
  setInputValue('');
  setIsLoading(true);

  try {
    // Store message with project context
    await sendMessage({
      role: 'user',
      content: userContent,
      projectId: projectId ?? undefined,
    });
    setLocalMessages((prev) => prev.filter((m) => m.id !== userMessageId));

    // Get messages for API
    const messagesForApi = [
      ...dbMessages,
      { role: 'user' as const, content: userContent },
    ].map(({ role, content }) => ({ role, content }));

    // Create streaming chat WITH project context
    const { streamId, messages: chatMessages } = await createStreamingChat({
      messages: messagesForApi,
      projectId: projectId ?? undefined,
    });

    // ... rest of streaming logic
  } catch (err) {
    // ... error handling
  } finally {
    setIsLoading(false);
  }
};
```

**Auto-switch to detected project**:

```typescript
// When detectedProject changes and no manual override
useEffect(() => {
  if (detectedProject && !projectId) {
    setProjectId(detectedProject.projectId);
  }
}, [detectedProject, projectId]);

// When user manually selects project, clear detection override
const handleManualProjectSelect = (newProjectId: Id<'projects'> | null) => {
  setProjectId(newProjectId);
  setDetectedProject(null); // Clear detection
};
```

**Project Context Indicator** (in chat header):

```typescript
{
  projectId && (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b text-xs">
      <MothIcon className="size-3 text-amber-500" />
      <span className="text-muted-foreground">
        Discussing: <span className="font-medium text-foreground">{/* Project name */}</span>
      </span>
      {detectedProject && detectedProject.confidence === 'medium' && (
        <span className="text-amber-500">(auto-detected)</span>
      )}
      <button
        onClick={() => setProjectId(null)}
        className="ml-auto text-muted-foreground hover:text-foreground"
        title="Clear project context"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
```

---

### 2.2 Project Switcher UI

Add dropdown/popover showing user's projects.

```typescript
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

function ProjectSwitcher({
  selectedProjectId,
  onSelect,
  onClear,
}: {
  selectedProjectId: Id<'projects'> | null;
  onSelect: (projectId: Id<'projects'>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const userProjects = useQuery(api.projects.list); // Assuming this exists

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-1 text-xs"
        >
          <FolderOpen className="size-3" />
          {selectedProjectId ? (
            <span>
              {userProjects?.find((p) => p._id === selectedProjectId)?.name ?? 'Unknown'}
            </span>
          ) : (
            <span className="text-muted-foreground">All projects</span>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onClear();
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                <span className="mr-2">✕</span>
                Clear context
              </CommandItem>
              {userProjects?.map((project) => (
                <CommandItem
                  key={project._id}
                  onSelect={() => {
                    onSelect(project._id);
                    setOpen(false);
                  }}
                >
                  <FolderOpen className="mr-2 size-3" />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

### 2.3 Enhanced Empty State

Update empty state to prompt for project context:

```typescript
{allMessages.length === 0 && (
  <div className="text-muted-foreground py-8 text-center">
    <p className="mb-1 font-serif text-sm">The archives are open.</p>
    <p className="text-xs">
      {!projectId ? (
        <>
          Ask me about a project by name, like{" "}
          <button
            onClick={() => handleExampleClick('Tell me about The Verdant Realm')}
            className="text-amber-500 hover:underline"
          >
            "The Verdant Realm"
          </button>
        </>
      ) : (
        <>
          Ask me anything about{" "}
          <span className="text-amber-500">
            {userProjects?.find((p) => p._id === projectId)?.name}
          </span>
        </>
      )}
    </p>
  </div>
)}
```

---

## Phase 3: Testing Strategy

### 3.1 Backend Tests

**File**: `convex/__tests__/chat.test.ts` (NEW)

```typescript
import { expect, test } from 'convex-test';
import { api, internal } from './_generated/api';
import { Id } from './_generated/dataModel';

test('detectProject: exact match (case-insensitive)', async (ctx) => {
  // Setup: Create user and project
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  const projectId = await ctx.db.insert('projects', {
    userId,
    name: 'The Verdant Realm',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Exact match
  const result1 = await ctx.runQuery(api.chat.detectProject, {
    message: 'The Verdant Realm',
    userId,
  });
  expect(result1).not.toBeNull();
  expect(result1!.projectId).toEqual(projectId);
  expect(result1!.confidence).toEqual('high');

  // Case-insensitive
  const result2 = await ctx.runQuery(api.chat.detectProject, {
    message: 'the verdant realm',
    userId,
  });
  expect(result2).not.toBeNull();
  expect(result2!.confidence).toEqual('high');
});

test('detectProject: fuzzy partial match', async (ctx) => {
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  await ctx.db.insert('projects', {
    userId,
    name: 'The Verdant Realm',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const result = await ctx.runQuery(api.chat.detectProject, {
    message: 'Tell me about Verdant',
    userId,
  });
  expect(result).not.toBeNull();
  expect(result!.confidence).toEqual('medium');
});

test('detectProject: no match', async (ctx) => {
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  await ctx.db.insert('projects', {
    userId,
    name: 'The Verdant Realm',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const result = await ctx.runQuery(api.chat.detectProject, {
    message: 'Tell me about something else entirely',
    userId,
  });
  expect(result).toBeNull();
});

test('detectProject: user-only projects', async (ctx) => {
  const userId1 = await ctx.db.insert('users', {
    name: 'User 1',
    createdAt: Date.now(),
  });
  const userId2 = await ctx.db.insert('users', {
    name: 'User 2',
    createdAt: Date.now(),
  });

  const projectId = await ctx.db.insert('projects', {
    userId: userId1,
    name: 'Secret Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // User 2 should not see User 1's project
  const result = await ctx.runQuery(api.chat.detectProject, {
    message: 'Secret Project',
    userId: userId2,
  });
  expect(result).toBeNull();
});

test('getProjectContext: unauthorized access', async (ctx) => {
  const userId1 = await ctx.db.insert('users', {
    name: 'User 1',
    createdAt: Date.now(),
  });
  const userId2 = await ctx.db.insert('users', {
    name: 'User 2',
    createdAt: Date.now(),
  });

  const projectId = await ctx.db.insert('projects', {
    userId: userId1,
    name: 'Private Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const result = await ctx.runQuery(api.chat.getProjectContext, {
    projectId,
  });
  // Should return null for unauthorized user
  expect(result).toBeNull();
});

test('getProjectContext: aggregates entities and facts', async (ctx) => {
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  const projectId = await ctx.db.insert('projects', {
    userId,
    name: 'Test Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create confirmed entity
  const entityId = await ctx.db.insert('entities', {
    projectId,
    name: 'Hero Character',
    type: 'character',
    aliases: [],
    status: 'confirmed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create confirmed fact
  await ctx.db.insert('facts', {
    projectId,
    entityId,
    subject: 'Hero',
    predicate: 'is',
    object: 'brave',
    confidence: 1.0,
    status: 'confirmed',
    createdAt: Date.now(),
  });

  const context = await ctx.runQuery(api.chat.getProjectContext, { projectId });
  expect(context).not.toBeNull();
  expect(context!.entities).toHaveLength(1);
  expect(context!.entities[0].name).toEqual('Hero Character');
  expect(context!.entities[0].facts).toHaveLength(1);
});
```

---

### 3.2 Integration Tests

**File**: `convex/__tests__/chat-integration.test.ts` (NEW)

```typescript
import { expect, test } from 'convex-test';
import { api } from './_generated/api';

test('end-to-end chat with project context', async (ctx) => {
  // Setup
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  const projectId = await ctx.db.insert('projects', {
    userId,
    name: 'Test World',
    description: 'A test world',
    projectType: 'original-fiction',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create entity
  const entityId = await ctx.db.insert('entities', {
    projectId,
    name: 'King Alaric',
    type: 'character',
    description: 'The wise king',
    aliases: ['King A'],
    status: 'confirmed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create fact
  await ctx.db.insert('facts', {
    projectId,
    entityId,
    subject: 'King Alaric',
    predicate: 'rules',
    object: 'the northern kingdom',
    confidence: 1.0,
    status: 'confirmed',
    createdAt: Date.now(),
  });

  // Send message with project context
  const messageId = await ctx.runMutation(api.chatHistory.send, {
    role: 'user',
    content: 'Tell me about King Alaric',
    projectId,
  });

  // Verify message stored with projectId
  const storedMessage = await ctx.db.get(messageId);
  expect(storedMessage!.projectId).toEqual(projectId);

  // Create streaming chat with project context
  const { streamId, messages } = await ctx.runMutation(
    api.chat.createStreamingChat,
    {
      messages: [{ role: 'user', content: 'Tell me about King Alaric' }],
      projectId,
    }
  );

  // Verify system prompt includes context
  const systemMessage = messages.find((m) => m.role === 'system');
  expect(systemMessage).not.toBeNull();
  expect(systemMessage!.content).toContain('King Alaric');
  expect(systemMessage!.content).toContain('Test World');
});

test('chatHistory.list filters by projectId', async (ctx) => {
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });

  const projectId1 = await ctx.db.insert('projects', {
    userId,
    name: 'Project 1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const projectId2 = await ctx.db.insert('projects', {
    userId,
    name: 'Project 2',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create messages for different projects
  await ctx.runMutation(api.chatHistory.send, {
    role: 'user',
    content: 'Message in Project 1',
    projectId: projectId1,
  });

  await ctx.runMutation(api.chatHistory.send, {
    role: 'user',
    content: 'Message in Project 2',
    projectId: projectId2,
  });

  // List messages for Project 1 only
  const project1Messages = await ctx.runQuery(api.chatHistory.list, {
    limit: 10,
    projectId: projectId1,
  });

  expect(project1Messages).toHaveLength(1);
  expect(project1Messages[0].content).toEqual('Message in Project 1');
});
```

---

### 3.3 Frontend Tests

**File**: `src/components/__tests__/VellumChat.test.tsx` (NEW)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VellumChat } from '../VellumChat';
import { useMutation, useQuery } from 'convex/react';
import { useDebouncedCallback } from 'use-debounce';

// Mock dependencies
vi.mock('convex/react');
vi.mock('use-debounce');

const mockUserId = 'user123' as Id<'users'>;

describe('VellumChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    (useQuery as vi.Mock).mockReturnValue([]); // No saved messages
    (useMutation as vi.Mock).mockReturnValue(vi.fn());
    (useDebouncedCallback as vi.Mock).mockReturnValue([vi.fn(), { cancel: vi.fn() }]);
  });

  it('renders project context indicator when project is selected', () => {
    render(<VellumChat />);

    // Simulate project selection
    // Check that project indicator appears
  });

  it('debounces project detection on input change', async () => {
    const detectProject = vi.fn();
    (useMutation as vi.Mock).mockImplementation((api) => {
      if (api === api.chat.detectProject) {
        return detectProject;
      }
      return vi.fn();
    });

    render(<VellumChat />);

    const input = screen.getByPlaceholderText('Ask Vellum...');

    // Type "Tell me about Verdant"
    fireEvent.change(input, { target: { value: 'Tell me about Verdant' } });

    // Wait for debounce (300ms)
    await waitFor(() => {
      expect(detectProject).toHaveBeenCalledWith({
        message: 'Tell me about Verdant',
        userId: mockUserId,
      });
    }, { timeout: 500 });
  });

  it('shows project switcher dropdown', () => {
    const projects = [
      { _id: 'proj1', name: 'Project 1' },
      { _id: 'proj2', name: 'Project 2' },
    ];
    (useQuery as vi.Mock).mockImplementation((api) => {
      if (api === api.projects.list) {
        return projects;
      }
      return [];
    });

    render(<VellumChat />);

    // Open switcher and verify projects appear
  });

  it('clears project context when X button clicked', () => {
    render(<VellumChat />);

    // Select a project first
    // Then click X button
    // Verify project context indicator disappears
  });

  it('shows enhanced empty state with project context', () => {
    render(<VellumChat />);

    // Verify empty state text mentions project context
  });
});
```

---

### 3.4 Performance Tests

**Targets**:

- Typical project (<100 entities): <2s context retrieval
- Large project (1000 entities, 5000 facts): <5s context retrieval
- Cache hit rate: >70%

```typescript
// Performance tests (manual/load testing)

test('context retrieval performance: typical project', async (ctx) => {
  const userId = await ctx.db.insert('users', {
    name: 'Test User',
    createdAt: Date.now(),
  });
  const projectId = await ctx.db.insert('projects', {
    userId,
    name: 'Performance Test',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create 50 entities with 5 facts each (typical)
  for (let i = 0; i < 50; i++) {
    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: `Entity ${i}`,
      type: 'character',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (let j = 0; j < 5; j++) {
      await ctx.db.insert('facts', {
        projectId,
        entityId,
        subject: `Entity ${i}`,
        predicate: `fact ${j}`,
        object: 'test',
        confidence: 1.0,
        status: 'confirmed',
        createdAt: Date.now(),
      });
    }
  }

  const start = Date.now();
  const context = await ctx.runQuery(api.chat.getProjectContext, { projectId });
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(2000); // <2s for typical project
  expect(context).not.toBeNull();
  expect(context!.entities).toHaveLength(50);
});

test('context retrieval performance: large project', async (ctx) => {
  // ... create 1000 entities, 5000 facts
  // Expect <5s for large project
});
```

---

## Phase 4: Migration

### 4.1 Schema Migration

```bash
# Step 1: Start dev server
npx convex dev

# Step 2: Convex auto-detects schema changes
# Review the migration plan in the terminal

# Step 3: Confirm migration
# Convex will prompt to apply the migration

# Step 4: Verify
# Check that chatMessages now has projectId column
```

**No data migration needed**: Existing messages have `projectId: null`, which is backward compatible.

### 4.2 Dependency Installation

```bash
# Add debounce library
pnpm add use-debounce
```

---

## Success Criteria

### Functional

| Criterion | Target | Measurement |
| :-- | :-- | :-- |
| Vellum has project context | 100% | System prompt includes context when projectId provided |
| Vellum prompts for context | 90%+ | Empty state shows project suggestion |
| Performance | <2s typical | P95 latency for context retrieval |
| Access control | 100% | Unauthorized users see null context |
| Test coverage | 265 tests pass | All existing + new tests |

### User Experience

| Criterion                 | Target | Measurement                          |
| :------------------------ | :----- | :----------------------------------- |
| Auto-detection accuracy   | 90%+   | User doesn't need to manually switch |
| Manual switcher available | 100%   | Visible in UI                        |
| Visual indicator          | 100%   | Shows current project context        |
| Graceful degradation      | 100%   | Works when context unavailable       |

### Technical

| Criterion            | Target | Measurement                 |
| :------------------- | :----- | :-------------------------- |
| Cache hit rate       | >70%   | Monitor cache metrics       |
| Bundle size increase | <10KB  | Production build analysis   |
| No regression        | 100%   | All 265 existing tests pass |

---

## Implementation Timeline

### Day 1: Schema + detectProject

- [ ] Add `projectId` field to `chatMessages` in schema
- [ ] Add `by_project` index to `chatMessages`
- [ ] Implement `detectProject` query
- [ ] Test exact and fuzzy matching

### Day 2: Context aggregation + caching

- [ ] Implement `getProjectContext` query
- [ ] Implement `getCachedProjectContext` and `cacheProjectContext`
- [ ] Add cache invalidation helpers
- [ ] Test context formatting

### Day 3: Update chat APIs

- [ ] Update `createStreamingChat` to accept `projectId`
- [ ] Update `chatHistory.send` to accept `projectId`
- [ ] Update `chatHistory.list` to filter by `projectId`
- [ ] Test end-to-end chat with context

### Day 4: Frontend VellumChat updates

- [ ] Add projectId and detectedProject state
- [ ] Add debounced project detection
- [ ] Add project context indicator
- [ ] Update handleSubmit to pass projectId

### Day 5: Project switcher + error handling

- [ ] Add project switcher UI component
- [ ] Add enhanced empty state
- [ ] Handle edge cases (no access, detection failures)
- [ ] Test user flows

### Day 6-7: Test suite + bug fixes

- [ ] Write backend tests (detectProject, getProjectContext)
- [ ] Write integration tests (chat with context)
- [ ] Write frontend tests (component interactions)
- [ ] Fix bugs from testing

### Day 8: Migration + final polish

- [ ] Run schema migration
- [ ] Final performance testing
- [ ] Update documentation
- [ ] Ship to production

---

## Open Questions (Resolved)

| Question | Decision | Rationale |
| :-- | :-- | :-- |
| Context priority with user instructions | Merge intelligently | User instructions override project context |
| Multi-project support | Add later | Scope to single project for MVP |
| TTRPG reveal status | Not relevant | Owner collaborates with Vellum, not players |
| Cache TTL | 1 hour | User-confirmed, balances freshness/performance |
| Context limit | Entity count, not tokens | Simpler implementation, predictable bounds |

---

## Code Examples

### Project Detection (convex/chat.ts)

```typescript
export const detectProject = query({
  args: {
    message: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, { message, userId }) => {
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    if (projects.length === 0) return null;

    const normalizedMessage = message.toLowerCase();

    // Exact match
    for (const project of projects) {
      if (project.name.toLowerCase() === normalizedMessage) {
        return { projectId: project._id, confidence: 'high' as const };
      }
    }

    // Fuzzy match
    const messageWords = normalizedMessage
      .split(/\s+/)
      .filter((w) => w.length > 2);

    for (const project of projects) {
      const projectNameWords = project.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const matchingWords = messageWords.filter((word) =>
        projectNameWords.some(
          (projectWord) =>
            projectWord.includes(word) || word.includes(projectWord)
        )
      );

      if (matchingWords.length / projectNameWords.length >= 0.5) {
        return { projectId: project._id, confidence: 'medium' as const };
      }
    }

    return null;
  },
});
```

### Context Aggregation (convex/chat.ts)

```typescript
export const getProjectContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const role = await getProjectRole(ctx, projectId);
    if (role === null) return null;

    const project = await ctx.db.get(projectId);
    if (!project) return null;

    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project_status', (q) =>
        q.eq('projectId', projectId).eq('status', 'confirmed')
      )
      .collect();

    const entitiesWithFacts = await Promise.all(
      entities.slice(0, 100).map(async (entity) => {
        const facts = await ctx.db
          .query('facts')
          .withIndex('by_entity', (q) =>
            q.eq('entityId', entity._id).eq('status', 'confirmed')
          )
          .collect();

        return {
          entity,
          facts: facts.slice(0, 10),
          factCount: facts.length,
        };
      })
    );

    const topEntities = entitiesWithFacts
      .sort((a, b) => b.factCount - a.factCount)
      .slice(0, 50);

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    return {
      project: {
        name: project.name,
        description: project.description,
        projectType: project.projectType,
      },
      entities: topEntities.map(({ entity, facts }) => ({
        name: entity.name,
        type: entity.type,
        description: entity.description,
        aliases: entity.aliases,
        facts: facts.map((f) => ({
          subject: f.subject,
          predicate: f.predicate,
          object: f.object,
          evidenceSnippet: f.evidenceSnippet,
        })),
      })),
      documents: documents
        .sort((a, b) => b.orderIndex - a.orderIndex)
        .slice(0, 10),
    };
  },
});
```

### Caching (convex/chat.ts)

```typescript
const PROJECT_CONTEXT_CACHE_VERSION = 'v1';
const PROJECT_CONTEXT_TTL = 60 * 60 * 1000;

export const getCachedProjectContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const cached = await ctx.runQuery(internal.llmExtract.checkCache, {
      inputHash: `projectContext:${projectId}`,
      promptVersion: PROJECT_CONTEXT_CACHE_VERSION,
    });
    return cached ?? null;
  },
});

export const cacheProjectContext = mutation({
  args: {
    projectId: v.id('projects'),
    context: v.any(),
  },
  handler: async (ctx, { projectId, context }) => {
    await ctx.runMutation(internal.llmExtract.saveToCache, {
      inputHash: `projectContext:${projectId}`,
      promptVersion: PROJECT_CONTEXT_CACHE_VERSION,
      modelId: 'context-cache',
      response: context,
    });
  },
});
```

---

## References

### Existing Patterns

| Pattern | Location | Usage |
| :-- | :-- | :-- |
| Access control | `convex/lib/projectAccess.ts` | `getProjectRole()`, `canReadProject()` |
| Cache pattern | `convex/llm/cache.ts` | `checkCache()`, `saveToCache()`, `invalidateCache()` |
| Auth helpers | `convex/lib/auth.ts` | `getAuthUserId()`, `requireAuth()` |
| Error handling | `convex/lib/errors.ts` | Error factories |
| Pagination | `convex/entities.ts` | `listByProjectPaginated()` |

### Key Files Modified

| File | Change |
| :-- | :-- |
| `convex/schema.ts` | Add `projectId` to `chatMessages` |
| `convex/chat.ts` | Add detection, context, caching functions; update `createStreamingChat` |
| `convex/chatHistory.ts` | Update `send` and `list` with `projectId` |
| `src/components/VellumChat.tsx` | Add project state, detection, switcher |

### Key Files Created

| File                                           | Purpose            |
| :--------------------------------------------- | :----------------- |
| `convex/__tests__/chat.test.ts`                | Backend unit tests |
| `convex/__tests__/chat-integration.test.ts`    | Integration tests  |
| `src/components/__tests__/VellumChat.test.tsx` | Frontend tests     |

### External Dependencies

| Package        | Version | Usage                       |
| :------------- | :------ | :-------------------------- |
| `use-debounce` | Latest  | Debounced project detection |

---

## Appendix: Context Format Specification

### System Prompt Injection

When project context is available, it is prepended to the system prompt:

```
You are Vellum, the Archivist Moth — a gentle, meticulous librarian...

[INJECTED CONTEXT]
--- PROJECT CONTEXT ---
# Project Name
Type: ttrpg

## Entities (5)
### Hero Character (character)
Description: The brave protagonist
Known as: Hero A

Facts:
- Hero defeats the dragon (from Chapter 1)
- Hero is the chosen one (stated in prophecy)

### Location Name (location)
Description: Ancient ruins
Facts:
- Location is haunted (ambient sound)
- Location contains treasure (rumor)

## Recent Documents (3)
- Chapter 1: The Beginning (2500 words)
- Character Backstories (1800 words)
- World History (3200 words)

[END INJECTED CONTEXT]

Remember: You are chatting, not extracting data...
```

### Entity Display Format

```
### {entityName} ({type})
{description}
Known as: {alias1}, {alias2}

Facts:
- {subject} {predicate} {object} ({evidenceSnippet})
- ...
```

### Document Display Format

```
- {title} ({wordCount} words)
```
