"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { getQueryClient } from "./query-client";

/**
 * Provides the React Query client to the tree. `useState` ensures we grab the
 * client exactly once per component instance (the factory already returns the
 * browser singleton). Devtools are tree-shaken out of production builds.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
