"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dashboardHomeForRole } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { GoogleAuthInput } from "@/types/auth";

/**
 * Google signup/signin mutation. Mirrors useLogin: on success it seeds the auth
 * context and routes to the account role's dashboard. The `role` (doctor|patient)
 * only matters for a brand-new account — the backend ignores it for an existing one.
 */
export function useGoogleAuth() {
  const router = useRouter();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (input: GoogleAuthInput) => authService.google(input),
    onSuccess: ({ user }) => {
      setUser(user);
      toast.success(`Welcome, ${user.name.split(" ")[0]}!`);
      router.replace(dashboardHomeForRole(user.role));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
