// src/states/S1SynopsisView.tsx
import { useState } from "react";
import { Box, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import { proposeSynopsis } from "../services/aiJobsService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

export default function S1SynopsisView({ vm, sm }: { vm: VM; sm: SM }) {
  const [idea, setIdea] = useState("");
  const [proposal, setProposal] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const onPropose = async () => {
    const res = await proposeSynopsis(sp.id, {
      idea,
      genre: sp.genre,
      tone: sp.tone,
      currentSynopsis: sp.synopsis
    });
    setProposal(res.proposal);
    setPreviewOpen(true);
  };

  const applyProposal = async () => {
    if (!proposal) return;
    await vm.saveScreenplay({ synopsis: proposal });
    vm.markDirty("S1_SYNOPSIS", false);
    setPreviewOpen(false);
  };

  const onSave = async () => {
    await vm.saveScreenplay({
      synopsis: sp.synopsis,
      logline: sp.logline,
      genre: sp.genre,
      tone: sp.tone
    });
  };

  const onApprove = async () => {
    const ok = await sm.requestTransition("S2_TREATMENT");
    if (!ok) alert("Guard fails: ensure the synopsis has enough content (>= ~40 chars in mock).");
  };

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          label="Working title"
          value={sp.title}
          onChange={(e) => { vm.setScreenplay({ ...sp, title: e.target.value }); vm.markDirty("S1_SYNOPSIS", true); }}
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="Genre"
            value={sp.genre ?? ""}
            onChange={(e) => { vm.setScreenplay({ ...sp, genre: e.target.value }); vm.markDirty("S1_SYNOPSIS", true); }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Tone"
            value={sp.tone ?? ""}
            onChange={(e) => { vm.setScreenplay({ ...sp, tone: e.target.value }); vm.markDirty("S1_SYNOPSIS", true); }}
            sx={{ flex: 1 }}
          />
        </Stack>
        <TextField
          label="Logline"
          value={sp.logline ?? ""}
          onChange={(e) => { vm.setScreenplay({ ...sp, logline: e.target.value }); vm.markDirty("S1_SYNOPSIS", true); }}
          helperText="One-sentence promise of the story"
        />
        <TextField
          label="Idea (prompt to help AI)"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Optional: short description to guide the AI proposal"
        />
        <TextField
          label="Synopsis"
          value={sp.synopsis ?? ""}
          onChange={(e) => { vm.setScreenplay({ ...sp, synopsis: e.target.value }); vm.markDirty("S1_SYNOPSIS", true); }}
          multiline minRows={6}
        />

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onPropose}>Propose with AI</Button>
          <Button variant="contained" onClick={onSave} disabled={!vm.dirtyByState["S1_SYNOPSIS"]}>
            Save
          </Button>
          <Button color="secondary" onClick={onApprove}>Approve & Continue (→ S2)</Button>
        </Stack>
      </Stack>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>AI Proposal — Synopsis</DialogTitle>
        <DialogContent dividers>
          <Typography whiteSpace="pre-wrap">{proposal}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button variant="contained" onClick={applyProposal}>Apply to Synopsis</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
