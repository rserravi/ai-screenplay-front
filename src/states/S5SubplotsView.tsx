// src/states/S5SubplotsView.tsx
import { useMemo, useState } from "react";
import {
  Box, Stack, Typography, Paper, Grid, TextField, Select, MenuItem,
  Button, Chip, IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, ListItemText
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Subplot, SubplotBeat, SubplotType } from "../models/subplots";
import type { Character } from "../models/characters";
import { proposeSubplots, proposeSubplotBeats } from "../services/aiJobsService";
import { addSubplot, updateSubplot, removeSubplot } from "../services/screenplayService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

const SUBPLOT_TYPES: SubplotType[] = [
  "RELATIONSHIP","ANTAGONIST_POV","INTERNAL_CONFLICT","PROFESSIONAL_MISSION","INVESTIGATION","FAMILY","RIVALRY",
  "REDEMPTION_OR_REVENGE","THEMATIC_DEBATE","COMIC_RUNNER","BACKSTORY","WORLD_OR_INSTITUTION","SIDE_QUEST"
];

export default function S5SubplotsView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const [preview, setPreview] = useState<Omit<Subplot, "id">[] | null>(null);

  const subplots = sp.subplots ?? [];
  const chars = sp.characters ?? [];
  const tps = sp.turning_points ?? [];

  const stats = useMemo(() => ({
    count: subplots.length,
    beats: subplots.reduce((acc, s) => acc + (s.beats?.length ?? 0), 0),
    withTP: subplots.filter(s => (s.linkedTurningPoints?.length ?? 0) > 0).length
  }), [subplots]);

  const onAdd = async () => {
    const base: Omit<Subplot, "id"> = {
      title: `Subplot ${subplots.length + 1}`,
      type: "RELATIONSHIP",
      purpose: "",
      dominantActs: ["ACT_I","ACT_II"],
      charactersInvolved: [],
      linkedTurningPoints: [],
      beats: []
    };
    const created = await addSubplot(sp.id, base);
    vm.setScreenplay({ ...sp, subplots: [...subplots, created] });
    vm.markDirty("S5_SUBPLOTS", true);
  };

  const onRemove = async (id: number) => {
    await removeSubplot(sp.id, id);
    vm.setScreenplay({ ...sp, subplots: subplots.filter(s => s.id !== id) });
    vm.markDirty("S5_SUBPLOTS", true);
  };

  const onChange = async (s: Subplot) => {
    const saved = await updateSubplot(sp.id, s);
    vm.setScreenplay({ ...sp, subplots: subplots.map(x => x.id === s.id ? saved : x) });
    vm.markDirty("S5_SUBPLOTS", true);
  };

  const propose = async () => {
    const res = await proposeSubplots(sp.id, {
      treatment: sp.treatment,
      turning_points: tps.map(tp => ({ type: tp.type, summary: tp.summary })),
      characters: chars.map(c => ({ id: c.id, name: c.name, structural_role: c.structural_role })),
      genre: sp.genre, tone: sp.tone
    });
    setPreview(res.subplots);
  };

  const applyPreviewReplace = async () => {
    if (!preview) return;
    // crea todas de cero (mock)
    const created = await Promise.all(preview.map(p => addSubplot(sp.id, p)));
    vm.setScreenplay({ ...sp, subplots: created });
    vm.markDirty("S5_SUBPLOTS", true);
    setPreview(null);
  };

  const saveAll = async () => {
    await vm.saveScreenplay({ subplots: sp.subplots });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S6_KEY_SCENES");
    if (!ok) {
      alert("Guard fails: need >=1 subplot with beats & characters; and at least one subplot linked to a Turning Point.");
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Design secondary plotlines. Each subplot should have beats that change something and, ideally, connect to Turning Points.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={propose}>Propose Subplots</Button>
          <Button variant="contained" onClick={saveAll} disabled={!vm.dirtyByState["S5_SUBPLOTS"]}>Save</Button>
          <Button color="secondary" onClick={approve}>Approve & Continue (→ S6)</Button>
          <Chip size="small" label={`Subplots: ${stats.count}`} />
          <Chip size="small" label={`Beats total: ${stats.beats}`} />
          <Chip size="small" label={`Linked to TPs: ${stats.withTP}`} />
        </Stack>

        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
            <Typography variant="subtitle1">Subplots</Typography>
            <Button startIcon={<AddIcon />} onClick={onAdd}>Add</Button>
          </Stack>
          <Divider />
          <Grid container spacing={2} p={2}>
            {subplots.map(spo => (
              <Grid item xs={12} key={spo.id}>
                <SubplotCard
                  s={spo}
                  onChange={onChange}
                  onRemove={onRemove}
                  characters={chars}
                  turningPointsCount={tps.length}
                />
              </Grid>
            ))}
            {subplots.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">No subplots yet.</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Stack>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>AI Proposal — Subplots</DialogTitle>
        <DialogContent dividers>
          {preview?.map((s, i) => (
            <Box key={i} mb={2}>
              <Typography variant="subtitle2">{s.title} — {s.type}</Typography>
              <Typography variant="body2" color="text.secondary">{s.purpose}</Typography>
              <Typography variant="caption" color="text.secondary">
                Acts: {s.dominantActs.join(", ")} · Beats: {s.beats.length}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
          <Button variant="contained" onClick={applyPreviewReplace}>Apply (replace current)</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function SubplotCard({
  s, onChange, onRemove, characters, turningPointsCount
}: {
  s: Subplot;
  onChange: (s: Subplot) => void;
  onRemove: (id: number) => void;
  characters: Character[];
  turningPointsCount: number;
}) {
  const set = (patch: Partial<Subplot>) => onChange({ ...s, ...patch });

  const toggleAct = (act: "ACT_I"|"ACT_II"|"ACT_III") => {
    const has = s.dominantActs.includes(act);
    const next = has ? s.dominantActs.filter(a => a !== act) : [...s.dominantActs, act];
    set({ dominantActs: next });
  };

  const addBeat = () => {
    const next = [...(s.beats ?? [])];
    const ord = next.length ? Math.max(...next.map(b => b.order)) + 1 : 1;
    next.push({ order: ord, summary: "" });
    set({ beats: next });
  };

  const editBeat = (idx: number, patch: Partial<SubplotBeat>) => {
    const next = s.beats.map((b, i) => i === idx ? { ...b, ...patch } : b);
    set({ beats: next });
  };

  const delBeat = (idx: number) => {
    const next = s.beats.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i + 1 }));
    set({ beats: next });
  };

  const proposeBeats = async () => {
    const res = await proposeSubplotBeats(1, 0, {
      title: s.title,
      type: s.type,
      purpose: s.purpose,
      dominantActs: s.dominantActs,
      charactersInvolved: characters.filter(c => s.charactersInvolved.includes(c.id)).map(c => c.name),
      constraints: []
    });
    set({ beats: res.beats });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1">{s.title || "Untitled Subplot"}</Typography>
        <IconButton aria-label="delete subplot" size="small" onClick={() => onRemove(s.id)}><DeleteIcon fontSize="small" /></IconButton>
      </Stack>

      <Grid container spacing={1} mt={0.5}>
        <Grid item xs={12} md={6}>
          <TextField label="Title" value={s.title} onChange={(e) => set({ title: e.target.value })} fullWidth size="small" />
        </Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth size="small" value={s.type} onChange={(e) => set({ type: e.target.value as SubplotType })}>
            {SUBPLOT_TYPES.map(t => <MenuItem key={t} value={t}>{t.replaceAll("_"," ")}</MenuItem>)}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <ActsToggles value={s.dominantActs} onToggle={toggleAct} />
        </Grid>

        <Grid item xs={12}>
          <TextField label="Purpose" value={s.purpose} onChange={(e) => set({ purpose: e.target.value })} fullWidth size="small" />
        </Grid>

        <Grid item xs={12} md={6}>
          <MultiSelectCharacters
            value={s.charactersInvolved}
            onChange={(ids) => set({ charactersInvolved: ids })}
            characters={characters}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MultiSelectTPs
            value={s.linkedTurningPoints ?? []}
            onChange={(ids) => set({ linkedTurningPoints: ids })}
            count={turningPointsCount}
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">Beats</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={addBeat} startIcon={<AddIcon />}>Add beat</Button>
              <Button variant="outlined" onClick={proposeBeats}>Propose beats</Button>
            </Stack>
          </Stack>
          <Box sx={{ mt: 1 }}>
            {s.beats.map((b, idx) => (
              <Grid container spacing={1} alignItems="center" key={idx} sx={{ mb: 1 }}>
                <Grid item xs={12} md={1.2}>
                  <TextField label="Order" size="small" type="number" value={b.order}
                    onChange={(e) => editBeat(idx, { order: Number(e.target.value) })} />
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField label="Summary" size="small" value={b.summary}
                    onChange={(e) => editBeat(idx, { summary: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={3.3}>
                  <TextField label="Out change" size="small" value={b.outChange ?? ""}
                    onChange={(e) => editBeat(idx, { outChange: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} md={0.5}>
                  <IconButton size="small" onClick={() => delBeat(idx)}><DeleteIcon fontSize="small" /></IconButton>
                </Grid>
              </Grid>
            ))}
            {s.beats.length === 0 && <Typography variant="body2" color="text.secondary">No beats yet.</Typography>}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

function ActsToggles({ value, onToggle }: {
  value: ("ACT_I"|"ACT_II"|"ACT_III")[];
  onToggle: (a: "ACT_I"|"ACT_II"|"ACT_III") => void;
}) {
  const acts: ("ACT_I"|"ACT_II"|"ACT_III")[] = ["ACT_I","ACT_II","ACT_III"];
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      {acts.map(a => (
        <Chip key={a}
          label={a.replaceAll("_"," ")}
          variant={value.includes(a) ? "filled" : "outlined"}
          onClick={() => onToggle(a)}
          size="small"
        />
      ))}
    </Stack>
  );
}

function MultiSelectCharacters({
  value, onChange, characters
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  characters: Character[];
}) {
  return (
    <Select
      multiple fullWidth size="small"
      value={value}
      onChange={(e) => onChange((e.target.value as number[]) || [])}
      renderValue={(selected) => characters.filter(c => selected.includes(c.id)).map(c => c.name).join(", ")}
    >
      {characters.map(c => (
        <MenuItem key={c.id} value={c.id}>
          <Checkbox checked={value.includes(c.id)} />
          <ListItemText primary={c.name} />
        </MenuItem>
      ))}
    </Select>
  );
}

function MultiSelectTPs({
  value, onChange, count
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  count: number;
}) {
  const options = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <Select
      multiple fullWidth size="small"
      value={value}
      onChange={(e) => onChange((e.target.value as number[]) || [])}
      renderValue={(selected) => (selected as number[]).sort((a,b)=>a-b).join(", ")}
    >
      {options.map(n => (
        <MenuItem key={n} value={n}>
          <Checkbox checked={value.includes(n)} />
          <ListItemText primary={`TP #${n}`} />
        </MenuItem>
      ))}
    </Select>
  );
}
