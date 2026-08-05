import type { ZodError } from "zod";
import {
  problemSchema,
  type Problem,
  type ValidationItem,
} from "@ai-estimate-studio/contracts";

export const PROBLEM_MEDIA_TYPE = "application/problem+json";
const PROBLEM_BASE = "https://ai-estimate-studio.dev/problems/";

export type ProblemOptions = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  errors?: ValidationItem[];
};

function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function createProblem(options: ProblemOptions): Problem {
  const problem = {
    type:
      options.type ??
      `${PROBLEM_BASE}${options.title.toLowerCase().replaceAll(" ", "-")}`,
    title: options.title,
    status: options.status,
    ...(options.detail ? { detail: options.detail } : {}),
    ...(options.instance ? { instance: options.instance } : {}),
    correlationId: options.correlationId ?? newCorrelationId(),
    ...(options.errors && options.errors.length > 0
      ? { errors: options.errors }
      : {}),
  } satisfies Problem;

  return problemSchema.parse(problem);
}

export function problemResponse(
  options: ProblemOptions,
  headers?: HeadersInit,
): Response {
  const problem = createProblem(options);
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", PROBLEM_MEDIA_TYPE);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-correlation-id", problem.correlationId);
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: responseHeaders,
  });
}

export function validationProblem(
  error: ZodError,
  correlationId?: string,
): Response {
  return problemResponse({
    title: "Validation failed",
    status: 422,
    type: `${PROBLEM_BASE}validation-failed`,
    ...(correlationId ? { correlationId } : {}),
    errors: error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    })),
  });
}

export function internalProblem(correlationId?: string): Response {
  return problemResponse({
    title: "Internal server error",
    status: 500,
    type: `${PROBLEM_BASE}internal-server-error`,
    ...(correlationId ? { correlationId } : {}),
  });
}
