import { Router } from "express";
import { db } from "../db";
import { runs } from "../db/schema";
import { eq } from "drizzle-orm";
import { stopContainer } from "../scheduler/dockerRunner";

export const runsRouter = Router();

runsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid run id" });
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, id));
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }

  res.json(run);
});

runsRouter.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid run id" });
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, id));
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }

  if (!run.containerId) {
    return res.status(409).json({ error: "Run has no active container" });
  }

  await stopContainer(run.containerId);
  const [updated] = await db
    .update(runs)
    .set({ status: "canceled", finishedAt: new Date() })
    .where(eq(runs.id, id))
    .returning();

  res.json(updated);
});
