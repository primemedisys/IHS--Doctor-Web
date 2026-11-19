"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form";

export type RHFTextFieldProps<T extends FieldValues> = {
  name: Path<T>;
} & Omit<TextFieldProps, "name" | "error" | "helperText" | "value" | "defaultValue">;

/**
 * MUI TextField bound to React Hook Form via <Controller>. Surfaces the field's
 * Zod/RHF validation error as `helperText` automatically. `helperText` you pass
 * is used as the resting hint when there's no error.
 */
export function RHFTextField<T extends FieldValues>({ name, helperText, ...props }: RHFTextFieldProps<T> & { helperText?: string }) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={field.value ?? ""}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          {...props}
        />
      )}
    />
  );
}
