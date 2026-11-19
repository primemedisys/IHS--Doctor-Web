"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver, type UseFormReturn } from "react-hook-form";
import { FiPlus } from "react-icons/fi";
import type { z } from "zod";
import { FormContainer } from "@/components/forms/FormContainer";

/**
 * The shared shell for every "list of items + inline add-form" portfolio editor
 * (education, experience, services, …). Extracts the heading / required-chip /
 * rows / add-form layout so each section is just a hook + schema + fields — no
 * copy-pasted scaffolding. `rows` is the rendered list; `children` is the
 * RHFTextField grid for the add-form. When `editing` is set, the same form
 * edits that row instead ("Save changes" / "Cancel").
 */
export function RepeatableSection<I extends FieldValues>({
  title,
  hint,
  required,
  isEmpty,
  methods,
  onAdd,
  addLabel,
  adding,
  editing = false,
  onCancelEdit,
  rows,
  children,
}: {
  title: string;
  hint?: string;
  required?: boolean;
  isEmpty: boolean;
  methods: UseFormReturn<I>;
  onAdd: (values: I) => void;
  addLabel: string;
  adding?: boolean;
  /** True while the form is editing an existing row. */
  editing?: boolean;
  onCancelEdit?: () => void;
  rows: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {required && (
          <Chip
            size="small"
            label={isEmpty ? "Required" : "Added"}
            color={isEmpty ? "warning" : "success"}
            variant={isEmpty ? "filled" : "outlined"}
          />
        )}
      </Stack>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}

      {!isEmpty && <Stack spacing={1}>{rows}</Stack>}

      <Box
        sx={{
          p: editing ? 1.5 : 0,
          borderRadius: 1.5,
          border: editing ? "1px solid" : "none",
          borderColor: "primary.main",
          bgcolor: editing ? "action.hover" : "transparent",
        }}
      >
        {editing && (
          <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "primary.main", mb: 1 }}>
            Editing entry
          </Typography>
        )}
        <FormContainer methods={methods} onSubmit={(v) => onAdd(v as I)}>
          <Grid container spacing={1.5} sx={{ alignItems: "flex-start" }}>
            {children}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  type="submit"
                  size="small"
                  variant={editing ? "contained" : "outlined"}
                  startIcon={editing ? undefined : <FiPlus />}
                  loading={adding}
                >
                  {editing ? "Save changes" : addLabel}
                </Button>
                {editing && onCancelEdit && (
                  <Button size="small" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </FormContainer>
      </Box>
    </Stack>
  );
}

/** A compact one-line row with edit / delete buttons — the default row renderer. */
export function SectionRow({
  primary,
  secondary,
  onEdit,
  onRemove,
  removing,
  active = false,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  /** Loads this row into the form for editing. */
  onEdit?: () => void;
  onRemove: () => void;
  removing?: boolean;
  /** Highlights the row currently being edited. */
  active?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.5,
        px: active ? 1 : 0,
        borderRadius: 1,
        bgcolor: active ? "action.selected" : "transparent",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
            {secondary}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        {onEdit && (
          <Button size="small" onClick={onEdit} disabled={active} sx={{ minWidth: 0 }}>
            Edit
          </Button>
        )}
        <Button size="small" color="error" onClick={onRemove} disabled={removing} sx={{ minWidth: 0 }}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}

/** The slice of a react-query mutation the editor needs (keeps it library-agnostic). */
interface Mutation<V> {
  mutate: (variables: V, options?: { onSuccess?: () => void }) => void;
  isPending: boolean;
}

/**
 * Add-or-edit wiring for one section form: one react-hook-form instance that
 * adds a new row, or — after `startEdit(row)` — saves changes to that row.
 * The form is reset to `empty` after a successful add/save or on cancel, and
 * removing the row being edited drops out of edit mode.
 */
export function useEditableSection<TItem extends { id: string }, TInput extends FieldValues>({
  schema,
  empty,
  toForm,
  add,
  update,
}: {
  schema: z.ZodType<TInput, TInput>;
  empty: TInput;
  toForm: (item: TItem) => TInput;
  add: Mutation<TInput>;
  update: Mutation<{ id: string; patch: Partial<TInput> }>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const methods = useForm<TInput>({
    resolver: zodResolver(schema) as unknown as Resolver<TInput>,
    defaultValues: empty as DefaultValues<TInput>,
  });
  const stopEdit = () => {
    setEditingId(null);
    methods.reset(empty);
  };
  const startEdit = (item: TItem) => {
    setEditingId(item.id);
    methods.reset(toForm(item));
  };
  const submit = (values: TInput) => {
    if (editingId) update.mutate({ id: editingId, patch: values }, { onSuccess: stopEdit });
    else add.mutate(values, { onSuccess: () => methods.reset(empty) });
  };
  /** Call before removing a row, so deleting the row being edited resets the form. */
  const forget = (id: string) => {
    if (editingId === id) stopEdit();
  };
  return {
    methods,
    editingId,
    startEdit,
    stopEdit,
    submit,
    forget,
    saving: add.isPending || update.isPending,
  };
}

/** Number → form string ("" when unset). */
export const yearStr = (v?: number | null) => (v != null ? String(v) : "");
