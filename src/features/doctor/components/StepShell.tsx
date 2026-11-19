"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import type { ReactNode } from "react";
import { FiCheckCircle } from "react-icons/fi";

/**
 * A titled card wrapper for one onboarding/editor step. Shows a "Complete" chip
 * when the step's completeness flag is true.
 */
export function StepShell({
  title,
  description,
  complete,
  children,
}: {
  title: string;
  description?: string;
  complete?: boolean;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        subheader={description}
        action={
          complete ? (
            <Chip icon={<FiCheckCircle />} color="success" size="small" label="Complete" variant="outlined" />
          ) : undefined
        }
      />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
