import { create } from "zustand";
import { Snackbar, Alert } from "@mui/material";

interface NotifyState {
  message: string | null;
  notify: (msg: string) => void;
  clear: () => void;
}

const useNotifyStore = create<NotifyState>((set) => ({
  message: null,
  notify: (msg) => set({ message: msg }),
  clear: () => set({ message: null }),
}));

export function useNotify() {
  return useNotifyStore((s) => s.notify);
}

export function NotifySnackbar() {
  const message = useNotifyStore((s) => s.message);
  const clear = useNotifyStore((s) => s.clear);
  return (
    <Snackbar open={!!message} autoHideDuration={4000} onClose={clear}>
      <Alert onClose={clear} severity="error" variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
}
