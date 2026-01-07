import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  // Users (extended from Convex Auth)
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    createdAt: v.number(),
    onboardingCompleted: v.optional(v.boolean()),
    tutorialState: v.optional(
      v.object({
        hasSeenTour: v.boolean(),
        completedSteps: v.array(v.string()),
        tourStartedAt: v.optional(v.number()),
        tourCompletedAt: v.optional(v.number()),
      })
    ),
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
      })
    ),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    pendingEmail: v.optional(v.string()),
    pendingEmailSetAt: v.optional(v.number()),
  }).index('by_email', ['email']),

  // Projects
  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    isTutorial: v.optional(v.boolean()),
    projectType: v.optional(
      v.union(
        v.literal('ttrpg'),
        v.literal('original-fiction'),
        v.literal('fanfiction'),
        v.literal('game-design'),
        v.literal('general')
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    stats: v.optional(
      v.object({
        documentCount: v.number(),
        entityCount: v.number(),
        factCount: v.number(),
        alertCount: v.number(),
        noteCount: v.optional(v.number()),
      })
    ),
  }).index('by_user', ['userId', 'updatedAt']),

  // Documents
  documents: defineTable({
    projectId: v.id('projects'),
    title: v.string(),
    content: v.optional(v.string()), // Inline content ≤1MB
    storageId: v.optional(v.id('_storage')), // File reference >1MB
    contentType: v.union(v.literal('text'), v.literal('markdown'), v.literal('file')),
    orderIndex: v.number(),
    wordCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    processedAt: v.optional(v.number()),
    processingStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
  })
    .index('by_project', ['projectId', 'orderIndex'])
    .index('by_project_status', ['projectId', 'processingStatus'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['projectId'],
    }),

  // Entities
  entities: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    type: v.union(
      v.literal('character'),
      v.literal('location'),
      v.literal('item'),
      v.literal('concept'),
      v.literal('event')
    ),
    description: v.optional(v.string()),
    aliases: v.array(v.string()),
    firstMentionedIn: v.optional(v.id('documents')),
    status: v.union(v.literal('pending'), v.literal('confirmed')),
    revealedToViewers: v.optional(v.boolean()),
    revealedAt: v.optional(v.union(v.number(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId', 'type'])
    .index('by_project_status', ['projectId', 'status'])
    .index('by_name', ['projectId', 'name'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['projectId'],
    })
    .searchIndex('search_description', {
      searchField: 'description',
      filterFields: ['projectId'],
    }),

  // Facts
  facts: defineTable({
    projectId: v.id('projects'),
    entityId: v.optional(v.id('entities')),
    documentId: v.optional(v.id('documents')),
    subject: v.string(),
    predicate: v.string(),
    object: v.string(),
    confidence: v.number(),
    evidenceSnippet: v.optional(v.string()),
    evidencePosition: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    temporalBound: v.optional(
      v.object({
        type: v.union(v.literal('point'), v.literal('range'), v.literal('relative')),
        value: v.string(),
      })
    ),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('rejected')),
    createdAt: v.number(),
  })
    .index('by_entity', ['entityId', 'status'])
    .index('by_document', ['documentId'])
    .index('by_project', ['projectId', 'status']),

  // Alerts (Placeholder for Phase 4)
  alerts: defineTable({
    projectId: v.id('projects'),
    documentId: v.id('documents'),
    factIds: v.array(v.id('facts')),
    entityIds: v.array(v.id('entities')),
    type: v.union(v.literal('contradiction'), v.literal('timeline'), v.literal('ambiguity')),
    severity: v.union(v.literal('error'), v.literal('warning')),
    title: v.string(),
    description: v.string(),
    evidence: v.array(
      v.object({
        snippet: v.string(),
        documentId: v.id('documents'),
        documentTitle: v.string(),
      })
    ),
    suggestedFix: v.optional(v.string()),
    status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId', 'status'])
    .index('by_document', ['documentId']),

  // Chat Messages (Vellum conversation history)
  chatMessages: defineTable({
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    createdAt: v.number(),
  }).index('by_user', ['userId', 'createdAt']),

  // LLM Cache
  llmCache: defineTable({
    inputHash: v.string(),
    promptVersion: v.string(),
    modelId: v.string(),
    response: v.string(), // Stringified JSON
    tokenCount: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index('by_hash', ['inputHash', 'promptVersion']),

  // Notes (project-level)
  notes: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId', 'pinned', 'updatedAt'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['projectId'],
    }),

  // Entity Notes (entity-level annotations)
  entityNotes: defineTable({
    entityId: v.id('entities'),
    projectId: v.id('projects'),
    userId: v.id('users'),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_entity', ['entityId', 'updatedAt'])
    .index('by_project', ['projectId']),
});
