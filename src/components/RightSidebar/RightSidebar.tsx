// src/components/RightSidebar/RightSidebar.tsx
import { Box, Card, CardContent, CardHeader, Typography, Stack, Chip } from "@mui/material";
import type { useAppViewModel } from "../../vm/useAppViewModel";
import { useMemo } from "react";

type VM = ReturnType<typeof useAppViewModel>;

export function RightSidebar({ vm }: { vm: VM }) {
  const sp = vm.screenplay;

  const counts = useMemo(() => ({
    chars: sp?.characters?.length ?? 0,
    rels: sp?.relationships?.length ?? 0,
    subplots: sp?.subplots?.length ?? 0,
    keyScenes: (sp?.scenes ?? []).filter(s => s.is_key).length
  }), [sp]);

  return (
    <Box sx={{ position: "sticky", top: 88 }}>
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Project" />
          <CardContent>
            <Typography variant="body2"><strong>{sp?.title ?? "—"}</strong></Typography>
            <Typography variant="caption" color="text.secondary">
              {sp?.genre ?? "—"} · {sp?.tone ?? "—"}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip size="small" label={`Chars ${counts.chars}`} />
              <Chip size="small" label={`Rels ${counts.rels}`} />
              <Chip size="small" label={`Subplots ${counts.subplots}`} />
              <Chip size="small" label={`Key scenes ${counts.keyScenes}`} />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Character Graph" />
          <CardContent>
            <MiniGraph
              names={(sp?.characters ?? []).map(c => ({ id: c.id, label: c.name }))}
              rels={(sp?.relationships ?? []).map(r => ({ a: r.a_id, b: r.b_id, w: r.strength ?? 0.5 }))}
            />
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Subplots" />
          <CardContent>
            {(sp?.subplots ?? []).slice(0, 5).map(s => (
              <Typography key={s.id} variant="body2">• {s.title}</Typography>
            ))}
            {(sp?.subplots?.length ?? 0) === 0 && (
              <Typography variant="body2" color="text.secondary">No subplots yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

function MiniGraph({
  names, rels, size = 260
}: {
  names: { id: number; label: string }[];
  rels: { a: number; b: number; w: number }[];
  size?: number;
}) {
  if (names.length === 0) return <Typography variant="body2" color="text.secondary">No characters.</Typography>;
  const cx = size / 2, cy = size / 2, R = (size / 2) - 24;

  // posiciones en círculo
  const pos = new Map<number, { x: number; y: number }>();
  names.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / names.length - Math.PI / 2;
    pos.set(n.id, { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) });
  });

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size}>
        {/* edges */}
        {rels.map((e, i) => {
          const a = pos.get(e.a), b = pos.get(e.b);
          if (!a || !b) return null;
          const sw = 1 + 2 * (e.w ?? 0.5);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity="0.25" strokeWidth={sw} />;
        })}
        {/* nodes */}
        {names.map((n, i) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={12} fill="currentColor" fillOpacity="0.15" />
              <text x={p.x} y={p.y + 4} fontSize="10" textAnchor="middle">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
