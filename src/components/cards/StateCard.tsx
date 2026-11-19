"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { cardHover } from "@/theme/styles";
import { formatCompactNumber } from "@/utils/format";
import type { StateInfo } from "@/types/doctor";

/** Clickable state tile for the healthcare map — links to a state-filtered search. */
export function StateCard({ state }: { state: StateInfo }) {
  const href = `${ROUTES.findDoctor}?${SEARCH_PARAMS.state}=${state.code}`;
  return (
    <Card sx={{ height: "100%", ...cardHover }}>
      <CardActionArea component={Link} href={href} sx={{ height: "100%", p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: (t) => `${t.tokens.radius.sm}px`,
                bgcolor: "grey.100",
                color: "text.primary",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {state.code}
            </Box>
            <FiChevronRight />
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {state.name}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Stat label="Doctors" value={formatCompactNumber(state.doctorsCount)} />
            <Stat label="Hospitals" value={formatCompactNumber(state.hospitalsCount)} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
