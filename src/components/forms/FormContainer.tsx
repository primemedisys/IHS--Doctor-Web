"use client";

import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from "react-hook-form";

export interface FormContainerProps<TFieldValues extends FieldValues> {
  /** The object returned by `useForm()`. */
  methods: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * React Hook Form context + a native <form>. Wire any RHF form with this and
 * drop `RHF*` fields inside — they read validation state from context, so no
 * prop-drilling of `register`/`errors`.
 */
export function FormContainer<TFieldValues extends FieldValues>({
  methods,
  onSubmit,
  children,
  sx,
}: FormContainerProps<TFieldValues>) {
  return (
    <FormProvider {...methods}>
      <Box component="form" noValidate onSubmit={methods.handleSubmit(onSubmit)} sx={sx}>
        {children}
      </Box>
    </FormProvider>
  );
}
