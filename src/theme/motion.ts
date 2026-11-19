import type { Variants } from "framer-motion";

/** Repo-standard easing curve (same as the Home hero). */
export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Parent container that staggers its `fadeUp` children. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Child entrance: fade in while rising. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

/** Scroll-reveal props — spread onto a motion component to animate it once on view. */
export const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px 0px" },
  transition: { duration: 0.5, ease: easeOut },
} as const;
