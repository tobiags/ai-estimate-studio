import { getServerEnv } from "../../../src/runtime/server-env";

export function GET(): Response {
  const environment = getServerEnv();

  return Response.json({
    status: "ok",
    release: environment.RELEASE_SHA ?? "development",
  });
}
