import { spawnSync } from "node:child_process";

function runDocker(arguments_) {
  const result = spawnSync("docker", arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `docker ${arguments_.join(" ")} failed with exit code ${result.status}.`,
    );
  }
}

runDocker(["info"]);
runDocker(["compose", "config", "--quiet"]);
runDocker([
  "compose",
  "up",
  "--detach",
  "--wait",
  "--wait-timeout",
  "120",
  "postgres",
  "minio",
  "mailpit",
]);
runDocker(["compose", "run", "--rm", "minio-init"]);

process.stdout.write(
  "Local infrastructure is healthy. MinIO: http://localhost:9001; Mailpit: http://localhost:8025\n",
);
