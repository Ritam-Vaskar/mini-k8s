import { Router } from "express";
import { db } from "../db";
import { jobs, runs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { computeNextRunAt } from "../utils/time";
import { createJobSchema, updateJobSchema } from "../validation/jobSchemas";
import { pollAndRunOnce } from "../scheduler/scheduler";
import { sql } from "drizzle-orm";

export const jobsRouter = Router();

jobsRouter.post("/", async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { schedule, ...rest } = parsed.data;
  const now = new Date();
  let nextRunAt: Date | null;

  try {
    nextRunAt = computeNextRunAt(
      schedule.type === "once" ? { type: "once", runAt: schedule.runAt ? new Date(schedule.runAt) : now } : schedule,
      now
    );
  } catch (error) {
    return res.status(400).json({ error: "Invalid schedule", details: error instanceof Error ? error.message : undefined });
  }

  const [job] = await db
    .insert(jobs)
    .values({
      name: rest.name,
      image: rest.image,
      command: rest.command,
      scheduleType: schedule.type,
      cronExpression: schedule.type === "cron" ? schedule.cron : null,
      intervalSeconds: schedule.type === "interval" ? schedule.seconds : null,
      runAt: schedule.type === "once" && schedule.runAt ? new Date(schedule.runAt) : null,
      enabled: rest.enabled ?? true,
      concurrencyPolicy: rest.concurrencyPolicy ?? "forbid",
      nextRunAt,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return res.status(201).json(job);
});

jobsRouter.get("/", async (_req, res) => {
  const items = await db.select().from(jobs).orderBy(desc(jobs.id));
  res.json(items);
});

jobsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid job id" });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

jobsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid job id" });
  }

  const parsed = updateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const now = new Date();

  const updateData: Record<string, unknown> = {
    updatedAt: now
  };

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.image !== undefined) updateData.image = payload.image;
  if (payload.command !== undefined) updateData.command = payload.command;
  if (payload.enabled !== undefined) updateData.enabled = payload.enabled;
  if (payload.concurrencyPolicy !== undefined) updateData.concurrencyPolicy = payload.concurrencyPolicy;

  if (payload.schedule) {
    const schedule = payload.schedule;
    let nextRunAt: Date | null;

    try {
      nextRunAt = computeNextRunAt(
        schedule.type === "once" ? { type: "once", runAt: schedule.runAt ? new Date(schedule.runAt) : now } : schedule,
        now
      );
    } catch (error) {
      return res.status(400).json({ error: "Invalid schedule", details: error instanceof Error ? error.message : undefined });
    }

    updateData.scheduleType = schedule.type;
    updateData.cronExpression = schedule.type === "cron" ? schedule.cron : null;
    updateData.intervalSeconds = schedule.type === "interval" ? schedule.seconds : null;
    updateData.runAt = schedule.type === "once" && schedule.runAt ? new Date(schedule.runAt) : null;
    updateData.nextRunAt = nextRunAt;
  }

  const [job] = await db
    .update(jobs)
    .set(updateData)
    .where(eq(jobs.id, id))
    .returning();

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

jobsRouter.post("/:id/run", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid job id" });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (job.concurrencyPolicy === "forbid") {
    const [runningOnly] = await db
      .select({ count: sql<number>`count(*)` })
      .from(runs)
      .where(sql`${runs.jobId} = ${job.id} and ${runs.status} = 'running'`);

    if (Number(runningOnly?.count || 0) > 0) {
      return res.status(409).json({ error: "Job is already running" });
    }
  }
    return res.status(409).json({ error: "Job is already running" });
  }

  await db.update(jobs).set({ nextRunAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, job.id));
  await pollAndRunOnce();

  const [latestRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.jobId, job.id))
    .orderBy(desc(runs.id))
    .limit(1);

  return res.status(202).json(latestRun);
});

jobsRouter.get("/:id/runs", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid job id" });
  }

  const items = await db
    .select()
    .from(runs)
    .where(eq(runs.jobId, id))
    .orderBy(desc(runs.id));

  res.json(items);
});
