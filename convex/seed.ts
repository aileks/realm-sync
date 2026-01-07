import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const seedDemoData = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const now = Date.now();

    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'The Verdant Realm',
      description:
        "A sample fantasy world to explore Realm Sync's features. Discover characters, locations, and even some continuity issues for Vellum to catch!",
      projectType: 'general',
      isTutorial: true,
      createdAt: now,
      updatedAt: now,
      stats: { documentCount: 3, entityCount: 14, factCount: 10, alertCount: 2, noteCount: 3 },
    });

    const doc1Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 1: The Beginning',
      content: `In northern reaches of the Verdant Realm, city of Thornhaven stands as a beacon of civilization. Sir Aldric, the aging knight commander at sixty winters old, watches over its walls with unwavering vigilance.

The Emerald Crown, a relic of immense power, rests in the castle vault. It was forged in the Year of Falling Stars by the First Queen, Elara the Wise. Legend says whoever wears it can command the forest itself.

Lady Mira, Sir Aldric's daughter, studies the arcane arts in the Eastern Tower. At twenty-three summers, she is the youngest mage to ever master the Verdant Blessing—a spell that can heal any wound.

The Thornwood Forest surrounds the city, ancient and watchful. Within its depths lives the Forest Spirit, a being as old as the realm itself. Some say it protects travelers; others claim it leads them astray.`,
      contentType: 'markdown',
      orderIndex: 0,
      wordCount: 156,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const doc2Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 2: The Conflict',
      content: `The Dragon of Ashfall descends upon Thornhaven at dawn. Sir Aldric, now leading the defense at fifty winters old, realizes the creature is not attacking but fleeing something far worse in the mountains.

"It's wounded," Lady Mira observes, her silver eyes reflecting the dragon's flames. "Something in the Ashen Peaks has driven it here."

The Council of Elders convenes in the Great Hall. Lord Thorne, master of coin, argues for negotiation. High Priestess Vera insists the dragon is an omen—the prophecy of the Burning Sky begins.

Sir Aldric remembers the old tales: when dragons flee, Shadowbane stirs. That ancient evil was sealed beneath the mountains centuries ago by the First Queen herself, using the Emerald Crown's power.

"We must retrieve the Crown from the vault," Aldric declares. "It's the only weapon that can stop what's coming."

But the vault has been sealed since the Great War. And the key was lost when the Last King fell.`,
      contentType: 'markdown',
      orderIndex: 1,
      wordCount: 178,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const doc3Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 3: The Discovery',
      content: `Lady Mira discovers an ancient tome in the Eastern Tower's forbidden section. It speaks of Shadowbane's true nature—not a creature, but a curse placed by a betrayed court mage.

The tome reveals that the Emerald Crown was not forged in the Year of Falling Stars, but was a gift from the Forest Spirit to the First Queen, Elara the Brave, in exchange for a promise never fulfilled.

"The histories are wrong," Mira whispers, her hands trembling. "Everything we know about the Crown is a lie."

Meanwhile, Sir Aldric leads a scouting party into the Ashen Peaks. They find the dragon's lair—empty save for a single obsidian egg and a message carved in stone: "The sleeper wakes when the crown is worn."

At the Festival of Green Leaves, celebrated on the first full moon of spring, the people of Thornhaven gather unaware of the danger. Lady Mira must choose: reveal the truth and cause panic, or find the vault key before it's too late.`,
      contentType: 'markdown',
      orderIndex: 2,
      wordCount: 185,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const aldricId = await ctx.db.insert('entities', {
      projectId,
      name: 'Sir Aldric',
      type: 'character',
      description:
        'The aging knight commander of Thornhaven. A veteran warrior with decades of experience.',
      aliases: ['The Knight Commander', 'Commander Aldric'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      revealedToViewers: true,
      revealedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const miraId = await ctx.db.insert('entities', {
      projectId,
      name: 'Lady Mira',
      type: 'character',
      description:
        "Sir Aldric's daughter, a talented mage who mastered the Verdant Blessing at a young age.",
      aliases: ['Mira', 'The Young Mage'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
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

    await ctx.db.insert('entities', {
      projectId,
      name: 'Magister Crow',
      type: 'character',
      description: 'A blind old magister who serves the old magic.',
      aliases: [],
      firstMentionedIn: doc2Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'Thornhaven',
      type: 'location',
      description:
        'A city in the northern reaches of the Verdant Realm, protected by ancient walls.',
      aliases: ['The Northern City', 'City of Thorns'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const crownId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Emerald Crown',
      type: 'item',
      description: 'A powerful relic that can command the forest. Its true origins are disputed.',
      aliases: ['The Crown', 'Crown of the Forest'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const dragonId = await ctx.db.insert('entities', {
      projectId,
      name: 'Dragon of Ashfall',
      type: 'character',
      description: 'An ancient dragon that fled from something in the Ashen Peaks.',
      aliases: ['The Dragon', 'Ashfall'],
      firstMentionedIn: doc2Id,
      status: 'confirmed',
      revealedToViewers: true,
      revealedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const shadowbaneId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Shadowbane',
      type: 'concept',
      description:
        'An ancient evil sealed beneath the mountains. Actually a curse, not a creature.',
      aliases: ['The Ancient Evil', 'The Sleeper'],
      firstMentionedIn: doc2Id,
      status: 'pending',
      revealedToViewers: false,
      createdAt: now,
      updatedAt: now,
    });

    const forestSpiritId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Forest Spirit',
      type: 'character',
      description: 'A being as old as the realm that dwells in the Thornwood Forest.',
      aliases: ['Spirit of the Wood', 'The Ancient One'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      revealedToViewers: true,
      revealedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const elaraId = await ctx.db.insert('entities', {
      projectId,
      name: 'Elara First Queen',
      type: 'character',
      description: 'The legendary First Queen who sealed the Shadowbane. Her epithet varies.',
      aliases: ['The First Queen', 'Elara the Wise', 'Elara the Brave'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'Thornwood Forest',
      type: 'location',
      description: 'An ancient forest surrounding Thornhaven, home to the Forest Spirit.',
      aliases: ['The Forest', 'The Thornwood'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'The Ashen Peaks',
      type: 'location',
      description: 'A mountain range where the Shadowbane was sealed and the dragon originated.',
      aliases: ['The Mountains', 'Ashfall Mountains'],
      firstMentionedIn: doc2Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const festivalId = await ctx.db.insert('entities', {
      projectId,
      name: 'Festival of Green Leaves',
      type: 'event',
      description: 'A celebration held on the first full moon of spring in Thornhaven.',
      aliases: ['The Spring Festival', 'Green Leaves'],
      firstMentionedIn: doc3Id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'The Verdant Blessing',
      type: 'concept',
      description: 'A powerful healing spell that can cure any wound.',
      aliases: ['Blessing of the Forest'],
      firstMentionedIn: doc1Id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const aldricAgeFact1 = await ctx.db.insert('facts', {
      projectId,
      entityId: aldricId,
      documentId: doc1Id,
      subject: 'Sir Aldric',
      predicate: 'has_age',
      object: 'sixty winters',
      confidence: 1.0,
      evidenceSnippet: 'Sir Aldric, the aging knight commander at sixty winters old',
      evidencePosition: { start: 95, end: 155 },
      status: 'confirmed',
      createdAt: now,
    });

    const aldricAgeFact2 = await ctx.db.insert('facts', {
      projectId,
      entityId: aldricId,
      documentId: doc2Id,
      subject: 'Sir Aldric',
      predicate: 'has_age',
      object: 'fifty winters',
      confidence: 1.0,
      evidenceSnippet: 'Sir Aldric, now leading the defense at fifty winters old',
      evidencePosition: { start: 52, end: 108 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: miraId,
      documentId: doc1Id,
      subject: 'Lady Mira',
      predicate: 'is_daughter_of',
      object: 'Sir Aldric',
      confidence: 1.0,
      evidenceSnippet: "Lady Mira, Sir Aldric's daughter",
      evidencePosition: { start: 350, end: 382 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: miraId,
      documentId: doc1Id,
      subject: 'Lady Mira',
      predicate: 'has_age',
      object: 'twenty-three summers',
      confidence: 1.0,
      evidenceSnippet: 'At twenty-three summers, she is the youngest mage',
      evidencePosition: { start: 420, end: 468 },
      status: 'confirmed',
      createdAt: now,
    });

    const crownOriginFact1 = await ctx.db.insert('facts', {
      projectId,
      entityId: crownId,
      documentId: doc1Id,
      subject: 'The Emerald Crown',
      predicate: 'was_forged_in',
      object: 'the Year of Falling Stars by the First Queen',
      confidence: 1.0,
      evidenceSnippet:
        'It was forged in the Year of Falling Stars by the First Queen, Elara the Wise',
      evidencePosition: { start: 220, end: 298 },
      status: 'confirmed',
      createdAt: now,
    });

    const crownOriginFact2 = await ctx.db.insert('facts', {
      projectId,
      entityId: crownId,
      documentId: doc3Id,
      subject: 'The Emerald Crown',
      predicate: 'origin',
      object: 'a gift from the Forest Spirit to Elara the Brave',
      confidence: 0.9,
      evidenceSnippet:
        'the Emerald Crown was not forged in the Year of Falling Stars, but was a gift from the Forest Spirit to the First Queen, Elara the Brave',
      evidencePosition: { start: 150, end: 288 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: dragonId,
      documentId: doc2Id,
      subject: 'Dragon of Ashfall',
      predicate: 'is_fleeing_from',
      object: 'something in the Ashen Peaks',
      confidence: 1.0,
      evidenceSnippet:
        'the creature is not attacking but fleeing something far worse in the mountains',
      evidencePosition: { start: 92, end: 170 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: shadowbaneId,
      documentId: doc3Id,
      subject: 'The Shadowbane',
      predicate: 'true_nature',
      object: 'a curse placed by a betrayed court mage, not a creature',
      confidence: 0.85,
      evidenceSnippet: "the Shadowbane's true nature—not a creature, but a curse",
      evidencePosition: { start: 80, end: 136 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: festivalId,
      documentId: doc3Id,
      subject: 'Festival of Green Leaves',
      predicate: 'occurs_on',
      object: 'the first full moon of spring',
      confidence: 1.0,
      evidenceSnippet: 'the Festival of Green Leaves, celebrated on the first full moon of spring',
      evidencePosition: { start: 580, end: 652 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId: elaraId,
      documentId: doc1Id,
      subject: 'Elara First Queen',
      predicate: 'known_as',
      object: 'Elara the Wise',
      confidence: 1.0,
      evidenceSnippet: 'the First Queen, Elara the Wise',
      evidencePosition: { start: 267, end: 298 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('alerts', {
      projectId,
      documentId: doc2Id,
      factIds: [aldricAgeFact1, aldricAgeFact2],
      entityIds: [aldricId],
      type: 'contradiction',
      severity: 'error',
      title: "Sir Aldric's age is inconsistent",
      description:
        "Sir Aldric is described as 'sixty winters old' in Chapter 1, but 'fifty winters old' in Chapter 2. This is a contradiction of 10 years.",
      evidence: [
        {
          snippet: 'Sir Aldric, the aging knight commander at sixty winters old',
          documentId: doc1Id,
          documentTitle: 'Canon',
        },
        {
          snippet: 'Sir Aldric, now leading the defense at fifty winters old',
          documentId: doc2Id,
          documentTitle: 'Chapter 2: The Conflict',
        },
      ],
      suggestedFix:
        "Decide on Sir Aldric's canonical age. Consider whether Chapter 2 occurs before Chapter 1, or if this is a typo.",
      status: 'open',
      createdAt: now,
    });

    await ctx.db.insert('alerts', {
      projectId,
      documentId: doc3Id,
      factIds: [crownOriginFact1, crownOriginFact2],
      entityIds: [crownId, elaraId, forestSpiritId],
      type: 'contradiction',
      severity: 'warning',
      title: 'Conflicting origin stories for the Emerald Crown',
      description:
        "Chapter 1 states the Emerald Crown was 'forged in the Year of Falling Stars by the First Queen', but Chapter 3 reveals it was 'a gift from the Forest Spirit'. These origins are mutually exclusive.",
      evidence: [
        {
          snippet: 'It was forged in the Year of Falling Stars by the First Queen, Elara the Wise',
          documentId: doc1Id,
          documentTitle: 'Canon',
        },
        {
          snippet:
            'the Emerald Crown was not forged... but was a gift from the Forest Spirit to the First Queen, Elara the Brave',
          documentId: doc3Id,
          documentTitle: 'Chapter 3: The Discovery',
        },
      ],
      suggestedFix:
        "This may be intentional—Chapter 3 reveals the 'true' origin. Consider adding a note that Chapter 1's account is commonly believed (but false) history.",
      status: 'open',
      createdAt: now,
    });

    await ctx.db.insert('notes', {
      projectId,
      userId,
      title: 'Campaign Overview',
      content:
        'The Verdant Realm is a fantasy setting focused on the city of Thornhaven and the surrounding lands. Key plot points involve the Emerald Crown, the awakening Shadowbane, and the Festival of Green Leaves. Players will discover that ancient histories may not be what they seem.',
      tags: ['ttrpg', 'overview'],
      pinned: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('notes', {
      projectId,
      userId,
      title: 'Session Notes - Week 1',
      content:
        'Party arrived in Thornhaven seeking work. Met Sir Aldric at the gates. Discussed rumors of the Dragon of Ashfall appearing in the north. Lady Mira invited them to the Eastern Tower for tea.',
      tags: ['session', 'week-1'],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('notes', {
      projectId,
      userId,
      title: 'DM Secrets',
      content:
        "TRUE LORE: The Shadowbane is not a creature but a curse placed by Elara's betrayed court mage. The Emerald Crown was a gift from the Forest Spirit, not forged by ancient smiths. The 'Year of Falling Stars' is a fabricated history meant to hide the true origin. Only the DM knows this until players discover Chapter 3's revelation.",
      tags: ['dm-only', 'secrets'],
      pinned: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entityNotes', {
      entityId: aldricId,
      projectId,
      userId,
      content:
        "DM NOTE: Sir Aldric's age inconsistency between Chapter 1 (60 winters) and Chapter 2 (50 winters) is intentional. Chapter 2 may be a flashback or contradiction represents unreliable narration. Keep this open for players to notice.",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entityNotes', {
      entityId: crownId,
      projectId,
      userId,
      content:
        'DM NOTE: The Emerald Crown\'s dual origin is a key plot twist. The "forged in Year of Falling Stars" story is what historians believe. Chapter 3 reveals the TRUTH: it was a gift from the Forest Spirit to Elara. This should only be revealed if players investigate deeply.',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entityNotes', {
      entityId: shadowbaneId,
      projectId,
      userId,
      content:
        'DM NOTE: Shadowbane is NOT a creature. It is a curse placed by a betrayed court mage. This is the central secret of the campaign. Do not reveal until players find the ancient tome in Chapter 3.',
      createdAt: now,
      updatedAt: now,
    });

    return { projectId, documentIds: [doc1Id, doc2Id, doc3Id] };
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

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const notes = await ctx.db
      .query('notes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const entityNotes = await ctx.db
      .query('entityNotes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    for (const note of entityNotes) {
      await ctx.db.delete(note._id);
    }

    for (const alert of alerts) {
      await ctx.db.delete(alert._id);
    }

    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    for (const entity of entities) {
      await ctx.db.delete(entity._id);
    }

    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(projectId);
  },
});
