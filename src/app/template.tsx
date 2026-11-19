"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Set once the first page has MOUNTED on the client — module scope, so it
 * survives navigations (a template remounts on every navigation).
 *
 * Written in an effect, never during render: render must be pure. The old
 * version flipped it inside the useState initializer, and React (Strict Mode,
 * dev) runs initializers twice — the second run saw `true`, so the hydrating
 * client rendered opacity 0 while the server HTML had opacity 1, a hydration
 * mismatch on every first load.
 */
let mounted = false;

/**
 * Route transition: each client-side navigation fades the new page in.
 * The very first load is NOT animated (initial={false}), so server-rendered
 * content is never hidden waiting for JavaScript and the server and client
 * render the same style. Opacity only — a transform here would break the
 * sticky/fixed navigation inside. Reduced-motion users get no animation (the
 * global MotionConfig).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  // Read only. On the server and on the hydrating first render this is false.
  const [animate] = useState(() => mounted);
  useEffect(() => {
    mounted = true;
  }, []);
  return (
    <motion.div initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
