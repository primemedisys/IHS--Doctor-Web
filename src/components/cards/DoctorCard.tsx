"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";
import { FiBriefcase, FiMapPin } from "react-icons/fi";
import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { RatingStat } from "@/components/ui/RatingStat";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ROUTES } from "@/constants/routes";
import { cardHover } from "@/theme/styles";
import { formatCurrency } from "@/utils/format";
import { formatPersonName } from "@/utils/display";
import type { Doctor } from "@/types/doctor";

/** Summary card for a doctor — used on Home and the Find Doctor listing. */
export function DoctorCard({ doctor, sx }: { doctor: Doctor; sx?: SxProps<Theme> }) {
  const profileHref = ROUTES.doctorProfile(doctor.slug);

  return (
    <Card
      sx={[
        { height: "100%", display: "flex", flexDirection: "column" },
        cardHover,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Stack direction="row" spacing={2}>
          <DoctorAvatar name={doctor.name} src={doctor.photoUrl} size={56} />
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                {formatPersonName(doctor.name) || doctor.name}
              </Typography>
              {doctor.verified && <VerifiedBadge compact />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {doctor.specialtyName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {doctor.qualifications.join(", ")}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={0.5}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "text.secondary" }}>
            <FiBriefcase size={14} />
            <Typography variant="body2" noWrap>
              {doctor.experienceYears} yrs · {doctor.hospital}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "text.secondary" }}>
            <FiMapPin size={14} />
            <Typography variant="body2" noWrap>
              {doctor.city}, {doctor.stateName}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
          {doctor.languages.slice(0, 3).map((lang) => (
            <Chip key={lang} size="small" label={lang} variant="outlined" />
          ))}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />
        <Divider />

        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <RatingStat value={doctor.rating} count={doctor.reviewsCount} />
          <Typography variant="subtitle2">
            {formatCurrency(doctor.consultationFee)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Chip
            size="small"
            label={doctor.available ? "Available" : "Unavailable"}
            color={doctor.available ? "success" : "default"}
            variant={doctor.available ? "filled" : "outlined"}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button component={Link} href={profileHref} variant="contained" size="small">
            View profile
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
