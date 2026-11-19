"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiArrowLeft, FiChevronDown, FiEye, FiStar } from "react-icons/fi";
import { toast } from "sonner";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import type { PrescriptionTemplate, TemplateAssetKind, TemplateUpdate } from "@/types/prescription";
import {
  useRemoveAsset,
  useSetDefaultTemplate,
  useTemplate,
  useTemplatePreview,
  useUpdateTemplate,
  useUploadAsset,
} from "../hooks";
import { BodyPanel, BrandingPanel, FooterPanel, HeaderPanel, PatientFieldsPanel, SidebarPanel, ThemePanel } from "./panels";
import { RxPdfPreviewDialog } from "./RxPdfPreviewDialog";
import { RxPreview } from "./RxPreview";

const AUTOSAVE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The letterhead editor: an accordion of panels on the left, a live A4 preview
 * on the right, autosaved as the doctor types.
 *
 * This screen has ~40 controls across 7 panels. An explicit Save button that
 * the doctor forgets after twenty tweaks is worse than a debounce — so every
 * change merges into a pending patch and flushes 800ms after the last keystroke.
 */
export function TemplateEditor({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTemplate(templateId);
  const update = useUpdateTemplate(templateId);
  const uploadAsset = useUploadAsset(templateId);
  const removeAsset = useRemoveAsset(templateId);
  const setDefault = useSetDefaultTemplate();

  // The form's own copy, DERIVED rather than synced: `edits` is null until the
  // doctor touches something, so the fetched row shows through. Copying `data`
  // into state inside an effect would cascade a render on every refetch.
  const [edits, setEdits] = useState<PrescriptionTemplate | null>(null);
  const draft = edits ?? data ?? null;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scale, setScale] = useState(0.55);

  // Bumped on every successful save so "Preview PDF" refetches exactly once
  // per edit, rather than on every open.
  const [savedAtOverride, setSavedAt] = useState<string | null>(null);
  const savedAt = savedAtOverride ?? data?.updatedAt ?? null;

  const pending = useRef<TemplateUpdate>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;

    setSaveState("saving");
    update.mutate(body, {
      onSuccess: (t) => {
        setSaveState("saved");
        setSavedAt(t.updatedAt);
      },
      onError: (e) => {
        setSaveState("error");
        toast.error(getErrorMessage(e));
      },
    });
  }, [update]);

  const patch = useCallback(
    (body: TemplateUpdate) => {
      setEdits((prev) => {
        const base = prev ?? data;
        return base ? { ...base, ...body } : prev;
      });
      pending.current = { ...pending.current, ...body };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush, data],
  );

  // Never lose the last keystroke to an unmount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const preview = useTemplatePreview(templateId, savedAt, previewOpen);

  // The server owns asset URLs, so fold its response back into the local copy
  // — but keep any unsaved text edits the doctor made while the upload ran.
  const onUpload = async (kind: TemplateAssetKind, file: File) => {
    const t = await uploadAsset.mutateAsync({ kind, file });
    setEdits((prev) => ({ ...(prev ?? t), assets: t.assets }));
    setSavedAt(t.updatedAt);
    toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} updated`);
    return t;
  };

  const onRemoveAsset = async (kind: TemplateAssetKind) => {
    const t = await removeAsset.mutateAsync(kind);
    setEdits((prev) => ({ ...(prev ?? t), assets: t.assets }));
    setSavedAt(t.updatedAt);
    return t;
  };

  if (isLoading || (!draft && !isError)) return <Loading label="Loading letterhead…" />;
  if (isError || !draft) return <ErrorState onRetry={() => refetch()} />;

  const panels: Array<[string, React.ReactNode]> = [
    ["Header & credentials", <HeaderPanel key="h" template={draft} patch={patch} />],
    [
      "Logo, watermark & signature",
      <BrandingPanel key="b" template={draft} patch={patch} onUpload={onUpload} onRemove={onRemoveAsset} busy={uploadAsset.isPending} />,
    ],
    ["Theme & page", <ThemePanel key="t" template={draft} patch={patch} />],
    ["Patient fields", <PatientFieldsPanel key="p" template={draft} patch={patch} />],
    ["Advice sidebar", <SidebarPanel key="s" template={draft} patch={patch} />],
    ["Prescription body", <BodyPanel key="bd" template={draft} patch={patch} />],
    ["Footer", <FooterPanel key="f" template={draft} patch={patch} />],
  ];

  return (
    <Stack spacing={2}>
      {/* header bar */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton onClick={() => router.push(ROUTES.dashboard.prescriptionTemplates)} aria-label="Back to templates">
            <FiArrowLeft />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              {draft.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {draft.clinic && <Chip size="small" variant="outlined" label={draft.clinic.name} />}
              {draft.isDefault && <Chip size="small" color="primary" icon={<FiStar />} label="Default" />}
              <SaveChip state={saveState} />
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          {!draft.isDefault && (
            <Button
              variant="outlined"
              startIcon={<FiStar />}
              onClick={() =>
                setDefault.mutate(templateId, {
                  onSuccess: () => {
                    setEdits({ ...draft, isDefault: true });
                    toast.success("Default letterhead updated");
                  },
                  onError: (e) => toast.error(getErrorMessage(e)),
                })
              }
            >
              Set default
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<FiEye />}
            onClick={() => {
              flush(); // save first, so the preview shows what's on screen
              setPreviewOpen(true);
            }}
          >
            Preview PDF
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        {/* panels */}
        <Box sx={{ flex: { lg: "0 0 42%" }, width: "100%", minWidth: 0 }}>
          {panels.map(([label, panel], i) => (
            <Accordion key={label} defaultExpanded={i === 0} disableGutters>
              <AccordionSummary expandIcon={<FiChevronDown />}>
                <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
              </AccordionSummary>
              <AccordionDetails>{panel}</AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* live preview */}
        <Box sx={{ flex: 1, width: "100%", minWidth: 0, position: { lg: "sticky" }, top: 16 }}>
          <Box sx={{ display: "flex", justifyContent: "center", overflow: "auto", py: 1 }}>
            <RxPreview
              template={draft}
              logoUrl={draft.assets.logoUrl}
              watermarkUrl={draft.assets.watermarkUrl}
              signatureUrl={draft.assets.signatureUrl}
              scale={scale}
            />
          </Box>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              Zoom {Math.round(scale * 100)}%
            </Typography>
            <Slider size="small" min={0.3} max={0.9} step={0.05} value={scale} onChange={(_e, v) => setScale(v as number)} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
            Approximate preview — use <b>Preview PDF</b> to see the exact page.
          </Typography>
        </Box>
      </Stack>

      <RxPdfPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${draft.name} — preview`}
        blob={preview.data}
        isLoading={preview.isLoading || preview.isFetching}
        isError={preview.isError}
        onRetry={() => preview.refetch()}
        fileName="letterhead-preview.pdf"
      />
    </Stack>
  );
}

function SaveChip({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const meta = {
    saving: { label: "Saving…", color: "default" as const },
    saved: { label: "Saved", color: "success" as const },
    error: { label: "Save failed", color: "error" as const },
  }[state];
  return <Chip size="small" variant="outlined" color={meta.color} label={meta.label} />;
}
