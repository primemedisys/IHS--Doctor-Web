"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

/** Access the auth context; throws if used outside <AuthProvider>. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
