"use client";

import Box from "@mui/material/Box";
import Slide from "@mui/material/Slide";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiWifiOff } from "react-icons/fi";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * A persistent bar while the device has no network.
 *
 * A toast is the wrong shape for this: toasts expire, and being offline does
 * not. The bar stays until connectivity returns, so a failed action has a
 * visible explanation on screen when the user looks up from it.
 *
 * Pinned to the BOTTOM, clear of the app bar and any dialog title, and
 * `pointerEvents: none` so it can never intercept a tap on whatever is beneath.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  return (
    <Slide direction="up" in={!online} mountOnEnter unmountOnExit>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.snackbar + 1,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
          p: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          sx={(t) => ({
            alignItems: "center",
            px: 2,
            py: 1.25,
            borderRadius: `${t.tokens.radius.pill}px`,
            bgcolor: t.palette.grey[900],
            color: "#fff",
            boxShadow: t.shadows[6],
            maxWidth: "calc(100% - 24px)",
          })}
        >
          <FiWifiOff size={16} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            You&apos;re offline — we&apos;ll reconnect automatically.
          </Typography>
        </Stack>
      </Box>
    </Slide>
  );
}
