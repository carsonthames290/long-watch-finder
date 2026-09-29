/** Browser-side YouTube search. No server, no API key — runs wherever the page is hosted. */

export type YtVideo = {
  id: string;
  title: string;
  channel: string;
  channelUrl: string | null;
  thumbnail: string;
  duration: string | null;
  views: string | null;
};

const READERS = ["https://r.jina.ai/", "https://r.jina.ai/https://"];

function buildUrl(reader: string, query: string) {
  const target = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`;
  return reader.endsWith("https://") ? reader + target.replace(/^https:\/\//, "") : reader + target;
}

/** Parse the reader's markdown rendering of a YouTube results page. */
function parse(md: string): YtVideo[] {
  const lines = md.split("\n");
  const out: YtVideo[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const head = line.match(/^###\s+\[(.+?)\]\(https:\/\/www\.youtube\.com\/(?:watch\?v=|shorts\/)([\w-]{11})/);
    if (!head) continue;
    const id = head[2]!;
    if (seen.has(id)) continue;
    seen.add(id);

    // duration sits on the thumbnail line just above the title
    let duration: string | null = null;
    for (let b = i - 1; b >= Math.max(0, i - 4); b--) {
      const d = lines[b]!.match(/\)\s+(\d{1,2}:\d{2}(?::\d{2})?)\s/);
      if (d) {
        duration = d[1]!;
        break;
      }
    }

    // channel + views sit just below the title
    let channel = "Unknown channel";
    let channelUrl: string | null = null;
    let views: string | null = null;
    for (let a = i + 1; a < Math.min(lines.length, i + 14); a++) {
      const c =
        lines[a]!.match(/^\[(.+?)\]\((https:\/\/www\.youtube\.com\/(?:@|channel\/)[^)]+)\)/) ??
        lines[a]!.match(/\[([^\]]{1,60})\]\((https:\/\/www\.youtube\.com\/(?:@|channel\/)[^)]+)\)/);
      if (c && channelUrl === null && !/^!/.test(c[1]!)) {
        channel = c[1]!;
        channelUrl = c[2]!;
      }
      const v = lines[a]!.match(/([\d.,]+[KMB]?)\s+views?/i) ?? lines[a]!.match(/^\s*([\d.,]+[KMB])\s+\S+\s+ago/);
      if (v && !views) views = `${v[1]} views`;
    }

    out.push({
      id,
      title: head[1]!.trim(),
      channel,
      channelUrl,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration,
      views,
    });
    if (out.length >= 40) break;
  }
  return out;
}

export async function searchYouTubeInBrowser(query: string): Promise<YtVideo[]> {
  let lastError: unknown = null;
  for (const reader of READERS) {
    try {
      const res = await fetch(buildUrl(reader, query), { headers: { Accept: "text/plain" } });
      if (!res.ok) throw new Error(String(res.status));
      const list = parse(await res.text());
      if (list.length) return list;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return [];
}
