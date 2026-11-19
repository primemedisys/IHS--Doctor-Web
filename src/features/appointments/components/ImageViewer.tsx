"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { FiMaximize, FiMinus, FiPlus } from "react-icons/fi";

/*
 * Lifted verbatim out of ReportViewerDialog so the record reader can mount the
 * SAME viewer per sheet. Two hundred lines of pointer maths — pan, pinch,
 * wheel-zoom, fit — is not something to have twice.
 */

/** Does this URL point at an image we can render (and therefore pan/zoom)? */
export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|avif|svg)(\?|#|$)/i.test(url);
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 0.35;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Pan/zoom image viewer.
 *
 * An X-ray in a scrollable box is unreadable — you can only ever see a strip of
 * it and the two scrollbars fight the content. This shows the whole image
 * fitted, then lets it be zoomed and dragged like any image viewer:
 *   • the +/− buttons and the mouse wheel zoom;
 *   • click-and-hold drags (pointer events, so a touch drag works too);
 *   • the container hides overflow, so scrollbars never appear.
 *
 * Panning is only enabled once zoomed in — dragging an image that already fits
 * would just slide it off the screen for no reason.
 */
export function ImageViewer({ url, alt }: { url: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  /** True once the rendered image is taller/wider than the stage — see `pannable`. */
  const [overflowing, setOverflowing] = useState(false);

  /**
   * How far the image may be dragged before its edge leaves the stage, per axis.
   *
   * Measured from live rects rather than from `scale`, because the fitted size
   * depends on the image's own aspect: a portrait X-ray fits by height and a
   * landscape one by width, so the same zoom level overflows different axes.
   */
  const panBounds = useCallback(() => {
    const stage = stageRef.current?.getBoundingClientRect();
    const img = imgRef.current?.getBoundingClientRect();
    if (!stage || !img) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (img.width - stage.width) / 2),
      y: Math.max(0, (img.height - stage.height) / 2),
    };
  }, []);

  /**
   * Panning is offered whenever the image overflows — NOT only when zoomed past
   * fit. A tall report at 100% already overflows a wide stage, and refusing to
   * drag it left the bottom of the page unreachable.
   */
  const pannable = scale > MIN_SCALE || overflowing;

  /** Re-check overflow after anything that changes the rendered size. */
  const measure = useCallback(() => {
    const b = panBounds();
    setOverflowing(b.x > 1 || b.y > 1);
  }, [panBounds]);
  /**
   * Every pointer currently down, so two fingers can be told apart from one.
   * `touchAction: "none"` below suppresses the browser's own pinch — that is
   * needed for the drag-to-pan to work at all, but it means pinch-to-zoom has
   * to be implemented here or a phone has no way to zoom whatsoever.
   */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  /** Distance between the two active pointers. */
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const zoomTo = useCallback(
    (next: number) => {
      const s = clamp(next, MIN_SCALE, MAX_SCALE);
      setScale(s);
      // Back at fit, recentre — otherwise the image stays nudged off-centre from
      // an earlier pan with no way to tell it is not centred.
      if (s === MIN_SCALE) setOffset({ x: 0, y: 0 });
      // The transform lands next paint; measure after it.
      requestAnimationFrame(measure);
    },
    [measure],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Second finger down → this is a pinch, not a pan. Drop any drag in
    // progress so the image doesn't lurch as the gesture changes meaning.
    if (pointers.current.size === 2) {
      drag.current = null;
      setDragging(false);
      pinch.current = { dist: spread(), scale };
      return;
    }
    if (!pannable) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Pinch: scale relative to the spread the gesture STARTED at, so the zoom
    // tracks the fingers instead of drifting on every move event.
    if (pinch.current && pointers.current.size === 2) {
      const d = spread();
      if (pinch.current.dist > 0 && d > 0) zoomTo(pinch.current.scale * (d / pinch.current.dist));
      return;
    }
    if (!drag.current) return;
    // Clamped to the overflow, so the image can never be dragged into empty
    // space and "lost" off the side of the stage.
    const b = panBounds();
    setOffset({
      x: clamp(drag.current.ox + (e.clientX - drag.current.x), -b.x, b.x),
      y: clamp(drag.current.oy + (e.clientY - drag.current.y), -b.y, b.y),
    });
  };

  const endDrag = (e?: React.PointerEvent) => {
    if (e) pointers.current.delete(e.pointerId);
    // Lifting one finger ends the pinch; the other may keep panning.
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
    setDragging(false);
  };

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "#0b0b0f" }}>
      <Box
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onWheel={(e) => zoomTo(scale + (e.deltaY < 0 ? STEP : -STEP))}
        onDoubleClick={() => zoomTo(scale > MIN_SCALE ? MIN_SCALE : 2)}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden", // no scrollbars, ever — the image pans instead
          touchAction: "none", // we handle the drag; stop the browser panning too
          cursor: pannable ? (dragging ? "grabbing" : "grab") : "default",
        }}
      >
        <Box
          component="img"
          ref={imgRef}
          src={url}
          alt={alt}
          draggable={false}
          onLoad={measure}
          sx={{
            /*
             * Sized by INSET, not by `max-height: 100%`.
             *
             * The stage used to be a centred grid, where a percentage max-height
             * on the item resolves against an auto-sized row — i.e. against the
             * image's own height — so it constrained nothing. A landscape scan
             * happened to fit by width and looked fine; a portrait one (an L-S
             * spine film) rendered at full height and was cut off by the dialog,
             * at 100%, with panning still disabled because the scale was 1.
             *
             * Filling a definite box with `object-fit: contain` has no such
             * circularity: "fit" is now genuinely fitted at every aspect ratio.
             */
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            userSelect: "none",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            // Animate the zoom buttons, but never the drag — a transition on
            // pointermove makes panning feel like it is lagging behind.
            transition: dragging ? "none" : "transform 120ms ease-out",
          }}
        />
      </Box>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          bgcolor: "rgba(0,0,0,0.6)",
          borderRadius: 2,
          p: 0.5,
          alignItems: "center",
        }}
      >
        <Tooltip title="Zoom out">
          <span>
            <IconButton
              size="small"
              sx={{ color: "#fff" }}
              disabled={scale <= MIN_SCALE}
              onClick={() => zoomTo(scale - STEP)}
              aria-label="Zoom out"
            >
              <FiMinus />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="caption" sx={{ color: "#fff", minWidth: 42, textAlign: "center" }}>
          {Math.round(scale * 100)}%
        </Typography>
        <Tooltip title="Zoom in">
          <span>
            <IconButton
              size="small"
              sx={{ color: "#fff" }}
              disabled={scale >= MAX_SCALE}
              onClick={() => zoomTo(scale + STEP)}
              aria-label="Zoom in"
            >
              <FiPlus />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Fit to screen">
          <span>
            <IconButton
              size="small"
              sx={{ color: "#fff" }}
              disabled={scale === MIN_SCALE && offset.x === 0 && offset.y === 0}
              onClick={() => zoomTo(MIN_SCALE)}
              aria-label="Fit to screen"
            >
              <FiMaximize />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}
