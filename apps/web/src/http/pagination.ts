import {
  paginationQuerySchema,
  type Page,
} from "@ai-estimate-studio/contracts";

export function parsePagination(request: Request) {
  const url = new URL(request.url);
  return paginationQuerySchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
}

export function page<T>(
  data: T[],
  nextCursor?: string | null,
): { data: T[]; page: Page } {
  return {
    data,
    page: {
      nextCursor: nextCursor ?? null,
      hasMore: nextCursor !== undefined && nextCursor !== null,
    },
  };
}
