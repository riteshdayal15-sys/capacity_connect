/**
 * Shared video-URL helper (Capacity Connect).
 *
 * Normalizes any YouTube URL (watch?v=, youtu.be/, /embed/, /shorts/, /live/)
 * into the embeddable https://www.youtube.com/embed/ID form.
 * Plain watch/short-link URLs refuse to load inside an <iframe>
 * (YouTube sends X-Frame-Options: DENY → "refused to connect").
 * Also preserves start-time (?t= / ?start=).
 * Direct video files (.mp4/.webm/...) are returned as-is for a <video> tag.
 */

export type EmbeddableMedia =
  | { kind: "youtube"; src: string }
  | { kind: "file"; src: string };

export function toEmbedUrl(rawUrl: string): EmbeddableMedia | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) {
    return { kind: "file", src: url };
  }

  const idMatch = url.match(
    /(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (!idMatch) return null;

  let startParam = "";
  const startMatch = url.match(/[?&](?:start|t)=([^&#]+)/);
  if (startMatch) {
    const raw = decodeURIComponent(startMatch[1]);
    let seconds: number | null = null;
    if (/^\d+$/.test(raw)) {
      seconds = parseInt(raw, 10);
    } else {
      const hms = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
      if (hms && (hms[1] || hms[2] || hms[3])) {
        seconds =
          parseInt(hms[1] || "0", 10) * 3600 +
          parseInt(hms[2] || "0", 10) * 60 +
          parseInt(hms[3] || "0", 10);
      }
    }
    if (seconds !== null && seconds > 0) startParam = `?start=${seconds}`;
  }

  return { kind: "youtube", src: `https://www.youtube.com/embed/${idMatch[1]}${startParam}` };
}
