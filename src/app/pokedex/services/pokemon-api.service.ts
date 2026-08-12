import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { GraphqlClientService } from '../../core/graphql-client.service';
import { POKEAPI_URL } from '../../../environments/environment';
import { Pokemon, PokemonAbility } from '../models/pokemon.model';

export const GET_POKEMON_LIST = `
  query GetPokemonList($limit: Int!, $offset: Int!) {
    pokemon: pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: { id: asc }) {
      id
      name
      height
      weight
      pokemon_v2_pokemontypes {
        slot
        pokemon_v2_type {
          name
        }
      }
      pokemon_v2_pokemonstats {
        base_stat
        effort
        pokemon_v2_stat {
          name
        }
      }
      pokemon_v2_pokemonsprites {
        sprites
      }
    }
  }
`;

export const GET_POKEMON_ABILITIES = `
  query GetPokemonAbilities($pokemonId: Int!) {
    pokemon: pokemon_v2_pokemon(where: { id: { _eq: $pokemonId } }) {
      pokemon_v2_pokemonabilities {
        is_hidden
        pokemon_v2_ability {
          name
          pokemon_v2_abilityeffecttexts(where: { language_id: { _eq: 9 } }, limit: 1) {
            short_effect
          }
        }
      }
    }
  }
`;

interface PokemonListResponse {
  pokemon: RawPokemon[];
}

interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemontypes: Array<{ slot: number; pokemon_v2_type: { name: string } }>;
  pokemon_v2_pokemonstats: Array<{ base_stat: number; effort: number; pokemon_v2_stat: { name: string } }>;
  pokemon_v2_pokemonsprites: Array<{ sprites: string }>;
}

interface PokemonAbilitiesResponse {
  pokemon: Array<{ pokemon_v2_pokemonabilities: RawAbility[] }>;
}

interface RawAbility {
  is_hidden: boolean;
  pokemon_v2_ability: {
    name: string;
    pokemon_v2_abilityeffecttexts: Array<{ short_effect: string }>;
  };
}

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly client = inject(GraphqlClientService);

  /** Fetches a page of Pokémon from the public PokeAPI GraphQL endpoint. */
  getPokemonList(limit: number, offset: number): Observable<Pokemon[]> {
    return this.client
      .pokeapiQuery$<PokemonListResponse>(POKEAPI_URL, GET_POKEMON_LIST, { limit, offset })
      .pipe(map((response) => response.pokemon.map(mapRawPokemon)));
  }

  /** Fetches the abilities (with English short effect) for a single Pokémon. */
  getPokemonAbilities(pokemonId: number): Observable<PokemonAbility[]> {
    return this.client
      .pokeapiQuery$<PokemonAbilitiesResponse>(POKEAPI_URL, GET_POKEMON_ABILITIES, { pokemonId })
      .pipe(
        map(
          (response) =>
            response.pokemon[0]?.pokemon_v2_pokemonabilities.map(mapRawAbility) ?? [],
        ),
      );
  }
}

function mapRawPokemon(raw: RawPokemon): Pokemon {
  const spriteJson = raw.pokemon_v2_pokemonsprites[0]?.sprites ?? '{}';
  const parsed = parseSprite(spriteJson);

  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    types: raw.pokemon_v2_pokemontypes.map((type) => ({
      slot: type.slot,
      type: { name: type.pokemon_v2_type.name },
    })),
    stats: raw.pokemon_v2_pokemonstats.map((stat) => ({
      baseStat: stat.base_stat,
      effort: stat.effort,
      stat: { name: stat.pokemon_v2_stat.name },
    })),
    sprite: parsed.front_default ?? '',
  };
}

function mapRawAbility(raw: RawAbility): PokemonAbility {
  return {
    name: raw.pokemon_v2_ability.name,
    shortEffect:
      raw.pokemon_v2_ability.pokemon_v2_abilityeffecttexts[0]?.short_effect ?? '',
    isHidden: raw.is_hidden,
  };
}

function parseSprite(spritesJson: string): { front_default?: string } {
  try {
    return JSON.parse(spritesJson) as { front_default?: string };
  } catch {
    return {};
  }
}
