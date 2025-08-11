// src/models/screenplay.ts
import type { StateId } from "./enums";
import type { TurningPoint } from "./turningPoints";
import type { Character, Relationship } from "./characters";
import type { Subplot } from "./subplots";
import type { Scene } from "./scenes";

export interface Treatment { act1?: string; act2?: string; act3?: string; }

export interface Screenplay {
    id: number;
    project_id: number;
    title: string;
    logline?: string;
    genre?: string;
    tone?: string;

    // S1–S6 artifacts
    synopsis?: string;                 // S1
    treatment?: Treatment;             // S2
    turning_points?: TurningPoint[];   // S3
    characters?: Character[];          // S4
    relationships?: Relationship[];    // S4
    subplots?: Subplot[];              // S5
    scenes?: Scene[];                  // S6+

    status: StateId | "INIT";
    current_state: StateId | "INIT";
    style_guide_id?: number | null;
    created_at: string;
    updated_at?: string;
}

export type { Character, Relationship, Subplot, Scene };
