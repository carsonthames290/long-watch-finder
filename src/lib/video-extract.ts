export type FoundVideo = {
  embed_url: string;
  watch_url: string | null;
  provider: string;
  title: string | null;
  thumbnail_url: string | null;
};

const YT_ID = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^"'\s]*v=|embed\/|live\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;
const VIMEO_ID = /(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/g;
const DAILYMOTION_ID = /dailymotion\.com\/(?:embed\/)?video\/([A-Za-z0-9]+)/g;
const IFRAME_SRC = /<iframe[^>]+src=["']([^"']+)["']/gi;
const VIDEO_SRC = /<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/gi;

function absolute(src: string, pageUrl: string): string | null {
  try {
    return new URL(src, pageUrl).toString();
  } catch {
    return null;
  }
}

/** Extracts embeddable videos from a page's HTML. Works for long-form content
 * (multi-hour streams, recordings) since playback is delegated to the source player. */
export function extractVideos(html: string, pageUrl: string, pageTitle?: string): FoundVideo[] {
  const found = new Map<string, FoundVideo>();
  const haystacks: string[] = [html];

  for (const m of html.matchAll(IFRAME_SRC)) {
    const abs = absolute(m[1]!, pageUrl);
    if (abs) haystacks.push(abs);
  }

  const all = haystacks.join("\n");

  for (const m of all.matchAll(YT_ID)) {
    const id = m[1]!;
    found.set(`yt:${id}`, {
      embed_url: `https://www.youtube-nocookie.com/embed/${id}`,
      watch_url: `https://www.youtube.com/watch?v=${id}`,
      provider: "youtube",
      title: pageTitle ?? null,
      thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }

  for (const m of all.matchAll(VIMEO_ID)) {
    const id = m[1]!;
    found.set(`vimeo:${id}`, {
      embed_url: `https://player.vimeo.com/video/${id}`,
      watch_url: `https://vimeo.com/${id}`,
      provider: "vimeo",
      title: pageTitle ?? null,
      thumbnail_url: null,
    });
  }

  for (const m of all.matchAll(DAILYMOTION_ID)) {
    const id = m[1]!;
    found.set(`dm:${id}`, {
      embed_url: `https://www.dailymotion.com/embed/video/${id}`,
      watch_url: `https://www.dailymotion.com/video/${id}`,
      provider: "dailymotion",
      title: pageTitle ?? null,
      thumbnail_url: null,
    });
  }

  for (const m of html.matchAll(VIDEO_SRC)) {
    const abs = absolute(m[1]!, pageUrl);
    if (!abs) continue;
    found.set(`file:${abs}`, {
      embed_url: abs,
      watch_url: abs,
      provider: "file",
      title: pageTitle ?? null,
      thumbnail_url: null,
    });
  }

  return [...found.values()];
}

/** Keeps only same-host http(s) page URLs, dropping assets and fragments. */
export function isScannablePage(url: string, rootUrl: string): boolean {
  try {
    const u = new URL(url);
    const root = new URL(rootUrl);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (u.hostname !== root.hostname) return false;
    if (/\.(png|jpe?g|gif|svg|webp|css|js|ico|pdf|zip|woff2?|mp3)$/i.test(u.pathname)) return false;
    u.hash = "";
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}
