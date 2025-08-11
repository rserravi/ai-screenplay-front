// src/models/characters.ts

// 1) Structural role (estable)
export type StructuralRole =
  | "PROTAGONIST"
  | "DEUTERAGONIST"
  | "TRITAGONIST"
  | "ANTAGONIST"
  | "ANTAGONIST_LIEUTENANT"
  | "SUPPORTING"
  | "CAMEO";

// 2) Archetypes (función dramática; puede cambiar por fase)
export type Archetype =
  | "HERO" | "MENTOR" | "HERALD" | "THRESHOLD_GUARDIAN"
  | "ALLY" | "TRICKSTER" | "SHAPESHIFTER" | "SHADOW"
  | "SEER" | "TEMPTER" | "CONFIDANT"
  | "REASON" | "EMOTION" | "IMPACT_CHARACTER";

// 3) Journey phases (elige la nomenclatura que prefieras; aquí usaremos actos)
export type JourneyPhase = "ACT_I" | "ACT_II" | "ACT_III";

export interface ArchetypeBeat {
  phase: JourneyPhase;
  archetype: Archetype;
  notes?: string;
}

export interface Character {
  id: number;
  name: string;
  structural_role: StructuralRole;
  goal?: string;
  need?: string;
  flaw?: string;
  arc_summary?: string;
  bio?: string;
  tags?: string[];
  archetype_timeline?: ArchetypeBeat[]; // p. ej., [{ phase:"ACT_I", archetype:"HERO" }, ...]
}

// 4) Relaciones dirigidas con atributos
export type RelationKind =
  | "ALLY_OF" | "RIVAL_OF" | "NEMESIS_OF"
  | "MENTOR_OF" | "MENTEE_OF"
  | "PROTECTOR_OF" | "WARD_OF"
  | "BOSS_OF" | "REPORT_OF" | "COMMANDER_OF" | "SUBORDINATE_OF"
  | "TEAMMATE_OF" | "CO_CONSPIRATOR_OF"
  | "ROMANTIC_PARTNER_OF" | "EX_PARTNER_OF" | "CRUSH_ON" | "SPOUSE_OF"
  | "PARENT_OF" | "CHILD_OF" | "SIBLING_OF"
  | "INFORMANT_OF" | "SABOTEUR_OF" | "FOIL_TO";

export interface Relationship {
  id: number;
  a_id: number; // from
  b_id: number; // to
  kind: RelationKind;
  strength?: number; // 0..1
  trust?: number;    // 0..1
  secrecy?: number;  // 0..1
  notes?: string;
}

export const PHASES: JourneyPhase[] = ["ACT_I", "ACT_II", "ACT_III"];
export const ARCHETYPES: Archetype[] = [
  "HERO","MENTOR","HERALD","THRESHOLD_GUARDIAN","ALLY","TRICKSTER","SHAPESHIFTER","SHADOW",
  "SEER","TEMPTER","CONFIDANT","REASON","EMOTION","IMPACT_CHARACTER"
];
export const STRUCT_ROLES: StructuralRole[] = [
  "PROTAGONIST","DEUTERAGONIST","TRITAGONIST","ANTAGONIST","ANTAGONIST_LIEUTENANT","SUPPORTING","CAMEO"
];
export const RELATION_KINDS: RelationKind[] = [
  "ALLY_OF","RIVAL_OF","NEMESIS_OF","MENTOR_OF","MENTEE_OF","PROTECTOR_OF","WARD_OF",
  "BOSS_OF","REPORT_OF","COMMANDER_OF","SUBORDINATE_OF","TEAMMATE_OF","CO_CONSPIRATOR_OF",
  "ROMANTIC_PARTNER_OF","EX_PARTNER_OF","CRUSH_ON","SPOUSE_OF","PARENT_OF","CHILD_OF","SIBLING_OF",
  "INFORMANT_OF","SABOTEUR_OF","FOIL_TO"
];
