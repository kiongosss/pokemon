import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';

import { PokemonStat } from '../models/pokemon.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { AsyncStateComponent } from '../../common/components/async-state/async-state.component';
import { toAsyncState } from '../../common/models/async-state.model';
import { Pokemon } from '../models/pokemon.model';
import { FilterCriteria, filteredSortedPaged$ } from '../state/pokemon.selectors';
import { PokemonStore } from '../state/pokemon.store';
import { PokemonDetailPanelComponent } from '../pokemon-detail-panel/pokemon-detail-panel.component';

@Component({
  selector: 'app-pokedex-table',
  standalone: true,
  imports: [AsyncStateComponent, PokemonDetailPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pokedex-table.component.html',
})
export class PokedexTableComponent {
  protected readonly pokemonStore = inject(PokemonStore);

  // Filter/sort/page signals
  readonly searchInput$ = new Subject<string>();
  readonly searchQuery = toSignal(
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged(), switchMap((value) => of(value))),
    { initialValue: '' },
  );
  readonly selectedType = signal<string>('');
  readonly sortField = signal<FilterCriteria['sortField']>('id');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly page = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // Row selection
  readonly selectedPokemonId = signal<number | null>(null);
  readonly selectPokemon = output<number>();

  readonly pageSizes = [10, 25, 50];

  private readonly state = toSignal(this.pokemonStore.state$, {
    initialValue: { items: [] as Pokemon[], nextOffset: 0, isLoading: false, error: null },
  });

  readonly allTypes = computed(() => {
    const types = new Set<string>();
    for (const pokemon of this.state().items) {
      for (const type of pokemon.types) {
        types.add(type.type.name);
      }
    }
    return [...types].sort();
  });

  readonly filters = computed<FilterCriteria>(() => ({
    search: this.searchQuery(),
    type: this.selectedType(),
    sortField: this.sortField(),
    sortDir: this.sortDir(),
    page: this.page(),
    pageSize: this.pageSize(),
  }));

  private readonly filters$ = toObservable(this.filters);

  /** Paged, filtered, sorted page view, switched to on every filter change. */
  readonly pageView = toSignal(
    this.filters$.pipe(switchMap((filters) => filteredSortedPaged$(this.pokemonStore.state$, of(filters)))),
    {
      initialValue: {
        items: [] as Pokemon[],
        total: 0,
        page: 0,
        pageSize: 10,
        isLoading: false,
        error: null,
      },
    },
  );

  /** Four-state view model consumed by <app-async-state>. */
  readonly view = computed(() =>
    toAsyncState(this.pageView().items, this.pageView().isLoading, this.pageView().error),
  );

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.pageView().total / this.pageSize())));

  constructor() {
    this.pokemonStore.loadPage(20, 0);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput$.next(value);
  }

  setType(value: string): void {
    this.selectedType.set(value);
    this.page.set(0);
  }

  setSort(field: FilterCriteria['sortField']): void {
    if (this.sortField() === field) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
      this.page.set(0);
    }
  }

  sortIndicator(field: FilterCriteria['sortField']): string {
    if (this.sortField() !== field) return '';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  setPageSize(event: Event): void {
    const size = +(event.target as HTMLSelectElement).value;
    this.pageSize.set(size);
    this.page.set(0);
  }

  previousPage(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) this.page.update((p) => p + 1);
  }

  onRowClick(pokemon: Pokemon): void {
    this.selectedPokemonId.set(pokemon.id);
    this.selectPokemon.emit(pokemon.id);
  }

  getStat(stats: PokemonStat[], name: string): number {
    return stats.find((s) => s.stat.name === name)?.baseStat ?? 0;
  }

  closePanel(): void {
    this.selectedPokemonId.set(null);
  }
}
