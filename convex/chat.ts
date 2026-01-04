import { action } from './_generated/server';
import { v } from 'convex/values';
import { VELLUM_SYSTEM_PROMPT } from './llm/extract';

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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = process.env.MODEL;
    if (!model) {
      throw new Error('MODEL not configured');
    }

    const apiMessages = [{ role: 'system', content: VELLUM_SYSTEM_PROMPT }, ...messages];

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
