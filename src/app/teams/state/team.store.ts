import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, concat, EMPTY, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, mergeMap, shareReplay, take, tap } from 'rxjs/operators';

import { GraphqlRequestError } from '../../core/graphql-client.service';
import { Team, TeamInput } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly stateSubject = new BehaviorSubject<Team[]>([]);
  private readonly errorsSubject = new Subject<string>();
  private readonly pendingCreations$ = new BehaviorSubject<number>(0);
  private readonly createRequests$ = new Subject<TeamInput>();
  private tempIdCounter = 0;

  /** Emits the current list of teams on subscription and on every change. */
  readonly teams$ = this.stateSubject.asObservable();

  /** Emits user-facing error messages for toasts/snackbars. */
  readonly errors$ = this.errorsSubject.asObservable();

  /** Emits true while a create request is in flight. */
  readonly isCreating$ = this.pendingCreations$.pipe(
    map((count) => count > 0),
    distinctUntilChanged(),
  );

  /**
   * Command stream for creating a team.
   * Adds an optimistic record, merges each API call so rapid creates run in parallel,
   * and replaces/removes the optimistic record on success/error. Share-replayed so
   * the side effects run and late subscribers see the latest result.
   */
  readonly createResult$ = this.createRequests$.pipe(
    tap(() => this.pendingCreations$.next(this.pendingCreations$.getValue() + 1)),
    mergeMap((input) => this.handleCreate$(input)),
    shareReplay(1),
  );

  private readonly createResultSubscription = this.createResult$.subscribe();

  /** Pushes a new create request into the command stream. */
  createTeam(input: TeamInput): void {
    this.createRequests$.next(input);
  }

  /** Loads the list of teams from the mock server. */
  loadTeams(): void {
    this.api
      .getTeams()
      .pipe(
        take(1),
        tap((teams) => this.stateSubject.next(teams)),
        catchError((error: unknown) => {
          this.pushError(error);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  /**
   * Removes the team from state immediately, calls the API, and restores the previous
   * state if the request fails.
   */
  deleteTeam(id: string): void {
    const previous = this.stateSubject.getValue();
    const next = previous.filter((team) => team.id !== id);
    this.stateSubject.next(next);

    this.api
      .deleteTeam(id)
      .pipe(
        catchError((error: unknown) => {
          this.stateSubject.next(previous);
          this.pushError(error);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private handleCreate$(input: TeamInput): Observable<Team | null> {
    const tempId = this.generateTempId();
    const optimistic: Team = {
      ...input,
      id: tempId,
      created_at: new Date().toISOString(),
    };

    const addOptimistic$ = of(null).pipe(
      tap(() => this.stateSubject.next([...this.stateSubject.getValue(), optimistic])),
    );

    const api$ = this.api.createTeam(input).pipe(
      tap((team) => this.replaceOptimistic(tempId, team)),
      catchError((error: unknown) => {
        this.removeOptimistic(tempId);
        this.pushError(error);
        return EMPTY;
      }),
    );

    return concat(addOptimistic$, api$).pipe(
      finalize(() => this.pendingCreations$.next(this.pendingCreations$.getValue() - 1)),
    );
  }

  private replaceOptimistic(tempId: string, real: Team): void {
    const current = this.stateSubject.getValue();
    this.stateSubject.next(current.map((team) => (team.id === tempId ? real : team)));
  }

  private removeOptimistic(tempId: string): void {
    const current = this.stateSubject.getValue();
    this.stateSubject.next(current.filter((team) => team.id !== tempId));
  }

  private pushError(error: unknown): void {
    const message =
      error instanceof GraphqlRequestError
        ? error.userMessage
        : 'Team operation failed';
    this.errorsSubject.next(message);
  }

  private generateTempId(): string {
    return `team-temp-${++this.tempIdCounter}`;
  }
}
