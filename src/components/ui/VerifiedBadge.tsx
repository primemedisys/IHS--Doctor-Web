"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { FiCheckCircle } from "react-icons/fi";

/** Trust marker for verified doctors. `compact` renders an icon-only variant. */
export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Tooltip title="Verified doctor">
        <Box component="span" sx={{ display: "inline-flex", color: "secondary.main" }} aria-label="Verified">
          <FiCheckCircle />
        </Box>
      </Tooltip>
    );
  }
  return (
    <Chip
      size="small"
      color="secondary"
      variant="outlined"
      icon={<FiCheckCircle />}
      label="Verified"
      sx={{ fontWeight: 600 }}
    />
  );
}
