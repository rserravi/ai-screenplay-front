// src/layouts/MainLayout.tsx
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { PropsWithChildren, useState } from "react";

export function MainLayout({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ display: "grid", minHeight: "100dvh", gridTemplateRows: "64px 1fr" }}>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <List>
          {[
            "Home",
            "Settings",
            "Help",
          ].map((text) => (
            <ListItemButton key={text} onClick={() => setOpen(false)}>
              <ListItemText primary={text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <IconButton
            edge="start"
            aria-label="menu"
            size="small"
            onClick={() => setOpen(true)}
          >
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
