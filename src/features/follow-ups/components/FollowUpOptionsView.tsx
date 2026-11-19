"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import {
  FiArchive,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { getErrorMessage } from "@/utils/error";
import {
  useCreateFollowUpStatus,
  useDeleteFollowUpStatus,
  useFollowUpStatuses,
  useReorderFollowUpStatuses,
  useUpdateFollowUpStatus,
} from "../hooks";
import { chipColors, FOLLOW_UP_PALETTE } from "../format";
import type { FollowUpStatus } from "@/types/followUp";

/** The 12-swatch palette plus a free hex field — fast path and escape hatch. */
function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }} useFlexGap>
        {FOLLOW_UP_PALETTE.map((hex) => (
          <Box
            key={hex}
            component="button"
            type="button"
            aria-label={`Use ${hex}`}
            onClick={() => onChange(hex)}
            sx={(t) => ({
              width: 26,
              height: 26,
              p: 0,
              cursor: "pointer",
              borderRadius: `${t.tokens.radius.xs}px`,
              bgcolor: hex,
              border: 2,
              borderColor: value.toLowerCase() === hex.toLowerCase() ? "text.primary" : "transparent",
              boxShadow: `inset 0 0 0 1px ${alpha("#000", 0.15)}`,
            })}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        label="Hex"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!/^#[0-9A-Fa-f]{6}$/.test(value)}
        helperText={/^#[0-9A-Fa-f]{6}$/.test(value) ? " " : "Six-digit hex, e.g. #2E86C1"}
        sx={{ width: 140 }}
      />
    </Stack>
  );
}

/** The chip exactly as the roster will draw it — shown while choosing, not after. */
function Preview({ label, colorHex }: { label: string; colorHex: string }) {
  return (
    <Box
      component="span"
      sx={(t) => {
        const c = chipColors(t, colorHex);
        return {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.125,
          py: 0.5,
          borderRadius: `${t.tokens.radius.pill}px`,
          border: 1,
          borderColor: c.line,
          bgcolor: c.soft,
          color: c.ink,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        };
      }}
    >
      <Box
        component="span"
        sx={(t) => ({ width: 7, height: 7, borderRadius: "50%", bgcolor: chipColors(t, colorHex).solid })}
      />
      {label || "Preview"}
    </Box>
  );
}

/** One row: read mode, or the inline editor. */
function StatusRow({
  status,
  isFirst,
  isLast,
  onMove,
}: {
  status: FollowUpStatus;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const update = useUpdateFollowUpStatus();
  const remove = useDeleteFollowUpStatus();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(status.label);
  const [colorHex, setColorHex] = useState(status.colorHex);

  const startEdit = () => {
    setLabel(status.label);
    setColorHex(status.colorHex);
    setEditing(true);
  };

  const save = () => {
    if (label.trim().length < 2) {
      toast.error("A status needs at least two characters.");
      return;
    }
    update.mutate(
      { id: status.id, patch: { label: label.trim(), colorHex } },
      {
        onSuccess: () => {
          toast.success("Status updated");
          setEditing(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const archive = () =>
    update.mutate(
      { id: status.id, patch: { isActive: !status.isActive } },
      {
        onSuccess: () =>
          toast.success(status.isActive ? "Status archived" : "Status restored"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  /**
   * Delete is refused by the server while patients still carry the status. That
   * 409 is not an error to apologise for — it is the answer, so it is turned
   * into the offer to archive instead.
   */
  const del = () => {
    remove.mutate(status.id, {
      onSuccess: () => toast.success("Status deleted"),
      onError: (e) => {
        const inUse = status.inUse ?? 0;
        toast.error(
          inUse > 0
            ? `${inUse} patient${inUse === 1 ? "" : "s"} still use "${status.label}". Archive it instead.`
            : getErrorMessage(e),
        );
      },
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        p: 1.5,
        borderRadius: `${t.tokens.radius.md}px`,
        opacity: status.isActive ? 1 : 0.7,
      })}
    >
      {editing ? (
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "flex-start" } }}>
            <TextField
              size="small"
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ minWidth: 200 }}
              autoFocus
            />
            <ColorPicker value={colorHex} onChange={setColorHex} />
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Preview label={label} colorHex={colorHex} />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              variant="contained"
              startIcon={<FiCheck />}
              onClick={save}
              loading={update.isPending}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Save
            </Button>
            <Button
              size="small"
              color="inherit"
              startIcon={<FiX />}
              onClick={() => setEditing(false)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Stack spacing={0.25}>
            <Tooltip title="Move up">
              <span>
                <IconButton size="small" disabled={isFirst} onClick={() => onMove(status.id, -1)} sx={{ p: 0.25 }}>
                  <FiChevronUp size={14} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton size="small" disabled={isLast} onClick={() => onMove(status.id, 1)} sx={{ p: 0.25 }}>
                  <FiChevronDown size={14} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Preview label={status.label} colorHex={status.colorHex} />

          <Typography sx={{ fontSize: 12.5, color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
            {status.inUse ?? 0} patient{(status.inUse ?? 0) === 1 ? "" : "s"}
          </Typography>
          {!status.isActive && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "warning.main" }}>Archived</Typography>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Rename or recolour">
            <IconButton onClick={startEdit} aria-label={`Edit ${status.label}`}>
              <FiEdit2 size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={status.isActive ? "Archive — hides it from the pickers" : "Restore"}>
            <IconButton onClick={archive} aria-label={status.isActive ? "Archive" : "Restore"}>
              {status.isActive ? <FiArchive size={16} /> : <FiRotateCcw size={16} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={(status.inUse ?? 0) > 0 ? "In use — archive it instead" : "Delete"}>
            <span>
              <IconButton
                onClick={del}
                disabled={(status.inUse ?? 0) > 0 || remove.isPending}
                aria-label={`Delete ${status.label}`}
                sx={{ color: "error.main" }}
              >
                <FiTrash2 size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
    </Paper>
  );
}

/**
 * The doctor's own follow-up categories.
 *
 * Everything here is theirs: the labels, the colours, the order, and whether a
 * category exists at all. The four they start with are ordinary rows, not
 * defaults the system depends on — a surgeon's list is not a dermatologist's,
 * and nothing in the app reads a label's text.
 */
export function FollowUpOptionsView() {
  const { data: statuses = [], isLoading, isError, refetch } = useFollowUpStatuses();
  const create = useCreateFollowUpStatus();
  const reorder = useReorderFollowUpStatuses();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [colorHex, setColorHex] = useState(FOLLOW_UP_PALETTE[1]);

  const add = () => {
    if (label.trim().length < 2) {
      toast.error("A status needs at least two characters.");
      return;
    }
    create.mutate(
      { label: label.trim(), colorHex },
      {
        onSuccess: () => {
          toast.success("Status added");
          setLabel("");
          setColorHex(FOLLOW_UP_PALETTE[1]);
          setAdding(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  /** Swap with the neighbour and send the whole order — a partial order is worse than none. */
  const move = (id: string, direction: -1 | 1) => {
    const ids = statuses.map((s) => s.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate(ids, { onError: (e) => toast.error(getErrorMessage(e)) });
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Follow-up options
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The categories you tag patients with, and the colour each one wears on your appointment
            board. Yours alone — rename them, recolour them, add your own.
          </Typography>
        </Box>
        {!adding && (
          <Button
            variant="contained"
            startIcon={<FiPlus />}
            onClick={() => setAdding(true)}
            sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0 }}
          >
            Add status
          </Button>
        )}
      </Stack>

      {adding && (
        <Paper variant="outlined" sx={(t) => ({ p: 2, borderRadius: `${t.tokens.radius.md}px` })}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "flex-start" } }}>
              <TextField
                size="small"
                label="Label"
                placeholder="e.g. POST-OP DAY 7"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                sx={{ minWidth: 220 }}
                autoFocus
              />
              <ColorPicker value={colorHex} onChange={setColorHex} />
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Preview label={label} colorHex={colorHex} />
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                onClick={add}
                loading={create.isPending}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Add
              </Button>
              <Button
                color="inherit"
                onClick={() => setAdding(false)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {isLoading ? (
        <Loading label="Loading your statuses…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : statuses.length === 0 ? (
        <Paper variant="outlined">
          <EmptyState
            icon="FiTag"
            title="No follow-up statuses"
            description="You've removed every category. Add one to start tagging patients again."
            action={
              <Button variant="contained" startIcon={<FiPlus />} onClick={() => setAdding(true)}>
                Add status
              </Button>
            }
          />
        </Paper>
      ) : (
        <Stack spacing={1.25}>
          {statuses.map((s, i) => (
            <StatusRow
              key={s.id}
              status={s}
              isFirst={i === 0}
              isLast={i === statuses.length - 1}
              onMove={move}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
