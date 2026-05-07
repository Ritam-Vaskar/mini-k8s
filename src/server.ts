import { app } from "./app";
import { config } from "./config";
import { startScheduler } from "./scheduler/scheduler";

app.listen(config.port, () => {
  startScheduler(config.schedulerPollMs);
});
