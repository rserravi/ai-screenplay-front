// src/states/S9ReviewView.tsx
import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Alert,
  AlertTitle,
} from "@mui/material";
import { useNotify } from "./useNotify";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

import type { useAppViewModel } from "../vm/useAppViewModel";
import type { useStateMachine } from "../vm/useStateMachine";
import type { Scene } from "../models/scenes";
import type { Character } from "../models/characters";
import type { Subplot } from "../models/subplots";

import {
  updateScene,
  updateCharacter,
  updateSubplot,
} from "../services/screenplayService";
import {
  makeSlugline,
  compileFountain,
  downloadFountain,
} from "../utils/fountain";

// Reusos (asegúrate de exportarlos como 'export function ...' en sus archivos)
import { CharacterCard } from "../states/S4CharactersView"; // <-- exportado
import { SceneEditor } from "../states/S8FormattedDraftView"; // <-- exportado
import { SubplotCard } from "../states/S5SubplotsView"; // <-- exportado

type VM = ReturnType<typeof useAppViewModel>;
type SM = ReturnType<typeof useStateMachine>;

export default function S9ReviewView({ vm, sm }: { vm: VM; sm: SM }) {
  const sp = vm.screenplay;
  if (!sp) return <Typography variant="body2">Loading screenplay…</Typography>;
  const notify = useNotify();

  const scenes = useMemo(
    () => (sp.scenes ?? []).slice().sort((a, b) => a.order - b.order),
    [sp.scenes],
  );
  const characterNames = useMemo(
    () => (sp.characters ?? []).map((c) => c.name).filter(Boolean),
    [sp.characters],
  );
  const subplotTitles = useMemo(
    () => (sp.subplots ?? []).map((s) => s.title).filter(Boolean),
    [sp.subplots],
  );

  // Modals
  const [openCharacterId, setOpenCharacterId] = useState<number | null>(null);
  const [openSceneId, setOpenSceneId] = useState<number | null>(null);
  const [openSubplotId, setOpenSubplotId] = useState<number | null>(null);

  // Inline edit por escena (texto Fountain)
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [draftBuffer, setDraftBuffer] = useState<string>("");

  const startEdit = (sc: Scene) => {
    setEditingSceneId(sc.id);
    setDraftBuffer(sc.formatted_text ?? fallbackSceneText(sc));
  };
  const cancelEdit = () => {
    setEditingSceneId(null);
    setDraftBuffer("");
  };
  const saveEdit = async (sc: Scene) => {
    const saved = await updateScene(sp.id, {
      ...sc,
      formatted_text: draftBuffer,
    });
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? []).map((x) => (x.id === sc.id ? saved : x)),
    });
    vm.markDirty("S9_REVIEW" as any, true);
    setEditingSceneId(null);
  };

  const saveAll = async () => {
    await vm.saveScreenplay({ scenes: sp.scenes });
  };

  const compileAndDownload = () => {
    const fountain = compileFountain(sp, scenes);
    downloadFountain(sp.title || "screenplay", fountain);
  };

  const approve = async () => {
    // Aquí podrías añadir guard S9→S10 si defines un siguiente estado
    notify(
      "S9 Review listo. (Puedes definir un guard y estado S10 para cierre/export final)",
    );
  };

  const onClickName = useCallback(
    (name: string) => {
      const c = (sp.characters ?? []).find(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      );
      if (c) setOpenCharacterId(c.id);
    },
    [sp.characters],
  );

  const onClickSubplot = useCallback(
    (title: string) => {
      const s = (sp.subplots ?? []).find(
        (x) => x.title.toLowerCase() === title.toLowerCase(),
      );
      if (s) setOpenSubplotId(s.id);
    },
    [sp.subplots],
  );

  const openSceneMeta = (sceneId: number) => setOpenSceneId(sceneId);

  const jumpToTP = (tpOrder: number | null | undefined) => {
    if (!tpOrder) return;
    try {
      sessionStorage.setItem("ui.focus.tp", String(tpOrder));
    } catch {
      /* noop */
    }
    vm.setCurrentState("S6_KEY_SCENES" as any);
  };

  // ── Validador liviano ─────────────────────────────────────────
  const issues = useMemo(() => {
    const arr: {
      kind: string;
      label: string;
      sceneId?: number;
      tp?: number;
    }[] = [];
    const contiguous = scenes.every((s, i) => s.order === i + 1);
    if (!contiguous)
      arr.push({
        kind: "NUMBERING",
        label: "Scene numbering is not contiguous",
      });

    for (const s of scenes) {
      const metaBad =
        !s.heading ||
        !s.time_of_day ||
        !s.location ||
        (s.location?.trim().length ?? 0) < 3;
      if (metaBad)
        arr.push({
          kind: "META",
          label: `Missing meta in scene #${s.order}`,
          sceneId: s.id,
        });

      if ((s.synopsis?.trim().length ?? 0) < 30) {
        arr.push({
          kind: "SYNOPSIS",
          label: `Short synopsis in scene #${s.order}`,
          sceneId: s.id,
        });
      }
      if (s.is_key && (s.formatted_text?.trim().length ?? 0) < 60) {
        arr.push({
          kind: "KEY_DRAFT",
          label: `Key scene #${s.order} draft is thin`,
          sceneId: s.id,
          tp: s.linked_turning_point ?? undefined,
        });
      }
    }
    return arr;
  }, [scenes]);

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Full screenplay view. Click a <strong>scene header</strong> to edit
          its metadata; click a <strong>character name</strong> or{" "}
          <strong>subplot title</strong> to open its card. You can edit scene
          text inline; all changes sync with earlier steps.
        </Typography>

        {/* Validador */}
        {issues.length > 0 && (
          <Alert severity="warning" icon={<ReportProblemIcon />}>
            <AlertTitle>Quality checks</AlertTitle>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {issues.slice(0, 12).map((it, i) => (
                <Chip
                  key={i}
                  size="small"
                  color={it.kind === "KEY_DRAFT" ? "warning" : "default"}
                  label={it.label}
                  onClick={() => {
                    if (it.sceneId) setOpenSceneId(it.sceneId);
                    else if (it.tp) jumpToTP(it.tp);
                  }}
                  sx={{ mb: 0.5 }}
                />
              ))}
              {issues.length > 12 && (
                <Chip size="small" label={`+${issues.length - 12} more`} />
              )}
            </Stack>
          </Alert>
        )}

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={compileAndDownload}>
            Download (.fountain)
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAll}
            disabled={!vm.dirtyByState["S9_REVIEW" as any]}
          >
            Save
          </Button>
          <Button color="secondary" startIcon={<InfoIcon />} onClick={approve}>
            Finish Review
          </Button>
          <Chip size="small" label={`Scenes: ${scenes.length}`} />
        </Stack>

        {/* Documento completo */}
        <Paper variant="outlined">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            px={2}
            py={1}
          >
            <Typography variant="subtitle1">Document</Typography>
            <Typography variant="caption" color="text.secondary">
              Read & edit — synced with S6/S7/S8
            </Typography>
          </Stack>
          <Divider />

          <Box sx={{ p: 2 }}>
            <Stack spacing={3}>
              {scenes.map((sc) => (
                <SceneBlock
                  key={sc.id}
                  scene={sc}
                  characters={sp.characters ?? []}
                  subplots={sp.subplots ?? []}
                  onOpenSceneMeta={() => openSceneMeta(sc.id)}
                  onClickName={onClickName}
                  onClickSubplot={onClickSubplot}
                  onJumpToTP={() => jumpToTP(sc.linked_turning_point)}
                  isEditing={editingSceneId === sc.id}
                  draftBuffer={
                    editingSceneId === sc.id ? draftBuffer : undefined
                  }
                  onChangeDraft={(v) => setDraftBuffer(v)}
                  onStartEdit={() => startEdit(sc)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(sc)}
                />
              ))}
              {scenes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No scenes to show.
                </Typography>
              )}
            </Stack>
          </Box>
        </Paper>
      </Stack>

      {/* Character modal */}
      <Dialog
        open={openCharacterId != null}
        onClose={() => setOpenCharacterId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Character</DialogTitle>
        <DialogContent dividers>
          {openCharacterId != null && (
            <CharacterModalBody
              characterId={openCharacterId}
              vm={vm}
              onClose={() => setOpenCharacterId(null)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCharacterId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Scene modal (metadata + quick text) */}
      <Dialog
        open={openSceneId != null}
        onClose={() => setOpenSceneId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scene</DialogTitle>
        <DialogContent dividers>
          {openSceneId != null && (
            <SceneModalBody
              sceneId={openSceneId}
              vm={vm}
              onClose={() => setOpenSceneId(null)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSceneId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Subplot modal */}
      <Dialog
        open={openSubplotId != null}
        onClose={() => setOpenSubplotId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Subplot</DialogTitle>
        <DialogContent dividers>
          {openSubplotId != null && (
            <SubplotModalBody
              subplotId={openSubplotId}
              vm={vm}
              onClose={() => setOpenSubplotId(null)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubplotId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Scene block
 * ────────────────────────────────────────────────────────────────────────── */

function SceneBlock({
  scene,
  characters,
  subplots,
  onOpenSceneMeta,
  onClickName,
  onClickSubplot,
  onJumpToTP,
  isEditing,
  draftBuffer,
  onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  scene: Scene;
  characters: Character[];
  subplots: Subplot[];
  onOpenSceneMeta: () => void;
  onClickName: (name: string) => void;
  onClickSubplot: (title: string) => void;
  onJumpToTP: () => void;
  isEditing: boolean;
  draftBuffer?: string;
  onChangeDraft: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const slug = makeSlugline(scene.heading, scene.location, scene.time_of_day);
  const text =
    scene.formatted_text && scene.formatted_text.trim().length
      ? scene.formatted_text
      : fallbackSceneText(scene);

  const names = useMemo(
    () => characters.map((c) => c.name).filter(Boolean),
    [characters],
  );
  const subTitles = useMemo(
    () => subplots.map((s) => s.title).filter(Boolean),
    [subplots],
  );

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ cursor: "pointer" }}
        onClick={onOpenSceneMeta}
      >
        <Typography variant="subtitle2">#{scene.order}</Typography>
        <Typography variant="subtitle2" sx={{ textDecoration: "underline" }}>
          {slug}
        </Typography>
        {scene.is_key ? (
          <Chip
            size="small"
            color="warning"
            label={`TP#${scene.linked_turning_point ?? "-"}`}
            onClick={(e) => {
              e.stopPropagation();
              onJumpToTP();
            }}
          />
        ) : null}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          title="Edit text"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Body */}
      {!isEditing ? (
        <Box sx={{ mt: 1, px: 1 }}>
          <FountainReadOnly
            text={text}
            names={names}
            subplotTitles={subTitles}
            onClickName={onClickName}
            onClickSubplot={onClickSubplot}
          />
        </Box>
      ) : (
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <TextField
                value={draftBuffer}
                onChange={(e) => onChangeDraft(e.target.value)}
                fullWidth
                multiline
                minRows={8}
                placeholder={text}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={onSaveEdit}
                >
                  Save
                </Button>
                <Button startIcon={<CloseIcon />} onClick={onCancelEdit}>
                  Cancel
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Character modal body
 * ────────────────────────────────────────────────────────────────────────── */

function CharacterModalBody({
  characterId,
  vm,
  onClose,
}: {
  characterId: number;
  vm: ReturnType<typeof useAppViewModel>;
  onClose: () => void;
}) {
  const sp = vm.screenplay!;
  const c = (sp.characters ?? []).find((x) => x.id === characterId);
  if (!c)
    return (
      <Typography variant="body2" color="text.secondary">
        Character not found.
      </Typography>
    );

  const onChange = async (next: any) => {
    const saved = await updateCharacter(sp.id, next);
    vm.setScreenplay({
      ...sp,
      characters: (sp.characters ?? []).map((x) =>
        x.id === saved.id ? saved : x,
      ),
    });
    vm.markDirty("S9_REVIEW" as any, true);
  };

  return (
    <CharacterCard
      c={c}
      onChange={onChange}
      onDelete={() => {
        /* opcional */
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Subplot modal body (reusa SubplotCard)
 * ────────────────────────────────────────────────────────────────────────── */

function SubplotModalBody({
  subplotId,
  vm,
  onClose,
}: {
  subplotId: number;
  vm: ReturnType<typeof useAppViewModel>;
  onClose: () => void;
}) {
  const sp = vm.screenplay!;
  const s = (sp.subplots ?? []).find((x) => x.id === subplotId);
  if (!s)
    return (
      <Typography variant="body2" color="text.secondary">
        Subplot not found.
      </Typography>
    );

  const onChange = async (next: Subplot) => {
    const saved = await updateSubplot(sp.id, next);
    vm.setScreenplay({
      ...sp,
      subplots: (sp.subplots ?? []).map((x) => (x.id === saved.id ? saved : x)),
    });
    vm.markDirty("S9_REVIEW" as any, true);
  };

  return (
    <SubplotCard
      s={s}
      onChange={onChange}
      onRemove={() => {
        /* opcional eliminar aquí */
      }}
      characters={sp.characters ?? []}
      turningPointsCount={(sp.turning_points ?? []).length}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Scene modal body (reusa SceneEditor)
 * ────────────────────────────────────────────────────────────────────────── */

function SceneModalBody({
  sceneId,
  vm,
  onClose,
}: {
  sceneId: number;
  vm: ReturnType<typeof useAppViewModel>;
  onClose: () => void;
}) {
  const sp = vm.screenplay!;
  const sc = (sp.scenes ?? []).find((x) => x.id === sceneId);
  if (!sc)
    return (
      <Typography variant="body2" color="text.secondary">
        Scene not found.
      </Typography>
    );

  const onChange = async (next: Scene) => {
    const saved = await updateScene(sp.id, next);
    vm.setScreenplay({
      ...sp,
      scenes: (sp.scenes ?? []).map((x) => (x.id === saved.id ? saved : x)),
    });
    vm.markDirty("S9_REVIEW" as any, true);
  };

  return (
    <SceneEditor
      sc={sc}
      onChange={onChange}
      onPropose={() => {}}
      loading={false}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Read-only renderer con nombres y subplots clicables
 * ────────────────────────────────────────────────────────────────────────── */

function FountainReadOnly({
  text,
  names,
  subplotTitles,
  onClickName,
  onClickSubplot,
}: {
  text: string;
  names: string[];
  subplotTitles: string[];
  onClickName: (name: string) => void;
  onClickSubplot: (title: string) => void;
}) {
  if (!text) return null;

  // Prepara regex (escapar y ordenar por longitud)
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameList = names
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(esc)
    .filter(Boolean);
  const subplotList = subplotTitles
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(esc)
    .filter(Boolean);

  const re =
    nameList.length || subplotList.length
      ? new RegExp(
          `(?<!\\w)(${[...nameList, ...subplotList].join("|")})(?!\\w)`,
          "gi",
        )
      : null;

  const isName = (token: string) =>
    names.some((n) => n.toLowerCase() === token.toLowerCase());
  const isSubplot = (token: string) =>
    subplotTitles.some((t) => t.toLowerCase() === token.toLowerCase());

  const parts: (JSX.Element | string)[] = [];

  text.split("\n").forEach((line, i) => {
    if (!re) {
      parts.push(
        <Typography
          key={i}
          component="div"
          sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 14 }}
        >
          {line}
        </Typography>,
      );
      return;
    }
    const row: (JSX.Element | string)[] = [];
    let lastIndex = 0;
    line.replace(re, (match, _p1, offset) => {
      const before = line.slice(lastIndex, offset);
      if (before) row.push(before);
      const token = match as string;

      if (isName(token)) {
        row.push(
          <Chip
            key={`${i}:${offset}:name`}
            size="small"
            label={token}
            onClick={() => onClickName(token)}
            sx={{ mx: 0.25, cursor: "pointer" }}
          />,
        );
      } else if (isSubplot(token)) {
        row.push(
          <Chip
            key={`${i}:${offset}:subplot`}
            size="small"
            variant="outlined"
            color="secondary"
            label={token}
            onClick={() => onClickSubplot(token)}
            sx={{ mx: 0.25, cursor: "pointer" }}
          />,
        );
      } else {
        row.push(token);
      }

      lastIndex = offset + token.length;
      return match;
    });
    const tail = line.slice(lastIndex);
    if (tail) row.push(tail);
    parts.push(
      <Typography
        key={i}
        component="div"
        sx={{ fontFamily: "monospace", fontSize: 14 }}
      >
        {row.map((seg, k) => (
          <span key={k}>{seg}</span>
        ))}
      </Typography>,
    );
  });

  return <>{parts}</>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Fallback de texto para escenas sin formatted_text
 * ────────────────────────────────────────────────────────────────────────── */

function fallbackSceneText(s: Scene) {
  const slug = makeSlugline(s.heading, s.location, s.time_of_day);
  const lines = [
    slug,
    "",
    (s.synopsis ?? "").trim(),
    "",
    s.goal ? `> GOAL: ${s.goal}` : "",
    s.conflict ? `> CONFLICT: ${s.conflict}` : "",
    s.outcome ? `> OUTCOME: ${s.outcome}` : "",
    "",
  ].filter(Boolean);
  return lines.join("\n");
}
