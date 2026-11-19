"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { FiFileText, FiSettings } from "react-icons/fi";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import type { PrescriptionStatus } from "@/types/prescription";
import { usePrescriptions } from "../hooks";
import { fmtDate } from "./rx-format";

type Filter = "all" | PrescriptionStatus;

/** Everything the doctor has written, newest first. */
export function PrescriptionHistory() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, refetch } = usePrescriptions(
    filter === "all" ? {} : { status: filter },
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Prescriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Written from your appointments. Finalized ones are locked.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FiSettings />} onClick={() => router.push(ROUTES.dashboard.prescriptionTemplates)}>
          Letterheads
        </Button>
      </Stack>

      <Tabs value={filter} onChange={(_e, v) => setFilter(v as Filter)}>
        <Tab value="all" label="All" />
        <Tab value="draft" label="Drafts" />
        <Tab value="finalized" label="Signed" />
      </Tabs>

      {isLoading ? (
        <Loading label="Loading prescriptions…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon="FiFileText"
          title="No prescriptions yet"
          description="Open a confirmed appointment and choose “Write prescription”."
        />
      ) : (
        <Stack spacing={1.5}>
          {data.map((rx) => (
            <Card key={rx.id} variant="outlined">
              <CardContent
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", cursor: "pointer" }}
                onClick={() => router.push(ROUTES.dashboard.prescription(rx.id))}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
                  <FiFileText />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {rx.patient.name ?? "—"}
                      {rx.rxNumber && (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {" "}
                          · {rx.rxNumber}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {rx.diagnosis || "No diagnosis recorded"}
                      {rx.clinic ? ` · ${rx.clinic.name}` : ""}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  {rx.version > 1 && <Chip size="small" variant="outlined" label={`v${rx.version}`} />}
                  {rx.supersededById ? (
                    <Chip size="small" variant="outlined" label="Superseded" />
                  ) : (
                    <Chip
                      size="small"
                      color={rx.status === "finalized" ? "success" : "warning"}
                      label={rx.status === "finalized" ? "Signed" : "Draft"}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(rx.finalizedAt ?? rx.createdAt)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
