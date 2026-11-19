"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { FiArrowLeft, FiEye } from "react-icons/fi";
import { EmptyState, Loading } from "@/components/feedback";
import { queryKeys } from "@/constants/queryKeys";
import { DoctorProfileView, type PortfolioSectionKey } from "@/features/doctors";
import { usePortfolioPreview } from "../hooks";
import { PortfolioEditor } from "./PortfolioEditor";
import { PortfolioSectionEditDialog } from "./PortfolioSectionEditDialog";

/**
 * The doctor's own portfolio page (dashboard → portfolio). It renders EXACTLY as
 * patients see the public `/doctors/[slug]` page (same `DoctorProfileView`, fed by
 * `GET /doctor/preview`). Every section carries an inline edit pencil that opens
 * the matching editor in a modal right on the template — no navigation away.
 * A "Full editor" fallback (documents, verification, sparse/empty sections) is
 * still one click away.
 */
export function PortfolioPreview() {
  const [editing, setEditing] = useState(false);
  const [editSection, setEditSection] = useState<PortfolioSectionKey | null>(null);
  const queryClient = useQueryClient();
  const { data: doctor, isLoading } = usePortfolioPreview();

  // Full editor (same page, toggled view) — used for documents & anything not
  // reachable from an on-template pencil.
  if (editing) {
    const backToPreview = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.preview() });
      setEditing(false);
    };
    return (
      <Stack spacing={3}>
        <Box>
          <Button startIcon={<FiEye />} variant="contained" onClick={backToPreview}>
            Back to preview
          </Button>
        </Box>
        <PortfolioEditor />
      </Stack>
    );
  }

  if (isLoading) return <Loading label="Loading your public profile…" />;
  if (!doctor) {
    return (
      <EmptyState
        icon="FiUserX"
        title="Nothing to preview yet"
        description="Fill in your professional details and portfolio to see how your profile will look."
        action={
          <Button startIcon={<FiArrowLeft />} variant="contained" onClick={() => setEditing(true)}>
            Start editing
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DoctorProfileView
        doctor={doctor}
        preview
        onEdit={() => setEditing(true)}
        onEditSection={setEditSection}
      />
      <PortfolioSectionEditDialog section={editSection} onClose={() => setEditSection(null)} />
    </>
  );
}
