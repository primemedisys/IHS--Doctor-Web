"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dashboardHomeForRole } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import type { RegisterInput } from "../schemas";

/** Registration mutation — creates the mock account and routes to the dashboard. */
export function useRegister() {
  const router = useRouter();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user }) => {
      setUser(user);
      if (user.role === "doctor") {
        toast.success("Account created — your profile is pending verification.");
      } else {
        toast.success(`Welcome to IHS, ${user.name.split(" ")[0]}!`);
      }
      router.replace(dashboardHomeForRole(user.role));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
