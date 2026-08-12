export interface PokemonType {
  slot: number;
  type: { name: string };
}

export interface PokemonStat {
  baseStat: number;
  effort: number;
  stat: { name: string };
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: PokemonType[];
  stats: PokemonStat[];
  sprite: string;
}

export interface PokemonAbility {
  name: string;
  shortEffect: string;
  isHidden: boolean;
}
