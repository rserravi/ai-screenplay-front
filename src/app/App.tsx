// src/app/App.tsx
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { MainLayout } from "../layouts/MainLayout";
import ScreenplayPage from "../pages/ScreenplayPage";
import { NotifySnackbar } from "../states/useNotify";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout>
        <ScreenplayPage />
      </MainLayout>
      <NotifySnackbar />
    </ThemeProvider>
  );
}
