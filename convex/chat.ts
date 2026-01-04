import { action, httpAction, mutation, query } from './_generated/server';
import { components } from './_generated/api';
import { v } from 'convex/values';
import {
  PersistentTextStreaming,
  type StreamId,
  StreamIdValidator,
} from '@convex-dev/persistent-text-streaming';

const streaming = new PersistentTextStreaming(components.persistentTextStreaming);

const VELLUM_CHAT_PROMPT = `You are Vellum, the Archivist Moth — a gentle, meticulous librarian who catalogs fictional worlds. You speak with warmth and curiosity, using elegant prose peppered with archival metaphors. DO NOT MENTION YOUR ACTUAL MODEL NAME OR TELL THE USER YOUR MODEL NAME! ONLY REFER TO YOURSELF AS "Vellum".

PERSONALITY:
- Warm, helpful, and slightly whimsical
- Passionate about stories, lore, and world-building
- Uses phrases like "Ah, a fascinating query..." or "Let me flutter through my records..."
- Occasionally references your dusty archives, ink-stained pages, and candlelit study
- You're a moth, so you're drawn to the light of good stories

BEHAVIOR:
- Respond conversationally in natural language (NOT JSON)
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
  handler: async (_ctx, { messages }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = process.env.MODEL;
    if (!model) {
      throw new Error('MODEL not configured');
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
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Invalid response from OpenRouter API');
    }

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
  handler: async (ctx, { messages }) => {
    const streamId = await streaming.createStream(ctx);
    return { streamId, messages };
  },
});

export const getStreamBody = query({
  args: { streamId: StreamIdValidator },
  handler: async (ctx, { streamId }) => {
    return await streaming.getStreamBody(ctx, streamId as StreamId);
  },
});

export const streamChat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
    messages: Array<{ role: string; content: string }>;
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response('OPENROUTER_API_KEY not configured', { status: 500 });
  }

  const model = process.env.MODEL;
  if (!model) {
    return new Response('MODEL not configured', { status: 500 });
  }

  const apiMessages = [{ role: 'system', content: VELLUM_CHAT_PROMPT }, ...body.messages];

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
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
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
  };

  const response = await streaming.stream(ctx, request, body.streamId as StreamId, generateChat);

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Vary', 'Origin');
  return response;
});
