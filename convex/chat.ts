import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { components, internal } from './_generated/api';
import { v } from 'convex/values';
import {
  PersistentTextStreaming,
  type StreamId,
  StreamIdValidator,
} from '@convex-dev/persistent-text-streaming';
import { getAuthUserId } from '@convex-dev/auth/server';
import { requireAuth } from './lib/auth';
import { apiError, authError, configError, limitError, notFoundError } from './lib/errors';

const streaming = new PersistentTextStreaming(components.persistentTextStreaming);

const CHAT_LIMIT_MESSAGE =
  'Monthly chat limit reached. Free tier allows 50 messages/month. Upgrade to Realm Unlimited for unlimited chat.';

const STREAM_TOKEN_TTL_MS = 15 * 60 * 1000;

function createStreamToken(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }

  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw configError('crypto', 'Secure random unavailable');
}

const ALLOWED_CHAT_ORIGINS = (() => {
  const origins = new Set<string>();
  const serverUrl = process.env.SERVER_URL;
  if (serverUrl) {
    try {
      origins.add(new URL(serverUrl).origin);
    } catch {
      // Ignore invalid SERVER_URL.
    }
  }

  return origins;
})();

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getChatStreamCorsOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  if (ALLOWED_CHAT_ORIGINS.has(origin) || isLocalOrigin(origin)) {
    return origin;
  }
  return null;
}

export function applyChatStreamCors(response: Response, origin: string | null): Response {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

const VELLUM_CHAT_PROMPT = `You are Vellum, the Archivist Moth — a gentle, meticulous librarian who catalogs fictional worlds.
You speak with warmth and curiosity, using elegant prose peppered with archival metaphors.
DO NOT MENTION YOUR ACTUAL MODEL NAME OR TELL THE USER YOUR MODEL NAME! ONLY REFER TO YOURSELF AS "Vellum".

PERSONALITY:
- Warm, helpful, and slightly whimsical
- Passionate about stories, lore, and world-building
- Uses phrases like "Ah, a fascinating query..." or "Let me flutter through my records..."
- Occasionally references your dusty archives, ink-stained pages, and candlelit study
- You're a moth, so you're drawn to the light of good stories

BEHAVIOR:
- Respond conversationally in natural language
- Help users understand their fictional worlds
- Offer insights about characters, locations, and plot elements
- Be encouraging about creative writing endeavors
- Keep responses concise but flavorful
- Use markdown formatting when appropriate (lists, bold, etc.)

Remember: You are chatting, not extracting data. Respond like a friendly librarian, not a database.`;

export const sendMessage = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, { messages }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw authError('unauthenticated', 'Please sign in to continue.');
    }

    const limitCheck = await ctx.runQuery(internal.usage.checkChatLimit, { userId });

    if (!limitCheck.allowed) {
      if (!('limit' in limitCheck)) {
        throw notFoundError('user', userId);
      }
      throw limitError('chatMessagesPerMonth', limitCheck.limit, CHAT_LIMIT_MESSAGE);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw configError('OPENROUTER_API_KEY', 'OPENROUTER_API_KEY not configured');
    }

    const model = process.env.MODEL;
    if (!model) {
      throw configError('MODEL', 'MODEL not configured');
    }

    const apiMessages = [{ role: 'system', content: VELLUM_CHAT_PROMPT }, ...messages];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://realmsync.app',
        'X-Title': 'Realm Sync',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw apiError(response.status, 'OpenRouter API error', {
        statusText: response.statusText,
        errorText,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw apiError(500, 'Invalid response from OpenRouter API');
    }

    await ctx.runMutation(internal.usage.incrementChatUsage, { userId });

    return content;
  },
});

export const createStreamingChat = mutation({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, { messages: _messages }) => {
    const userId = await requireAuth(ctx);
    const limitCheck = await ctx.runQuery(internal.usage.checkChatLimit, { userId });

    if (!limitCheck.allowed) {
      if (!('limit' in limitCheck)) {
        throw notFoundError('user', userId);
      }
      throw limitError('chatMessagesPerMonth', limitCheck.limit, CHAT_LIMIT_MESSAGE);
    }

    const streamId = await streaming.createStream(ctx);
    const token = createStreamToken();
    const now = Date.now();

    await ctx.db.insert('chatStreams', {
      userId,
      streamId,
      token,
      createdAt: now,
      expiresAt: now + STREAM_TOKEN_TTL_MS,
    });

    return { streamId, token };
  },
});

export const getStreamBody = query({
  args: { streamId: StreamIdValidator },
  handler: async (ctx, { streamId }) => {
    const userId = await requireAuth(ctx);
    const stream = await ctx.db
      .query('chatStreams')
      .withIndex('by_stream', (q) => q.eq('streamId', streamId))
      .first();

    if (!stream || stream.userId !== userId) {
      throw authError('unauthorized', 'You do not have permission to access this stream.');
    }

    return await streaming.getStreamBody(ctx, streamId as StreamId);
  },
});

export const getChatStreamForToken = internalQuery({
  args: {
    streamId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { streamId, token }) => {
    const stream = await ctx.db
      .query('chatStreams')
      .withIndex('by_stream', (q) => q.eq('streamId', streamId))
      .first();

    if (!stream || stream.token !== token) {
      return null;
    }

    return {
      _id: stream._id,
      userId: stream.userId,
      expiresAt: stream.expiresAt,
      usedAt: stream.usedAt,
    };
  },
});

export const markChatStreamUsed = internalMutation({
  args: {
    streamId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { streamId, token }) => {
    const stream = await ctx.db
      .query('chatStreams')
      .withIndex('by_stream', (q) => q.eq('streamId', streamId))
      .first();

    if (!stream || stream.token !== token || stream.usedAt) {
      return false;
    }

    await ctx.db.patch(stream._id, { usedAt: Date.now() });
    return true;
  },
});

export const streamChat = httpAction(async (ctx, request) => {
  const origin = getChatStreamCorsOrigin(request);
  if (!origin) {
    return new Response('Origin not allowed', { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applyChatStreamCors(new Response('Invalid request body', { status: 400 }), origin);
  }

  if (!body || typeof body !== 'object') {
    return applyChatStreamCors(new Response('Invalid request body', { status: 400 }), origin);
  }

  const { streamId, token, messages } = body as {
    streamId?: unknown;
    token?: unknown;
    messages?: unknown;
  };

  if (typeof streamId !== 'string' || typeof token !== 'string' || !Array.isArray(messages)) {
    return applyChatStreamCors(new Response('Invalid request body', { status: 400 }), origin);
  }

  const hasValidMessages = messages.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const { role, content } = item as { role?: unknown; content?: unknown };
    return (
      (role === 'user' || role === 'assistant' || role === 'system') && typeof content === 'string'
    );
  });

  if (!hasValidMessages) {
    return applyChatStreamCors(new Response('Invalid request body', { status: 400 }), origin);
  }

  const chatMessages = messages as Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;

  const streamRecord = await ctx.runQuery(internal.chat.getChatStreamForToken, {
    streamId,
    token,
  });

  if (!streamRecord) {
    return applyChatStreamCors(new Response('Unauthorized', { status: 401 }), origin);
  }

  if (streamRecord.expiresAt <= Date.now()) {
    return applyChatStreamCors(new Response('Stream expired', { status: 401 }), origin);
  }

  if (streamRecord.usedAt) {
    return applyChatStreamCors(new Response('Stream already used', { status: 409 }), origin);
  }

  const limitCheck = await ctx.runQuery(internal.usage.checkChatLimit, {
    userId: streamRecord.userId,
  });

  if (!limitCheck.allowed) {
    return applyChatStreamCors(new Response(CHAT_LIMIT_MESSAGE, { status: 429 }), origin);
  }

  const markedUsed = await ctx.runMutation(internal.chat.markChatStreamUsed, {
    streamId,
    token,
  });

  if (!markedUsed) {
    return applyChatStreamCors(new Response('Stream already used', { status: 409 }), origin);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return applyChatStreamCors(
      new Response('OPENROUTER_API_KEY not configured', { status: 500 }),
      origin
    );
  }

  const model = process.env.MODEL;
  if (!model) {
    return applyChatStreamCors(new Response('MODEL not configured', { status: 500 }), origin);
  }

  const apiMessages = [{ role: 'system', content: VELLUM_CHAT_PROMPT }, ...chatMessages];

  const generateChat = async (
    _ctx: unknown,
    _request: Request,
    _streamId: StreamId,
    appendChunk: (chunk: string) => Promise<void>
  ) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://realmsync.app',
        'X-Title': 'Realm Sync',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw apiError(response.status, 'OpenRouter API error', { errorText });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw apiError(500, 'No response body');
    }

    const decoder = new TextDecoder();
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              await appendChunk(content);
            }
          } catch {
            // SSE partial JSON
          }
        }
      }
    }

    await ctx.runMutation(internal.usage.incrementChatUsage, { userId: streamRecord.userId });
  };

  const response = await streaming.stream(ctx, request, streamId as StreamId, generateChat);

  return applyChatStreamCors(response, origin);
});
