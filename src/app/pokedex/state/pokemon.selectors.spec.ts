import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import { Pokemon } from '../models/pokemon.model';
import { FilterCriteria, filteredSortedPaged$ } from './pokemon.selectors';
import { PokemonState } from './pokemon.store';

const testScheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

function pokemon(name: string, id: number, types: string[]): Pokemon {
  return {
    id,
    name,
    height: 10,
    weight: 10,
    sprite: '',
    types: types.map((t, i) => ({ slot: i + 1, type: { name: t } })),
    stats: [],
  };
}

describe('pokemon.selectors', () => {
  it('filters, sorts and pages items based on filters$', () => {
    const state: PokemonState = {
      items: [
        pokemon('Bulbasaur', 1, ['grass']),
        pokemon('Charmander', 4, ['fire']),
        pokemon('Squirtle', 7, ['water']),
      ],
      nextOffset: 0,
      isLoading: false,
      error: null,
    };

    const filters: FilterCriteria = {
      search: 'char',
      type: '',
      sortField: 'id',
      sortDir: 'asc',
      page: 0,
      pageSize: 1,
    };

    testScheduler.run(({ cold, expectObservable }) => {
      const state$ = cold('s--', { s: state });
      const filters$ = cold('f--', { f: filters });
      const result$ = filteredSortedPaged$(state$, filters$);

      expectObservable(result$).toBe('300ms r', {
        r: {
          items: [state.items[1]],
          total: 1,
          page: 0,
          pageSize: 1,
          isLoading: false,
          error: null,
        },
      });
    });
  });
});
