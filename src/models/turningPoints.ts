// src/models/turningPoints.ts
export type TurningPointType =
  | "INCITING_INCIDENT"
  | "PLOT_POINT_1"
  | "MIDPOINT"
  | "PLOT_POINT_2"
  | "CLIMAX";

export interface TurningPoint {
  id: number;
  type: TurningPointType;
  summary: string;
  order: number; // 1..5 timeline order
  candidate_scene_id?: number | null;
}

export const TP_ORDER: TurningPointType[] = [
  "INCITING_INCIDENT",
  "PLOT_POINT_1",
  "MIDPOINT",
  "PLOT_POINT_2",
  "CLIMAX"
];

export const TP_LABEL: Record<TurningPointType, string> = {
  INCITING_INCIDENT: "Inciting Incident",
  PLOT_POINT_1: "Plot Point 1",
  MIDPOINT: "Midpoint",
  PLOT_POINT_2: "Plot Point 2",
  CLIMAX: "Climax"
};
