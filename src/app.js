import express from "express";
import { jobsRouter } from "./routes/jobs.js";
import { runsRouter } from "./routes/runs.js";

export const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/jobs", jobsRouter);
app.use("/runs", runsRouter);
