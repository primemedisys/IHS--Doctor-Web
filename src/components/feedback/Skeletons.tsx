import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/** Skeleton matching the DoctorCard layout, shown while listings load. */
export function DoctorCardSkeleton() {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2}>
          <Skeleton variant="circular" width={56} height={56} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="70%" height={26} />
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Stack>
        <Skeleton variant="text" sx={{ mt: 2 }} />
        <Skeleton variant="text" width="80%" />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Skeleton variant="rounded" width={56} height={24} />
          <Skeleton variant="rounded" width={56} height={24} />
        </Stack>
        <Skeleton variant="rounded" height={40} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}

/** A responsive grid of DoctorCardSkeletons. */
export function DoctorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
          <DoctorCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}
