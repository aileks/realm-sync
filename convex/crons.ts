import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.weekly(
  'cleanup expired refresh tokens',
  { dayOfWeek: 'sunday', hourUTC: 3, minuteUTC: 0 },
  internal.cleanup.cleanupExpiredRefreshTokens
);

crons.daily('reset demo account', { hourUTC: 8, minuteUTC: 0 }, internal.seed.resetDemoAccount);

export default crons;
