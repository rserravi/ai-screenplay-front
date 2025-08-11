// src/states/S6KeyScenesView.tsx
import { useMemo, useState, useEffect } from "react";
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
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNotify } from "./useNotify";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import WorkflowActions from "../components/WorkflowActions";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Scene, Heading, DayPart } from "../models/scenes";
import { proposeKeyScenes, proposeSceneForTP } from "../services/aiJobsService";
import {
  addScene,
  updateScene,
  removeScene,
} from "../services/screenplayService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

const HEADINGS: Heading[] = ["INT", "EXT", "INT/EXT"];
const TIMES: DayPart[] = ["DAY", "NIGHT", "DAWN", "DUSK"];

export default function S6KeyScenesView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const tps = sp.turning_points ?? [];
  const scenes = useMemo(
    () =>
      (sp.scenes ?? [])
        .filter((s) => s.is_key)
        .sort((a, b) => a.order - b.order),
    [sp.scenes],
  );

  const stats = useMemo(
    () => ({
      count: scenes.length,
      covered: new Set(scenes.map((s) => s.linked_turning_point)).size,
      need: tps.length,
    }),
    [scenes, tps],
  );

  const [preview, setPreview] = useState<Omit<Scene, "id" | "order">[] | null>(
    null,
  );

  // Focus visual cuando aterrizas desde S9 (TP chip)
  const [focusTP, setFocusTP] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = sessionStorage.getItem("ui.focus.tp");
      if (v) {
        setFocusTP(Number(v));
        sessionStorage.removeItem("ui.focus.tp");
        const t = setTimeout(() => setFocusTP(null), 3000);
        return () => clearTimeout(t);
      }
    } catch {
      /* noop */
    }
  }, []);

  const notify = useNotify();
  const addForTP = async (tpOrder: number) => {
    const created = await addScene(sp.id, {
      title: `Key Scene #${tpOrder}`,
      is_key: true,
      linked_turning_point: tpOrder,
      heading: "INT",
      location: "",
      time_of_day: "DAY",
      synopsis: "",
      goal: "",
      conflict: "",
      outcome: "",
      characters: [],
    });
    vm.setScreenplay({ ...sp, scenes: [...(sp.scenes ?? []), created] });
    vm.markDirty("S6_KEY_SCENES", true);
  };

  const proposeForTP = async (
    tpOrder: number,
    tpType: string,
    tpSummary: string,
  ) => {
    const s = await proposeSceneForTP(sp.id, {
      tp_order: tpOrder,
      tp_type: tpType,
      tp_summary: tpSummary,
    });
    const created = await addScene(sp.id, s);
    vm.setScreenplay({ ...sp, scenes: [...(sp.scenes ?? []), created] });
    vm.markDirty("S6_KEY_SCENES", true);
  };

  const proposeAll = async () => {
    const res = await proposeKeyScenes(sp.id, {
      treatment: sp.treatment,
      turning_points: tps.map((tp) => ({
        order: tp.order,
        type: tp.type,
        summary: tp.summary,
      })),
      characters: (sp.characters ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        structural_role: c.structural_role,
      })),
      genre: sp.genre,
      tone: sp.tone,
    });
    setPreview(res.scenes);
  };

  const applyPreview = async () => {
    if (!preview) return;
    const created = await Promise.all(preview.map((p) => addScene(sp.id, p)));
    vm.setScreenplay({ ...sp, scenes: [...(sp.scenes ?? []), ...created] });
    vm.markDirty("S6_KEY_SCENES", true);
    setPreview(null);
  };

  const onChange = async (s: Scene) => {
    const saved = await updateScene(sp.id, s);
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? []).map((x) => (x.id === s.id ? saved : x)),
    });
    vm.markDirty("S6_KEY_SCENES", true);
  };

  const onRemove = async (id: number) => {
    await removeScene(sp.id, id);
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? []).filter((x) => x.id !== id),
    });
    vm.markDirty("S6_KEY_SCENES", true);
  };

  const saveAll = async () => {
    await vm.saveScreenplay({ scenes: sp.scenes });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S7_ALL_SCENES");
    if (!ok) {
      notify(
        "Guard fails: need coverage (≥1 key scene per TP) and synopsis ≥ 40 characters.",
      );
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Plan the key scenes that land each Turning Point. One or more per TP;
          each with G/C/O (Goal/Conflict/Outcome).
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            onClick={proposeAll}
            disabled={!tps.length}
          >
            Propose All from Turning Points
          </Button>
          <WorkflowActions
            onSave={saveAll}
            onApprove={approve}
            saveDisabled={!vm.dirtyByState["S6_KEY_SCENES"]}
          >
            <Chip size="small" label={`Key scenes: ${stats.count}`} />
            <Chip
              size="small"
              label={`TP covered: ${stats.covered}/${stats.need || "-"}`}
            />
          </WorkflowActions>
        </Stack>

        {/* Lista por TP */}
        {tps.map((tp) => {
          const items = scenes.filter(
            (s) => s.linked_turning_point === tp.order,
          );
          return (
            <Paper
              key={tp.order}
              variant="outlined"
              sx={{
                p: 2,
                borderColor: focusTP === tp.order ? "warning.main" : "divider",
                boxShadow: focusTP === tp.order ? 2 : 0,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1">
                  TP#{tp.order} — {tp.type}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addForTP(tp.order)}
                  >
                    Add scene
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => proposeForTP(tp.order, tp.type, tp.summary)}
                  >
                    Propose scene
                  </Button>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {tp.summary}
              </Typography>

              {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No key scenes for this TP yet.
                </Typography>
              )}

              <Stack spacing={1.5}>
                {items.map((s) => (
                  <SceneRow
                    key={s.id}
                    scene={s}
                    onChange={onChange}
                    onRemove={onRemove}
                  />
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Preview dialog */}
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Proposal — Key Scenes</DialogTitle>
        <DialogContent dividers>
          {preview?.map((p, i) => (
            <Box key={i} mb={2}>
              <Typography variant="subtitle2">
                {p.title} (TP#{p.linked_turning_point})
              </Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">
                {p.synopsis}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
          <Button variant="contained" onClick={applyPreview}>
            Apply (append)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SceneRow({
  scene,
  onChange,
  onRemove,
}: {
  scene: Scene;
  onChange: (s: Scene) => void;
  onRemove: (id: number) => void;
}) {
  const set = (patch: Partial<Scene>) => onChange({ ...scene, ...patch });
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Grid container spacing={1} alignItems="center">
        <Grid xs={12} md={2.2}>
          <TextField
            size="small"
            label="Title"
            value={scene.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Grid>
        <Grid xs={12} md={1.8}>
          <Select
            size="small"
            fullWidth
            value={scene.heading ?? "INT"}
            onChange={(e) => set({ heading: e.target.value as Heading })}
          >
            {HEADINGS.map((h) => (
              <MenuItem key={h} value={h}>
                {h}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid xs={12} md={3}>
          <TextField
            size="small"
            label="Location"
            value={scene.location ?? ""}
            onChange={(e) => set({ location: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={12} md={1.5}>
          <Select
            size="small"
            fullWidth
            value={scene.time_of_day ?? "DAY"}
            onChange={(e) => set({ time_of_day: e.target.value as DayPart })}
          >
            {TIMES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid xs={12} md={3.5}>
          <TextField
            size="small"
            label="Synopsis"
            value={scene.synopsis}
            onChange={(e) => set({ synopsis: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={12} md={0.6}>
          <IconButton
            size="small"
            onClick={() => onRemove(scene.id)}
            aria-label="delete"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Grid>
      </Grid>
      <Grid container spacing={1} mt={0.5}>
        <Grid xs={12} md={4}>
          <TextField
            size="small"
            label="Goal"
            value={scene.goal ?? ""}
            onChange={(e) => set({ goal: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={12} md={4}>
          <TextField
            size="small"
            label="Conflict"
            value={scene.conflict ?? ""}
            onChange={(e) => set({ conflict: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={12} md={4}>
          <TextField
            size="small"
            label="Outcome"
            value={scene.outcome ?? ""}
            onChange={(e) => set({ outcome: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
