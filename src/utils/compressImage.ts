/**
 * Shrink a photo in the browser before uploading it.
 *
 * The reason is bandwidth, not storage. A modern phone camera produces 8–12 MB
 * per shot; over a typical mobile uplink that is a two-to-three minute upload
 * that any passing tunnel or lift will kill. The same page of a lab report,
 * resized to 1920px and re-encoded, is usually under 1 MB — a few seconds, and
 * it survives a flaky connection.
 *
 * Written against canvas rather than pulling in a library: this is ~40 lines,
 * has no transitive dependencies to audit in a health app, and the library
 * versions of it do the same thing.
 *
 * What it deliberately does NOT touch:
 *   • PDFs, DICOM, spreadsheets — not images; re-encoding would corrupt them.
 *   • Anything already small enough. Re-encoding a 200 KB JPEG only loses
 *     detail for no gain.
 *   • The original file, if anything fails. A compressor that throws must not
 *     block an upload — it falls back to sending what the user chose.
 *
 * Quality is 0.82: high enough that text in a photographed report stays
 * readable, which is the whole point of the document.
 */
export interface CompressOptions {
  /** Longest edge, in px. 1920 keeps report text legible when zoomed. */
  maxDimension?: number;
  /** Files at or below this are passed through untouched. */
  skipUnderBytes?: number;
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1920,
  skipUnderBytes: 1_000_000,
  quality: 0.82,
};

/** Only raster photos benefit. HEIC has no canvas decoder in most browsers. */
const COMPRESSIBLE = /^image\/(jpeg|png|webp)$/i;

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDimension, skipUnderBytes, quality } = { ...DEFAULTS, ...options };

  if (!COMPRESSIBLE.test(file.type) || file.size <= skipUnderBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    // Already small enough in pixels — re-encoding would only lose detail.
    if (scale === 1 && file.size <= skipUnderBytes * 2) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // If the "compressed" version is bigger — which happens with flat PNGs —
    // keep the original. Never make the upload worse.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // A decode failure must never block the upload.
    return file;
  }
}
