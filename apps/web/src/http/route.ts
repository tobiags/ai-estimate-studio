import type { z } from "zod";
import {
  validationProblem,
  internalProblem,
  problemResponse,
} from "./problems";

const DEFAULT_MAX_JSON_BYTES = 1_048_576;

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<T | Response> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)
    .at(0)
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return problemResponse({
      title: "Unsupported media type",
      status: 415,
      type: "https://ai-estimate-studio.dev/problems/unsupported-media-type",
    });
  }

  const bytes = await request.clone().arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    return problemResponse({
      title: "Payload too large",
      status: 413,
      type: "https://ai-estimate-studio.dev/problems/payload-too-large",
    });
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return problemResponse({
      title: "Malformed JSON",
      status: 400,
      type: "https://ai-estimate-studio.dev/problems/malformed-json",
    });
  }

  const result = schema.safeParse(value);
  return result.success ? result.data : validationProblem(result.error);
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export async function safeRoute(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch {
    return internalProblem();
  }
}
