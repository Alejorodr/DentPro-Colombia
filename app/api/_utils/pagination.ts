const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export function getPaginationParams(searchParams: URLSearchParams) {
  const pageValue = Number.parseInt(searchParams.get("page") ?? "", 10);
  const pageSizeValue = Number.parseInt(searchParams.get("pageSize") ?? "", 10);

  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSizeCandidate = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, pageSizeCandidate);

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

export function buildPaginatedResponse<T>(data: T[], page: number, pageSize: number, total: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { data, page, pageSize, total, totalPages };
}
