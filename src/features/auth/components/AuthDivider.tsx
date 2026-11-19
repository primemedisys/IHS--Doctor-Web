import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

/** "or" separator between the Google button and the email form. */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <Divider>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </Typography>
    </Divider>
  );
}
