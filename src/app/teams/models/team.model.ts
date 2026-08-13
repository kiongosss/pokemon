export interface Team {
  id: string;
  trainer_id: string;
  name: string;
  pokemon_ids: string[];
  created_at: string;
}

export interface TeamInput {
  trainer_id: string;
  name: string;
  pokemon_ids: string[];
}
