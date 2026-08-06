import { getServerEnv } from "../../../src/runtime/server-env";

export const dynamic = "force-static";

export function GET(): Response {
  if (process.env.STATIC_EXPORT === "true") {
    return Response.json({
      status: "ok",
      release: process.env.RELEASE_SHA ?? "static-demo",
    });
  }

  const environment = getServerEnv();

  return Response.json({
    status: "ok",
    release: environment.RELEASE_SHA ?? "development",
  });
}
