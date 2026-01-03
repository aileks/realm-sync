import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const seedProject = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const now = Date.now();

    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'The Northern Chronicles',
      description:
        'A fantasy epic set in a frozen kingdom where winter has lasted for generations.',
      createdAt: now,
      updatedAt: now,
      stats: { documentCount: 2, entityCount: 7, factCount: 8, alertCount: 0 },
    });

    const doc1Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 1: The Frozen Throne',
      content: `The wind howled across the battlements of Winterhold Castle as King Aldric surveyed his domain. His steel-gray eyes, weathered by countless winters, scanned the endless white expanse stretching to the horizon.

"Your Grace," said Commander Thorne, approaching with measured steps. "The scouts have returned from the Northern Pass. They bring troubling news."

Aldric turned, his fur-lined cloak swirling around him. At sixty winters, he was still an imposing figure—broad-shouldered and tall, with a crown of iron resting upon his silver hair. The crown had belonged to his father, and his father's father before him, forged from the ore of the Sacred Mountain.

"Speak, Commander. I would hear it plain."

"The Frostborne have been sighted, my lord. A host of them, moving south through the Shattered Peaks. Lady Elara estimates their numbers at three thousand."

The king's jaw tightened. The Frostborne—those cursed beings who had once been men, transformed by the endless winter into something other. Something hungry.

"Send word to the other holds. Summon the Council of Lords. And find my daughter—tell Princess Sera that her nameday celebrations must wait."`,
      contentType: 'text',
      orderIndex: 0,
      wordCount: 198,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const doc2Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 2: The Ancient Pact',
      content: `Princess Sera stood in the Great Library, her fingers tracing the spines of books older than the kingdom itself. At twenty winters, she had her father's determination but her mother's curiosity—a dangerous combination, the court whispered.

"You should not be here alone, Princess," came a voice from the shadows.

She did not turn. "Neither should you, Magister Crow. This section is forbidden to all but the royal bloodline."

The old man emerged from between the towering shelves, his black robes rustling like wings. His eyes were milky white—blinded in service to the old magic—yet he moved with uncanny precision.

"There are things you seek that should remain buried," he warned. "The Pact of Frost was sealed for good reason."

"A pact made by desperate men who had no other choice," Sera countered. "But the Frostborne still come. Whatever bargain our ancestors struck, it is failing."

Magister Crow was silent for a long moment. When he spoke again, his voice was barely above a whisper. "The Pact was not a bargain, child. It was a binding—a prison. And prisons, given enough time, always fail."`,
      contentType: 'text',
      orderIndex: 1,
      wordCount: 201,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const aldricId = await ctx.db.insert('entities', {
      projectId,
      name: 'King Aldric',
      type: 'character',
      description:
        'The aging king of the frozen kingdom, sixty winters old, with steel-gray eyes and silver hair.',
      aliases: ['His Grace', 'The Winter King'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const seraId = await ctx.db.insert('entities', {
      projectId,
      name: 'Princess Sera',
      type: 'character',
      description:
        'The twenty-year-old princess, daughter of King Aldric, known for her curiosity and determination.',
      aliases: [],
      firstMentionedIn: doc1Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'Commander Thorne',
      type: 'character',
      description: 'Military commander serving King Aldric.',
      aliases: [],
      firstMentionedIn: doc1Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const crowId = await ctx.db.insert('entities', {
      projectId,
      name: 'Magister Crow',
      type: 'character',
      description: 'A blind old magister who serves the old magic, wears black robes.',
      aliases: [],
      firstMentionedIn: doc2Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'Winterhold Castle',
      type: 'location',
      description:
        'The seat of power for King Aldric, featuring battlements overlooking a frozen landscape.',
      aliases: ['The Frozen Throne'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const frostborneId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Frostborne',
      type: 'concept',
      description:
        'Cursed beings who were once men, transformed by the endless winter into something hungry and dangerous.',
      aliases: [],
      firstMentionedIn: doc1Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const pactId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Pact of Frost',
      type: 'event',
      description:
        'An ancient binding/prison created by desperate ancestors, which is now failing.',
      aliases: ['The Ancient Pact'],
      firstMentionedIn: doc2Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: aldricId,
      documentId: doc1Id,
      subject: 'King Aldric',
      predicate: 'has age',
      object: 'sixty winters',
      confidence: 1.0,
      evidenceSnippet: 'At sixty winters, he was still an imposing figure',
      evidencePosition: { start: 456, end: 505 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: aldricId,
      documentId: doc1Id,
      subject: 'King Aldric',
      predicate: 'rules from',
      object: 'Winterhold Castle',
      confidence: 1.0,
      evidenceSnippet: 'King Aldric surveyed his domain',
      evidencePosition: { start: 62, end: 93 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: seraId,
      documentId: doc1Id,
      subject: 'Princess Sera',
      predicate: 'is daughter of',
      object: 'King Aldric',
      confidence: 1.0,
      evidenceSnippet: 'find my daughter—tell Princess Sera',
      evidencePosition: { start: 1147, end: 1183 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: seraId,
      documentId: doc2Id,
      subject: 'Princess Sera',
      predicate: 'has age',
      object: 'twenty winters',
      confidence: 1.0,
      evidenceSnippet: "At twenty winters, she had her father's determination",
      evidencePosition: { start: 86, end: 139 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: frostborneId,
      documentId: doc1Id,
      subject: 'Frostborne',
      predicate: 'were once',
      object: 'men',
      confidence: 1.0,
      evidenceSnippet: 'those cursed beings who had once been men',
      evidencePosition: { start: 888, end: 929 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: frostborneId,
      documentId: doc1Id,
      subject: 'Frostborne army',
      predicate: 'numbers approximately',
      object: 'three thousand',
      confidence: 0.9,
      evidenceSnippet: 'Lady Elara estimates their numbers at three thousand',
      evidencePosition: { start: 760, end: 812 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: crowId,
      documentId: doc2Id,
      subject: 'Magister Crow',
      predicate: 'is',
      object: 'blind',
      confidence: 1.0,
      evidenceSnippet: 'His eyes were milky white—blinded in service to the old magic',
      evidencePosition: { start: 520, end: 581 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: pactId,
      documentId: doc2Id,
      subject: 'The Pact of Frost',
      predicate: 'was',
      object: 'a binding/prison, not a bargain',
      confidence: 0.85,
      evidenceSnippet: 'The Pact was not a bargain, child. It was a binding—a prison.',
      evidencePosition: { start: 960, end: 1021 },
      status: 'pending',
      createdAt: now,
    });

    return { projectId, documentIds: [doc1Id, doc2Id] };
  },
});

export const clearSeedData = internalMutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) return;

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    for (const entity of entities) {
      await ctx.db.delete(entity._id);
    }

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(projectId);
  },
});
