"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { UpdateProfileInput } from "../schemas";

/** PATCH /auth/profile — saves own profile and refreshes the auth context. */
export function useUpdateProfile() {
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (patch: UpdateProfileInput) => authService.updateProfile(patch),
    onSuccess: (user) => {
      setUser(user);
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
