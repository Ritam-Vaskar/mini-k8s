import { db } from "../db";
import { jobs, runs } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { computeNextRunAt, ScheduleInput } from "../utils/time";
import { runContainer } from "./dockerRunner";

export type JobRow = typeof jobs.$inferSelect;

function toScheduleInput(job: JobRow): ScheduleInput {
  if (job.scheduleType === "cron") {
    return { type: "cron", cron: job.cronExpression || "" };
  }
  if (job.scheduleType === "interval") {
    return { type: "interval", seconds: job.intervalSeconds || 0 };
  }
  return { type: "once", runAt: job.runAt ? new Date(job.runAt) : undefined };
}

async function createRun(job: JobRow) {
  const [run] = await db
    .insert(runs)
    .values({
      jobId: job.id,
      status: "pending"
    })
    .returning();

  return run;
}

async function startRun(job: JobRow, runId: number) {
  try {
    await db.update(runs).set({ status: "running", startedAt: new Date() }).where(eq(runs.id, runId));

    const result = await runContainer(job.image, job.command || undefined);

    await db.update(runs).set({
      status: result.exitCode === 0 ? "succeeded" : "failed",
      finishedAt: new Date(),
      exitCode: result.exitCode ?? undefined,
      containerId: result.containerId,
      logs: result.logs
    }).where(eq(runs.id, runId));
  } catch (error) {
    await db.update(runs).set({
      status: "failed",
      finishedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error"
    }).where(eq(runs.id, runId));
  }
}

export async function pollAndRunOnce(): Promise<number> {
  const now = new Date();

  const dueJobs = await db.transaction(async (tx) => {
    const result = await tx.execute<JobRow>(sql`
      select * from jobs
      where enabled = true
        and next_run_at is not null
        and next_run_at <= now()
      for update skip locked
    `);

    return result.rows || [];
  });

  for (const job of dueJobs) {
    if (job.concurrencyPolicy === "forbid") {
      const runningCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(runs)
        .where(and(eq(runs.jobId, job.id), eq(runs.status, "running")));

      if (Number(runningCount[0]?.count || 0) > 0) {
        continue;
      }
    }

    const schedule = toScheduleInput(job);
    const nextRunAt = job.scheduleType === "once" ? null : computeNextRunAt(schedule, now);

    await db.update(jobs).set({
      lastRunAt: now,
      nextRunAt,
      updatedAt: now
    }).where(eq(jobs.id, job.id));

    const run = await createRun(job);
    void startRun(job, run.id);
  }

  return dueJobs.length;
}

export function startScheduler(pollMs: number) {
  const tick = async () => {
    try {
      await pollAndRunOnce();
    } catch (error) {
      // Swallow scheduler loop errors to keep process alive.
    }
  };

  void tick();
  return setInterval(tick, pollMs);
}
