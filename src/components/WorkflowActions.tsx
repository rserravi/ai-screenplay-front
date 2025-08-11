import { ReactNode } from "react";
import { Stack, Button } from "@mui/material";

interface WorkflowActionsProps {
  onSave: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  saveDisabled?: boolean;
  children?: ReactNode;
}

export default function WorkflowActions({ onSave, onApprove, saveDisabled, children }: WorkflowActionsProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button variant="contained" onClick={onSave} disabled={saveDisabled}>Save</Button>
      <Button variant="contained" color="secondary" onClick={onApprove}>Approve & Continue</Button>
      {children}
    </Stack>
  );
}

