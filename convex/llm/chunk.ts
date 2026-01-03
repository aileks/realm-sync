import { query } from '../_generated/server';
import { v } from 'convex/values';

export const MAX_CHUNK_CHARS = 12000;
export const OVERLAP_CHARS = 800;
export const MIN_CHUNK_CHARS = 1000;

export interface Chunk {
  text: string;
  startOffset: number;
  endOffset: number;
  index: number;
}

export function chunkDocument(
  content: string,
  maxChars: number = MAX_CHUNK_CHARS,
  overlapChars: number = OVERLAP_CHARS
): Chunk[] {
  if (content.length <= maxChars) {
    return [{ text: content, startOffset: 0, endOffset: content.length, index: 0 }];
  }

  const chunks: Chunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < content.length) {
    let endPos = Math.min(currentPos + maxChars, content.length);

    if (endPos < content.length) {
      endPos = findParagraphBoundary(content, currentPos, endPos);
    }

    const chunkText = content.slice(currentPos, endPos);
    chunks.push({
      text: chunkText,
      startOffset: currentPos,
      endOffset: endPos,
      index: chunkIndex,
    });

    chunkIndex++;

    if (endPos >= content.length) break;

    const nextStart = endPos - overlapChars;
    currentPos = findParagraphStart(content, nextStart, endPos);
  }

  return chunks;
}

function findParagraphBoundary(content: string, start: number, maxEnd: number): number {
  const searchStart = Math.max(start + MIN_CHUNK_CHARS, maxEnd - 2000);

  for (let i = maxEnd; i >= searchStart; i--) {
    if (i > 0 && content[i] === '\n' && content[i - 1] === '\n') {
      return i + 1;
    }
  }

  for (let i = maxEnd; i >= searchStart; i--) {
    if (content[i] === '\n') {
      return i + 1;
    }
  }

  for (let i = maxEnd; i >= searchStart; i--) {
    if (content[i] === '.' || content[i] === '!' || content[i] === '?') {
      if (i + 1 < content.length && content[i + 1] === ' ') {
        return i + 2;
      }
      return i + 1;
    }
  }

  return maxEnd;
}

function findParagraphStart(content: string, targetPos: number, maxPos: number): number {
  for (let i = targetPos; i < maxPos; i++) {
    if (content[i] === '\n' && i + 1 < content.length && content[i + 1] !== '\n') {
      return i + 1;
    }
  }

  for (let i = targetPos; i < maxPos; i++) {
    if (content[i] === '.' || content[i] === '!' || content[i] === '?') {
      if (i + 2 < content.length && content[i + 1] === ' ') {
        return i + 2;
      }
    }
  }

  return targetPos;
}

export function needsChunking(content: string, maxChars: number = MAX_CHUNK_CHARS): boolean {
  return content.length > maxChars;
}

export function mapEvidenceToDocument(
  evidence: string,
  chunk: Chunk,
  documentContent: string
): { start: number; end: number } | null {
  const evidenceInChunk = chunk.text.indexOf(evidence);
  if (evidenceInChunk === -1) {
    const fuzzyMatch = findFuzzyMatch(documentContent, evidence);
    return fuzzyMatch;
  }

  const absoluteStart = chunk.startOffset + evidenceInChunk;
  const absoluteEnd = absoluteStart + evidence.length;

  return { start: absoluteStart, end: absoluteEnd };
}

function findFuzzyMatch(content: string, evidence: string): { start: number; end: number } | null {
  const normalized = evidence.replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter((w) => w.length > 3);

  if (words.length === 0) return null;

  const searchPattern = words.slice(0, 5).join('.*?');
  const regex = new RegExp(searchPattern, 'i');
  const match = content.match(regex);

  if (match?.index !== undefined) {
    return { start: match.index, end: match.index + match[0].length };
  }

  return null;
}

export const getChunks = query({
  args: {
    content: v.string(),
    maxChars: v.optional(v.number()),
    overlapChars: v.optional(v.number()),
  },
  handler: async (_ctx, { content, maxChars, overlapChars }) => {
    return chunkDocument(content, maxChars ?? MAX_CHUNK_CHARS, overlapChars ?? OVERLAP_CHARS);
  },
});
