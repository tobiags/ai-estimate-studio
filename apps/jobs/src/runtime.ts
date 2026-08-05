import { parseServerEnv, type ServerEnv } from "@ai-estimate-studio/config/env";

export interface JobRunnerLogger {
  info(message: string): void;
  error(message: string): void;
}

export interface JobRunner {
  environment: ServerEnv;
  isRunning(): boolean;
  start(): void;
  stop(): void;
}

export function createJobRunner(
  source: Record<string, unknown>,
  logger: JobRunnerLogger = console,
): JobRunner {
  const environment = parseServerEnv(source);
  let running = false;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  return {
    environment,
    isRunning: () => running,
    start: () => {
      if (!running) {
        running = true;
        keepAlive = setInterval(() => undefined, 60_000);
        logger.info("Job runner started.");
      }
    },
    stop: () => {
      if (running) {
        running = false;
        clearInterval(keepAlive);
        keepAlive = undefined;
        logger.info("Job runner stopped.");
      }
    },
  };
}
