import { inject } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, map, startWith, switchMap, take } from 'rxjs/operators';

import { TeamStore } from '../state/team.store';

/**
 * Factory for an async validator that ensures a team name is not already in use.
 * Injecting the store keeps the validator pure and testable.
 */
export function uniqueTeamNameValidator(store = inject(TeamStore)): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> =>
    control.valueChanges.pipe(
      startWith(control.value),
      debounceTime(300),
      take(1),
      switchMap(() =>
        store.teams$.pipe(
          take(1),
          map((teams) => {
            const name = (control.value as string).trim().toLowerCase();
            if (!name) return null;

            const taken = teams.some((team) => team.name.toLowerCase() === name);
            return taken ? { uniqueTeamName: true } : null;
          }),
        ),
      ),
    );
}
