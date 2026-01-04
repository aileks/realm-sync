import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {auth} from './auth';
import {streamChat} from './chat';

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

export default http;
