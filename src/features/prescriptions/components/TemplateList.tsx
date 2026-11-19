"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FiCopy, FiFileText, FiMoreVertical, FiPlus, FiStar, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { formatRelative } from "@/utils/format";
import { useClinics } from "@/features/doctor/hooks";
import type { PrescriptionTemplateSummary } from "@/types/prescription";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSetDefaultTemplate,
  useTemplates,
} from "../hooks";

/** The doctor's letterheads. One per clinic, plus a default for video consults. */
export function TemplateList() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTemplates();
  const create = useCreateTemplate();
  const [newOpen, setNewOpen] = useState(false);

  if (isLoading) return <Loading label="Loading letterheads…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const templates = data ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Prescription letterheads
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Header, logo, colours, advice list and footer — configured per clinic.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setNewOpen(true)}>
          New letterhead
        </Button>
      </Stack>

      {templates.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <FiFileText size={28} />
            <Typography sx={{ mt: 1, fontWeight: 600 }}>No letterheads yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              One is created automatically the first time you write a prescription — or make one now.
            </Typography>
            <Button variant="contained" startIcon={<FiPlus />} onClick={() => setNewOpen(true)}>
              New letterhead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {templates.map((t) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
              <TemplateCard template={t} onOpen={() => router.push(ROUTES.dashboard.prescriptionTemplate(t.id))} />
            </Grid>
          ))}
        </Grid>
      )}

      <NewTemplateDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        busy={create.isPending}
        onCreate={(name, clinicId) =>
          create.mutate(
            { name, clinicId },
            {
              onSuccess: (t) => {
                setNewOpen(false);
                toast.success("Letterhead created");
                router.push(ROUTES.dashboard.prescriptionTemplate(t.id));
              },
              onError: (e) => toast.error(getErrorMessage(e)),
            },
          )
        }
      />
    </Stack>
  );
}

function TemplateCard({ template: t, onOpen }: { template: PrescriptionTemplateSummary; onOpen: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const setDefault = useSetDefaultTemplate();
  const duplicate = useDuplicateTemplate();
  const remove = useDeleteTemplate();
  const close = () => setAnchor(null);

  const act = <T,>(p: Promise<T>, ok: string) =>
    p.then(() => toast.success(ok)).catch((e) => toast.error(getErrorMessage(e)));

  return (
    <Card variant="outlined" sx={{ height: "100%", position: "relative" }}>
      <IconButton
        size="small"
        sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Letterhead actions"
      >
        <FiMoreVertical />
      </IconButton>
      <CardActionArea onClick={onOpen} sx={{ height: "100%", alignItems: "stretch" }}>
        <CardContent>
          <Box
            sx={{
              height: 88,
              borderRadius: 1,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
              overflow: "hidden",
            }}
          >
            {t.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logoUrl} alt="" style={{ maxHeight: 72, maxWidth: "80%", objectFit: "contain" }} />
            ) : (
              <FiFileText size={24} />
            )}
          </Box>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {t.name}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
            {t.isDefault && <Chip size="small" color="primary" label="Default" icon={<FiStar />} />}
            <Chip size="small" variant="outlined" label={t.clinic?.name ?? "Video / any clinic"} />
          </Stack>
          {t.updatedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Edited {formatRelative(t.updatedAt)}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {!t.isDefault && (
          <MenuItem
            onClick={() => {
              close();
              act(setDefault.mutateAsync(t.id), "Default letterhead updated");
            }}
          >
            <FiStar style={{ marginRight: 8 }} /> Set as default
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            close();
            act(duplicate.mutateAsync({ id: t.id, name: `${t.name} (copy)` }), "Duplicated");
          }}
        >
          <FiCopy style={{ marginRight: 8 }} /> Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            act(remove.mutateAsync(t.id), "Letterhead deleted");
          }}
        >
          <FiTrash2 style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}

function NewTemplateDialog({
  open,
  onClose,
  onCreate,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, clinicId: string | null) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [clinicId, setClinicId] = useState<string>("");
  const clinics = useClinics();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>New letterhead</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            select
            size="small"
            label="Clinic"
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            helperText="Leave empty to use it for video consults and as your fallback."
          >
            <MenuItem value="">Video / any clinic</MenuItem>
            {(clinics.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim() || busy} onClick={() => onCreate(name.trim(), clinicId || null)}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
