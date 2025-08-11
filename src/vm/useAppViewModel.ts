// src/vm/useAppViewModel.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Screenplay } from "../models/screenplay";
import type { StateId } from "../models/enums";
import { STATES } from "../models/enums";
import * as screenplayService from "../services/screenplayService";

type DirtyMap = Record<StateId, boolean>;
type DesyncMap = Record<StateId, boolean>;

const emptyMap = Object.fromEntries(STATES.map((s) => [s, false])) as Record<StateId, boolean>;

export function useAppViewModel() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const [screenplay, _setScreenplay] = useState<Screenplay | null>(null);
  const [currentState, setCurrentState] = useState<StateId>("S1_SYNOPSIS");
  const [dirtyByState, setDirty] = useState<DirtyMap>({ ...emptyMap });
  const [desyncByState, setDesync] = useState<DesyncMap>({ ...emptyMap });
  const [loading, setLoading] = useState(false);

  const setScreenplay = useCallback((next: Screenplay | null) => {
    if (!mounted.current) return;
    _setScreenplay(next);
  }, []);

  const loadScreenplay = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const sp = await screenplayService.get(id);
      if (!mounted.current) return;
      setScreenplay(sp);
      setCurrentState(((sp.current_state as StateId) ?? "S1_SYNOPSIS"));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [setScreenplay]);

  const saveScreenplay = useCallback(async (patch: Partial<Screenplay>) => {
    if (!screenplay) return null;
    setLoading(true);
    try {
      const updated = await screenplayService.update(screenplay.id, patch);
      if (!mounted.current) return null;
      setScreenplay(updated);
      setDirty((m) => ({ ...m, [currentState]: false }));
      return updated;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [screenplay, currentState, setScreenplay]);

  const markDirty = useCallback((s: StateId, value = true) => {
    setDirty((m) => ({ ...m, [s]: value }));
  }, []);

  const markDesyncedFrom = useCallback((from: StateId) => {
    const idx = STATES.indexOf(from);
    setDesync((prev) => {
      const next = { ...prev };
      STATES.slice(idx + 1).forEach((s) => (next[s] = true));
      return next;
    });
  }, []);

  const clearDesync = useCallback((s: StateId) => {
    setDesync((m) => ({ ...m, [s]: false }));
  }, []);

  return {
    // estado
    screenplay, setScreenplay,
    currentState, setCurrentState,
    loading,
    dirtyByState, markDirty,
    desyncByState, markDesyncedFrom, clearDesync,
    // io
    loadScreenplay, saveScreenplay
  };
}

export type AppViewModel = ReturnType<typeof useAppViewModel>;
