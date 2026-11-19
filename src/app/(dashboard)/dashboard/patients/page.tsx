import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MyPatientsTable } from "@/features/timeline";

/** My Patients — the doctor's roster (docs/treatment-timeline §5.4). */
export default function MyPatientsPage() {
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>My Patients</Typography>
        <Typography variant="body2" color="text.secondary">
          Everyone you&apos;ve consulted, most recently seen first.
        </Typography>
      </div>
      <MyPatientsTable />
    </Stack>
  );
}
