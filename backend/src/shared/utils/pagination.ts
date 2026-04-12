// Helpers de paginação — offset-based
// Padrão: 50 registros/página conforme PRD NFR

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationArgs(params: PaginationParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
