"use client";

import { useMotionValue, useReducedMotion, useSpring, type MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

const SPRING = { stiffness: 110, damping: 22, mass: 0.5 };

/**
 * Pointer position over an element, normalised to -1…1 on each axis and
 * smoothed with a spring — for a small, bounded parallax. Callers scale it
 * (e.g. `useTransform(x, v => v * 10)` for ±10px).
 *
 * Inert (stays at 0) for touch / coarse pointers and for reduced-motion users.
 * Listeners and the pending animation frame are cleaned up on unmount, and the
 * values ease back to centre when the pointer leaves.
 */
export function usePointerParallax<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const ref = useRef<T | null>(null);
  const reduceMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        rawX.set(Math.max(-1, Math.min(1, nx)));
        rawY.set(Math.max(-1, Math.min(1, ny)));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      rawX.set(0);
      rawY.set(0);
    };
  }, [reduceMotion, rawX, rawY]);

  return { ref, x, y };
}
