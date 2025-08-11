// src/states/S3TurningPointsView.tsx
import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNotify } from "./useNotify";
import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import { useAiJobs } from "../vm/useAiJobs";
import {
  TP_ORDER,
  TP_LABEL,
  type TurningPoint,
  type TurningPointType,
} from "../models/turningPoints";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

const EMPTY_ROWS: TurningPoint[] = TP_ORDER.map((t, i) => ({
  id: i + 1,
  type: t,
  summary: "",
  order: i + 1,
}));

export default function S3TurningPointsView({ vm, sm }: { vm: VM; sm: SM }) {
  const ai = useAiJobs();
  const notify = useNotify();
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const rows =
    sp.turning_points && sp.turning_points.length
      ? sp.turning_points
      : EMPTY_ROWS;

  const setRow = (idx: number, patch: Partial<TurningPoint>) => {
    const clone = rows.map((r) => ({ ...r }));
    clone[idx] = { ...clone[idx], ...patch };
    vm.setScreenplay({ ...sp, turning_points: clone });
    vm.markDirty("S3_TURNING_POINTS" as any, true);
  };

  const counts = useMemo(
    () => ({
      filled: rows.filter((r) => (r.summary?.trim().length ?? 0) > 0).length,
      uniqueTypes: new Set(rows.map((r) => r.type)).size,
      uniqueOrders: new Set(rows.map((r) => r.order)).size,
    }),
    [rows],
  );

  const [aiPreview, setAiPreview] = useState<TurningPoint[] | null>(null);

  const proposeAll = async () => {
    const res = await ai.proposeTurningPoints(sp.id, {
      treatment: sp.treatment,
      constraints: [sp.genre ?? "", sp.tone ?? ""].filter(Boolean),
    });
    const preview = res.items.map((it, i) => ({ id: i + 1, ...it }));
    setAiPreview(preview);
  };

  const applyPreview = () => {
    if (!aiPreview) return;
    vm.setScreenplay({ ...sp, turning_points: aiPreview });
    vm.markDirty("S3_TURNING_POINTS" as any, true);
    setAiPreview(null);
  };

  const save = async () => {
    await vm.saveScreenplay({ turning_points: rows });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S4_CHARACTERS");
    if (!ok) {
      notify(
        "Guard fails: need 5 unique types, unique orders 1..5 and non-empty summaries (≥15 chars).",
      );
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Define the five structural turning points. You can ask AI to propose
          them from the Treatment.
        </Typography>

        <Paper variant="outlined">
          <Grid container p={1} sx={{ bgcolor: "grey.50" }}>
            <Grid xs={12} md={3}>
              <Typography variant="caption">Type</Typography>
            </Grid>
            <Grid xs={12} md={7}>
              <Typography variant="caption">Summary</Typography>
            </Grid>
            <Grid xs={12} md={2}>
              <Typography variant="caption">Order</Typography>
            </Grid>
          </Grid>

          {rows.map((row, idx) => (
            <Grid
              key={row.id}
              container
              alignItems="center"
              p={1}
              spacing={1}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
              <Grid xs={12} md={3}>
                <Select
                  fullWidth
                  size="small"
                  value={row.type}
                  onChange={(e) =>
                    setRow(idx, { type: e.target.value as TurningPointType })
                  }
                >
                  {TP_ORDER.map((t) => (
                    <MenuItem key={t} value={t}>
                      {TP_LABEL[t]}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid xs={12} md={7}>
                <TextField
                  value={row.summary}
                  onChange={(e) => setRow(idx, { summary: e.target.value })}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="What happens here and how it changes trajectory?"
                />
              </Grid>
              <Grid xs={12} md={2}>
                <Select
                  fullWidth
                  size="small"
                  value={row.order}
                  onChange={(e) =>
                    setRow(idx, { order: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            </Grid>
          ))}
        </Paper>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={proposeAll} disabled={ai.loading}>
            Propose from Treatment
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!vm.dirtyByState["S3_TURNING_POINTS" as any]}
          >
            Save
          </Button>
          <Button color="secondary" onClick={approve}>
            Approve & Continue (→ S4)
          </Button>
          <Chip size="small" label={`Filled: ${counts.filled}/5`} />
          <Chip size="small" label={`Unique types: ${counts.uniqueTypes}/5`} />
          <Chip
            size="small"
            label={`Unique orders: ${counts.uniqueOrders}/5`}
          />
        </Stack>
      </Stack>

      <Dialog
        open={!!aiPreview}
        onClose={() => setAiPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Proposal — Turning Points</DialogTitle>
        <DialogContent dividers>
          {aiPreview?.map((tp) => (
            <Box key={tp.id} mb={2}>
              <Typography variant="subtitle2">
                {tp.order}. {TP_LABEL[tp.type]}
              </Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">
                {tp.summary}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiPreview(null)}>Close</Button>
          <Button variant="contained" onClick={applyPreview}>
            Apply All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
