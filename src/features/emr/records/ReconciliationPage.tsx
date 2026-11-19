"use client";

/**
 * Reconciliation — the backend has NO reconciliation model, table or API
 * (verified: no model, migration, route or controller). So this page shows no
 * records and offers no create/review actions; it states that plainly rather
 * than inventing reconciliation status. Wire it to the real API once one exists.
 */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RecordsFrame, Section, Muted } from "./RecordsKit";

const NAVY = "#10254D";

export function ReconciliationPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="reconciliation" compact>
      {() => (
        <Section title="Medication Reconciliation" hint="Reviewed, continued, discontinued and newly identified medicines">
          <Box sx={{ textAlign: "center", py: 4, px: 1, maxWidth: 560, mx: "auto" }}>
            <Typography sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>No reconciliation records</Typography>
            <Muted>
              Medication reconciliation is not recorded by the system yet, so there is nothing to show for this patient. No medicine is
              marked reconciled automatically. Prescriptions remain available under Medicine Timeline and Treatment Summary.
            </Muted>
          </Box>
        </Section>
      )}
    </RecordsFrame>
  );
}
