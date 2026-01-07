import { defineApp } from 'convex/server';
import persistentTextStreaming from '@convex-dev/persistent-text-streaming/convex.config';
import polar from '@convex-dev/polar/convex.config';

const app = defineApp();
app.use(persistentTextStreaming);
app.use(polar);

export default app;
