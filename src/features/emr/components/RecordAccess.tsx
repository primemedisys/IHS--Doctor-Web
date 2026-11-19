"use client";

/**
 * Patient-controlled access to other doctors' records (backend migration 057),
 * as the doctor sees it in the workbench.
 *
 * This file only DESCRIBES access and lets the doctor ask for it. The server
 * decides everything: locked records are never in the responses, so there is
 * nothing here to "unhide". A grant appears only after the patient approves,
 * and disappears on the next request after it is revoked or expires.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { getErrorMessage } from "@/utils/error";
import { emrKeys, useCancelAccessRequest, useRequestAccess } from "../hooks";
import { emrService } from "../services/emr.service";
import { instantLabel } from "../format";
import type { AccessCategory, AccessCategoryState, ClinicalAccess } from "@/types/emr";

interface AccessCtx {
  patientId: string;
  access: ClinicalAccess | null;
  state: (c: AccessCategory) => AccessCategoryState | null;
  granted: (c: AccessCategory) => boolean;
  openRequest: (preselect?: AccessCategory[]) => void;
}

const Ctx = createContext<AccessCtx | null>(null);

/** Access state for the open patient — `null` outside the workspace (nothing is shown then). */
export function useRecordAccess() {
  return useContext(Ctx);
}

/** How often an open workspace re-checks the patient's decisions (no socket on this site). */
const ACCESS_POLL_MS = 30_000;

const signature = (a: ClinicalAccess | null | undefined) =>
  (a?.categories ?? []).map((c) => `${c.category}:${c.status}:${c.grantExpiresAt ?? ""}`).join("|");

export function RecordAccessProvider({ patientId, access: initial, children }: { patientId: string; access: ClinicalAccess | null; children: ReactNode }) {
  const [dialog, setDialog] = useState<AccessCategory[] | null>(null);
  const qc = useQueryClient();
  // The patient approves / declines / revokes elsewhere: poll the small summary
  // and, when it changes, refetch every view of this patient so newly shared
  // records appear and revoked ones disappear. The server re-checks the grant
  // on every request regardless — this only keeps the screen current.
  const polled = useQuery({
    queryKey: [...emrKeys.patient(patientId), "access"],
    queryFn: () => emrService.access(patientId),
    initialData: initial ?? undefined,
    refetchInterval: ACCESS_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const access = polled.data ?? initial;
  const seen = useRef(signature(initial));
  useEffect(() => {
    const now = signature(polled.data);
    if (!polled.data || now === seen.current) return;
    seen.current = now;
    void qc.invalidateQueries({
      queryKey: emrKeys.patient(patientId),
      predicate: (q) => q.queryKey[q.queryKey.length - 1] !== "access",
    });
  }, [polled.data, patientId, qc]);

  const value = useMemo<AccessCtx>(() => {
    const byCat = new Map((access?.categories ?? []).map((c) => [c.category, c]));
    return {
      patientId,
      access,
      state: (c) => byCat.get(c) ?? null,
      granted: (c) => Boolean(byCat.get(c)?.granted),
      openRequest: (preselect = []) => setDialog(preselect),
    };
  }, [patientId, access]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {dialog && access && (
        <RequestAccessDialog patientId={patientId} access={access} preselect={dialog} onClose={() => setDialog(null)} />
      )}
    </Ctx.Provider>
  );
}

/** "Pending since …", "Declined …", etc. — the doctor's OWN request state, nothing about the records. */
function statusText(s: AccessCategoryState): { label: string; color: "default" | "success" | "warning" | "error" } {
  switch (s.status) {
    case "open":
      return { label: "Visible to treating doctors", color: "success" };
    case "granted":
      return { label: `Shared until ${instantLabel(s.grantExpiresAt)}`, color: "success" };
    case "pending":
      return { label: `Requested ${instantLabel(s.requestedAt)} · awaiting patient`, color: "warning" };
    case "rejected":
      return { label: s.retryAt ? `Declined · ask again after ${instantLabel(s.retryAt)}` : "Declined by the patient", color: "error" };
    case "revoked":
      return { label: "Access revoked by the patient", color: "default" };
    case "expired":
      return { label: s.decidedAt ? "Access expired" : "Request expired unanswered", color: "default" };
    case "cancelled":
      return { label: "Request withdrawn", color: "default" };
    default:
      return { label: "Private", color: "default" };
  }
}

/**
 * The locked state of one category, where its records would be. `compact` is
 * one line (inside a consultation card or above a list); the full form is a
 * section placeholder.
 */
export function LockedNotice({ category, compact = false, scope = "previous" }: { category: AccessCategory; compact?: boolean; scope?: "previous" | "others" }) {
  const ctx = useRecordAccess();
  const s = ctx?.state(category);
  if (!ctx || !s || s.granted) return null;
  const st = statusText(s);
  const label = s.label.toLowerCase();
  const action = s.canRequest ? (
    <Button size="small" variant={compact ? "text" : "contained"} startIcon={<Icon name="FiUnlock" />} onClick={() => ctx.openRequest([category])}>
      Request access
    </Button>
  ) : null;

  if (compact) {
    return (
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75, color: "text.secondary" }}>
        <Icon name="FiLock" size={14} />
        <Typography variant="body2" color="text.secondary">
          {scope === "others" ? `${s.label} from other doctors are private.` : "Private — not shared with you."}
        </Typography>
        {s.status !== "none" && <Chip size="small" color={st.color} variant="outlined" label={st.label} sx={{ height: 22 }} />}
        {action}
      </Stack>
    );
  }
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({ p: 2, borderStyle: "dashed", bgcolor: alpha(t.palette.text.primary, 0.02), display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: "wrap" })}
    >
      <Box sx={{ display: "flex", color: "text.secondary", pt: 0.25 }}><Icon name="FiLock" size={20} /></Box>
      <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>This patient&apos;s {label} from other doctors is private.</Typography>
        <Typography variant="body2" color="text.secondary">{s.description} Records you created yourself are always shown.</Typography>
        {s.status !== "none" && <Chip size="small" color={st.color} variant="outlined" label={st.label} sx={{ mt: 0.75 }} />}
      </Box>
      {action}
    </Paper>
  );
}

/** One-line reminder above a list that mixes own records with (possibly) others'. */
export function OthersHiddenLine({ category }: { category: AccessCategory }) {
  const ctx = useRecordAccess();
  if (!ctx || ctx.granted(category)) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <LockedNotice category={category} compact scope="others" />
    </Box>
  );
}

/** Summary strip: what is shared, what is pending, one button to ask. */
export function RecordAccessBar() {
  const ctx = useRecordAccess();
  if (!ctx?.access) return null;
  const cats = ctx.access.categories;
  const pending = cats.filter((c) => c.status === "pending").length;
  const askable = cats.some((c) => c.canRequest);
  const protectedCats = cats.filter((c) => c.status !== "open");
  const sharedProtected = protectedCats.filter((c) => c.granted).length;
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({ px: { xs: 1.5, md: 2 }, py: 1.25, borderRadius: `${t.tokens.radius.xl}px`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 })}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "primary.main", mr: 0.5 }}>
        <Icon name="FiShield" size={17} />
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>Previous records from other doctors</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
        Common records visible · {sharedProtected} of {protectedCats.length} protected sections shared
        {pending ? ` · ${pending} awaiting the patient` : ""}
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5, flex: "1 1 320px" }}>
        {cats.map((c) => (
          <Tooltip key={c.category} title={`${c.description} — ${statusText(c).label}`}>
            <Chip
              size="small"
              icon={<Icon name={c.status === "open" ? "FiEye" : c.granted ? "FiUnlock" : c.status === "pending" ? "FiClock" : "FiLock"} size={13} />}
              color={c.granted ? "success" : c.status === "pending" ? "warning" : "default"}
              variant={c.granted && c.status !== "open" ? "filled" : "outlined"}
              label={c.label}
            />
          </Tooltip>
        ))}
      </Stack>
      <Button size="small" variant="outlined" startIcon={<Icon name="FiUnlock" />} onClick={() => ctx.openRequest()} disabled={!askable && !pending}>
        {askable ? "Request access" : "Manage requests"}
      </Button>
    </Paper>
  );
}

function RequestAccessDialog({ patientId, access, preselect, onClose }: { patientId: string; access: ClinicalAccess; preselect: AccessCategory[]; onClose: () => void }) {
  const request = useRequestAccess(patientId);
  const cancel = useCancelAccessRequest(patientId);
  const [picked, setPicked] = useState<Set<AccessCategory>>(
    new Set(preselect.filter((c) => access.categories.find((x) => x.category === c)?.canRequest)),
  );
  const [purpose, setPurpose] = useState("");
  const toggle = (c: AccessCategory) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const send = () =>
    request.mutate(
      { categories: [...picked], purpose: purpose.trim() || undefined },
      {
        onSuccess: (res) => {
          const skipped = res.skipped?.length ?? 0;
          toast.success(skipped ? `Request sent. ${skipped} section(s) were already shared or pending.` : "Request sent to the patient");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request access to previous records</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Medical history, consultations, diagnoses, notes and vitals are already visible to you. Prescriptions and
          reports from other doctors open only after the patient approves — each section separately.
        </Typography>
        <Stack spacing={0.75}>
          {access.categories.filter((c) => c.status !== "open").map((c) => {
            const st = statusText(c);
            return (
              <Paper key={c.category} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "flex-start", gap: 1, opacity: c.canRequest ? 1 : 0.85 }}>
                <Checkbox
                  size="small"
                  checked={picked.has(c.category)}
                  disabled={!c.canRequest}
                  onChange={() => toggle(c.category)}
                  slotProps={{ input: { "aria-label": c.label } }}
                  sx={{ p: 0.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{c.description}</Typography>
                  {c.status !== "none" && <Chip size="small" color={st.color} variant="outlined" label={st.label} sx={{ mt: 0.5, height: 22 }} />}
                </Box>
                {c.status === "pending" && c.requestId && (
                  <Button
                    size="small"
                    color="inherit"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(c.requestId!, {
                        onSuccess: () => toast.success("Request withdrawn"),
                        onError: (e) => toast.error(getErrorMessage(e)),
                      })
                    }
                  >
                    Withdraw
                  </Button>
                )}
              </Paper>
            );
          })}
        </Stack>
        <TextField
          fullWidth
          size="small"
          label="Purpose (optional, shown to the patient)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          multiline
          minRows={2}
          sx={{ mt: 1.5 }}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={send} disabled={!picked.size || request.isPending}>
          Send request{picked.size > 1 ? ` (${picked.size})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
