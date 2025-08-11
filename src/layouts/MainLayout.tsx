// src/layouts/MainLayout.tsx
import { AppBar, Toolbar, Typography, Box, Container, IconButton, LinearProgress } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import type { PropsWithChildren } from "react";

export function MainLayout({ children, loading = false }: PropsWithChildren<{ loading?: boolean }>) {
  return (
    <Box sx={{ display: "grid", minHeight: "100dvh", gridTemplateRows: "64px 1fr" }}>
      {loading && (
        <LinearProgress
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar + 1,
          }}
        />
      )}

      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <IconButton edge="start" aria-label="menu" size="small">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
            AI Screenplay
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Project: <strong>Untitled Screenplay</strong>
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 2 }}>{children}</Container>
    </Box>
  );
}
