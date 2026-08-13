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
  mutation CreateTeam($trainer_id: ID!, $name: String!, $pokemon_ids: [String]!, $created_at: Date!) {
    createTeam(trainer_id: $trainer_id, name: $name, pokemon_ids: $pokemon_ids, created_at: $created_at) {
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
    return this.client
      .query$<TeamCreateResponse>(MOCK_URL, CREATE_TEAM, {
        trainer_id: input.trainer_id,
        name: input.name,
        pokemon_ids: input.pokemon_ids,
        created_at: new Date().toISOString(),
      })
      .pipe(map((response) => response.createTeam));
  }

  /** Deletes a team by ID and returns the deleted ID. */
  deleteTeam(id: string): Observable<string> {
    return this.client
      .query$<TeamDeleteResponse>(MOCK_URL, DELETE_TEAM, { id })
      .pipe(map((response) => response.deleteTeam.id));
  }
}
