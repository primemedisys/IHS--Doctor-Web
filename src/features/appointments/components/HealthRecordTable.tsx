"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { FiPlus } from "react-icons/fi";
import type { VitalsMatrix } from "@/types/appointment";
import { VITAL_LEGEND, VITAL_STATUS_STYLE, VitalValueCell } from "../vitalStatus";

/** "2026-07-14" → "14 Jul '26". */
function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ (\d\d)$/, " '$1");
}

/** Short Location label — the place name (first comma-segment); full text shows on hover. */
function locationShort(loc: string): string {
  const first = loc.split(",")[0]?.trim();
  return first || loc;
}

/**
 * Twin of the patient app's record table: one ROW per reading, one COLUMN per
 * parameter (Date · Location · then the vital fields in `matrix.fields` order).
 * Readings run NEWEST → oldest top-to-bottom (latest in row one); the box
 * scrolls vertically inside itself so the page never grows unbounded. When
 * `onAddReading` is passed the doctor can append their own reading (tagged
 * "clinic") right here. Header row is sticky; the Date column is sticky-left.
 */
export function HealthRecordTable({
  matrix,
  onAddReading,
  /**
   * Show the colour legend under the table. Default true.
   *
   * False when the table is repeated once per date on the patient record: the
   * legend explains the colours ONCE, and reprinting it under every one of a
   * year's worth of date blocks is pure noise.
   */
  showLegend = true,
  /**
   * Show the Date column. Default true.
   *
   * False when the table is rendered inside a single date's block on the
   * patient record: the block header already states the date, so the column
   * repeats it on every row and spends the widest sticky column in the table
   * saying nothing new.
   */
  showDate = true,
}: {
  matrix: VitalsMatrix;
  onAddReading?: () => void;
  showLegend?: boolean;
  showDate?: boolean;
}) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const { fields, entries } = matrix;

  if (entries.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: onAddReading ? 1.5 : 0 }}>
          No vitals recorded yet.
        </Typography>
        {onAddReading && (
          <Button variant="outlined" startIcon={<FiPlus />} onClick={onAddReading}>
            Add reading
          </Button>
        )}
      </Box>
    );
  }

  const headCell = { fontWeight: 700, bgcolor: "background.paper", textAlign: "center" as const };
  const stickyDateHead = { ...headCell, position: "sticky" as const, top: 0, left: 0, zIndex: 4 };
  const stickyDateCell = {
    position: "sticky" as const,
    left: 0,
    zIndex: 1,
    bgcolor: "background.paper",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  };

  // The API already returns readings NEWEST-FIRST, which is the order we
  // render: the most recent reading is the one a doctor or patient looks for,
  // so it sits in row one and needs no scrolling to find.
  const rows = entries;

  const addButton = onAddReading ? (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
      <Button size="small" variant="outlined" startIcon={<FiPlus />} onClick={onAddReading}>
        Add reading
      </Button>
    </Box>
  ) : null;

  const legend = (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, mt: 1.5, alignItems: "center" }}>
      {VITAL_LEGEND.map((l) => (
        <Stack key={l.status} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: VITAL_STATUS_STYLE[l.status].color,
              border: (t) => (l.status === "normal" ? `1px solid ${t.palette.divider}` : undefined),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {l.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  // Below `md` nine columns cannot be read at any sensible font size, so the
  // matrix becomes one card per reading. Nothing is hidden and nothing scrolls
  // sideways — the same data, laid out for the width that actually exists.
  if (isNarrow) {
    return (
      <Box>
        {addButton}
        <Stack spacing={1.5} sx={{ maxHeight: 420, overflowY: "auto", overflowX: "hidden" }}>
          {rows.map((e) => (
            <Card key={e.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {dateLabel(e.recordedOn)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: "60%" }}>
                  {e.location ? locationShort(e.location) : ""}
                  {e.source === "doctor" ? " · clinic" : ""}
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
                  gap: 1,
                }}
              >
                {fields.map((f) => (
                  <Box key={f.key}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                      {f.label}
                      {f.unit ? ` (${f.unit})` : ""}
                    </Typography>
                    <VitalValueCell value={e.values[f.key]} unit={f.unit} status={e.statuses?.[f.key]} />
                  </Box>
                ))}
              </Box>
            </Card>
          ))}
        </Stack>
        {showLegend && legend}
      </Box>
    );
  }

  return (
    <Box>
      {addButton}
      <Box
        sx={{
          maxHeight: { xs: 320, sm: 420 },
          overflowY: "auto",
          overflowX: "hidden",
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: (t) => `${t.tokens.radius.md}px`,
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            // `fixed` makes the columns SHARE the available width rather than
            // each claiming its natural size — that, plus dropping the old
            // `minWidth`, is what keeps the whole table on screen at any
            // resolution instead of clipping it behind a scrollbar.
            tableLayout: "fixed",
            width: "100%",
            "& .MuiTableCell-root": {
              px: { xs: 0.5, sm: 0.75, md: 1 },
              py: 0.75,
              fontSize: { xs: "0.72rem", sm: "0.78rem", md: "0.8125rem" },
            },
          }}
        >
          <TableHead>
            <TableRow>
              {showDate && <TableCell sx={stickyDateHead}>Date</TableCell>}
              <TableCell sx={headCell}>Location</TableCell>
              {fields.map((f) => (
                <TableCell key={f.key} align="center" sx={headCell}>
                  <Box sx={{ lineHeight: 1.2 }}>{f.label}</Box>
                  {f.unit ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", lineHeight: 1.1, fontWeight: 400 }}
                    >
                      {f.unit}
                    </Typography>
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id} hover>
                {showDate && (
                  <TableCell component="th" scope="row" sx={stickyDateCell}>
                    {dateLabel(e.recordedOn)}
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {e.location ? (
                    <Tooltip title={e.location} arrow>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          verticalAlign: "bottom",
                          cursor: "default",
                        }}
                      >
                        {locationShort(e.location)}
                      </Box>
                    </Tooltip>
                  ) : (
                    "—"
                  )}
                  {e.source === "doctor" && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                      · clinic
                    </Typography>
                  )}
                </TableCell>
                {fields.map((f) => (
                  <TableCell key={f.key} align="center">
                    <VitalValueCell
                      value={e.values[f.key]}
                      unit={f.unit}
                      status={e.statuses?.[f.key]}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* No patient-facing disclaimer here — a clinician reading reference
          ranges is the intended audience. */}
      {showLegend && legend}
    </Box>
  );
}
