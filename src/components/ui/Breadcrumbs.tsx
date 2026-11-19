"use client";

import MuiBreadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { FiChevronRight } from "react-icons/fi";

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail; the last item renders as plain text. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <MuiBreadcrumbs separator={<FiChevronRight size={14} />} aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return last || !item.href ? (
          <Typography key={item.label} variant="body2" color="text.primary" aria-current={last ? "page" : undefined}>
            {item.label}
          </Typography>
        ) : (
          <Link key={item.label} component={NextLink} href={item.href} variant="body2" color="text.secondary">
            {item.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
