// src/states/S8FormattedDraftView.tsx
import { useMemo, useState } from "react";
import {
  Box, Stack, Typography, Paper, Grid, TextField, Button, Chip, IconButton, Divider
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DownloadIcon from "@mui/icons-material/Download";
import WorkflowActions from "../components/WorkflowActions";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Scene } from "../models/scenes";
import { proposeSceneDraft } from "../services/aiJobsService";
import { updateScene } from "../services/screenplayService";
import { compileFountain, downloadFountain } from "../utils/fountain";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

export default function S8FormattedDraftView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const scenes = (sp.scenes ?? []).slice().sort((a, b) => a.order - b.order);
  const keyCount = scenes.filter(s => s.is_key).length;
  const coveredKeys = scenes.filter(s => s.is_key && (s.formatted_text?.trim().length ?? 0) >= 60).length;
  const drafted = scenes.filter(s => (s.formatted_text?.trim().length ?? 0) >= 40).length;

  const [busyId, setBusyId] = useState<number | null>(null);

  const proposeFor = async (sc: Scene) => {
    setBusyId(sc.id);
    try {
      const charNames = (sp.characters ?? [])
        .filter(c => (sc.characters ?? []).includes(c.id))
        .map(c => c.name);
      const { fountain } = await proposeSceneDraft(sp.id, sc.id, {
        heading: sc.heading, location: sc.location, time_of_day: sc.time_of_day,
        title: sc.title, synopsis: sc.synopsis, goal: sc.goal, conflict: sc.conflict, outcome: sc.outcome,
        characterNames: charNames, style: { pacing: "LEAN" }
      });
      const saved = await updateScene(sp.id, { ...sc, formatted_text: fountain });
      vm.setScreenplay({ ...sp, scenes: (sp.scenes ?? []).map(x => x.id === sc.id ? saved : x) });
      vm.markDirty("S8_FORMATTED_DRAFT", true);
    } finally {
      setBusyId(null);
    }
  };

  const saveAll = async () => {
    await vm.saveScreenplay({ scenes: sp.scenes });
  };

  const compile = () => {
    const content = compileFountain(sp, scenes);
    downloadFountain(sp.title || "screenplay", content);
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S9_REVIEW");
    if (!ok) {
      alert("Guard fails: key scenes need proper drafts (≥60 chars), and most scenes (≥60%) should have ≥40 chars.");
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Format each scene in <strong>Fountain</strong>. Start with key scenes, then fill the rest. You can ask AI to propose a draft.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={compile}>Compile & Download (.fountain)</Button>
          <WorkflowActions
            onSave={saveAll}
            onApprove={approve}
            saveDisabled={!vm.dirtyByState["S8_FORMATTED_DRAFT"]}
          >
            <Chip size="small" label={`Scenes drafted: ${drafted}/${scenes.length}`} />
            <Chip size="small" label={`Key drafted: ${coveredKeys}/${keyCount}`} />
          </WorkflowActions>
        </Stack>

        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
            <Typography variant="subtitle1">Scenes (formatted text)</Typography>
            <Typography variant="caption" color="text.secondary">Tip: Fountain supports SLUGS, dialogue blocks, transitions, etc.</Typography>
          </Stack>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {scenes.map((s) => (
                <SceneEditor
                  key={s.id}
                  sc={s}
                  onChange={async (next) => {
                    const saved = await updateScene(sp.id, next);
                    vm.setScreenplay({ ...sp, scenes: (sp.scenes ?? []).map(x => x.id === next.id ? saved : x) });
                    vm.markDirty("S8_FORMATTED_DRAFT", true);
                  }}
                  onPropose={() => proposeFor(s)}
                  loading={busyId === s.id}
                />
              ))}
              {scenes.length === 0 && <Typography variant="body2" color="text.secondary">No scenes loaded.</Typography>}
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}

export function SceneEditor({
  sc, onChange, onPropose, loading
}: {
  sc: Scene;
  onChange: (s: Scene) => void;
  onPropose: () => void;
  loading: boolean;
}) {
  const isKey = sc.is_key;
  const badge = isKey ? `TP#${sc.linked_turning_point ?? "-"}` : "non-key";
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2">#{sc.order} — {sc.title || "Untitled"} {isKey ? "· Key" : ""}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" color={isKey ? "warning" : "default"} label={badge} />
          <Button size="small" startIcon={<AutoFixHighIcon />} onClick={onPropose} disabled={loading}>
            Propose draft
          </Button>
        </Stack>
      </Stack>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <TextField
            label="Fountain (formatted text for this scene)"
            value={sc.formatted_text ?? ""}
            onChange={(e) => onChange({ ...sc, formatted_text: e.target.value })}
            multiline minRows={6} fullWidth
            placeholder={`e.g.\n${(sc.heading ?? "INT")}. ${(sc.location ?? "LOCATION").toUpperCase()} - ${(sc.time_of_day ?? "DAY").toUpperCase()}\n\nAction line...\n\nCHARACTER NAME\nDialogue...\n`}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
