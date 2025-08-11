// src/vm/useStateMachine.ts
import { STATES, type StateId } from "../models/enums";
import type { Screenplay } from "../models/screenplay";
import * as screenplayService from "../services/screenplayService";

export function useStateMachine(opts: {
  screenplay: Screenplay | null;
  currentState: StateId;                 // <-- NUEVO
  setCurrentState: (s: StateId) => void;
}) {
  const { screenplay, currentState, setCurrentState } = opts;

  function canEnter(target: StateId): boolean {
    // baseline: lo que el usuario ve en Tabs; si no hay, cae al backend/mock; si tampoco, S1
    const baseline = currentState ?? (screenplay?.current_state as StateId) ?? "S1_SYNOPSIS";
    const curIdx = STATES.indexOf(baseline);
    const tgtIdx = STATES.indexOf(target);
    if (curIdx === -1 || tgtIdx === -1) return false;

    // permite: actual, anteriores y la inmediata siguiente
    return tgtIdx <= curIdx + 1;
  }

  async function requestTransition(target: StateId) {
    if (!screenplay) return false;
    const ok = await screenplayService.requestState(screenplay.id, target);
    if (ok) setCurrentState(target);
    return ok;
  }

  return { canEnter, requestTransition };
}
