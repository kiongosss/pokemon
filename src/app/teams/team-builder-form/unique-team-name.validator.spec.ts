import { FormControl, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import { Team } from '../models/team.model';
import { TeamStore } from '../state/team.store';
import { uniqueTeamNameValidator } from './unique-team-name.validator';

function fakeStore(teams: Team[]): TeamStore {
  return { teams$: of(teams) } as unknown as TeamStore;
}

describe('uniqueTeamNameValidator', () => {
  it('returns null for a unique team name', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(
      ({ expectObservable }) => {
        const control = new FormControl<string>('New Team', { nonNullable: true });
        const store = fakeStore([
          { id: '1', trainer_id: 't', name: 'Existing', pokemon_ids: [], created_at: '' },
        ]);

        const result$ = uniqueTeamNameValidator(store)(control) as Observable<ValidationErrors | null>;

        expectObservable(result$).toBe('300ms (r|)', { r: null });
      },
    );
  });

  it('returns uniqueTeamName error for an existing team name', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(
      ({ expectObservable }) => {
        const control = new FormControl<string>('Existing', { nonNullable: true });
        const store = fakeStore([
          { id: '1', trainer_id: 't', name: 'Existing', pokemon_ids: [], created_at: '' },
        ]);

        const result$ = uniqueTeamNameValidator(store)(control) as Observable<ValidationErrors | null>;

        expectObservable(result$).toBe('300ms (r|)', { r: { uniqueTeamName: true } });
      },
    );
  });
});
