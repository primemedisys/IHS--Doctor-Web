"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";
import { EmptyState } from "@/components/feedback";
import { formatCurrency, formatDate } from "@/utils/format";
import type { ApptStatus, DashAppointment } from "@/types/dashboard";

const statusColor: Record<ApptStatus, "primary" | "success" | "default"> = {
  upcoming: "primary",
  completed: "success",
  cancelled: "default",
};

export function AppointmentList({
  appointments,
  perspective,
}: {
  appointments: DashAppointment[];
  perspective: "patient" | "doctor";
}) {
  if (!appointments.length) {
    return <EmptyState icon="FiCalendar" title="No appointments" description="Appointments will appear here once booked." />;
  }
  return (
    <Stack spacing={1.5}>
      {appointments.map((a) => {
        const title = perspective === "patient" ? a.doctorName : a.patientName;
        const subtitle = perspective === "patient" ? a.doctorSpecialty : a.mode === "video" ? "Video consultation" : a.clinic;
        return (
          <Paper key={a.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  width: 44,
                  height: 44,
                  borderRadius: (t) => `${t.tokens.radius.md}px`,
                  bgcolor: "grey.100",
                  color: a.mode === "video" ? "primary.main" : "text.secondary",
                }}
              >
                {a.mode === "video" ? <FiVideo /> : <FiMapPin />}
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "text.secondary", mt: 0.25 }}>
                  <FiCalendar size={12} />
                  <Typography variant="caption">
                    {formatDate(a.date)} · {a.time}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Chip size="small" label={a.status} color={statusColor[a.status]} variant={a.status === "cancelled" ? "outlined" : "filled"} sx={{ textTransform: "capitalize", fontWeight: 600 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {formatCurrency(a.fee)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
