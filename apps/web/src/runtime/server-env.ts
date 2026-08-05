import "server-only";

import { parseServerEnv, type ServerEnv } from "@ai-estimate-studio/config/env";

export function getServerEnv(
  source: Record<string, unknown> = process.env,
): ServerEnv {
  return parseServerEnv(source);
}
