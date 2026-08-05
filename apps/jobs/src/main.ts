import { createJobRunner } from "./runtime.js";

const runner = createJobRunner(process.env);

runner.start();

const shutdown = (): void => {
  runner.stop();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
