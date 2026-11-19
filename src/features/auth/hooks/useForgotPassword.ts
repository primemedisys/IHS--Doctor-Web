"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { ForgotPasswordInput } from "../schemas";

/**
 * Requests a reset link. The success copy mirrors the backend's
 * no-enumeration policy — we never confirm whether the email exists.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => authService.forgotPassword(input),
    onSuccess: () => toast.success("If that email is registered, a reset link is on its way."),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
