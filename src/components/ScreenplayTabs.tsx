// src/components/ScreenplayTabs.tsx
import { Tabs, Tab, Badge, Box, Tooltip } from "@mui/material";
import { STATES, type StateId } from "../models/enums";

const INDEX: Record<StateId, number> = STATES.reduce((acc, s, i) => {
    acc[s] = i; return acc;
}, {} as Record<StateId, number>);

type Props = {
    current: StateId;
    onChange: (s: StateId) => void;
    dirtyByState?: Partial<Record<StateId, boolean>>;
    desyncByState?: Partial<Record<StateId, boolean>>;
    canEnter?: (s: StateId) => boolean;
};

export function ScreenplayTabs({
    current,
    onChange,
    dirtyByState = {},
    desyncByState = {},
    canEnter = () => true
}: Props) {
    const currentIndex = STATES.includes(current) ? INDEX[current] : 0;

    const handleChange = (_: unknown, valueIndex: number) => {
        const next = STATES[valueIndex];
        if (!next) return;
        if (!canEnter(next)) return;
        onChange(next);
    };

    return (
        <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            <Tabs
                value={currentIndex}
                onChange={handleChange}
                variant="scrollable"
                allowScrollButtonsMobile
            >
                {STATES.map((s, i) => {
                    const dirty = !!dirtyByState[s];
                    const desync = !!desyncByState[s];

                    // Importante: no deshabilitar el tab actualmente seleccionado
                    const disabled = i !== currentIndex && !canEnter(s);

                    const color = dirty ? "warning" : desync ? "secondary" : ("default" as any);
                    const label = (
                        <Badge color={color} variant={dirty || desync ? "dot" : "standard"} overlap="circular">
                            <span>{s.replace("_", " ")}</span>
                        </Badge>
                    );

                    return (
                        <Tooltip
                            key={s}
                            title={
                                disabled
                                    ? "Locked by previous state guards"
                                    : dirty
                                        ? "Unsaved changes"
                                        : desync
                                            ? "Out-of-date due to upstream edits"
                                            : ""
                            }
                        >
                            <Tab value={i} label={label} disabled={disabled} />
                        </Tooltip>
                    );
                })}
            </Tabs>
        </Box>
    );
}
