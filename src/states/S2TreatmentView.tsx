// src/states/S2TreatmentView.tsx
import { useMemo, useState } from "react";
import { Box, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip } from "@mui/material";
import WorkflowActions from "../components/WorkflowActions";

import { useNotify } from "./useNotify";
import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import { useAiJobs } from "../vm/useAiJobs";
import type { TreatmentSectionId } from "../services/aiJobsService";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

function wc(s?: string) {
  return s?.trim() ? s!.trim().split(/\s+/).length : 0;
}

export default function S2TreatmentView({ vm, sm }: { vm: VM; sm: SM }) {
  const ai = useAiJobs();
  const [sectionPreview, setSectionPreview] = useState<{
    section: TreatmentSectionId;
    text: string;
  } | null>(null);
  const [pointers, setPointers] = useState<string>(
    "Protagonist flaw\nCall to adventure\nRefusal\nMentor\nCrossing the threshold",
  );
  const notify = useNotify();

  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;

  const t = sp.treatment ?? { act1: "", act2: "", act3: "" };
  const counts = useMemo(
    () => ({ act1: wc(t.act1), act2: wc(t.act2), act3: wc(t.act3) }),
    [t.act1, t.act2, t.act3],
  );

  const setAct = (k: TreatmentSectionId, v: string) => {
    vm.setScreenplay({ ...sp, treatment: { ...(sp.treatment ?? {}), [k]: v } });
    vm.markDirty("S2_TREATMENT", true);
  };

  const propose = async (section: TreatmentSectionId) => {
    const payload = {
      pointers: pointers
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      currentText: (sp.treatment as any)?.[section] ?? "",
      constraints: [
        sp.genre ? `Genre: ${sp.genre}` : "",
        sp.tone ? `Tone: ${sp.tone}` : "",
      ].filter(Boolean),
    };
    const res = await ai.proposeTreatmentSection(sp.id, section, payload);
    setSectionPreview({ section: res.section, text: res.proposal });
  };

  const applyPreview = async () => {
    if (!sectionPreview) return;
    setAct(sectionPreview.section, sectionPreview.text);
    setSectionPreview(null);
  };

  const save = async () => {
    await vm.saveScreenplay({ treatment: sp.treatment });
  };

  const approve = async () => {
    const ok = await sm.requestTransition("S3_TURNING_POINTS");
    if (!ok)
      notify(
        "Guard fails: need minimum length per act (mock: A1≥60, A2≥80, A3≥60 words).",
      );
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Treatment is a 3–6 pages prose telling the whole story. Draft per act
          and ask AI for a section proposal.
        </Typography>

        <TextField
          label="Pointers (one per line to guide AI)"
          value={pointers}
          onChange={(e) => setPointers(e.target.value)}
          multiline
          minRows={3}
        />

        <SectionEditor
          title="ACT I (Setup)"
          value={t.act1 ?? ""}
          onChange={(v) => setAct("act1", v)}
          words={counts.act1}
          loading={ai.loading}
          onPropose={() => propose("act1")}
        />
        <SectionEditor
          title="ACT II (Confrontation)"
          value={t.act2 ?? ""}
          onChange={(v) => setAct("act2", v)}
          words={counts.act2}
          loading={ai.loading}
          onPropose={() => propose("act2")}
        />
        <SectionEditor
          title="ACT III (Resolution)"
          value={t.act3 ?? ""}
          onChange={(v) => setAct("act3", v)}
          words={counts.act3}
          loading={ai.loading}
          onPropose={() => propose("act3")}
        />

        <WorkflowActions
          onSave={save}
          onApprove={approve}
          saveDisabled={!vm.dirtyByState["S2_TREATMENT"]}
        >
          <Chip label={`A1: ${counts.act1}w  A2: ${counts.act2}w  A3: ${counts.act3}w`} size="small" />
        </WorkflowActions>

      </Stack>

      <Dialog
        open={!!sectionPreview}
        onClose={() => setSectionPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Proposal — Treatment</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary">
            Section: {sectionPreview?.section.toUpperCase()}
          </Typography>
          <Typography whiteSpace="pre-wrap" mt={1}>
            {sectionPreview?.text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionPreview(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={applyPreview}
            disabled={ai.loading}
          >
            Apply to Section
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SectionEditor({
  title,
  value,
  onChange,
  onPropose,
  loading,
  words,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onPropose: () => void;
  loading: boolean;
  words: number;
}) {
  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1">{title}</Typography>
        <Chip size="small" label={`${words} words`} />
        <Box flex={1} />
        <Button variant="outlined" onClick={onPropose} disabled={loading}>
          Propose with AI
        </Button>
      </Stack>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        minRows={8}
        placeholder="Write your Act here…"
      />
    </Stack>
  );
}
