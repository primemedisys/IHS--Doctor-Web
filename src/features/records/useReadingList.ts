"use client";

import { useMemo } from "react";
import { isImageUrl } from "@/features/appointments/components/ImageViewer";
import { bucketOf, reportType, type DocBucket } from "./bucket";
import type { SnapshotRecord } from "@/types/appointment";
import type { TimelineRow } from "@/types/timeline";

/**
 * One readable thing in the record reader.
 *
 * `source` is what makes this list workable at all: the two kinds of document
 * arrive completely differently. An uploaded record is a static file the browser
 * can fetch itself; a prescription is an authenticated endpoint that has to be
 * fetched as a blob. The sheet branches on this, nothing else does.
 */
export interface ReadingItem {
  /** Stable across re-sorts — the reader pins scroll position to it, not to an index. */
  key: string;
  kind: DocBucket;
  /** "RX-2026-000004", "Chest X-ray" — what the sheet header and the rail print. */
  label: string;
  /** "YYYY-MM-DD". What the list sorts on. */
  date: string;
  source:
    | { type: "url"; url: string; isImage: boolean; record: SnapshotRecord }
    | { type: "prescription"; id: string };
}

/** Newest first; ties broken so the order can never shuffle between renders. */
const byDateDesc = (a: ReadingItem, b: ReadingItem) =>
  b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key);

/**
 * Everything the doctor can read about this patient, newest first.
 *
 * Pure — it fetches nothing. Both inputs are already in the page's memory, which
 * is what makes opening the reader cost one request (the document clicked)
 * rather than one per document.
 *
 * Three rules do the real work:
 *
 * 1. **A prescription is dated by the consultation that issued it**, not by the
 *    day someone uploaded a copy. An uploaded record is filed by
 *    `recordDate ?? uploadedAt`, which for an untouched upload is the upload
 *    day — that is what once stacked four prescriptions from four different
 *    visits onto one date. The register fixes this the same way; the two must
 *    not disagree.
 *
 * 2. **A prescription and its uploaded copy are ONE item.** The upload wins: it
 *    is a real file the browser can fetch with no round trip through an
 *    authenticated endpoint.
 *
 * 3. **Only prescriptions that can actually be opened are listed.** A row whose
 *    `canView` is false has no id to fetch, and a sheet that can never render is
 *    worse than an absent one.
 */
export function useReadingList(
  records: SnapshotRecord[] | undefined,
  timelineRows: TimelineRow[] | undefined,
): ReadingItem[] {
  return useMemo(() => {
    const rows = timelineRows ?? [];

    // Rule 1: Rx number → the date of the consultation that issued it.
    const rxDates = new Map<string, string>();
    for (const r of rows) {
      const no = r.prescription?.rxNumber;
      if (no) rxDates.set(no, r.date);
    }

    const items: ReadingItem[] = [];
    const uploadedRxNumbers = new Set<string>();

    for (const rec of records ?? []) {
      const date = (rec.tag ? rxDates.get(rec.tag) : null) ?? rec.recordDate ?? rec.uploadedAt;
      if (!date || !rec.fileUrl) continue;
      const kind = bucketOf(rec);
      if (kind === "prescription" && rec.tag) uploadedRxNumbers.add(rec.tag);
      items.push({
        key: `rec:${rec.id ?? rec.fileUrl}`,
        kind,
        label: rec.tag ?? reportType(rec.fileType),
        date: date.slice(0, 10),
        source: { type: "url", url: rec.fileUrl, isImage: isImageUrl(rec.fileUrl), record: rec },
      });
    }

    for (const row of rows) {
      const rx = row.prescription;
      // Rule 3, then rule 2.
      if (!rx?.canView || !rx.id) continue;
      if (rx.rxNumber && uploadedRxNumbers.has(rx.rxNumber)) continue;
      items.push({
        key: `rx:${rx.id}`,
        kind: "prescription",
        label: rx.rxNumber ?? "Prescription",
        date: row.date.slice(0, 10),
        source: { type: "prescription", id: rx.id },
      });
    }

    return items.sort(byDateDesc);
  }, [records, timelineRows]);
}
