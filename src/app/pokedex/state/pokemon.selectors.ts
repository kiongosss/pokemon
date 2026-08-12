import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { Pokemon } from '../models/pokemon.model';
import { PokemonState } from './pokemon.store';

export interface FilterCriteria {
  search: string;
  type: string;
  sortField: 'id' | 'name' | 'height' | 'weight' | 'type' | 'hp' | 'attack' | 'defense';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface FilteredPokemonPage {
  items: Pokemon[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Returns an Observable of a paged, filtered, and sorted view of the loaded Pokémon.
 * The `search` filter is debounced so the UI does not react to every keystroke;
 * sort and page changes remain immediate. The debounce is applied to the search
 * stream before it is combined so that typing does not re-emit the entire page
 * builder until the user pauses.
 *
 * Emits: `{ items, total, page, pageSize, isLoading, error }`.
 */
export function filteredSortedPaged$(
  state$: Observable<PokemonState>,
  filters$: Observable<FilterCriteria>,
): Observable<FilteredPokemonPage> {
  const search$ = filters$.pipe(
    map((filters) => filters.search),
    debounceTime(300),
    distinctUntilChanged(),
  );

  const stableFilters$ = filters$.pipe(
    map((filters) => ({
      type: filters.type,
      sortField: filters.sortField,
      sortDir: filters.sortDir,
      page: filters.page,
      pageSize: filters.pageSize,
    })),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  const debouncedFilters$ = combineLatest([search$, stableFilters$]).pipe(
    map(([search, stable]) => ({ ...stable, search } as FilterCriteria)),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  return combineLatest([state$, debouncedFilters$]).pipe(
    map(([state, filters]) => buildPage(state, filters)),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}

function buildPage(state: PokemonState, filters: FilterCriteria): FilteredPokemonPage {
  const term = filters.search.trim().toLowerCase();

  let items = state.items.filter((pokemon) => {
    const matchesType = filters.type === '' || pokemon.types.some((t) => t.type.name === filters.type);
    const matchesSearch = term === '' || pokemon.name.toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  items = sortBy(items, filters.sortField, filters.sortDir);

  const total = items.length;
  const start = filters.page * filters.pageSize;
  const end = start + filters.pageSize;
  const pageItems = items.slice(start, end);

  return {
    items: pageItems,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    isLoading: state.isLoading,
    error: state.error,
  };
}

function getSortValue(item: Pokemon, field: FilterCriteria['sortField']): number | string {
  if (field === 'type') {
    return item.types[0]?.type.name ?? '';
  }
  if (field === 'hp' || field === 'attack' || field === 'defense') {
    return item.stats.find((s) => s.stat.name === field)?.baseStat ?? 0;
  }
  return item[field];
}

function sortBy(items: Pokemon[], field: FilterCriteria['sortField'], dir: 'asc' | 'desc'): Pokemon[] {
  const sorted = [...items].sort((a, b) => {
    const aValue = getSortValue(a, field);
    const bValue = getSortValue(b, field);

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    }

    return String(aValue).localeCompare(String(bValue));
  });

  return dir === 'asc' ? sorted : sorted.reverse();
}

/**
 * Returns an Observable that emits the distribution of Pokémon types
 * in the current state as `{ [typeName]: count }`.
 */
export function typeDistribution$(state$: Observable<PokemonState>): Observable<Record<string, number>> {
  return state$.pipe(
    map((state) =>
      state.items.reduce<Record<string, number>>((acc, pokemon) => {
        for (const type of pokemon.types) {
          const name = type.type.name;
          acc[name] = (acc[name] ?? 0) + 1;
        }
        return acc;
      }, {}),
    ),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}

/**
 * Returns an Observable that emits the total base stats across all loaded Pokémon
 * as `{ [statName]: totalBaseStat }`.
 */
export function statTotals$(state$: Observable<PokemonState>): Observable<Record<string, number>> {
  return state$.pipe(
    map((state) =>
      state.items.reduce<Record<string, number>>((acc, pokemon) => {
        for (const stat of pokemon.stats) {
          const name = stat.stat.name;
          acc[name] = (acc[name] ?? 0) + stat.baseStat;
        }
        return acc;
      }, {}),
    ),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );
}
