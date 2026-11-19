"use client";

import { useSyncExternalStore } from "react";

/**
 * Is the device online?
 *
 * `useSyncExternalStore` rather than useState + two effects: it subscribes to
 * the browser's own events and reads the value at render time, so there is no
 * window where React shows "online" because an effect has not run yet.
 *
 * The server snapshot is `true` on purpose. `navigator` does not exist during
 * SSR, and rendering an offline banner into the HTML of every page — which the
 * client would then immediately remove — is worse than assuming connectivity.
 *
 * `navigator.onLine` only knows whether the device has a NETWORK, not whether
 * that network reaches us: a captive-portal wifi reports online. So this is a
 * fast negative signal, never a positive guarantee — the request layer still
 * has to handle failure.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
