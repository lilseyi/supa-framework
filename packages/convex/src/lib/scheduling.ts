/**
 * Scheduling Helpers
 *
 * Utilities for working with Convex crons and scheduled functions.
 */

/**
 * Create a cron schedule string for common intervals.
 * Returns a cron expression string compatible with Convex's cronJobs().
 */
export const CronSchedules = {
  /** Every minute */
  everyMinute: "* * * * *",
  /** Every 5 minutes */
  every5Minutes: "*/5 * * * *",
  /** Every 15 minutes */
  every15Minutes: "*/15 * * * *",
  /** Every 30 minutes */
  every30Minutes: "*/30 * * * *",
  /** Every hour */
  everyHour: "0 * * * *",
  /** Every day at midnight UTC */
  daily: "0 0 * * *",
  /** Every day at a specific hour (0-23 UTC) */
  dailyAt: (hour: number) => `0 ${hour} * * *`,
  /** Every week on Monday at midnight UTC */
  weekly: "0 0 * * 1",
  /** Every month on the 1st at midnight UTC */
  monthly: "0 0 1 * *",
} as const;

/**
 * Calculate a delay in milliseconds.
 * Useful with ctx.scheduler.runAfter().
 */
export const Delay = {
  seconds: (n: number) => n * 1000,
  minutes: (n: number) => n * 60 * 1000,
  hours: (n: number) => n * 60 * 60 * 1000,
  days: (n: number) => n * 24 * 60 * 60 * 1000,
} as const;
