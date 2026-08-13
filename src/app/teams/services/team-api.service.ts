import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { GraphqlClientService } from '../../core/graphql-client.service';
import { MOCK_URL } from '../../../environments/environment';
import { Team, TeamInput } from '../models/team.model';

export const GET_TEAMS = `
  query GetTeams {
    allTeams {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

export const CREATE_TEAM = `
  mutation CreateTeam($input: TeamInput!) {
    createTeam(input: $input) {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

export const DELETE_TEAM = `
  mutation DeleteTeam($id: ID!) {
    deleteTeam(id: $id) {
      id
    }
  }
`;

interface TeamListResponse {
  allTeams: Team[];
}

interface TeamCreateResponse {
  createTeam: Team;
}

interface TeamDeleteResponse {
  deleteTeam: Pick<Team, 'id'>;
}

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly client = inject(GraphqlClientService);

  /** Fetches all teams from the local json-graphql-server mock. */
  getTeams(): Observable<Team[]> {
    return this.client.query$<TeamListResponse>(MOCK_URL, GET_TEAMS).pipe(
      map((response) => response.allTeams),
    );
  }

  /** Creates a new team on the mock server. */
  createTeam(input: TeamInput): Observable<Team> {
    const payload = { ...input, created_at: new Date().toISOString() };
    return this.client
      .query$<TeamCreateResponse>(MOCK_URL, CREATE_TEAM, { input: payload })
      .pipe(map((response) => response.createTeam));
  }

  /** Deletes a team by ID and returns the deleted ID. */
  deleteTeam(id: string): Observable<string> {
    return this.client
      .query$<TeamDeleteResponse>(MOCK_URL, DELETE_TEAM, { id })
      .pipe(map((response) => response.deleteTeam.id));
  }
}
