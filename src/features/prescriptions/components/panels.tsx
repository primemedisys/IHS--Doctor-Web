"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDropzone } from "react-dropzone";
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import {
  MEDICINE_COLUMNS,
  PATIENT_FIELD_KEYS,
  PRESCRIPTION_FONTS,
  type BodyJson,
  type FooterJson,
  type HeaderJson,
  type MedicineColumn,
  type PatientFieldConfig,
  type PrescriptionTemplate,
  type SidebarJson,
  type TemplateAssetKind,
  type TemplateUpdate,
} from "@/types/prescription";
import { COLUMN_LABELS, PATIENT_FIELD_LABELS, linesFrom } from "./rx-format";

/** Every panel receives the current template and a partial-patch callback. */
export interface PanelProps {
  template: PrescriptionTemplate;
  patch: (update: TemplateUpdate) => void;
}

// ── shared bits ──────────────────────────────────────────────────────────────
/**
 * A colour field with both a swatch and a hex box — the doctor either picks or
 * pastes `#2E4A2E` from their brand guide.
 */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const commit = (v: string) => {
    setText(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v.toUpperCase());
  };
  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={text}
      onChange={(e) => commit(e.target.value)}
      onBlur={() => setText(value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="input"
                type="color"
                aria-label={`${label} swatch`}
                value={value}
                onChange={(e) => commit(e.target.value)}
                sx={{ width: 28, height: 28, border: "none", background: "none", p: 0, cursor: "pointer" }}
              />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

/**
 * A reorderable list of one-line strings. Buttons, not drag-and-drop: no new
 * dependency, and ↑/↓ are keyboard- and screen-reader-operable for free.
 */
function LineList({
  lines,
  onChange,
  placeholder,
  addLabel,
  maxLines,
}: {
  lines: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  maxLines: number;
}) {
  const set = (i: number, v: string) => onChange(lines.map((l, j) => (j === i ? v : l)));
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <Stack spacing={1}>
      {lines.map((line, i) => (
        <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <TextField
            size="small"
            fullWidth
            value={line}
            placeholder={placeholder}
            onChange={(e) => set(i, e.target.value)}
          />
          <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
            <FiArrowUp />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => move(i, 1)}
            disabled={i === lines.length - 1}
            aria-label="Move down"
          >
            <FiArrowDown />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            aria-label="Remove line"
          >
            <FiX />
          </IconButton>
        </Stack>
      ))}
      <Button
        size="small"
        startIcon={<FiPlus />}
        disabled={lines.length >= maxLines}
        onClick={() => onChange([...lines, ""])}
        sx={{ alignSelf: "flex-start" }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}

// ── ① header ─────────────────────────────────────────────────────────────────
export function HeaderPanel({ template, patch }: PanelProps) {
  const h = template.headerJson;
  const setHeader = (next: Partial<HeaderJson>) => patch({ headerJson: { ...h, ...next } });

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        label="Doctor name line"
        value={h.doctorNameLine}
        onChange={(e) => setHeader({ doctorNameLine: e.target.value })}
        helperText="Printed large, at the top left. e.g. PROF. DR. PUSPAK SAMAL"
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Credential lines
        </Typography>
        <LineList
          lines={h.credentialLines}
          onChange={(credentialLines) => setHeader({ credentialLines })}
          placeholder="MS (Orthopaedics)"
          addLabel="Add credential"
          maxLines={10}
        />
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          size="small"
          fullWidth
          label="Clinic name"
          value={h.clinicName}
          onChange={(e) => setHeader({ clinicName: e.target.value })}
        />
        <TextField
          size="small"
          fullWidth
          label="Clinic tagline"
          value={h.clinicTagline}
          onChange={(e) => setHeader({ clinicTagline: e.target.value })}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          size="small"
          fullWidth
          label="Registration label"
          value={h.regNoLabel}
          onChange={(e) => setHeader({ regNoLabel: e.target.value })}
        />
        <TextField
          size="small"
          fullWidth
          label="Registration number"
          value={h.regNoValue}
          onChange={(e) => setHeader({ regNoValue: e.target.value })}
        />
        <TextField
          size="small"
          fullWidth
          select
          label="Logo side"
          value={h.logoPosition}
          onChange={(e) => setHeader({ logoPosition: e.target.value as "left" | "right" })}
        >
          <MenuItem value="left">Left</MenuItem>
          <MenuItem value="right">Right</MenuItem>
        </TextField>
      </Stack>

      <FormControlLabel
        control={
          <Checkbox checked={template.showHeader} onChange={(e) => patch({ showHeader: e.target.checked })} />
        }
        label="Show the header band"
      />
    </Stack>
  );
}

// ── branding ─────────────────────────────────────────────────────────────────
export interface BrandingPanelProps extends PanelProps {
  onUpload: (kind: TemplateAssetKind, file: File) => Promise<unknown>;
  onRemove: (kind: TemplateAssetKind) => Promise<unknown>;
  busy?: boolean;
}

function AssetDrop({
  kind,
  label,
  hint,
  url,
  onUpload,
  onRemove,
  busy,
}: {
  kind: TemplateAssetKind;
  label: string;
  hint: string;
  url: string | null;
  onUpload: (kind: TemplateAssetKind, file: File) => Promise<unknown>;
  onRemove: (kind: TemplateAssetKind) => Promise<unknown>;
  busy?: boolean;
}) {
  // Mirrors the backend's narrowed allowlist. The server stays the authority —
  // a PDF passes the shared upload middleware but is rejected for a letterhead.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    multiple: false,
    onDrop: (files) => {
      const file = files[0];
      if (!file) return;
      onUpload(kind, file).catch((e) => toast.error(getErrorMessage(e)));
    },
    onDropRejected: () => toast.error("Upload a PNG or JPEG image"),
  });

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        {...getRootProps()}
        sx={{
          border: "1px dashed",
          borderColor: isDragActive ? "primary.main" : "divider",
          borderRadius: 1,
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          bgcolor: isDragActive ? "action.hover" : "transparent",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} />
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} style={{ maxHeight: 72, maxWidth: "100%", objectFit: "contain" }} />
        ) : (
          <Stack spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <FiUpload />
            <Typography variant="caption">Drop or click — PNG / JPEG</Typography>
          </Stack>
        )}
      </Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
        {url && (
          <Button
            size="small"
            color="error"
            startIcon={<FiTrash2 />}
            onClick={() => onRemove(kind).catch((e) => toast.error(getErrorMessage(e)))}
          >
            Remove
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export function BrandingPanel({ template, patch, onUpload, onRemove, busy }: BrandingPanelProps) {
  return (
    <Stack spacing={2.5}>
      <AssetDrop kind="logo" label="Logo" hint="Top corner of the header band." url={template.assets.logoUrl} onUpload={onUpload} onRemove={onRemove} busy={busy} />
      <AssetDrop kind="watermark" label="Watermark" hint="Faint, centred behind the prescription body." url={template.assets.watermarkUrl} onUpload={onUpload} onRemove={onRemove} busy={busy} />
      <AssetDrop kind="signature" label="Signature" hint="Printed above the signature rule." url={template.assets.signatureUrl} onUpload={onUpload} onRemove={onRemove} busy={busy} />

      <FormControlLabel
        control={
          <Checkbox
            checked={template.showWatermark}
            onChange={(e) => patch({ showWatermark: e.target.checked })}
          />
        }
        label="Show the watermark"
      />
      <Box>
        <Typography variant="caption" color="text.secondary">
          Watermark opacity — {template.watermarkOpacity.toFixed(2)}
        </Typography>
        <Slider
          size="small"
          min={0}
          max={0.3}
          step={0.01}
          value={template.watermarkOpacity}
          disabled={!template.showWatermark}
          onChange={(_e, v) => patch({ watermarkOpacity: v as number })}
        />
      </Box>
    </Stack>
  );
}

// ── theme & page ─────────────────────────────────────────────────────────────
export function ThemePanel({ template: t, patch }: PanelProps) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <ColorField label="Header background" value={t.headerBgColor} onChange={(v) => patch({ headerBgColor: v })} />
        <ColorField label="Header text" value={t.headerTextColor} onChange={(v) => patch({ headerTextColor: v })} />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <ColorField label="Footer background" value={t.footerBgColor} onChange={(v) => patch({ footerBgColor: v })} />
        <ColorField label="Footer text" value={t.footerTextColor} onChange={(v) => patch({ footerTextColor: v })} />
      </Stack>
      <ColorField label="Accent (rules & labels)" value={t.accentColor} onChange={(v) => patch({ accentColor: v })} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          size="small"
          fullWidth
          select
          label="Font"
          value={t.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          // A free-text font is a broken PDF: the page renders on the SERVER,
          // where the doctor's fonts aren't installed.
          helperText="Print-safe families only"
        >
          {PRESCRIPTION_FONTS.map((f) => (
            <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
              {f.split(",")[0].replace(/'/g, "")}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          fullWidth
          type="number"
          label="Base font size (pt)"
          value={t.baseFontSizePt}
          onChange={(e) => patch({ baseFontSizePt: Number(e.target.value) })}
          slotProps={{ htmlInput: { min: 7, max: 16, step: 0.5 } }}
        />
        <TextField
          size="small"
          fullWidth
          select
          label="Page size"
          value={t.pageSize}
          onChange={(e) => patch({ pageSize: e.target.value as "A4" | "Letter" })}
        >
          <MenuItem value="A4">A4</MenuItem>
          <MenuItem value="Letter">Letter</MenuItem>
        </TextField>
      </Stack>

      <Typography variant="subtitle2">Margins (mm)</Typography>
      <Stack direction="row" spacing={2}>
        {(["marginMmTop", "marginMmRight", "marginMmBottom", "marginMmLeft"] as const).map((key) => (
          <TextField
            key={key}
            size="small"
            fullWidth
            type="number"
            label={key.replace("marginMm", "")}
            value={t[key]}
            onChange={(e) => patch({ [key]: Number(e.target.value) } as TemplateUpdate)}
            slotProps={{ htmlInput: { min: 0, max: 40 } }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// ── ② patient fields ─────────────────────────────────────────────────────────
export function PatientFieldsPanel({ template, patch }: PanelProps) {
  const fields = template.patientFieldsJson;
  const present = new Set(fields.map((f) => f.key));
  const missing = PATIENT_FIELD_KEYS.filter((k) => !present.has(k));

  const setField = (i: number, next: Partial<PatientFieldConfig>) =>
    patch({ patientFieldsJson: fields.map((f, j) => (j === i ? { ...f, ...next } : f)) });

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ patientFieldsJson: next });
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        Toggle, rename and reorder the boxes printed under the header. Row 1 prints above row 2.
        {!present.has("sex") && " “Age/Sex” prints both when Sex isn’t shown separately."}
      </Typography>

      {fields.map((f, i) => (
        <Stack key={f.key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Checkbox
            checked={f.enabled}
            onChange={(e) => setField(i, { enabled: e.target.checked })}
            slotProps={{ input: { "aria-label": `Show ${f.key}` } }}
          />
          <TextField
            size="small"
            sx={{ flex: 1 }}
            value={f.label}
            onChange={(e) => setField(i, { label: e.target.value })}
            disabled={!f.enabled}
          />
          <TextField
            size="small"
            select
            sx={{ width: 92 }}
            label="Row"
            value={f.row}
            onChange={(e) => setField(i, { row: Number(e.target.value) })}
            disabled={!f.enabled}
          >
            {[1, 2, 3].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
            <FiArrowUp />
          </IconButton>
          <IconButton size="small" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Move down">
            <FiArrowDown />
          </IconButton>
        </Stack>
      ))}

      {missing.length > 0 && (
        <TextField
          size="small"
          select
          label="Add a field"
          value=""
          onChange={(e) =>
            patch({
              patientFieldsJson: [
                ...fields,
                {
                  key: e.target.value as PatientFieldConfig["key"],
                  label: PATIENT_FIELD_LABELS[e.target.value as PatientFieldConfig["key"]],
                  enabled: true,
                  row: 2,
                },
              ],
            })
          }
        >
          {missing.map((k) => (
            <MenuItem key={k} value={k}>
              {PATIENT_FIELD_LABELS[k]}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}

// ── ③ advice sidebar ─────────────────────────────────────────────────────────
export function SidebarPanel({ template, patch }: PanelProps) {
  const s = template.sidebarJson;
  const [paste, setPaste] = useState("");
  const [pasteInto, setPasteInto] = useState(0);

  const setSidebar = (next: Partial<SidebarJson>) => patch({ sidebarJson: { ...s, ...next } });
  const setGroup = (i: number, next: Partial<SidebarJson["groups"][number]>) =>
    setSidebar({ groups: s.groups.map((g, j) => (j === i ? { ...g, ...next } : g)) });

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Checkbox checked={template.showSidebar} onChange={(e) => patch({ showSidebar: e.target.checked })} />}
        label="Show the advice sidebar"
      />

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <TextField
          size="small"
          label="Sidebar title"
          value={s.title}
          onChange={(e) => setSidebar({ title: e.target.value })}
          disabled={!template.showSidebar}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Width — {template.sidebarWidthPct}%
          </Typography>
          <Slider
            size="small"
            min={10}
            max={35}
            value={template.sidebarWidthPct}
            disabled={!template.showSidebar}
            onChange={(_e, v) => patch({ sidebarWidthPct: v as number })}
          />
        </Box>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        The whole list prints on every prescription; the items you tick while writing one are marked ✓ — the
        same as circling them on paper.
      </Typography>

      {s.groups.map((g, gi) => (
        <Box key={gi} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <TextField
              size="small"
              fullWidth
              label="Group heading (optional)"
              value={g.title}
              onChange={(e) => setGroup(gi, { title: e.target.value })}
            />
            {s.groups.length > 1 && (
              <IconButton
                size="small"
                onClick={() => setSidebar({ groups: s.groups.filter((_, j) => j !== gi) })}
                aria-label="Remove group"
              >
                <FiTrash2 />
              </IconButton>
            )}
          </Stack>
          <LineList
            lines={g.items}
            onChange={(items) => setGroup(gi, { items })}
            placeholder="CBC"
            addLabel="Add item"
            maxLines={60}
          />
        </Box>
      ))}

      {s.groups.length < 6 && (
        <Button
          size="small"
          startIcon={<FiPlus />}
          onClick={() => setSidebar({ groups: [...s.groups, { title: "", items: [] }] })}
          sx={{ alignSelf: "flex-start" }}
        >
          Add group
        </Button>
      )}

      {/* Rebuilding a 27-item investigation menu one [+] click at a time is the
          kind of friction that makes a doctor abandon the feature. */}
      <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Paste a list
        </Typography>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          placeholder={"CBC\nFBS, PPBS\nHbA1C"}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }}>
          {s.groups.length > 1 && (
            <TextField size="small" select label="Into group" value={pasteInto} onChange={(e) => setPasteInto(Number(e.target.value))} sx={{ width: 160 }}>
              {s.groups.map((g, i) => (
                <MenuItem key={i} value={i}>
                  {g.title || `Group ${i + 1}`}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button
            size="small"
            variant="outlined"
            disabled={!linesFrom(paste).length}
            onClick={() => {
              const add = linesFrom(paste);
              const target = s.groups[pasteInto] ?? s.groups[0];
              setGroup(pasteInto, { items: [...target.items, ...add].slice(0, 60) });
              setPaste("");
              toast.success(`Added ${add.length} item${add.length > 1 ? "s" : ""}`);
            }}
          >
            Add {linesFrom(paste).length || ""} line{linesFrom(paste).length === 1 ? "" : "s"}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}

// ── ④ body ───────────────────────────────────────────────────────────────────
export function BodyPanel({ template, patch }: PanelProps) {
  const b = template.bodyJson;
  const setBody = (next: Partial<BodyJson>) => patch({ bodyJson: { ...b, ...next } });

  const toggleColumn = (c: MedicineColumn) => {
    const on = b.medicineColumns.includes(c);
    // Keep the template's chosen order; never let the doctor empty the table.
    const next = on
      ? b.medicineColumns.filter((x) => x !== c)
      : MEDICINE_COLUMNS.filter((x) => b.medicineColumns.includes(x) || x === c);
    if (!next.length) return;
    setBody({ medicineColumns: next });
  };

  return (
    <Stack spacing={2}>
      <Stack>
        {(
          [
            ["rxSymbol", "Print the ℞ symbol"],
            ["showVitals", "Show the vitals line"],
            ["showDiagnosis", "Show the diagnosis"],
            ["showAdviceText", "Show free-text advice"],
            ["showFollowUp", "Show the follow-up date"],
          ] as const
        ).map(([key, label]) => (
          <FormControlLabel
            key={key}
            control={<Checkbox checked={b[key]} onChange={(e) => setBody({ [key]: e.target.checked })} />}
            label={label}
          />
        ))}
      </Stack>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Medicine table columns
        </Typography>
        <Typography variant="caption" color="text.secondary">
          These are also the columns you fill in while writing a prescription.
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", mt: 0.5 }}>
          {MEDICINE_COLUMNS.map((c) => (
            <FormControlLabel
              key={c}
              control={
                <Checkbox
                  checked={b.medicineColumns.includes(c)}
                  disabled={c === "medicineName"}
                  onChange={() => toggleColumn(c)}
                />
              }
              label={COLUMN_LABELS[c]}
            />
          ))}
        </Box>
      </Box>

      <TextField
        size="small"
        label="Disclaimer (optional)"
        value={b.disclaimer}
        onChange={(e) => setBody({ disclaimer: e.target.value })}
        multiline
        minRows={2}
      />
    </Stack>
  );
}

// ── ⑥ footer ─────────────────────────────────────────────────────────────────
export function FooterPanel({ template, patch }: PanelProps) {
  const f = template.footerJson;
  const setFooter = (next: Partial<FooterJson>) => patch({ footerJson: { ...f, ...next } });
  const setColumn = (i: number, next: Partial<FooterJson["columns"][number]>) =>
    setFooter({ columns: f.columns.map((c, j) => (j === i ? { ...c, ...next } : c)) });

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Checkbox checked={template.showFooter} onChange={(e) => patch({ showFooter: e.target.checked })} />}
        label="Show the footer band"
      />

      {f.columns.map((col, i) => (
        <Box key={i} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <TextField
              size="small"
              fullWidth
              label="Column title"
              value={col.title}
              onChange={(e) => setColumn(i, { title: e.target.value })}
            />
            {f.columns.length > 1 && (
              <IconButton
                size="small"
                onClick={() => setFooter({ columns: f.columns.filter((_, j) => j !== i) })}
                aria-label="Remove column"
              >
                <FiTrash2 />
              </IconButton>
            )}
          </Stack>
          <LineList
            lines={col.lines}
            onChange={(lines) => setColumn(i, { lines })}
            placeholder="B-31, HIG Duplex Baramunda"
            addLabel="Add line"
            maxLines={6}
          />
        </Box>
      ))}

      {f.columns.length < 4 && (
        <Button
          size="small"
          startIcon={<FiPlus />}
          onClick={() => setFooter({ columns: [...f.columns, { title: "", lines: [] }] })}
          sx={{ alignSelf: "flex-start" }}
        >
          Add column
        </Button>
      )}
    </Stack>
  );
}
