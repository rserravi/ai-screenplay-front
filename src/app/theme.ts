// src/app/theme.ts
import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    desync: Palette["primary"];
  }
  interface PaletteOptions {
    desync?: PaletteOptions["primary"];
  }
}

export const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "Apple Color Emoji",
      "Segoe UI Emoji"
    ].join(", ")
  },
  palette: {
    mode: "light",
    primary: { main: "#2B59C3" },
    secondary: { main: "#6B4EFF" },
    warning: { main: "#F59E0B" },
    desync: { main: "#A855F7" } // morado para “desync”
  },
  components: {
    MuiAppBar: { styleOverrides: { root: { boxShadow: "none", borderBottom: "1px solid #eee" } } },
    MuiToolbar: { styleOverrides: { root: { minHeight: 64 } } },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiBadge: {
      styleOverrides: {
        dot: { minWidth: 10, height: 10, borderRadius: 6 }
      }
    }
  }
});
