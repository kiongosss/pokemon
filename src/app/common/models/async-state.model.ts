export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'success'; data: T };

/**
 * Centralizes the four required view-state decisions:
 * 1. error wins if present,
 * 2. loading wins only when we have no cached data,
 * 3. empty wins when the list is empty and not loading,
 * 4. success otherwise.
 */
export function toAsyncState<T>(
  items: T[],
  isLoading: boolean,
  error: string | null,
): AsyncState<T[]> {
  if (error !== null) {
    return { status: 'error', message: error };
  }

  if (isLoading && items.length === 0) {
    return { status: 'loading' };
  }

  if (items.length === 0) {
    return { status: 'empty' };
  }

  return { status: 'success', data: items };
}
