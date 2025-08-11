// src/app/App.tsx
import { ThemeProvider, CssBaseline } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import { theme } from "./theme";
import { MainLayout } from "../layouts/MainLayout";
import ScreenplayPage from "../pages/ScreenplayPage";
import { useAppViewModel } from "../vm/useAppViewModel";
import { NotifySnackbar } from "../states/useNotify";


export default function App() {
  const vm = useAppViewModel();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <MainLayout>
        <Routes>
          <Route path="/screenplays/:id" element={<ScreenplayPage />} />
          <Route path="*" element={<Navigate to="/screenplays/1" replace />} />
        </Routes>
      </MainLayout>
      <NotifySnackbar />
    </ThemeProvider>
  );
}
