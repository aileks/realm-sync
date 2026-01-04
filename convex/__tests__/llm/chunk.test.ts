import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  needsChunking,
  mapEvidenceToDocument,
  MAX_CHUNK_CHARS,
  OVERLAP_CHARS,
  type Chunk,
} from '../../llm/chunk';

describe('chunkDocument', () => {
  it('returns single chunk for short content', () => {
    const content = 'This is a short document.';
    const chunks = chunkDocument(content);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(content);
    expect(chunks[0].startOffset).toBe(0);
    expect(chunks[0].endOffset).toBe(content.length);
    expect(chunks[0].index).toBe(0);
  });

  it('returns single chunk for content exactly at max size', () => {
    const content = 'x'.repeat(MAX_CHUNK_CHARS);
    const chunks = chunkDocument(content);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.length).toBe(MAX_CHUNK_CHARS);
  });

  it('uses default overlap for context continuity', () => {
    const content = 'word '.repeat(5000);
    const chunks = chunkDocument(content);

    if (chunks.length > 1) {
      const overlapRegion = chunks[0].endOffset - chunks[1].startOffset;
      expect(overlapRegion).toBeGreaterThanOrEqual(OVERLAP_CHARS - 200);
    }
  });

  it('splits content exceeding max size into multiple chunks', () => {
    const content = 'a'.repeat(MAX_CHUNK_CHARS + 5000);
    const chunks = chunkDocument(content);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it('preserves paragraph boundaries when splitting', () => {
    const paragraph1 = 'First paragraph. '.repeat(400);
    const paragraph2 = 'Second paragraph. '.repeat(400);
    const content = paragraph1 + '\n\n' + paragraph2;

    const chunks = chunkDocument(content, 8000, 500);

    const chunk0End = chunks[0].endOffset;
    const boundaryArea = content.slice(chunk0End - 5, chunk0End + 5);
    expect(boundaryArea).toMatch(/\n/);
  });

  it('creates overlapping chunks for context continuity', () => {
    const content = 'word '.repeat(5000);
    const chunks = chunkDocument(content, 5000, 500);

    if (chunks.length > 1) {
      const chunk0End = chunks[0].endOffset;
      const chunk1Start = chunks[1].startOffset;
      expect(chunk0End).toBeGreaterThan(chunk1Start);
    }
  });

  it('tracks correct offsets across all chunks', () => {
    const content = 'The quick brown fox. '.repeat(1000);
    const chunks = chunkDocument(content, 3000, 300);

    for (const chunk of chunks) {
      const extracted = content.slice(chunk.startOffset, chunk.endOffset);
      expect(extracted).toBe(chunk.text);
    }
  });

  it('handles content with no paragraph breaks', () => {
    const content = 'continuous text without breaks '.repeat(500);
    const chunks = chunkDocument(content, 3000, 300);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(3000);
    }
  });

  it('uses custom chunk and overlap sizes', () => {
    const content = 'test '.repeat(1000);
    const chunks = chunkDocument(content, 2000, 200);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].text.length).toBeLessThanOrEqual(2000);
  });

  it('handles content starting with newlines without index error', () => {
    const content = '\n\nParagraph after blank lines. '.repeat(500);
    const chunks = chunkDocument(content, 3000, 300);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(3000);
    }
  });

  it('handles boundary search near start of content', () => {
    const content = 'Short. '.repeat(200) + '\n\n' + 'More text. '.repeat(200);
    const chunks = chunkDocument(content, 1500, 100);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
      expect(chunk.endOffset).toBeLessThanOrEqual(content.length);
    }
  });

  it('handles content with only newlines at boundaries', () => {
    const content = '\n'.repeat(100) + 'text'.repeat(1000) + '\n'.repeat(100);
    const chunks = chunkDocument(content, 2000, 200);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      const extracted = content.slice(chunk.startOffset, chunk.endOffset);
      expect(extracted).toBe(chunk.text);
    }
  });
});

describe('needsChunking', () => {
  it('returns false for short content', () => {
    expect(needsChunking('short')).toBe(false);
  });

  it('returns false for content at max size', () => {
    expect(needsChunking('x'.repeat(MAX_CHUNK_CHARS))).toBe(false);
  });

  it('returns true for content exceeding max size', () => {
    expect(needsChunking('x'.repeat(MAX_CHUNK_CHARS + 1))).toBe(true);
  });

  it('respects custom max size', () => {
    expect(needsChunking('x'.repeat(1001), 1000)).toBe(true);
    expect(needsChunking('x'.repeat(1000), 1000)).toBe(false);
  });
});

describe('mapEvidenceToDocument', () => {
  const documentContent =
    'The hero walked into the dark forest. Birds sang overhead. The path was narrow.';

  it('maps evidence found in chunk to document position', () => {
    const chunk: Chunk = {
      text: 'The hero walked into the dark forest.',
      startOffset: 0,
      endOffset: 37,
      index: 0,
    };
    const evidence = 'dark forest';

    const result = mapEvidenceToDocument(evidence, chunk, documentContent);

    expect(result).not.toBeNull();
    expect(documentContent.slice(result!.start, result!.end)).toBe(evidence);
  });

  it('maps evidence from middle chunk correctly', () => {
    const chunk: Chunk = {
      text: 'Birds sang overhead. The path was narrow.',
      startOffset: 38,
      endOffset: 79,
      index: 1,
    };
    const evidence = 'path was narrow';

    const result = mapEvidenceToDocument(evidence, chunk, documentContent);

    expect(result).not.toBeNull();
    expect(documentContent.slice(result!.start, result!.end)).toBe(evidence);
  });

  it('returns null for evidence not in document', () => {
    const chunk: Chunk = {
      text: 'The hero walked into the dark forest.',
      startOffset: 0,
      endOffset: 37,
      index: 0,
    };
    const evidence = 'completely different text that does not exist';

    const result = mapEvidenceToDocument(evidence, chunk, documentContent);

    expect(result).toBeNull();
  });

  it('handles fuzzy matching for slightly modified evidence', () => {
    const longDoc =
      'The ancient warrior carried a legendary sword into battle against the darkness.';
    const chunk: Chunk = {
      text: longDoc,
      startOffset: 0,
      endOffset: longDoc.length,
      index: 0,
    };
    const evidence = 'warrior carried legendary sword';

    const result = mapEvidenceToDocument(evidence, chunk, longDoc);

    expect(result).not.toBeNull();
  });
});
