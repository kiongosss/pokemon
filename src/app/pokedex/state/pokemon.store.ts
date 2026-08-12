import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, EMPTY, map, Observable, shareReplay } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { GraphqlRequestError } from '../../core/graphql-client.service';
import { Pokemon } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';

export interface PokemonState {
  items: Pokemon[];
  nextOffset: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: PokemonState = {
  items: [],
  nextOffset: 0,
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly api = inject(PokemonApiService);
  private readonly stateSubject = new BehaviorSubject<PokemonState>(initialState);
  private readonly cache = new Map<number, Pokemon>();

  /** Emits the current store state on subscription and on every update. */
  readonly state$ = this.stateSubject.asObservable();

  /**
   * Loads a page of Pokémon from the PokeAPI.
   * Replaces items at offset 0; otherwise appends while skipping any duplicate ids.
   * Keeps an internal cache keyed by id to prevent refetching the same Pokémon.
   */
  loadPage(limit: number, offset: number): void {
    this.patchState({ isLoading: true, error: null });

    this.api
      .getPokemonList(limit, offset)
      .pipe(
        catchError((error: unknown) => {
          const message =
            error instanceof GraphqlRequestError
              ? error.userMessage
              : 'Failed to load Pokémon';
          this.patchState({ isLoading: false, error: message });
          return EMPTY;
        }),
      )
      .subscribe((pokemon) => this.handlePage(pokemon, limit, offset));
  }

  /**
   * Returns an Observable of the Pokémon with the given id, or undefined if not loaded.
   * Emits only when the value changes and replays the latest to late subscribers.
   */
  getById$(id: number): Observable<Pokemon | undefined> {
    return this.state$.pipe(
      map((state) => state.items.find((pokemon) => pokemon.id === id) ?? this.cache.get(id)),
      distinctUntilChanged(),
      shareReplay(1),
    );
  }

  private handlePage(page: Pokemon[], limit: number, offset: number): void {
    const current = this.stateSubject.getValue();
    const existingIds = new Set<number>(current.items.map((pokemon) => pokemon.id));
    const uniquePage: Pokemon[] = [];

    for (const pokemon of page) {
      this.cache.set(pokemon.id, pokemon);

      if (!existingIds.has(pokemon.id)) {
        uniquePage.push(pokemon);
        existingIds.add(pokemon.id);
      }
    }

    const items = offset === 0 ? page : [...current.items, ...uniquePage];

    this.patchState({
      items,
      nextOffset: offset + limit,
      isLoading: false,
      error: null,
    });
  }

  private patchState(partial: Partial<PokemonState>): void {
    this.stateSubject.next({ ...this.stateSubject.getValue(), ...partial });
  }
}
