"use client";

import GlobalStyles from "@mui/material/GlobalStyles";
import { alpha } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Desktop custom cursor: a small precise dot plus a soft trailing ring that
 * grows over clickable things. Purely visual and `pointer-events: none`, so it
 * never blocks clicks, selection or dragging.
 *
 * Safety rules:
 * - Only on a fine, hovering pointer (mouse) at ≥ 900px wide. Touch, pens,
 *   small screens → nothing changes.
 * - The native cursor is hidden ONLY after this has initialised (a class on
 *   <html>); if JavaScript fails, the normal cursor simply stays.
 * - Text fields, maps, iframes (PDF viewers, video), drag-and-drop zones and
 *   anything marked `data-native-cursor` keep the native cursor, and the custom
 *   one hides there.
 * - Off on working pages where precision matters (dashboards, maps, video
 *   calls) — see EXCLUDED_ROUTES.
 * - Reduced motion: no trailing ring, the dot just follows the pointer.
 * - Listeners and the animation frame are cleaned up on unmount / route change.
 */

const EXCLUDED_ROUTES: RegExp[] = [/^\/dashboard(\/|$)/, /^\/map(\/|$)/, /^\/ambulance(\/|$)/, /\/call(\/|$)/];

/** Where the native cursor must stay (and the custom one hides). */
const NATIVE_SELECTOR = [
  "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]):not([type=range])",
  "textarea",
  "select",
  "[contenteditable='true']",
  "iframe",
  "video",
  ".gm-style",
  "[data-native-cursor]",
  "[draggable='true']",
].join(",");

/** Where the ring switches to its "hover" state. */
const INTERACTIVE_SELECTOR =
  "a[href], button:not(:disabled), [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], label, summary, input[type=checkbox], input[type=radio], .MuiChip-clickable, [data-cursor='hover']";

const MEDIA = "(hover: hover) and (pointer: fine) and (min-width: 900px)";

function useCursorEnabled(): boolean {
  const pathname = usePathname() ?? "";
  const excluded = EXCLUDED_ROUTES.some((re) => re.test(pathname));
  const [mediaOk, setMediaOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MEDIA);
    const update = () => setMediaOk(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mediaOk && !excluded;
}

export function CustomCursor() {
  const enabled = useCursorEnabled();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!enabled || !dot || !ring) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let frame = 0;
    let shown = false;

    const setMode = (mode: "hidden" | "default" | "hover") => {
      ring.dataset.mode = mode;
      dot.dataset.mode = mode;
    };

    const tick = () => {
      // The ring eases toward the pointer (a gentle trail); the dot is exact.
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      frame = Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const schedule = () => {
      if (reduceMotion) {
        rx = x;
        ry = y;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        rx = x;
        ry = y;
        shown = true;
      }
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(NATIVE_SELECTOR)) setMode("hidden");
      else if (target?.closest(INTERACTIVE_SELECTOR)) setMode("hover");
      else setMode("default");
      schedule();
    };
    const onDown = () => ring.setAttribute("data-pressed", "true");
    const onUp = () => ring.removeAttribute("data-pressed");
    // Leaving the window — or entering an iframe — hides the custom cursor.
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) setMode("hidden");
    };

    setMode("hidden");
    root.classList.add("ihs-custom-cursor");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("ihs-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseout", onOut);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <GlobalStyles
        styles={{
          "html.ihs-custom-cursor, html.ihs-custom-cursor *": { cursor: "none !important" },
          [`html.ihs-custom-cursor :is(${NATIVE_SELECTOR}), html.ihs-custom-cursor :is(${NATIVE_SELECTOR}) *`]: {
            cursor: "auto !important",
          },
          "html.ihs-custom-cursor :is(input, textarea, [contenteditable='true'])": { cursor: "text !important" },
        }}
      />
      <div ref={ringRef} aria-hidden className="ihs-cursor-ring" data-mode="hidden" />
      <div ref={dotRef} aria-hidden className="ihs-cursor-dot" data-mode="hidden" />
      <GlobalStyles
        styles={(theme) => ({
          ".ihs-cursor-dot, .ihs-cursor-ring": {
            position: "fixed",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 2147483000,
            borderRadius: "50%",
            willChange: "transform",
            transition: "opacity 0.15s ease",
          },
          ".ihs-cursor-dot": {
            width: 6,
            height: 6,
            marginLeft: -3,
            marginTop: -3,
            background: theme.palette.secondary.main,
          },
          ".ihs-cursor-ring": {
            width: 30,
            height: 30,
            marginLeft: -15,
            marginTop: -15,
            border: `1.5px solid ${theme.palette.secondary.main}`,
            opacity: 0.45,
            transitionProperty: "opacity, width, height, margin, background-color, border-color",
            transitionDuration: "0.2s",
          },
          ".ihs-cursor-ring[data-mode='hover']": {
            width: 44,
            height: 44,
            marginLeft: -22,
            marginTop: -22,
            opacity: 0.9,
            backgroundColor: alpha(theme.palette.secondary.main, 0.08),
          },
          ".ihs-cursor-ring[data-pressed='true']": { width: 24, height: 24, marginLeft: -12, marginTop: -12 },
          ".ihs-cursor-dot[data-mode='hidden'], .ihs-cursor-ring[data-mode='hidden']": { opacity: 0 },
          "@media (prefers-reduced-motion: reduce)": {
            ".ihs-cursor-ring": { display: "none" },
          },
        })}
      />
    </>
  );
}
