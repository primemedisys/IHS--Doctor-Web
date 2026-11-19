"use client";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SidebarJson } from "@/types/prescription";

export interface AdviceChecklistProps {
  sidebar: SidebarJson;
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * The advice/investigation menu from the letterhead. The WHOLE list prints on
 * every prescription — ticking an item marks it, exactly like circling it on
 * the paper pad. So this is a checklist over the template's items, not a
 * free-form editor.
 */
export function AdviceChecklist({ sidebar, selected, onChange, disabled }: AdviceChecklistProps) {
  const picked = new Set(selected);

  const toggle = (item: string) => {
    const next = new Set(picked);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    onChange([...next]);
  };

  const groups = sidebar.groups.filter((g) => g.items.length > 0);

  if (!groups.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Your letterhead has no advice list yet. Add one under <b>Advice sidebar</b> in the letterhead editor.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {groups.map((g, gi) => (
        <Box key={gi}>
          {g.title && (
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {g.title}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {g.items.map((item) => (
              <FormControlLabel
                key={item}
                sx={{ my: -0.5 }}
                control={
                  <Checkbox size="small" disabled={disabled} checked={picked.has(item)} onChange={() => toggle(item)} />
                }
                label={<Typography variant="body2">{item}</Typography>}
              />
            ))}
          </Box>
        </Box>
      ))}
      {selected.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {selected.length} marked
        </Typography>
      )}
    </Stack>
  );
}
