"use client";

import Box from "@mui/material/Box";
import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ minHeight: "70dvh", display: "grid", placeItems: "center", p: 3 }}>
      <ErrorState description={error.message || "An unexpected error occurred."} onRetry={reset} />
    </Box>
  );
}
