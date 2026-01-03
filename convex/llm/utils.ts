import { internalQuery } from '../_generated/server';
import { v } from 'convex/values';

export const computeHash = internalQuery({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, { content }) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },
});
