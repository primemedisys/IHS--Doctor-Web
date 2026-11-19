"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { DoctorCard } from "@/components/cards";
import { EmptyState } from "@/components/feedback";
import { PageContainer } from "@/components/common";
import { Pagination } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useDoctorFilters, useDoctors } from "@/features/doctors/hooks";
import { DoctorFiltersPanel } from "./DoctorFiltersPanel";

export function DoctorDiscovery() {
  const { filters, update, setPage, reset, hasActiveFilters } = useDoctorFilters();
  const { data, isLoading, isError } = useDoctors(filters);

  return (
    <PageContainer
      title="Find a Doctor"
      subtitle="Search verified specialists by symptom, specialty, language and location."
      actions={
        <Button component={Link} href={ROUTES.healthcareMap} variant="outlined">
          Browse map
        </Button>
      }
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <DoctorFiltersPanel filters={filters} onChange={update} onReset={reset} hasActiveFilters={hasActiveFilters} />
        </Grid>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Stack spacing={2.5}>
            {isError && <Alert severity="error">Doctor discovery is temporarily unavailable.</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isLoading ? "Loading doctors..." : `${data?.total ?? 0} doctors found`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No booking or payment in MVP. Contact details are shown on profiles.
              </Typography>
            </Stack>

            {!isLoading && data?.data.length === 0 && (
              <EmptyState
                icon="FiSearch"
                title="No doctors match these filters"
                description="Try widening the location, specialty, fee or availability filters."
                action={<Button onClick={reset}>Clear filters</Button>}
              />
            )}

            <Grid container spacing={3}>
              {(data?.data ?? []).map((doctor) => (
                <Grid key={doctor.id} size={{ xs: 12, md: 6, xl: 4 }}>
                  <DoctorCard doctor={doctor} />
                </Grid>
              ))}
            </Grid>

            {isLoading && (
              <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <Typography color="text.secondary">Loading verified specialists...</Typography>
              </Box>
            )}

            {data && data.totalPages > 1 && (
              <Pagination page={data.page} count={data.totalPages} onChange={setPage} />
            )}
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
