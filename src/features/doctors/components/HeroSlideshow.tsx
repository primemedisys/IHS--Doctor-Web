"use client";

import Box from "@mui/material/Box";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/** How long each image stays on screen before the next one fades in. */
const SLIDE_MS = 7000;
/** Crossfade length (seconds). */
const FADE_S = 1.6;
/** The slow zoom-out runs across the whole time an image is visible. */
const ZOOM_S = SLIDE_MS / 1000 + FADE_S;
/** Starting scale of the zoom-out — subtle on purpose. */
const ZOOM_FROM = 1.08;

/**
 * Background slideshow for the portfolio hero: the doctor's own 1–3 images,
 * stacked and crossfaded, each with a slow zoom-out while it is showing.
 *
 * - All slides stay mounted (absolutely positioned, `object-fit: cover`), so a
 *   change never shifts the layout or re-requests an image.
 * - The outgoing slide keeps full opacity until the incoming one has faded in
 *   on top of it, so the crossfade never dips to the background.
 * - Images that fail to load drop out of the rotation; with none left the
 *   component renders nothing and the hero's plain background shows.
 * - Reduced motion: no rotation and no zoom — the first image just sits still.
 * - The timer pauses while the tab is hidden; timer and listener are cleaned
 *   up on unmount or when the image list changes.
 */
export function HeroSlideshow({ images }: { images: readonly string[] }) {
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const slides = useMemo(
    () => Array.from(new Set(images)).filter((src) => src && !failed.has(src)),
    [images, failed],
  );
  const [active, setActive] = useState(0);
  const count = slides.length;
  const current = count > 0 ? active % count : 0;

  useEffect(() => {
    if (count < 2 || reduceMotion) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer == null) timer = setInterval(() => setActive((i) => (i + 1) % count), SLIDE_MS);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count, reduceMotion]);

  if (count === 0) return null;

  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {slides.map((src, i) => {
        const isActive = i === current;
        return (
          <motion.img
            key={src}
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(src);
                return next;
              })
            }
            initial={{ opacity: 0, scale: reduceMotion ? 1 : ZOOM_FROM }}
            animate={
              isActive
                ? { opacity: 1, scale: reduceMotion ? 1 : [ZOOM_FROM, 1] }
                : { opacity: 0 }
            }
            transition={
              isActive
                ? { opacity: { duration: FADE_S, ease: "easeInOut" }, scale: { duration: ZOOM_S, ease: "linear" } }
                : { opacity: { duration: 0.4, delay: FADE_S } }
            }
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              zIndex: isActive ? 1 : 0,
              willChange: "opacity, transform",
            }}
          />
        );
      })}
    </Box>
  );
}
