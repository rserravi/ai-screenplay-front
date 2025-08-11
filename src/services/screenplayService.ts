// src/services/screenplayService.ts
import { api, isMock } from "./apiClient";
import type { Screenplay } from "../models/screenplay";
import type { StateId } from "../models/enums";
import type { Character, Relationship, ArchetypeBeat } from "../models/characters";
import type { Subplot } from "../models/subplots";
import type { Scene } from "../models/scenes";

/* ──────────────────────────────────────────────────────────────────────────
 * Mock DB
 * ────────────────────────────────────────────────────────────────────────── */

let mockScreenplay: Screenplay = {
  id: 1,
  project_id: 1,
  title: "Untitled Screenplay",
  logline: "",
  genre: "",
  tone: "",
  synopsis: "",
  treatment: { act1: "", act2: "", act3: "" },
  turning_points: [],
  characters: [],
  relationships: [],
  subplots: [],
  scenes: [],
  status: "S1_SYNOPSIS",
  current_state: "S1_SYNOPSIS",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/* ──────────────────────────────────────────────────────────────────────────
 * Core fetch/update
 * ────────────────────────────────────────────────────────────────────────── */

export async function get(id: number): Promise<Screenplay> {
  if (isMock) return structuredClone(mockScreenplay);
  const { data } = await api.get(`/screenplays/${id}`);
  return data;
}

export async function update(id: number, patch: Partial<Screenplay>): Promise<Screenplay> {
  if (isMock) {
    mockScreenplay = { ...mockScreenplay, ...patch, updated_at: new Date().toISOString() };
    return structuredClone(mockScreenplay);
  }
  const { data } = await api.patch(`/screenplays/${id}`, patch);
  return data;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Characters CRUD (mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function addCharacter(spId: number, c: Omit<Character, "id">): Promise<Character> {
  if (isMock) {
    const next: Character = { ...c, id: Date.now() };
    mockScreenplay.characters = [...(mockScreenplay.characters ?? []), next];
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(next);
  }
  const { data } = await api.post(`/screenplays/${spId}/characters`, c);
  return data;
}

export async function updateCharacter(spId: number, c: Character): Promise<Character> {
  if (isMock) {
    mockScreenplay.characters = (mockScreenplay.characters ?? []).map(x => x.id === c.id ? c : x);
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(c);
  }
  const { data } = await api.put(`/screenplays/${spId}/characters/${c.id}`, c);
  return data;
}

export async function removeCharacter(spId: number, id: number): Promise<void> {
  if (isMock) {
    mockScreenplay.characters = (mockScreenplay.characters ?? []).filter(x => x.id !== id);
    // limpia relaciones y referencias en subplots
    mockScreenplay.relationships = (mockScreenplay.relationships ?? []).filter(r => r.a_id !== id && r.b_id !== id);
    mockScreenplay.subplots = (mockScreenplay.subplots ?? []).map(sp =>
      ({ ...sp, charactersInvolved: sp.charactersInvolved.filter(cid => cid !== id) })
    );
    mockScreenplay.updated_at = new Date().toISOString();
    return;
  }
  await api.delete(`/screenplays/${spId}/characters/${id}`);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Relationships CRUD (mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function addRelationship(spId: number, r: Omit<Relationship, "id">): Promise<Relationship> {
  if (isMock) {
    const next: Relationship = { ...r, id: Date.now() + Math.floor(Math.random() * 1000) };
    mockScreenplay.relationships = [...(mockScreenplay.relationships ?? []), next];
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(next);
  }
  const { data } = await api.post(`/screenplays/${spId}/relationships`, r);
  return data;
}

export async function updateRelationship(spId: number, r: Relationship): Promise<Relationship> {
  if (isMock) {
    mockScreenplay.relationships = (mockScreenplay.relationships ?? []).map(x => x.id === r.id ? r : x);
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(r);
  }
  const { data } = await api.put(`/screenplays/${spId}/relationships/${r.id}`, r);
  return data;
}

export async function removeRelationship(spId: number, id: number): Promise<void> {
  if (isMock) {
    mockScreenplay.relationships = (mockScreenplay.relationships ?? []).filter(x => x.id !== id);
    mockScreenplay.updated_at = new Date().toISOString();
    return;
  }
  await api.delete(`/screenplays/${spId}/relationships/${id}`);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Subplots CRUD (mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function addSubplot(spId: number, s: Omit<Subplot, "id">): Promise<Subplot> {
  if (isMock) {
    const next: Subplot = { ...s, id: Date.now() + Math.floor(Math.random() * 100) };
    mockScreenplay.subplots = [...(mockScreenplay.subplots ?? []), next];
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(next);
  }
  const { data } = await api.post(`/screenplays/${spId}/subplots`, s);
  return data;
}

export async function updateSubplot(spId: number, s: Subplot): Promise<Subplot> {
  if (isMock) {
    mockScreenplay.subplots = (mockScreenplay.subplots ?? []).map(x => x.id === s.id ? s : x);
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(s);
  }
  const { data } = await api.put(`/screenplays/${spId}/subplots/${s.id}`, s);
  return data;
}

export async function removeSubplot(spId: number, id: number): Promise<void> {
  if (isMock) {
    mockScreenplay.subplots = (mockScreenplay.subplots ?? []).filter(x => x.id !== id);
    mockScreenplay.updated_at = new Date().toISOString();
    return;
  }
  await api.delete(`/screenplays/${spId}/subplots/${id}`);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Scenes CRUD (mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function addScene(spId: number, s: Omit<Scene, "id" | "order">): Promise<Scene> {
  if (isMock) {
    const nextOrder = (mockScreenplay.scenes?.length ?? 0) + 1;
    const next: Scene = { ...s, id: Date.now(), order: nextOrder };
    mockScreenplay.scenes = [...(mockScreenplay.scenes ?? []), next];
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(next);
  }
  const { data } = await api.post(`/screenplays/${spId}/scenes`, s);
  return data;
}

export async function updateScene(spId: number, s: Scene): Promise<Scene> {
  if (isMock) {
    mockScreenplay.scenes = (mockScreenplay.scenes ?? []).map(x => x.id === s.id ? s : x);
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(s);
  }
  const { data } = await api.put(`/screenplays/${spId}/scenes/${s.id}`, s);
  return data;
}

export async function removeScene(spId: number, id: number): Promise<void> {
  if (isMock) {
    mockScreenplay.scenes = (mockScreenplay.scenes ?? [])
      .filter(x => x.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((sc, i) => ({ ...sc, order: i + 1 })); // re-ordena contiguo
    mockScreenplay.updated_at = new Date().toISOString();
    return;
  }
  await api.delete(`/screenplays/${spId}/scenes/${id}`);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Scenes reordering (mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function reorderScenes(spId: number, orderedIds: number[]): Promise<Scene[]> {
  if (isMock) {
    const idToOrder = new Map<number, number>();
    orderedIds.forEach((id, idx) => idToOrder.set(id, idx + 1));
    mockScreenplay.scenes = (mockScreenplay.scenes ?? [])
      .slice()
      .sort((a, b) => (idToOrder.get(a.id) ?? a.order) - (idToOrder.get(b.id) ?? b.order))
      .map((s, i) => ({ ...s, order: i + 1 }));
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(mockScreenplay.scenes ?? []);
  }
  const { data } = await api.post(`/screenplays/${spId}/scenes:reorder`, { orderedIds });
  return data;
}

export async function moveScene(spId: number, sceneId: number, direction: "UP" | "DOWN"): Promise<Scene[]> {
  if (isMock) {
    const arr = (mockScreenplay.scenes ?? []).slice().sort((a, b) => a.order - b.order);
    const idx = arr.findIndex(s => s.id === sceneId);
    if (idx === -1) return structuredClone(arr);
    const swapWith = direction === "UP" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= arr.length) return structuredClone(arr);
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    mockScreenplay.scenes = arr.map((s, i) => ({ ...s, order: i + 1 }));
    mockScreenplay.updated_at = new Date().toISOString();
    return structuredClone(mockScreenplay.scenes ?? []);
  }
  const { data } = await api.post(`/screenplays/${spId}/scenes/${sceneId}:move`, { direction });
  return data;
}

/* ──────────────────────────────────────────────────────────────────────────
 * State transitions (guards, mock)
 * ────────────────────────────────────────────────────────────────────────── */

export async function requestState(id: number, target: StateId): Promise<boolean> {
  if (isMock) {
    // S1 → S2: synopsis mínima
    if (target === "S2_TREATMENT") {
      const ok = (mockScreenplay.synopsis?.trim()?.length ?? 0) >= 40;
      if (ok) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S2 → S3: tratamiento mínimo por acto
    if (target === "S3_TURNING_POINTS") {
      const t = mockScreenplay.treatment ?? { act1: "", act2: "", act3: "" };
      const w = (s?: string) => (s?.trim().split(/\s+/).length ?? 0);
      const ok = w(t.act1) >= 60 && w(t.act2) >= 80 && w(t.act3) >= 60;
      if (ok) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S3 → S4: TPs válidos
    if (target === "S4_CHARACTERS") {
      const tps = mockScreenplay.turning_points ?? [];
      const okLen = tps.length === 5;
      const okTypes = new Set(tps.map(t => t.type)).size === 5;
      const okOrder = tps.every(t => t.order >= 1 && t.order <= 5) && new Set(tps.map(t => t.order)).size === 5;
      const okSummary = tps.every(t => (t.summary?.trim().length ?? 0) >= 15);
      if (okLen && okTypes && okOrder && okSummary) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S4 → S5: personajes/arquetipos mínimos
    if (target === "S5_SUBPLOTS") {
      const chars = mockScreenplay.characters ?? [];
      if (chars.length < 2) return false;

      const hasProtag = chars.some(c => c.structural_role === "PROTAGONIST");
      const hasAnta = chars.some(c => c.structural_role === "ANTAGONIST" || c.structural_role === "ANTAGONIST_LIEUTENANT");

      const flatBeats: ArchetypeBeat[] = chars.flatMap(c => c.archetype_timeline ?? []);
      const hasHero = flatBeats.some(b => b.archetype === "HERO");
      const hasShadow = flatBeats.some(b => b.archetype === "SHADOW");
      const hasAllyOrMentor = flatBeats.some(b => b.archetype === "ALLY" || b.archetype === "MENTOR");

      const ok = hasProtag && hasAnta && hasHero && hasShadow && hasAllyOrMentor;
      if (ok) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S5 → S6: subplots básicos y al menos uno enlazado a TP
    if (target === "S6_KEY_SCENES") {
      const sps = mockScreenplay.subplots ?? [];
      if (sps.length === 0) return false;
      const eachHasBeats = sps.every(s => (s.beats?.length ?? 0) >= 1);
      const eachHasChars = sps.every(s => (s.charactersInvolved?.length ?? 0) >= 1);
      const linksToTP = (mockScreenplay.turning_points?.length ?? 0) === 0
        ? true
        : sps.some(s => (s.linkedTurningPoints?.length ?? 0) >= 1);
      const hasImpactful = sps.some(s => ["RELATIONSHIP", "INTERNAL_CONFLICT", "ANTAGONIST_POV"].includes(s.type));
      const ok = eachHasBeats && eachHasChars && linksToTP && hasImpactful;
      if (ok) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S6 → S7: cobertura de TPs mediante key scenes + sinopsis mínima
    if (target === "S7_ALL_SCENES") {
      const tps = mockScreenplay.turning_points ?? [];
      const scs = (mockScreenplay.scenes ?? []).filter(s => s.is_key);
      const coverage = new Set(scs.map(s => s.linked_turning_point));
      const allCovered = tps.length === 0 ? scs.length > 0 : tps.every(tp => coverage.has(tp.order));
      const minSynopsis = scs.every(s => (s.synopsis?.trim().length ?? 0) >= 40);
      if (allCovered && minSynopsis) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S7 → S8: numeración contigua, meta rellena y TPs cubiertos
    if (target === "S8_FORMATTED_DRAFT") {
      const scs = (mockScreenplay.scenes ?? []).slice().sort((a, b) => a.order - b.order);
      if (scs.length === 0) return false;

      const contiguous = scs.every((s, i) => s.order === i + 1);
      const metaOk = scs.every(s =>
        (s.heading ?? "") !== "" &&
        (s.location ?? "").trim().length >= 3 &&
        (s.time_of_day ?? "") !== "" &&
        (s.synopsis ?? "").trim().length >= 30
      );

      const tps = mockScreenplay.turning_points ?? [];
      const keyScenes = scs.filter(s => s.is_key);
      const covered = new Set(keyScenes.map(s => s.linked_turning_point));
      const allTPCovered = tps.length === 0 ? keyScenes.length > 0 : tps.every(tp => covered.has(tp.order));

      if (contiguous && metaOk && allTPCovered) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    // S8 → S9: key con drafts sólidos y ≥60% escenas con draft
    if (target === "S9_REVIEW") {
      const scs = (mockScreenplay.scenes ?? []);
      if (scs.length === 0) return false;

      const key = scs.filter(s => s.is_key);
      const draftedKeys = key.filter(s => (s.formatted_text?.trim().length ?? 0) >= 60).length;
      const draftedAll = scs.filter(s => (s.formatted_text?.trim().length ?? 0) >= 40).length;

      const pctAll = scs.length ? draftedAll / scs.length : 0;
      const keysOk = key.length === 0 ? draftedAll > 0 : draftedKeys === key.length;
      const coverageOk = pctAll >= 0.6; // 60%

      if (keysOk && coverageOk) {
        mockScreenplay.status = target;
        mockScreenplay.current_state = target;
        mockScreenplay.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    return false;
  }

  // Real backend
  const { data } = await api.post(`/screenplays/${id}/state`, { target });
  return !!data?.ok || !!data;
}
