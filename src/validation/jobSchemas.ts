import { z } from "zod";

const scheduleBase = z.object({
  type: z.enum(["cron", "interval", "once"])
});

const cronSchedule = scheduleBase.extend({
  type: z.literal("cron"),
  cron: z.string().min(1)
});

const intervalSchedule = scheduleBase.extend({
  type: z.literal("interval"),
  seconds: z.number().int().min(1)
});

const onceSchedule = scheduleBase.extend({
  type: z.literal("once"),
  runAt: z.string().datetime().optional()
});

export const scheduleSchema = z.discriminatedUnion("type", [
  cronSchedule,
  intervalSchedule,
  onceSchedule
]);

export const createJobSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  command: z.string().optional(),
  schedule: scheduleSchema,
  enabled: z.boolean().optional(),
  concurrencyPolicy: z.enum(["forbid", "allow"]).optional()
});

export const updateJobSchema = createJobSchema.partial();
