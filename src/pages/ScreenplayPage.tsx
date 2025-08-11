// src/pages/ScreenplayPage.tsx
import { useEffect, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";

import { ScreenplayTabs } from "../components/ScreenplayTabs";
import { RightSidebar } from "../components/RightSidebar/RightSidebar";

import S1SynopsisView from "../states/S1SynopsisView";
import S2TreatmentView from "../states/S2TreatmentView";
import S3TurningPointsView from "../states/S3TurningPointsView";
import S4CharactersView from "../states/S4CharactersView";
import S5SubplotsView from "../states/S5SubplotsView";
import S6KeyScenesView from "../states/S6KeyScenesView";
import S7AllScenesView from "../states/S7AllScenesView";
import S8FormattedDraftView from "../states/S8FormattedDraftView";
import S9ReviewView from "../states/S9ReviewView";
import S10ExportsView from "../states/S10ExportsView";


import { useAppViewModel } from "../vm/useAppViewModel";
import { useStateMachine } from "../vm/useStateMachine";
import type { StateId } from "../models/enums";

const SIDEBAR_WIDTH = 360; // ancho fijo y consistente
const APPBAR_OFFSET = 88;  // pegajoso (ajusta si tu AppBar cambia)

export default function ScreenplayPage() {
  const vm = useAppViewModel();

  const sm = useStateMachine({
    screenplay: vm.screenplay,
    currentState: vm.currentState,
    setCurrentState: vm.setCurrentState
  });

  useEffect(() => {
    vm.loadScreenplay(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Editor = useMemo(() => {
    switch (vm.currentState as StateId) {
      case "S1_SYNOPSIS":       return <S1SynopsisView vm={vm} sm={sm} />;
      case "S2_TREATMENT":      return <S2TreatmentView vm={vm} sm={sm} />;
      case "S3_TURNING_POINTS": return <S3TurningPointsView vm={vm} sm={sm} />;
      case "S4_CHARACTERS":     return <S4CharactersView vm={vm} sm={sm} />;
      case "S5_SUBPLOTS":       return <S5SubplotsView vm={vm} sm={sm} />;
      case "S6_KEY_SCENES":     return <S6KeyScenesView vm={vm} sm={sm} />;
      case "S7_ALL_SCENES":     return <S7AllScenesView vm={vm} sm={sm} />;
      case "S8_FORMATTED_DRAFT":return <S8FormattedDraftView vm={vm} sm={sm} />;
      case "S9_REVIEW":         return <S9ReviewView vm={vm} sm={sm} />;
      case "S10_EXPORTS":       return <S10ExportsView vm={vm} sm={sm} />;
      default:                  return <S1SynopsisView vm={vm} sm={sm} />;
    }
  }, [vm.currentState, vm, sm]);

  // Evita warning de Tabs cuando aún no hay screenplay
  const currentForTabs = (vm.screenplay ? vm.currentState : "S1_SYNOPSIS") as StateId;

  return (
    <Box>
      <ScreenplayTabs
        current={currentForTabs}
        onChange={vm.setCurrentState}
        dirtyByState={vm.dirtyByState}
        desyncByState={vm.desyncByState}
        canEnter={sm.canEnter}
      />

      {/* Layout consistente con CSS Grid */}
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",                                // móvil: sidebar abajo
            md: `minmax(0, 1fr) ${SIDEBAR_WIDTH}px`, // desktop: 2 columnas
          },
          alignItems: "start",
          gap: 3,
        }}
      >
        {/* Columna izquierda (contenido principal) */}
        <Box sx={{ minWidth: 0 /* evita overflow por contenido amplio */ }}>
          {vm.loading && !vm.screenplay ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}>
              <CircularProgress />
            </Box>
          ) : (
            Editor
          )}
        </Box>

        {/* Sidebar derecha fija */}
        <Box
          sx={{
            display: { xs: "none", md: "block" }, // oculta en móvil (aparece debajo por responsivo)
            position: "sticky",
            top: APPBAR_OFFSET,
            width: SIDEBAR_WIDTH,
            height: "fit-content",
          }}
        >
          <RightSidebar vm={vm} />
        </Box>
      </Box>

      {/* Sidebar en móvil: se muestra debajo cuando xs (opcional) */}
      <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
        <RightSidebar vm={vm} />
      </Box>
    </Box>
  );
}
