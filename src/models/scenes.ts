// src/models/scenes.ts
export type SceneStatus = "PLANNED" | "OUTLINED" | "DRAFTED" | "APPROVED";
export type Heading = "INT" | "EXT" | "INT/EXT";
export type DayPart = "DAY" | "NIGHT" | "DAWN" | "DUSK";

export interface Scene {
  id: number;
  order: number;                     // narrative position
  title: string;                     // optional (short slug)
  is_key?: boolean;                  // key scene?
  linked_turning_point?: number | null; // 1..5 (TP order), null if none
  heading?: Heading;                 // INT / EXT / INT/EXT
  location?: string;                 // "APARTMENT – LIVING ROOM"
  time_of_day?: DayPart;             // DAY / NIGHT / ...
  synopsis: string;                  // 2–6 lines
  goal?: string;
  conflict?: string;
  outcome?: string;                  // G/C/O
  characters?: number[];             // character IDs in scene
  status?: SceneStatus;
  formatted_text?: string;           // Fountain-formatted content for this scene
}
