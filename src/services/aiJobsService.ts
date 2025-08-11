// src/services/aiJobsService.ts
import { api, isMock } from "./apiClient";
import type { TurningPoint } from "../models/turningPoints";
import type {
    Character,
    Relationship,
    JourneyPhase,
    Archetype
} from "../models/characters";
import { PHASES } from "../models/characters";
import type { Subplot, SubplotBeat, SubplotType } from "../models/subplots";
import type { Scene } from "../models/scenes";


/* ──────────────────────────────────────────────────────────────────────────
 * S1 — Synopsis
 * ────────────────────────────────────────────────────────────────────────── */

export interface ProposeSynopsisInput {
    idea?: string;
    genre?: string;
    tone?: string;
    currentSynopsis?: string;
}
export interface ProposeSynopsisResult {
    proposal: string;
}

export async function proposeSynopsis(
    screenplayId: number,
    input: ProposeSynopsisInput
): Promise<ProposeSynopsisResult> {
    if (isMock) {
        const seed = (input.idea || "A character faces a life-changing decision").slice(0, 160);
        const genre = input.genre ? ` (${input.genre})` : "";
        const tone = input.tone ? ` with a ${input.tone} tone` : "";
        const proposal =
            `A concise synopsis${genre}${tone}: ` +
            `${seed}. When pressure mounts, their relationships fracture, forcing a risky plan that backfires. ` +
            `In the end, the protagonist must sacrifice a part of themselves to earn a second chance.`;
        await new Promise((r) => setTimeout(r, 600)); // mock latency
        return { proposal };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S1_SYNOPSIS",
        prompt_template_id: 1,
        input_payload: input
    });
    return data?.output_payload ?? { proposal: "" };
}

/* ──────────────────────────────────────────────────────────────────────────
 * S2 — Treatment (per section)
 * ────────────────────────────────────────────────────────────────────────── */

export type TreatmentSectionId = "act1" | "act2" | "act3";

export interface ProposeTreatmentInput {
    pointers?: string[];     // bullets to guide AI
    constraints?: string[];  // tone, POV, genre, etc.
    currentText?: string;    // existing text of that section, if any
}
export interface ProposeTreatmentResult {
    section: TreatmentSectionId;
    proposal: string;
}

export async function proposeTreatmentSection(
    screenplayId: number,
    section: TreatmentSectionId,
    input: ProposeTreatmentInput
): Promise<ProposeTreatmentResult> {
    if (isMock) {
        const hints = (input.pointers ?? []).slice(0, 5).map((s) => s.trim()).filter(Boolean);
        const proposal =
            `Treatment ${section.toUpperCase()} draft:\n` +
            `- Setup protagonist under pressure.\n` +
            (hints.length ? hints.map((h) => `- ${h}`).join("\n") + "\n" : "") +
            `- Escalate stakes and force a hard choice.\n` +
            `- End with a turning beat that propels the next act.`;
        await new Promise((r) => setTimeout(r, 700));
        return { section, proposal };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S2_TREATMENT",
        prompt_template_id: 2,
        input_payload: { section, ...input }
    });
    return data?.output_payload ?? { section, proposal: "" };
}

/* ──────────────────────────────────────────────────────────────────────────
 * S3 — Turning Points (5 beats)
 * ────────────────────────────────────────────────────────────────────────── */

export interface ProposeTPInput {
    treatment?: { act1?: string; act2?: string; act3?: string };
    goals?: string[];       // optional protagonist goals
    constraints?: string[]; // tone, genre, etc.
}
export interface ProposeTPResult {
    items: Pick<TurningPoint, "type" | "summary" | "order">[];
}

export async function proposeTurningPoints(
    screenplayId: number,
    input: ProposeTPInput
): Promise<ProposeTPResult> {
    if (isMock) {
        const a1 = (input.treatment?.act1 ?? "").slice(0, 80);
        const a2 = (input.treatment?.act2 ?? "").slice(0, 80);
        const a3 = (input.treatment?.act3 ?? "").slice(0, 80);
        const items: ProposeTPResult["items"] = [
            { order: 1, type: "INCITING_INCIDENT", summary: `A disruptive event pushes the hero out of normalcy. Hint: ${a1}` },
            { order: 2, type: "PLOT_POINT_1", summary: `Door closes behind the hero; no turning back. Hint: ${a1}` },
            { order: 3, type: "MIDPOINT", summary: `False victory/defeat that raises the stakes. Hint: ${a2}` },
            { order: 4, type: "PLOT_POINT_2", summary: `All seems lost; hero reframes the goal. Hint: ${a2}` },
            { order: 5, type: "CLIMAX", summary: `Final confrontation resolves the central conflict. Hint: ${a3}` }
        ];
        await new Promise((r) => setTimeout(r, 600));
        return { items };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S3_TURNING_POINTS",
        prompt_template_id: 3,
        input_payload: input
    });
    return data?.output_payload ?? { items: [] };
}

/* ──────────────────────────────────────────────────────────────────────────
 * S4 — Characters & Relationships
 * ────────────────────────────────────────────────────────────────────────── */

// Propose Characters
export interface ProposeCharactersInput {
    genre?: string;
    tone?: string;
    treatment?: { act1?: string; act2?: string; act3?: string };
    turning_points?: { type: string; summary: string }[];
}
export interface ProposeCharactersResult {
    characters: Omit<Character, "id">[];
}

export async function proposeCharacters(
    screenplayId: number,
    input: ProposeCharactersInput
): Promise<ProposeCharactersResult> {
    if (isMock) {
        const heroTimeline = PHASES.map<Archetype>((_, i) => (i === 1 ? "HERO" : "ALLY"));
        const shadowTimeline = PHASES.map<Archetype>((_, i) => (i === 2 ? "SHADOW" : "TRICKSTER"));
        const mentorTimeline = PHASES.map<Archetype>((_, i) => (i === 0 ? "MENTOR" : "ALLY"));

        const mkBeats = (arr: Archetype[]): { phase: JourneyPhase; archetype: Archetype }[] =>
            arr.map((a, idx) => ({ phase: PHASES[idx], archetype: a }));

        const characters: Omit<Character, "id">[] = [
            {
                name: "Alex",
                structural_role: "PROTAGONIST",
                goal: "Win back custody of their child",
                need: "Accept vulnerability and ask for help",
                flaw: "Pride and control",
                arc_summary: "From control to trust",
                tags: ["parent", "engineer"],
                archetype_timeline: mkBeats(heroTimeline)
            },
            {
                name: "Mara",
                structural_role: "ANTAGONIST",
                goal: "Secure a promotion by exposing Alex",
                need: "Find integrity",
                flaw: "Manipulative",
                arc_summary: "Power at any cost",
                tags: ["lawyer"],
                archetype_timeline: mkBeats(shadowTimeline)
            },
            {
                name: "Diego",
                structural_role: "SUPPORTING",
                goal: "Keep the team together",
                need: "Set boundaries",
                flaw: "Avoidant",
                arc_summary: "Learns to confront",
                tags: ["friend"],
                archetype_timeline: mkBeats(mentorTimeline)
            }
        ];

        await new Promise((r) => setTimeout(r, 700));
        return { characters };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S4_CHARACTERS",
        prompt_template_id: 4,
        input_payload: input
    });
    return data?.output_payload ?? { characters: [] };
}

// Propose Relationships
export interface ProposeRelationshipsInput {
    characters: { name: string; structural_role: string }[];
}
export interface ProposeRelationshipsResult {
    relationships: Omit<Relationship, "id">[];
}

export async function proposeRelationships(
    screenplayId: number,
    input: ProposeRelationshipsInput
): Promise<ProposeRelationshipsResult> {
    if (isMock) {
        // A: PROTAGONIST (idx 0), B: ANTAGONIST (idx 1), C: SUPPORTING (idx 2)
        // ids negativos = placeholders que la UI mapeará a ids reales por índice
        const rels: Omit<Relationship, "id">[] = [
            { a_id: -1, b_id: -2, kind: "NEMESIS_OF", strength: 0.9, trust: 0.1, secrecy: 0 },
            { a_id: -3, b_id: -1, kind: "MENTOR_OF", strength: 0.7, trust: 0.8, secrecy: 0 },
            { a_id: -1, b_id: -3, kind: "ALLY_OF", strength: 0.8, trust: 0.85, secrecy: 0 }
        ];
        await new Promise((r) => setTimeout(r, 500));
        return { relationships: rels };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S4_CHARACTERS",
        prompt_template_id: 5,
        input_payload: input
    });
    return data?.output_payload ?? { relationships: [] };
}

// ───────────────────────────────────────────────────────────────────────────
// S5 — Subplots (propuestas IA)
// ───────────────────────────────────────────────────────────────────────────

export interface ProposeSubplotsInput {
    treatment?: { act1?: string; act2?: string; act3?: string };
    turning_points?: { type: string; summary: string }[];
    characters?: { id?: number; name: string; structural_role: string }[];
    genre?: string;
    tone?: string;
}
export interface ProposeSubplotsResult {
    subplots: Omit<Subplot, "id">[];
}

export async function proposeSubplots(
    screenplayId: number,
    input: ProposeSubplotsInput
): Promise<ProposeSubplotsResult> {
    if (isMock) {
        const rel: Omit<Subplot, "id"> = {
            title: "B-Story: Alex & Diego",
            type: "RELATIONSHIP",
            purpose: "Carry the theme of trust; provide emotional stakes and midpoints support.",
            dominantActs: ["ACT_I", "ACT_II", "ACT_III"],
            charactersInvolved: [], // la UI asignará ids reales
            linkedTurningPoints: [1, 3, 5],
            beats: [
                { order: 1, summary: "Diego challenges Alex to open up.", outChange: "Alex agrees to try." },
                { order: 2, summary: "They clash over risk-taking during the investigation.", outChange: "Trust is damaged." },
                { order: 3, summary: "Reconciliation catalyzes Alex's final choice.", outChange: "Trust restored; Alex commits." }
            ]
        };
        const ant: Omit<Subplot, "id"> = {
            title: "Antagonist POV: Mara",
            type: "ANTAGONIST_POV",
            purpose: "Escalate external pressure and clarify stakes.",
            dominantActs: ["ACT_II"],
            charactersInvolved: [],
            linkedTurningPoints: [4],
            beats: [
                { order: 1, summary: "Mara secures surveillance on Alex.", outChange: "Stakes rise." },
                { order: 2, summary: "Mara learns a personal weakness.", outChange: "Targets Alex's flaw." }
            ]
        };
        await new Promise(r => setTimeout(r, 600));
        return { subplots: [rel, ant] };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S5_SUBPLOTS",
        prompt_template_id: 6,
        input_payload: input
    });
    return data?.output_payload ?? { subplots: [] };
}

export interface ProposeSubplotBeatsInput {
    title: string;
    type: SubplotType;
    purpose?: string;
    dominantActs?: ("ACT_I" | "ACT_II" | "ACT_III")[];
    charactersInvolved?: string[]; // names (UI las mapeará a ids)
    constraints?: string[];
}
export interface ProposeSubplotBeatsResult {
    beats: SubplotBeat[];
}

export async function proposeSubplotBeats(
    screenplayId: number,
    subplotIndex: number,
    input: ProposeSubplotBeatsInput
): Promise<ProposeSubplotBeatsResult> {
    if (isMock) {
        const beats: SubplotBeat[] = [
            { order: 1, summary: "Setup the tension inside the subplot.", outChange: "Goal clarified." },
            { order: 2, summary: "Complication forces a compromise.", outChange: "Stakes increase." },
            { order: 3, summary: "Reversal ties back to a Turning Point.", outChange: "Path redefined." }
        ];
        await new Promise(r => setTimeout(r, 500));
        return { beats };
    }

    const { data } = await api.post(`/ai/jobs`, {
        screenplay_id: screenplayId,
        state_context: "S5_SUBPLOTS",
        prompt_template_id: 7,
        input_payload: { subplotIndex, ...input }
    });
    return data?.output_payload ?? { beats: [] };
}

// ───────────────────────────────────────────────────────────────────────────
// S6 — Key Scenes (propuestas IA)
// ───────────────────────────────────────────────────────────────────────────

export interface ProposeKeyScenesInput {
  treatment?: { act1?: string; act2?: string; act3?: string };
  turning_points: { order: number; type: string; summary: string }[];
  characters?: { id?: number; name: string; structural_role: string }[];
  genre?: string; tone?: string;
}
export interface ProposeKeyScenesResult { scenes: Omit<Scene, "id" | "order">[]; }

export async function proposeKeyScenes(
  screenplayId: number,
  input: ProposeKeyScenesInput
): Promise<ProposeKeyScenesResult> {
  if (isMock) {
    const scenes: Omit<Scene, "id" | "order">[] = input.turning_points.map(tp => ({
      title: `Key scene for ${tp.type}`,
      is_key: true,
      linked_turning_point: tp.order,
      heading: tp.order <= 2 ? "INT" : "EXT",
      location: tp.order <= 3 ? "APARTMENT – LIVING ROOM" : "CITY STREET",
      time_of_day: tp.order % 2 ? "NIGHT" : "DAY",
      synopsis: `A scene that expresses: ${tp.summary.slice(0, 90)}...`,
      goal: "Advance the plot toward/away from the TP.",
      conflict: "Opposition pushes back; cost is introduced.",
      outcome: "Change of state aligning with the TP beat.",
      characters: (input.characters ?? []).slice(0, 2).map((_, i) => i) // la UI remapea ids reales
    }));
    await new Promise(r => setTimeout(r, 600));
    return { scenes };
  }

  const { data } = await api.post(`/ai/jobs`, {
    screenplay_id: screenplayId,
    state_context: "S6_KEY_SCENES",
    prompt_template_id: 8,
    input_payload: input
  });
  return data?.output_payload ?? { scenes: [] };
}

export interface ProposeSceneForTPInput {
  tp_order: number; tp_type: string; tp_summary: string;
  constraints?: string[];
}
export async function proposeSceneForTP(
  screenplayId: number,
  input: ProposeSceneForTPInput
): Promise<Omit<Scene, "id" | "order">> {
  if (isMock) {
    await new Promise(r => setTimeout(r, 400));
    return {
      title: `Key scene TP#${input.tp_order}`,
      is_key: true,
      linked_turning_point: input.tp_order,
      heading: input.tp_order <= 2 ? "INT" : "EXT",
      location: "WAREHOUSE",
      time_of_day: "NIGHT",
      synopsis: `A focused confrontation reflecting: ${input.tp_summary.slice(0, 90)}...`,
      goal: "Force the hero to commit.",
      conflict: "Antagonistic pressure escalates.",
      outcome: "Irreversible shift toward the next act.",
      characters: []
    };
  }

  const { data } = await api.post(`/ai/jobs`, {
    screenplay_id: screenplayId,
    state_context: "S6_KEY_SCENES",
    prompt_template_id: 9,
    input_payload: input
  });
  return data?.output_payload ?? {};
}

// ───────────────────────────────────────────────────────────────────────────
// S7 — All Scenes (propuestas IA para NO-clave)
// ───────────────────────────────────────────────────────────────────────────

export interface ProposeNonKeyScenesInput {
  treatment?: { act1?: string; act2?: string; act3?: string };
  turning_points?: { order: number; type: string; summary: string }[];
  subplots?: { title: string; type: string; beats: { order: number; summary: string }[] }[];
  existing?: { is_key?: boolean; linked_turning_point?: number | null }[];
  targetCount?: number;         // objetivo total de escenas (aprox)
  genre?: string; tone?: string;
}
export interface ProposeNonKeyScenesResult {
  scenes: Omit<Scene, "id" | "order">[]; // SOLO escenas NO clave (is_key: false)
}

export async function proposeNonKeyScenes(
  screenplayId: number,
  input: ProposeNonKeyScenesInput
): Promise<ProposeNonKeyScenesResult> {
  if (isMock) {
    // Crea 6 escenas no clave de ejemplo, mezclando actos y relacionándolas (sin TP)
    const baseLocs = ["APARTMENT – KITCHEN", "CITY STREET", "COURTHOUSE HALL", "OFFICE", "ROOFTOP", "BAR"];
    const scenes: Omit<Scene, "id" | "order">[] = Array.from({ length: 6 }).map((_, i) => ({
      title: `Bridge ${i + 1}`,
      is_key: false,
      linked_turning_point: null,
      heading: i % 2 ? "EXT" : "INT",
      location: baseLocs[i % baseLocs.length],
      time_of_day: i % 2 ? "DAY" : "NIGHT",
      synopsis: "A connective beat that escalates pressure and delivers a reveal tying subplots to the main goal.",
      goal: "Advance toward the next key beat.",
      conflict: "Obstacle complicates resources or relationships.",
      outcome: "New information or cost changes the approach.",
      characters: []
    }));
    await new Promise(r => setTimeout(r, 700));
    return { scenes };
  }

  const { data } = await api.post(`/ai/jobs`, {
    screenplay_id: screenplayId,
    state_context: "S7_ALL_SCENES",
    prompt_template_id: 10,
    input_payload: input
  });
  return data?.output_payload ?? { scenes: [] };
}


// ───────────────────────────────────────────────────────────────────────────
// S8 — Formatted Draft (per-scene Fountain generation)
// ───────────────────────────────────────────────────────────────────────────

export interface ProposeSceneDraftInput {
  heading?: "INT" | "EXT" | "INT/EXT";
  location?: string;
  time_of_day?: "DAY" | "NIGHT" | "DAWN" | "DUSK";
  title?: string;
  synopsis: string;
  goal?: string;
  conflict?: string;
  outcome?: string;
  characterNames?: string[]; // optional: names to stitch sample dialogue
  style?: { voice?: string; pacing?: "LEAN" | "NORMAL" | "LUSH" };
}
export interface ProposeSceneDraftResult { fountain: string; }

export async function proposeSceneDraft(
  screenplayId: number,
  sceneId: number,
  input: ProposeSceneDraftInput
): Promise<ProposeSceneDraftResult> {
  if (isMock) {
    const slug =
      `${input.heading ?? "INT"}. ${input.location ?? "LOCATION"} - ${input.time_of_day ?? "DAY"}`;
    const voice = input.style?.voice ? ` // voice: ${input.style.voice}` : "";
    const a = (s: string) => s.replace(/\s+/g, " ").trim();

    const whoA = (input.characterNames ?? ["ALEX"])[0].toUpperCase();
    const whoB = (input.characterNames ?? ["MARA", "DIEGO"])[1]?.toUpperCase();

    const fountain =
`${slug}

${a(input.synopsis)}

> GOAL: ${a(input.goal ?? "Advance toward objective.")}
> CONFLICT: ${a(input.conflict ?? "Opposition escalates.")}
> OUTCOME: ${a(input.outcome ?? "State changes.")}${voice}

${whoA}
We can't keep doing this the old way. It will break us.

${whoB ?? "OTHER"}
Then change it. Prove it costs you something.

Action line pushing into the next beat.
`;

    await new Promise(r => setTimeout(r, 500));
    return { fountain };
  }

  const { data } = await api.post(`/ai/jobs`, {
    screenplay_id: screenplayId,
    state_context: "S8_FORMATTED_DRAFT",
    prompt_template_id: 11,
    input_payload: { scene_id: sceneId, ...input }
  });
  return data?.output_payload ?? { fountain: "" };
}
