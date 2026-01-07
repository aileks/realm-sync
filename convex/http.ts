import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { auth } from './auth';
import { streamChat } from './chat';

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: '/chat-stream',
  method: 'POST',
  handler: streamChat,
});

http.route({
  path: '/chat-stream',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }),
});

http.route({
  path: '/webhooks/polar',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const signature = request.headers.get('x-polar-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    const body = await request.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      return new Response('Invalid signature', { status: 401 });
    }

    let event: {
      type: string;
      data: {
        id?: string;
        customer_id?: string;
        user_id?: string;
        status?: string;
        metadata?: { convex_user_id?: string };
      };
    };

    try {
      event = JSON.parse(body);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const userId = event.data?.metadata?.convex_user_id;

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.activated':
        if (userId) {
          await ctx.runMutation(api.subscription.handleSubscriptionActivated, {
            polarCustomerId: event.data.customer_id ?? '',
            polarSubscriptionId: event.data.id ?? '',
            userId: userId as Id<'users'>,
          });
        }
        break;

      case 'subscription.canceled':
      case 'subscription.revoked':
        if (userId) {
          await ctx.runMutation(api.subscription.handleSubscriptionCanceled, {
            userId: userId as Id<'users'>,
          });
        }
        break;

      default:
        console.log(`Unhandled Polar webhook event: ${event.type}`);
    }

    return new Response('OK', { status: 200 });
  }),
});

export default http;
