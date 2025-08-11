// src/app/App.tsx
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { MainLayout } from "../layouts/MainLayout";
import ScreenplayPage from "../pages/ScreenplayPage";
import { useAppViewModel } from "../vm/useAppViewModel";

export default function App() {
  const vm = useAppViewModel();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout loading={vm.loading}>
        <ScreenplayPage vm={vm} />
      </MainLayout>
    </ThemeProvider>
  );
}
