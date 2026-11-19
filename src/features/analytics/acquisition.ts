import { growthOf, pctOf } from "./format";
import type { AcquisitionGroup, AcquisitionGroupKey, AcquisitionKpis, AcquisitionPoint } from "./types";

/** Several API groups shown as one card / slice (counts, previous and sources summed). */
export interface FoldedGroup {
  key: string;
  label: string;
  count: number;
  previous: number;
  percent: number | null;
  change: number | null;
  sources: AcquisitionGroup["sources"];
  /** The raw groups folded in, for captions ("3 not asked"). */
  parts: AcquisitionGroup[];
}

export function foldGroups(kpis: AcquisitionKpis, folds: { key: string; label: string; groups: AcquisitionGroupKey[] }[]): FoldedGroup[] {
  return folds.map((f) => {
    const parts = kpis.groups.filter((g) => f.groups.includes(g.group));
    const count = parts.reduce((a, g) => a + g.count, 0);
    const previous = parts.reduce((a, g) => a + g.previous, 0);
    return {
      key: f.key,
      label: f.label,
      count,
      previous,
      percent: pctOf(count, kpis.newPatients),
      change: growthOf(count, previous),
      sources: parts.flatMap((g) => g.sources).sort((a, b) => b.count - a.count),
      parts,
    };
  });
}

export const groupCount = (kpis: AcquisitionKpis, key: AcquisitionGroupKey) => kpis.groups.find((g) => g.group === key)?.count ?? 0;

/** The overview's five cards: Other = other + not sure + not asked. */
export const OVERVIEW_FOLDS: { key: string; label: string; icon: string; groups: AcquisitionGroupKey[] }[] = [
  { key: "google", label: "Google", icon: "FiSearch", groups: ["google"] },
  { key: "social", label: "Social media / Meta", icon: "FiShare2", groups: ["social"] },
  { key: "referral", label: "Referral", icon: "FiUserPlus", groups: ["referral"] },
  { key: "ihs", label: "IHS platform", icon: "FiGlobe", groups: ["ihs"] },
  { key: "other", label: "Other", icon: "FiMoreHorizontal", groups: ["other", "undisclosed", "not_captured"] },
];

/** A trend point folded to the chart's six series (Other includes "not sure"). */
export function foldPoint(p: AcquisitionPoint) {
  return {
    bucket: p.bucket,
    google: p.google ?? 0,
    social: p.social ?? 0,
    referral: p.referral ?? 0,
    ihs: p.ihs ?? 0,
    other: (p.other ?? 0) + (p.undisclosed ?? 0),
    not_captured: p.not_captured ?? 0,
  };
}
