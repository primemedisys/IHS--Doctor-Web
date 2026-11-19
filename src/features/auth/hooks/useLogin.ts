"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dashboardHomeForRole } from "@/constants/routes";
import { env } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/utils/auth-token";
import { getErrorMessage } from "@/utils/error";
import type { LoginCredentials } from "../schemas";

/** Read the `{ error: { code } }` code off an axios error, if present. */
function errorCode(error: unknown): string | undefined {
  return (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error
    ?.code;
}

/** Toast + CTA that sends a non-doctor account to the patient site. */
function wrongPortalToast() {
  toast.error("This account is registered as a patient", {
    description: "Please sign in on the patient site.",
    action: {
      label: "Go to patient site",
      onClick: () => {
        window.location.href = env.patientUrl;
      },
    },
    duration: 10000,
  });
}

/**
 * Where to land after login: the `?redirect=` the route guard stashed (only
 * same-origin paths), else the role's dashboard home.
 */
function postLoginDestination(role: Parameters<typeof dashboardHomeForRole>[0]): string {
  if (typeof window !== "undefined") {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect?.startsWith("/") && !redirect.startsWith("//")) return redirect;
  }
  return dashboardHomeForRole(role);
}

/**
 * Login mutation: authenticates against the backend, seeds the auth context
 * and routes to the account role's dashboard. Errors surface via toast; the
 * form stays mounted for retry.
 */
export function useLogin() {
  const router = useRouter();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (input: LoginCredentials) => authService.login(input),
    onSuccess: ({ user }) => {
      // Belt-and-suspenders: the doctor app never keeps a non-doctor session.
      if (user.role !== "doctor") {
        tokenStorage.clear();
        wrongPortalToast();
        return;
      }
      setUser(user);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      router.replace(postLoginDestination(user.role));
    },
    onError: (error) => {
      // A patient tried to sign in on the doctor app — point them home.
      if (errorCode(error) === "WRONG_PORTAL") {
        wrongPortalToast();
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });
}
