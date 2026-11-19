"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dashboardHomeForRole } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { LoginInput } from "../schemas";

/** Admin sign-in via the dedicated /auth/admin/login endpoint (rejects non-admins). */
export function useAdminLogin() {
  const router = useRouter();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.adminLogin(input),
    onSuccess: ({ user }) => {
      setUser(user);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      router.replace(dashboardHomeForRole(user.role));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
