import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';
import { auth } from './auth';
import { streamChat, getChatStreamCorsOrigin, applyChatStreamCors } from './chat';
import { polar } from './polar';

const http = httpRouter();
auth.addHttpRoutes(http);

polar.registerRoutes(http, {
  path: '/polar/events',
  onSubscriptionCreated: async (ctx, event) => {
    const { data } = event;
    if (!data.customer.email) return;

    const users = await ctx.runQuery(api.users.listByEmail, {
      email: data.customer.email,
    });
    if (users.length === 0) return;
    if (users.length > 1) {
      console.warn(`Multiple users with email ${data.customer.email}, using first match`);
    }

    const userId = users[0]._id;

    await ctx.runMutation(api.users.updateSubscription, {
      userId,
      polarCustomerId: data.customer.id,
      polarSubscriptionId: data.id,
      subscriptionTier: 'unlimited',
      subscriptionStatus: data.status as
        | 'active'
        | 'trialing'
        | 'canceled'
        | 'past_due'
        | 'incomplete'
        | 'incomplete_expired',
      trialEndsAt: data.trialEnd ? new Date(data.trialEnd).getTime() : undefined,
    });
  },
  onSubscriptionUpdated: async (ctx, event) => {
    const { data } = event;

    const user = await ctx.runQuery(api.users.getByPolarCustomerId, {
      polarCustomerId: data.customer.id,
    });
    if (!user) return;

    await ctx.runMutation(api.users.updateSubscription, {
      userId: user._id,
      subscriptionStatus: data.status as
        | 'active'
        | 'trialing'
        | 'canceled'
        | 'past_due'
        | 'incomplete'
        | 'incomplete_expired',
      trialEndsAt: data.trialEnd ? new Date(data.trialEnd).getTime() : undefined,
    });
  },
});

http.route({
  path: '/chat-stream',
  method: 'POST',
  handler: streamChat,
});

http.route({
  path: '/chat-stream',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => {
    const origin = getChatStreamCorsOrigin(request);
    if (!origin) {
      return new Response('Origin not allowed', { status: 403 });
    }

    const response = new Response(null, { status: 204 });
    applyChatStreamCors(response, origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  }),
});

export default http;
