"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiEdit2, FiMapPin, FiTrash2 } from "react-icons/fi";
import type { OwnClinic } from "@/types/clinic";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One clinic row: identity, fee, the days it runs, and edit/delete actions. */
export function ClinicCard({
  clinic,
  onEdit,
  onDelete,
}: {
  clinic: OwnClinic;
  onEdit: (clinic: OwnClinic) => void;
  onDelete: (clinic: OwnClinic) => void;
}) {
  const days = [...new Set(clinic.availability.filter((s) => s.isActive).map((s) => s.dayOfWeek))]
    .sort((a, b) => a - b)
    .map((d) => DAY_ABBR[d]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {clinic.name}
              </Typography>
              {!clinic.isActive && <Chip label="Inactive" size="small" color="default" />}
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
              <FiMapPin size={14} />
              <Typography variant="body2">
                {[clinic.addressLine, clinic.city, clinic.state].filter(Boolean).join(", ")}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              In-clinic fee: ₹{clinic.offlineFee ?? 0}
              {clinic.phone ? ` · ${clinic.phone}` : ""}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
              {days.length ? (
                days.map((d) => <Chip key={d} label={d} size="small" variant="outlined" />)
              ) : (
                <Chip label="No hours set" size="small" color="warning" variant="outlined" />
              )}
            </Stack>
          </Stack>
          <Stack direction="row">
            <IconButton aria-label="Edit clinic" onClick={() => onEdit(clinic)}>
              <FiEdit2 size={18} />
            </IconButton>
            <IconButton aria-label="Delete clinic" color="error" onClick={() => onDelete(clinic)}>
              <FiTrash2 size={18} />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
