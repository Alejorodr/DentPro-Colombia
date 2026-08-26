export interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export type CollectionResponse<T> = T[] | PaginatedResponse<T>;

export function getCollectionItems<T>(payload: CollectionResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? payload.data ?? [];
}
