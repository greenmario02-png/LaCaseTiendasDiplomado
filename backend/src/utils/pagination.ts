export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  cursor?: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const cursor = query.cursor ? Number(query.cursor) : undefined;

  return {
    page,
    limit,
    skip: cursor ? 0 : (page - 1) * limit,
    cursor: cursor && !Number.isNaN(cursor) ? cursor : undefined,
  };
}
