"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { ResetPasswordInput } from "../schemas";

/** Consumes the emailed reset token, then sends the user back to sign in. */
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: ResetPasswordInput) =>
      authService.resetPassword({ token, password }),
    onSuccess: () => {
      toast.success("Password updated. Sign in with your new password.");
      router.replace(ROUTES.auth.login);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
