/** Matches the backend's shared.types.Page[T] envelope - see
 * shared.limits.DEFAULT_PAGE_LIMIT/MAX_PAGE_LIMIT for the limit bounds
 * every paginated GET route enforces on its own ?limit=/?offset=. */
export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export const DEFAULT_PAGE_LIMIT = 20;
