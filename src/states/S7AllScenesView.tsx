// src/states/S7AllScenesView.tsx
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
  IconButton,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNotify } from "./useNotify";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import WorkflowActions from "../components/WorkflowActions";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Scene, Heading, DayPart } from "../models/scenes";
import {
  addScene,
  updateScene,
  removeScene,
  reorderScenes,
  moveScene,
} from "../services/screenplayService";
import { proposeNonKeyScenes } from "../services/aiJobsService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

const HEADINGS: Heading[] = ["INT", "EXT", "INT/EXT"];
const TIMES: DayPart[] = ["DAY", "NIGHT", "DAWN", "DUSK"];

export default function S7AllScenesView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const scenes = (sp.scenes ?? []).slice().sort((a, b) => a.order - b.order);
  const tps = sp.turning_points ?? [];

  const stats = useMemo(
    () => ({
      total: scenes.length,
      key: scenes.filter((s) => s.is_key).length,
      nonKey: scenes.filter((s) => !s.is_key).length,
    }),
    [scenes],
  );

  const [proposing, setProposing] = useState(false);
  const notify = useNotify();

  const addSceneBelow = async (afterOrder: number) => {
    // Añade y reordena (lo sencillo en mock: insertar al final y luego reordenar ordenes)
    const created = await addScene(sp.id, {
      title: `Scene ${scenes.length + 1}`,
      is_key: false,
      linked_turning_point: null,
      heading: "INT",
      location: "",
      time_of_day: "DAY",
      synopsis: "",
      goal: "",
      conflict: "",
      outcome: "",
      characters: [],
    });
    const ids = scenes
      .flatMap((s) => (s.order <= afterOrder ? [s.id] : []))
      .concat([created.id])
      .concat(scenes.filter((s) => s.order > afterOrder).map((s) => s.id));
    const updated = await reorderScenes(sp.id, ids);
    vm.setScreenplay({ ...sp, scenes: updated });
    vm.markDirty("S7_ALL_SCENES", true);
  };

  const remove = async (id: number) => {
    await removeScene(sp.id, id);
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? [])
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })),
    });
    vm.markDirty("S7_ALL_SCENES", true);
  };

  const move = async (sceneId: number, dir: "UP" | "DOWN") => {
    const updated = await moveScene(sp.id, sceneId, dir);
    vm.setScreenplay({ ...sp, scenes: updated });
    vm.markDirty("S7_ALL_SCENES", true);
  };

  const onChange = async (s: Scene) => {
    const saved = await updateScene(sp.id, s);
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? []).map((x) => (x.id === s.id ? saved : x)),
    });
    vm.markDirty("S7_ALL_SCENES", true);
  };

  const proposeNonKey = async () => {
    setProposing(true);
    try {
      const res = await proposeNonKeyScenes(sp.id, {
        treatment: sp.treatment,
        turning_points: tps.map((tp) => ({
          order: tp.order,
          type: tp.type,
          summary: tp.summary,
        })),
        subplots: (sp.subplots ?? []).map((s) => ({
          title: s.title,
          type: s.type,
          beats: s.beats,
        })),
        existing: scenes.map((s) => ({
          is_key: s.is_key,
          linked_turning_point: s.linked_turning_point,
        })),
        targetCount: 40,
        genre: sp.genre,
        tone: sp.tone,
      });
      // apéndalas al final
      for (const p of res.scenes) {
        const created = await addScene(sp.id, p);
        sp.scenes = [...(sp.scenes ?? []), created];
      }
      vm.setScreenplay({
        ...sp,
        scenes: (sp.scenes ?? []).slice().sort((a, b) => a.order - b.order),
      });
      vm.markDirty("S7_ALL_SCENES", true);
    } finally {
      setProposing(false);
    }
  };

  const saveAll = async () => {
    await vm.saveScreenplay({ scenes: sp.scenes });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S8_FORMATTED_DRAFT");
    if (!ok) {
      notify(
        "Guard fails: ensure contiguous numbering, meta filled (heading/location/time) and all key TPs covered with ≥30-char synopsis.",
      );
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Complete the scene list (key and non-key). You can add, edit and
          reorder. Use AI to propose connective scenes.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            onClick={proposeNonKey}
            disabled={proposing}
          >
            Propose non-key scenes
          </Button>
          <WorkflowActions
            onSave={saveAll}
            onApprove={approve}
            saveDisabled={!vm.dirtyByState["S7_ALL_SCENES"]}
          >
            <Chip size="small" label={`Total: ${stats.total}`} />
            <Chip size="small" label={`Key: ${stats.key}`} />
            <Chip size="small" label={`Non-key: ${stats.nonKey}`} />
          </WorkflowActions>
        </Stack>

        <Paper variant="outlined">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            px={2}
            py={1}
          >
            <Typography variant="subtitle1">Scenes</Typography>
            <Typography variant="caption" color="text.secondary">
              Use the arrows to reorder; add below any scene.
            </Typography>
          </Stack>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack spacing={1.25}>
              {scenes.map((s, idx) => (
                <SceneRow
                  key={s.id}
                  scene={s}
                  isFirst={idx === 0}
                  isLast={idx === scenes.length - 1}
                  onChange={onChange}
                  onRemove={remove}
                  onMove={move}
                  onAddBelow={() => addSceneBelow(s.order)}
                />
              ))}
              {scenes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No scenes yet. Start by adding or proposing.
                </Typography>
              )}
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}

function SceneRow({
  scene,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
  onAddBelow,
}: {
  scene: Scene;
  isFirst: boolean;
  isLast: boolean;
  onChange: (s: Scene) => void;
  onRemove: (id: number) => void;
  onMove: (id: number, dir: "UP" | "DOWN") => void;
  onAddBelow: () => void;
}) {
  const set = (patch: Partial<Scene>) => onChange({ ...scene, ...patch });
  return (
    <Paper variant="outlined" sx={{ p: 1.25 }}>
      <Grid container spacing={1} alignItems="center">
        <Grid xs={12} md={0.8}>
          <Chip size="small" label={scene.order} />
        </Grid>
        <Grid xs={12} md={1.4}>
          {scene.is_key ? (
            <Chip
              size="small"
              color="warning"
              label={`TP#${scene.linked_turning_point ?? "-"}`}
            />
          ) : (
            <Chip size="small" variant="outlined" label="non-key" />
          )}
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
        <Grid xs={12} md={2.5}>
          <TextField
            size="small"
            label="Location"
            value={scene.location ?? ""}
            onChange={(e) => set({ location: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid xs={12} md={1.4}>
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
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              disabled={isFirst}
              onClick={() => onMove(scene.id, "UP")}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              disabled={isLast}
              onClick={() => onMove(scene.id, "DOWN")}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Grid>
        <Grid xs={12} md={0.6}>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={onAddBelow} title="Add below">
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onRemove(scene.id)}
              title="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
