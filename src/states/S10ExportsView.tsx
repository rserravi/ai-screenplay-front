// src/states/S10ExportsView.tsx
import { useMemo } from "react";
import { Box, Stack, Typography, Paper, Button, Chip, Divider } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CodeIcon from "@mui/icons-material/Code";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Scene } from "../models/scenes";
import { compileFountain, downloadFountain } from "../utils/fountain";
import { buildFdx, downloadFdx } from "../utils/fdx";
import { exportPdf } from "../utils/pdf";

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

export default function S10ExportsView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return null;

  const scenes = useMemo(() => (sp.scenes ?? []).slice().sort((a,b)=>a.order-b.order), [sp.scenes]);

  const counts = useMemo(() => ({
    scenes: scenes.length,
    drafted: scenes.filter(s => (s.formatted_text?.trim().length ?? 0) >= 40).length,
    keys: scenes.filter(s => s.is_key).length
  }), [scenes]);

  const exportFountain = () => {
    const content = compileFountain(sp, scenes);
    downloadFountain(sp.title || "screenplay", content);
  };

  const exportFdx = () => {
    const xml = buildFdx(sp, scenes);
    downloadFdx(sp.title || "screenplay", xml);
  };

  const exportPdfClick = () => exportPdf(sp, scenes);

  const exportBeatSheet = () => {
    const tps = sp.turning_points ?? [];
    const lines = [
      `# Beat Sheet — ${sp.title || "Untitled"}`,
      "",
      ...tps.sort((a,b)=>a.order-b.order).map(tp => `TP#${tp.order} — ${tp.type}\n${tp.summary}\n`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${sp.title || "screenplay"}-beats.md`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const exportCharacterBios = () => {
    const chars = sp.characters ?? [];
    const lines = [
      `# Character Bios — ${sp.title || "Untitled"}`,
      "",
      ...chars.map(c => `## ${c.name}\nRole: ${c.structural_role}\nMotivation: ${c.motivation ?? "-"}\nNeed: ${c.need ?? "-"}\nFlaw: ${c.flaw ?? "-"}\n`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${sp.title || "screenplay"}-characters.md`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Final exports. You can download a <strong>.fountain</strong>, a <strong>.fdx</strong> (Final Draft XML), and a <strong>.pdf</strong> with Hollywood layout.
        </Typography>

        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
            <Typography variant="subtitle1">Quality snapshot</Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={`Scenes: ${counts.scenes}`} />
              <Chip size="small" label={`Drafted: ${counts.drafted}`} />
              <Chip size="small" label={`Key: ${counts.keys}`} />
            </Stack>
          </Stack>
          <Divider />
          <Stack direction="row" spacing={1} p={2} flexWrap="wrap">
            <Button startIcon={<DownloadIcon />} variant="outlined" onClick={exportFountain}>Export Fountain</Button>
            <Button startIcon={<CodeIcon />} variant="outlined" onClick={exportFdx}>Export FDX</Button>
            <Button startIcon={<PictureAsPdfIcon />} variant="contained" onClick={exportPdfClick}>Export PDF</Button>
            <Button onClick={exportBeatSheet}>Beat Sheet (MD)</Button>
            <Button onClick={exportCharacterBios}>Character Bios (MD)</Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
