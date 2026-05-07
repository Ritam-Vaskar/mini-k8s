import { app } from "./app.js";
import { config } from "./config.js";
import { startScheduler } from "./scheduler/scheduler.js";

app.listen(config.port, () => {
  startScheduler(config.schedulerPollMs);
});
