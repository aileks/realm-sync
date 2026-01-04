import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

export const seedDemoData = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const projects: { projectId: Id<'projects'>; documentIds: Id<'documents'>[] }[] = [];

    // ========== PROJECT 1: Fantasy Novel ==========
    const fantasyProjectId = await ctx.db.insert('projects', {
      userId,
      name: 'The Northern Chronicles',
      description:
        'A fantasy epic set in a frozen kingdom where winter has lasted for generations.',
      createdAt: now,
      updatedAt: now,
      stats: { documentCount: 2, entityCount: 7, factCount: 8, alertCount: 0 },
    });

    const fantasyDoc1 = await ctx.db.insert('documents', {
      projectId: fantasyProjectId,
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

    const fantasyDoc2 = await ctx.db.insert('documents', {
      projectId: fantasyProjectId,
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
      projectId: fantasyProjectId,
      name: 'King Aldric',
      type: 'character',
      description: 'The aging king of the frozen kingdom, sixty winters old.',
      aliases: ['His Grace', 'The Winter King'],
      firstMentionedIn: fantasyDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const seraId = await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'Princess Sera',
      type: 'character',
      description: 'The twenty-year-old princess, known for her curiosity.',
      aliases: [],
      firstMentionedIn: fantasyDoc1,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'Commander Thorne',
      type: 'character',
      description: 'Military commander serving King Aldric.',
      aliases: [],
      firstMentionedIn: fantasyDoc1,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const crowId = await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'Magister Crow',
      type: 'character',
      description: 'A blind old magister who serves the old magic.',
      aliases: [],
      firstMentionedIn: fantasyDoc2,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'Winterhold Castle',
      type: 'location',
      description: 'The seat of power for King Aldric.',
      aliases: ['The Frozen Throne'],
      firstMentionedIn: fantasyDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const frostborneId = await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'The Frostborne',
      type: 'concept',
      description: 'Cursed beings who were once men, transformed by endless winter.',
      aliases: [],
      firstMentionedIn: fantasyDoc1,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const pactId = await ctx.db.insert('entities', {
      projectId: fantasyProjectId,
      name: 'The Pact of Frost',
      type: 'event',
      description: 'An ancient binding/prison created by desperate ancestors.',
      aliases: ['The Ancient Pact'],
      firstMentionedIn: fantasyDoc2,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: aldricId,
      documentId: fantasyDoc1,
      subject: 'King Aldric',
      predicate: 'has_age',
      object: 'sixty winters',
      confidence: 1.0,
      evidenceSnippet: 'At sixty winters, he was still an imposing figure',
      evidencePosition: { start: 456, end: 505 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: aldricId,
      documentId: fantasyDoc1,
      subject: 'King Aldric',
      predicate: 'rules_from',
      object: 'Winterhold Castle',
      confidence: 1.0,
      evidenceSnippet: 'King Aldric surveyed his domain',
      evidencePosition: { start: 62, end: 93 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: seraId,
      documentId: fantasyDoc1,
      subject: 'Princess Sera',
      predicate: 'is_daughter_of',
      object: 'King Aldric',
      confidence: 1.0,
      evidenceSnippet: 'find my daughter—tell Princess Sera',
      evidencePosition: { start: 1147, end: 1183 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: seraId,
      documentId: fantasyDoc2,
      subject: 'Princess Sera',
      predicate: 'has_age',
      object: 'twenty winters',
      confidence: 1.0,
      evidenceSnippet: "At twenty winters, she had her father's determination",
      evidencePosition: { start: 86, end: 139 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: frostborneId,
      documentId: fantasyDoc1,
      subject: 'Frostborne',
      predicate: 'were_once',
      object: 'men',
      confidence: 1.0,
      evidenceSnippet: 'those cursed beings who had once been men',
      evidencePosition: { start: 888, end: 929 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: frostborneId,
      documentId: fantasyDoc1,
      subject: 'Frostborne army',
      predicate: 'numbers_approximately',
      object: 'three thousand',
      confidence: 0.9,
      evidenceSnippet: 'Lady Elara estimates their numbers at three thousand',
      evidencePosition: { start: 760, end: 812 },
      status: 'pending',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fantasyProjectId,
      entityId: crowId,
      documentId: fantasyDoc2,
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
      projectId: fantasyProjectId,
      entityId: pactId,
      documentId: fantasyDoc2,
      subject: 'The Pact of Frost',
      predicate: 'was',
      object: 'a binding/prison, not a bargain',
      confidence: 0.85,
      evidenceSnippet: 'The Pact was not a bargain, child. It was a binding—a prison.',
      evidencePosition: { start: 960, end: 1021 },
      status: 'pending',
      createdAt: now,
    });

    projects.push({ projectId: fantasyProjectId, documentIds: [fantasyDoc1, fantasyDoc2] });

    // ========== PROJECT 2: D&D Campaign ==========
    const dndProjectId = await ctx.db.insert('projects', {
      userId,
      name: 'Curse of the Hollow King',
      description:
        'A D&D 5e campaign set in a cursed kingdom where the dead king still rules from his throne.',
      createdAt: now,
      updatedAt: now,
      stats: { documentCount: 2, entityCount: 8, factCount: 6, alertCount: 0 },
    });

    const dndDoc1 = await ctx.db.insert('documents', {
      projectId: dndProjectId,
      title: 'Session 1: The Road to Greyhollow',
      content: `The party met at the Rusty Tankard inn in Millbrook, hired by a mysterious woman named Lady Vesper to investigate disappearances in Greyhollow. She offered 500 gold pieces and passage on a merchant caravan.

Kira the half-elf rogue noticed Lady Vesper wore a signet ring bearing the crest of House Valdris—supposedly extinct for a century. When confronted, Vesper admitted she is the last heir, seeking to reclaim her ancestral home from "the thing wearing my grandfather's crown."

The journey took three days. Tormund the dwarf cleric sensed undead presence growing stronger as they approached. Zara the tiefling warlock's patron, the Raven Queen, sent cryptic warnings through dreams: "The hollow king hungers. His court grows."

They arrived at dusk. Greyhollow was silent—no birds, no insects. Smoke rose from chimneys but no one walked the streets. In the town square stood a statue of King Aldric Valdris III, but someone had chiseled away his face.`,
      contentType: 'text',
      orderIndex: 0,
      wordCount: 178,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const dndDoc2 = await ctx.db.insert('documents', {
      projectId: dndProjectId,
      title: 'Session 2: The Hollow Court',
      content: `The party infiltrated Castle Valdris through the old servant tunnels Vesper remembered from childhood. Inside, they found the court frozen in a mockery of life—nobles seated at a banquet table, unmoving, their eyes following the party's movement.

On the throne sat the Hollow King himself: King Aldric's corpse, animated by dark magic, a crown of black iron fused to his skull. He spoke in whispers that somehow filled the hall.

"More guests for my eternal feast. Lady Vesper... granddaughter... you've returned to take your place."

Combat erupted when Tormund attempted to turn undead. The "nobles" rose as wights. Kira landed a critical sneak attack on the Hollow King (47 damage!), but he regenerated. Zara discovered his phylactery was the crown itself.

The session ended with the party retreating to the tunnels, planning their next assault. They learned the crown must be destroyed in the Sunfire Forge beneath the mountains—the same forge where it was originally made.`,
      contentType: 'text',
      orderIndex: 1,
      wordCount: 182,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const vesperId = await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Lady Vesper Valdris',
      type: 'character',
      description: 'Last heir of House Valdris, quest giver. Wears family signet ring.',
      aliases: ['Lady Vesper', 'Vesper'],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const kiraId = await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Kira',
      type: 'character',
      description: 'Half-elf rogue, player character. Observant and skilled.',
      aliases: [],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Tormund',
      type: 'character',
      description: 'Dwarf cleric, player character. Can sense undead.',
      aliases: [],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const zaraId = await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Zara',
      type: 'character',
      description: 'Tiefling warlock, player character. Patron is the Raven Queen.',
      aliases: [],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const hollowKingId = await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'The Hollow King',
      type: 'character',
      description: 'Undead King Aldric Valdris III, main antagonist. Crown is his phylactery.',
      aliases: ['King Aldric Valdris III'],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Greyhollow',
      type: 'location',
      description: 'A cursed town, eerily silent. No wildlife.',
      aliases: [],
      firstMentionedIn: dndDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'Castle Valdris',
      type: 'location',
      description: 'Ancestral home of House Valdris, now ruled by the Hollow King.',
      aliases: [],
      firstMentionedIn: dndDoc2,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: dndProjectId,
      name: 'The Crown of Black Iron',
      type: 'item',
      description: "The Hollow King's phylactery. Must be destroyed in the Sunfire Forge.",
      aliases: [],
      firstMentionedIn: dndDoc2,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: vesperId,
      documentId: dndDoc1,
      subject: 'Lady Vesper',
      predicate: 'is_last_heir_of',
      object: 'House Valdris',
      confidence: 1.0,
      evidenceSnippet: 'she is the last heir',
      evidencePosition: { start: 340, end: 360 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: vesperId,
      documentId: dndDoc1,
      subject: 'Lady Vesper',
      predicate: 'offered_reward',
      object: '500 gold pieces',
      confidence: 1.0,
      evidenceSnippet: 'She offered 500 gold pieces',
      evidencePosition: { start: 150, end: 177 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: zaraId,
      documentId: dndDoc1,
      subject: 'Zara',
      predicate: 'has_patron',
      object: 'the Raven Queen',
      confidence: 1.0,
      evidenceSnippet: "Zara the tiefling warlock's patron, the Raven Queen",
      evidencePosition: { start: 520, end: 571 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: hollowKingId,
      documentId: dndDoc2,
      subject: 'The Hollow King',
      predicate: 'phylactery_is',
      object: 'the crown of black iron',
      confidence: 1.0,
      evidenceSnippet: 'his phylactery was the crown itself',
      evidencePosition: { start: 680, end: 715 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: kiraId,
      documentId: dndDoc2,
      subject: 'Kira',
      predicate: 'dealt_damage',
      object: '47 damage critical sneak attack',
      confidence: 1.0,
      evidenceSnippet: 'Kira landed a critical sneak attack on the Hollow King (47 damage!)',
      evidencePosition: { start: 580, end: 647 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: dndProjectId,
      entityId: hollowKingId,
      documentId: dndDoc2,
      subject: 'The Hollow King',
      predicate: 'can',
      object: 'regenerate',
      confidence: 1.0,
      evidenceSnippet: 'but he regenerated',
      evidencePosition: { start: 648, end: 666 },
      status: 'pending',
      createdAt: now,
    });

    projects.push({ projectId: dndProjectId, documentIds: [dndDoc1, dndDoc2] });

    // ========== PROJECT 3: Fanfiction ==========
    const fanficProjectId = await ctx.db.insert('projects', {
      userId,
      name: 'The Lost Apprentice',
      description:
        'A Harry Potter fanfic exploring what if Snape had a secret apprentice during the war.',
      createdAt: now,
      updatedAt: now,
      stats: { documentCount: 2, entityCount: 6, factCount: 5, alertCount: 0 },
    });

    const fanficDoc1 = await ctx.db.insert('documents', {
      projectId: fanficProjectId,
      title: 'Chapter 1: The Potions Prodigy',
      content: `Elara Blackwood had a secret. Every Tuesday and Thursday, while other students attended Quidditch practice or lounged in their common rooms, she descended to the dungeons for private lessons with Professor Snape.

"Your Wolfsbane is adequate," Snape said, examining her cauldron with his characteristic sneer. "Merely adequate. A first-year could achieve adequate."

Elara bit back her retort. She knew his teaching style by now—three years of clandestine tutoring had taught her that his criticism meant she was close to mastery.

"The lunar cycle affects the aconite's potency," she offered. "I compensated with additional moonstone."

For a fraction of a second, something like approval flickered in Snape's dark eyes. "You may yet prove yourself useful, Miss Blackwood. The Dark Lord's return approaches. The Order will need competent potioneers."

It was the closest he'd ever come to admitting she was being trained for the coming war.`,
      contentType: 'text',
      orderIndex: 0,
      wordCount: 163,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const fanficDoc2 = await ctx.db.insert('documents', {
      projectId: fanficProjectId,
      title: 'Chapter 2: The Spy and the Student',
      content: `Dumbledore's office was warm, but Elara felt cold. The Headmaster's blue eyes, usually twinkling, were grave.

"Professor Snape tells me you've progressed remarkably," Dumbledore said. "He rarely gives such praise."

"He's never praised me to my face," Elara muttered.

"No, he wouldn't. Severus shows affection through expectation." Dumbledore steepled his fingers. "Which is why I must ask something difficult. We need someone inside Malfoy Manor. Someone young enough to be overlooked, skilled enough to survive."

Elara's blood ran cold. "You want me to spy on the Death Eaters."

"I want you to make your own choice. But know this—Severus argued against this mission. Vehemently. For what it's worth, he believes you're too valuable to risk."

She thought of Snape's endless corrections, his impossible standards, his rare moments of almost-kindness. He'd trained her for this. Whether he wanted to admit it or not.

"I'll do it."`,
      contentType: 'text',
      orderIndex: 1,
      wordCount: 175,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
      processingStatus: 'completed',
    });

    const elaraBlackwoodId = await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'Elara Blackwood',
      type: 'character',
      description: "Snape's secret apprentice, potions prodigy, OC protagonist.",
      aliases: ['Miss Blackwood'],
      firstMentionedIn: fanficDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const snapeId = await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'Severus Snape',
      type: 'character',
      description: "Potions Master, Elara's secret mentor, Order spy.",
      aliases: ['Professor Snape', 'Snape'],
      firstMentionedIn: fanficDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    const dumbledoreId = await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'Albus Dumbledore',
      type: 'character',
      description: 'Headmaster of Hogwarts, leader of the Order of the Phoenix.',
      aliases: ['Dumbledore', 'The Headmaster'],
      firstMentionedIn: fanficDoc2,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'Malfoy Manor',
      type: 'location',
      description: 'Death Eater headquarters, target of spy mission.',
      aliases: [],
      firstMentionedIn: fanficDoc2,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'The Order of the Phoenix',
      type: 'concept',
      description: 'Secret organization fighting against Voldemort.',
      aliases: ['The Order'],
      firstMentionedIn: fanficDoc1,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('entities', {
      projectId: fanficProjectId,
      name: 'Wolfsbane Potion',
      type: 'item',
      description: 'Complex potion that helps werewolves retain their minds.',
      aliases: ['Wolfsbane'],
      firstMentionedIn: fanficDoc1,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fanficProjectId,
      entityId: elaraBlackwoodId,
      documentId: fanficDoc1,
      subject: 'Elara Blackwood',
      predicate: 'trained_by',
      object: 'Professor Snape',
      confidence: 1.0,
      evidenceSnippet: 'three years of clandestine tutoring',
      evidencePosition: { start: 340, end: 373 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fanficProjectId,
      entityId: elaraBlackwoodId,
      documentId: fanficDoc1,
      subject: 'Elara Blackwood',
      predicate: 'skilled_in',
      object: 'potion-making',
      confidence: 1.0,
      evidenceSnippet: 'compensated with additional moonstone',
      evidencePosition: { start: 450, end: 486 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fanficProjectId,
      entityId: snapeId,
      documentId: fanficDoc2,
      subject: 'Severus Snape',
      predicate: 'argued_against',
      object: "Elara's spy mission",
      confidence: 1.0,
      evidenceSnippet: 'Severus argued against this mission. Vehemently.',
      evidencePosition: { start: 520, end: 568 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fanficProjectId,
      entityId: dumbledoreId,
      documentId: fanficDoc2,
      subject: 'Dumbledore',
      predicate: 'wants_spy_at',
      object: 'Malfoy Manor',
      confidence: 1.0,
      evidenceSnippet: 'We need someone inside Malfoy Manor',
      evidencePosition: { start: 320, end: 355 },
      status: 'confirmed',
      createdAt: now,
    });

    await ctx.db.insert('facts', {
      projectId: fanficProjectId,
      entityId: elaraBlackwoodId,
      documentId: fanficDoc2,
      subject: 'Elara Blackwood',
      predicate: 'agrees_to',
      object: 'spy on Death Eaters',
      confidence: 1.0,
      evidenceSnippet: "I'll do it",
      evidencePosition: { start: 780, end: 790 },
      status: 'pending',
      createdAt: now,
    });

    projects.push({ projectId: fanficProjectId, documentIds: [fanficDoc1, fanficDoc2] });

    return { projects };
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
