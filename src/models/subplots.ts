// src/models/subplots.ts
import type { JourneyPhase } from "./characters";

export type SubplotType =
  | "RELATIONSHIP"          // B-Story: love/ally/mentor
  | "ANTAGONIST_POV"
  | "INTERNAL_CONFLICT"     // conflicto interno del prota
  | "PROFESSIONAL_MISSION"  // caso/misión/trabajo
  | "INVESTIGATION"
  | "FAMILY"
  | "RIVALRY"
  | "REDEMPTION_OR_REVENGE"
  | "THEMATIC_DEBATE"
  | "COMIC_RUNNER"
  | "BACKSTORY"
  | "WORLD_OR_INSTITUTION"
  | "SIDE_QUEST";

export interface SubplotBeat {
  order: number;            // orden dentro de la subtrama
  summary: string;          // qué ocurre
  outChange?: string;       // cómo cambia el estado/relación
}

export interface Subplot {
  id: number;
  title: string;
  type: SubplotType;
  purpose: string;                 // qué aporta a la A / al tema
  dominantActs: JourneyPhase[];    // ACT_I / ACT_II / ACT_III
  charactersInvolved: number[];    // ids de personajes
  linkedTurningPoints?: number[];  // ids de TPs (opcional)
  beats: SubplotBeat[];
}
