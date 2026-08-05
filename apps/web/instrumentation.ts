import { getServerEnv } from "./src/runtime/server-env";

export function register(): void {
  getServerEnv();
}
