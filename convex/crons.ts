import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.weekly(
  'cleanup expired refresh tokens',
  { dayOfWeek: 'sunday', hourUTC: 3, minuteUTC: 0 },
  internal.cleanup.cleanupExpiredRefreshTokens
);

crons.hourly(
  'cleanup expired chat streams',
  { minuteUTC: 15 },
  internal.cleanup.cleanupExpiredChatStreams
);

crons.daily(
  'reset stale usage counters',
  { hourUTC: 2, minuteUTC: 30 },
  internal.usage.resetStaleUsageCounters,
  {}
);

crons.daily('reset demo account', { hourUTC: 8, minuteUTC: 0 }, internal.seed.resetDemoAccount);

export default crons;
