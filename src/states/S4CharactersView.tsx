// src/states/S4CharactersView.tsx
import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNotify } from "./useNotify";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";

import {
  STRUCT_ROLES,
  ARCHETYPES,
  PHASES,
  type Character,
  type Relationship,
  type JourneyPhase,
  type Archetype,
  RELATION_KINDS,
  type RelationKind,
} from "../models/characters";

import {
  proposeCharacters,
  proposeRelationships,
} from "../services/aiJobsService";

import {
  addCharacter,
  updateCharacter,
  removeCharacter,
  addRelationship,
  updateRelationship,
  removeRelationship,
} from "../services/screenplayService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

export default function S4CharactersView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const [charPreview, setCharPreview] = useState<
    Omit<Character, "id">[] | null
  >(null);
  const [relsPreview, setRelsPreview] = useState<
    Omit<Relationship, "id">[] | null
  >(null);

  const chars = sp.characters ?? [];
  const rels = sp.relationships ?? [];
  const notify = useNotify();

  const stats = useMemo(() => {
    const roles = new Set(chars.map((c) => c.structural_role));
    const beats = chars.flatMap((c) => c.archetype_timeline ?? []);
    const hasHero = beats.some((b) => b.archetype === "HERO");
    const hasShadow = beats.some((b) => b.archetype === "SHADOW");
    const hasAllyOrMentor = beats.some(
      (b) => b.archetype === "ALLY" || b.archetype === "MENTOR",
    );
    return { count: chars.length, roles, hasHero, hasShadow, hasAllyOrMentor };
  }, [chars]);

  const onAddCharacter = async () => {
    const base: Omit<Character, "id"> = {
      name: `Character ${chars.length + 1}`,
      structural_role: "SUPPORTING",
      tags: [],
      archetype_timeline: PHASES.map((p) => ({
        phase: p,
        archetype: "ALLY" as Archetype,
      })),
    };
    const created = await addCharacter(sp.id, base);
    vm.setScreenplay({ ...sp, characters: [...chars, created] });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const onDeleteCharacter = async (id: number) => {
    await removeCharacter(sp.id, id);
    vm.setScreenplay({
      ...sp,
      characters: chars.filter((c) => c.id !== id),
      relationships: rels.filter((r) => r.a_id !== id && r.b_id !== id),
    });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const editCharacter = async (patch: Character) => {
    const saved = await updateCharacter(sp.id, patch);
    vm.setScreenplay({
      ...sp,
      characters: chars.map((c) => (c.id === saved.id ? saved : c)),
    });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const onAddRelationship = async () => {
    if (chars.length < 2) return;
    const r: Omit<Relationship, "id"> = {
      a_id: chars[0].id,
      b_id: chars[1].id,
      kind: "ALLY_OF",
      strength: 0.6,
      trust: 0.7,
      secrecy: 0,
    };
    const saved = await addRelationship(sp.id, r);
    vm.setScreenplay({ ...sp, relationships: [...rels, saved] });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const onEditRelationship = async (row: Relationship) => {
    const saved = await updateRelationship(sp.id, row);
    vm.setScreenplay({
      ...sp,
      relationships: rels.map((r) => (r.id === saved.id ? saved : r)),
    });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const onDeleteRelationship = async (id: number) => {
    await removeRelationship(sp.id, id);
    vm.setScreenplay({ ...sp, relationships: rels.filter((r) => r.id !== id) });
    vm.markDirty("S4_CHARACTERS", true);
  };

  const proposeChars = async () => {
    const res = await proposeCharacters(sp.id, {
      genre: sp.genre,
      tone: sp.tone,
      treatment: sp.treatment,
      turning_points: (sp.turning_points ?? []).map((tp) => ({
        type: tp.type,
        summary: tp.summary,
      })),
    });
    setCharPreview(res.characters);
  };

  const applyCharsPreview = async () => {
    if (!charPreview) return;
    // Reemplaza por simplicidad (puedes implementar merge si quieres)
    const created = await Promise.all(
      charPreview.map((c) => addCharacter(sp.id, c)),
    );
    vm.setScreenplay({ ...sp, characters: created });
    vm.markDirty("S4_CHARACTERS", true);
    setCharPreview(null);
  };

  const proposeRels = async () => {
    const res = await proposeRelationships(sp.id, {
      characters: chars.map((c) => ({
        name: c.name,
        structural_role: c.structural_role,
      })),
    });
    // Mapear ids negativos a ids reales por índice (mock)
    // -1 → chars[0], -2 → chars[1], etc. (si existen)
    const mapId = (tmpId: number) =>
      tmpId < 0 ? (chars[Math.abs(tmpId) - 1]?.id ?? chars[0].id) : tmpId;
    setRelsPreview(
      res.relationships.map((r) => ({
        ...r,
        a_id: mapId(r.a_id),
        b_id: mapId(r.b_id),
      })),
    );
  };

  const applyRelsPreview = async () => {
    if (!relsPreview) return;
    const saved = await Promise.all(
      relsPreview.map((r) => addRelationship(sp.id, r)),
    );
    vm.setScreenplay({ ...sp, relationships: [...rels, ...saved] });
    vm.markDirty("S4_CHARACTERS", true);
    setRelsPreview(null);
  };

  const saveAll = async () => {
    await vm.saveScreenplay({
      characters: sp.characters,
      relationships: sp.relationships,
    });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S5_SUBPLOTS");
    if (!ok) {
      notify(
        "Guard fails: need PROTAGONIST + ANTAGONIST, archetypes including HERO and SHADOW, and at least one ALLY or MENTOR.",
      );
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Define characters (structural role + archetypes per act) and their
          directed relationships.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={proposeChars}>
            Propose Characters
          </Button>
          <Button
            variant="outlined"
            onClick={proposeRels}
            disabled={(chars.length ?? 0) < 2}
          >
            Propose Relationships
          </Button>
          <Button
            variant="contained"
            onClick={saveAll}
            disabled={!vm.dirtyByState["S4_CHARACTERS"]}
          >
            Save
          </Button>
          <Button color="secondary" onClick={approve}>
            Approve & Continue (→ S5)
          </Button>
          <Chip size="small" label={`Chars: ${stats.count}`} />
          <Chip
            size="small"
            label={`Hero:${stats.hasHero ? "✓" : "—"} Shadow:${stats.hasShadow ? "✓" : "—"} Ally/Mentor:${stats.hasAllyOrMentor ? "✓" : "—"}`}
          />
        </Stack>

        {/* Characters */}
        <Paper variant="outlined">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            px={2}
            py={1}
          >
            <Typography variant="subtitle1">Characters</Typography>
            <Button startIcon={<AddIcon />} onClick={onAddCharacter}>
              Add
            </Button>
          </Stack>
          <Divider />
          <Grid container spacing={2} p={2}>
            {(chars ?? []).map((c) => (
              <Grid xs={12} md={6} key={c.id}>
                <CharacterCard
                  c={c}
                  onChange={editCharacter}
                  onDelete={onDeleteCharacter}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Relationships */}
        <Paper variant="outlined">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            px={2}
            py={1}
          >
            <Typography variant="subtitle1">Relationships</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={onAddRelationship}
              disabled={(chars.length ?? 0) < 2}
            >
              Add
            </Button>
          </Stack>
          <Divider />
          <Grid container spacing={1} p={2}>
            {(rels ?? []).map((r) => (
              <RelationshipRow
                key={r.id}
                r={r}
                onChange={onEditRelationship}
                onDelete={onDeleteRelationship}
                chars={chars}
              />
            ))}
            {rels.length === 0 && (
              <Grid xs={12}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ px: 1 }}
                >
                  No relationships yet.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Stack>

      {/* Preview dialogs */}
      <Dialog
        open={!!charPreview}
        onClose={() => setCharPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Proposal — Characters</DialogTitle>
        <DialogContent dividers>
          {charPreview?.map((c, i) => (
            <Box key={i} mb={2}>
              <Typography variant="subtitle2">
                {c.name} — {c.structural_role}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {c.arc_summary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {c.archetype_timeline
                  ?.map((b) => `${b.phase}:${b.archetype}`)
                  .join(" · ")}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCharPreview(null)}>Close</Button>
          <Button variant="contained" onClick={applyCharsPreview}>
            Apply (replace current)
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!relsPreview}
        onClose={() => setRelsPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Proposal — Relationships</DialogTitle>
        <DialogContent dividers>
          {relsPreview?.map((r, i) => (
            <Typography key={i} variant="body2">
              {labelChar(chars, r.a_id)} — {r.kind} → {labelChar(chars, r.b_id)}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelsPreview(null)}>Close</Button>
          <Button variant="contained" onClick={applyRelsPreview}>
            Apply (append)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function CharacterCard({
  c,
  onChange,
  onDelete,
}: {
  c: Character;
  onChange: (c: Character) => void;
  onDelete: (id: number) => void;
}) {
  const set = (patch: Partial<Character>) => onChange({ ...c, ...patch });

  const setBeat = (phase: JourneyPhase, archetype: Archetype) => {
    const beats = [...(c.archetype_timeline ?? [])];
    const idx = beats.findIndex((b) => b.phase === phase);
    if (idx >= 0) beats[idx] = { ...beats[idx], archetype };
    else beats.push({ phase, archetype });
    set({ archetype_timeline: beats });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1">{c.name}</Typography>
        <IconButton
          onClick={() => onDelete(c.id)}
          aria-label="delete character"
          size="small"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Grid container spacing={1} mt={0.5}>
        <Grid xs={12} md={6}>
          <TextField
            label="Name"
            value={c.name}
            onChange={(e) => set({ name: e.target.value })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid xs={12} md={6}>
          <Select
            fullWidth
            size="small"
            value={c.structural_role}
            onChange={(e) => set({ structural_role: e.target.value as any })}
          >
            {STRUCT_ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r.replaceAll("_", " ")}
              </MenuItem>
            ))}
          </Select>
        </Grid>

        <Grid xs={12} md={4}>
          <TextField
            label="Goal"
            value={c.goal ?? ""}
            onChange={(e) => set({ goal: e.target.value })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid xs={12} md={4}>
          <TextField
            label="Need"
            value={c.need ?? ""}
            onChange={(e) => set({ need: e.target.value })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid xs={12} md={4}>
          <TextField
            label="Flaw"
            value={c.flaw ?? ""}
            onChange={(e) => set({ flaw: e.target.value })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid xs={12}>
          <TextField
            label="Arc summary"
            value={c.arc_summary ?? ""}
            onChange={(e) => set({ arc_summary: e.target.value })}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
        </Grid>

        <Grid xs={12}>
          <Typography variant="caption" color="text.secondary">
            Archetypes per act
          </Typography>
          <Grid container spacing={1} mt={0.5}>
            {PHASES.map((p) => {
              const current =
                c.archetype_timeline?.find((b) => b.phase === p)?.archetype ??
                "ALLY";
              return (
                <Grid xs={12} md={4} key={p}>
                  <Select
                    fullWidth
                    size="small"
                    value={current}
                    onChange={(e) => setBeat(p, e.target.value as Archetype)}
                  >
                    {ARCHETYPES.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a.replaceAll("_", " ")}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    {p.replaceAll("_", " ")}
                  </Typography>
                </Grid>
              );
            })}
          </Grid>
        </Grid>

        <Grid xs={12}>
          <TextField
            label="Tags (comma-separated)"
            value={(c.tags ?? []).join(", ")}
            onChange={(e) =>
              set({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

function RelationshipRow({
  r,
  onChange,
  onDelete,
  chars,
}: {
  r: Relationship;
  onChange: (r: Relationship) => void;
  onDelete: (id: number) => void;
  chars: Character[];
}) {
  const set = (patch: Partial<Relationship>) => onChange({ ...r, ...patch });

  return (
    <Grid container spacing={1} alignItems="center">
      <Grid xs={12} md={3}>
        <Select
          fullWidth
          size="small"
          value={r.a_id}
          onChange={(e) => set({ a_id: Number(e.target.value) })}
        >
          {chars.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid xs={12} md={4}>
        <Select
          fullWidth
          size="small"
          value={r.kind}
          onChange={(e) => set({ kind: e.target.value as RelationKind })}
        >
          {RELATION_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {k.replaceAll("_", " ")}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid xs={12} md={3}>
        <Select
          fullWidth
          size="small"
          value={r.b_id}
          onChange={(e) => set({ b_id: Number(e.target.value) })}
        >
          {chars.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid xs={12} md={1.5}>
        <TextField
          label="Strength"
          size="small"
          type="number"
          inputProps={{ step: 0.1, min: 0, max: 1 }}
          value={r.strength ?? 0}
          onChange={(e) => set({ strength: Number(e.target.value) })}
        />
      </Grid>
      <Grid xs={12} md={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            label="Trust"
            size="small"
            type="number"
            inputProps={{ step: 0.1, min: 0, max: 1 }}
            value={r.trust ?? 0}
            onChange={(e) => set({ trust: Number(e.target.value) })}
          />
          <IconButton
            aria-label="delete relationship"
            size="small"
            onClick={() => onDelete(r.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Grid>
    </Grid>
  );
}

function labelChar(chars: Character[], id: number) {
  const c = chars.find((x) => x.id === id);
  return c ? c.name : `#${id}`;
}
