import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum
} from "drizzle-orm/pg-core";

export const scheduleTypeEnum = pgEnum("schedule_type", ["cron", "interval", "once"]);
export const runStatusEnum = pgEnum("run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "canceled"
]);
export const concurrencyEnum = pgEnum("concurrency_policy", ["forbid", "allow"]);

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  command: text("command"),
  scheduleType: scheduleTypeEnum("schedule_type").notNull(),
  cronExpression: text("cron_expression"),
  intervalSeconds: integer("interval_seconds"),
  runAt: timestamp("run_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  concurrencyPolicy: concurrencyEnum("concurrency_policy").notNull().default("forbid"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  status: runStatusEnum("status").notNull().default("pending"),
  containerId: text("container_id"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  exitCode: integer("exit_code"),
  error: text("error"),
  logs: text("logs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
