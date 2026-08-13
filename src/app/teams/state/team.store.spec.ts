import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlRequestError } from '../../core/graphql-client.service';
import { Team, TeamInput } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';
import { TeamStore } from './team.store';

describe('TeamStore', () => {
  let store: TeamStore;
  let createTeamSource: Subject<Team>;
  let deleteTeamSource: Subject<string>;
  let fakeApi: {
    createTeam: ReturnType<typeof vi.fn>;
    deleteTeam: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    createTeamSource = new Subject<Team>();
    deleteTeamSource = new Subject<string>();

    fakeApi = {
      createTeam: vi.fn().mockReturnValue(createTeamSource.asObservable()),
      deleteTeam: vi.fn().mockReturnValue(deleteTeamSource.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        { provide: TeamApiService, useValue: fakeApi },
      ],
    });

    store = TestBed.inject(TeamStore);
  });

  it('shows the optimistic team before the API resolves', () => {
    const input: TeamInput = {
      trainer_id: 'ash',
      name: 'Kanto All-Stars',
      pokemon_ids: ['25', '6', '9'],
    };

    let latest: Team[] = [];
    store.teams$.subscribe((teams) => (latest = teams));

    store.createTeam(input);

    // (a) optimistic state appears synchronously, before the mock API emits
    expect(fakeApi.createTeam).toHaveBeenCalledWith(input);
    expect(latest).toHaveLength(1);
    expect(latest[0].name).toBe(input.name);
    expect(latest[0].id).toMatch(/^team-temp-/);
    expect(latest[0].pokemon_ids).toEqual(input.pokemon_ids);

    const realTeam: Team = {
      id: 'team-1',
      trainer_id: input.trainer_id,
      name: input.name,
      pokemon_ids: input.pokemon_ids,
      created_at: '2024-01-01T00:00:00Z',
    };
    createTeamSource.next(realTeam);

    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe('team-1');
  });

  it('rolls back to the pre-optimistic snapshot when create errors', () => {
    const input: TeamInput = {
      trainer_id: 'misty',
      name: 'Water Types',
      pokemon_ids: ['120'],
    };

    let latest: Team[] = [];
    store.teams$.subscribe((teams) => (latest = teams));

    let lastError: string | null = null;
    store.errors$.subscribe((message) => (lastError = message));

    store.createTeam(input);
    expect(latest).toHaveLength(1); // optimistic added

    // (b) when the API errors, the optimistic record is removed and state rolls back
    const error = new GraphqlRequestError(
      'api boom',
      'Could not create team',
      new Error('boom'),
    );
    createTeamSource.error(error);

    expect(latest).toHaveLength(0);
    expect(lastError).toBe('Could not create team');
  });

  it('resolves concurrent creates independently', () => {
    const inputA: TeamInput = {
      trainer_id: 'ash',
      name: 'A',
      pokemon_ids: ['1'],
    };
    const inputB: TeamInput = {
      trainer_id: 'misty',
      name: 'B',
      pokemon_ids: ['2'],
    };
    const responses: Subject<Team>[] = [];

    fakeApi.createTeam = vi.fn(() => {
      const s = new Subject<Team>();
      responses.push(s);
      return s.asObservable();
    });

    let latest: Team[] = [];
    store.teams$.subscribe((teams) => (latest = teams));

    store.createTeam(inputA);
    store.createTeam(inputB);

    expect(latest).toHaveLength(2);
    expect(latest[0].name).toBe('A');
    expect(latest[1].name).toBe('B');
    const tempIdA = latest[0].id;
    const tempIdB = latest[1].id;

    // Resolve B first (out of order) — A must remain with its temp id.
    const realB: Team = {
      id: 'team-b',
      trainer_id: inputB.trainer_id,
      name: inputB.name,
      pokemon_ids: inputB.pokemon_ids,
      created_at: '2024-01-02T00:00:00Z',
    };
    responses[1].next(realB);
    expect(latest.find((t) => t.name === 'B')?.id).toBe('team-b');
    expect(latest.find((t) => t.name === 'A')?.id).toBe(tempIdA);

    // Resolve A.
    const realA: Team = {
      id: 'team-a',
      trainer_id: inputA.trainer_id,
      name: inputA.name,
      pokemon_ids: inputA.pokemon_ids,
      created_at: '2024-01-01T00:00:00Z',
    };
    responses[0].next(realA);

    const ids = latest.map((t) => t.id);
    expect(ids).toContain('team-a');
    expect(ids).toContain('team-b');
    expect(ids).not.toContain(tempIdA);
    expect(ids).not.toContain(tempIdB);
  });
});
