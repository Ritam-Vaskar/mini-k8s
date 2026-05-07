import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  schedulerPollMs: Number(process.env.SCHEDULER_POLL_MS || 5000),
  dockerHost: process.env.DOCKER_HOST || ""
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
