"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Open/close state for dialogs, drawers, menus and popovers.
 * Returns a memoized bag so it's safe to spread into child props.
 */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return useMemo(
    () => ({ isOpen, open, close, toggle, setIsOpen }),
    [isOpen, open, close, toggle],
  );
}
