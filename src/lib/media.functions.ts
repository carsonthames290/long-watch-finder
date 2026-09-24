import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YtVideo = { id: string; title: string; channel: string; channelUrl: string | null; thumbnail: string; duration: string | null; views: string | null };
export type TtVideo = { id: string; author: string; url: string; title: string };

const q = (d: unknown) => z.object({ query: z.string().trim().min(1).max(120) }).parse(d);

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator(q)
  .handler(async ({ data }): Promise<YtVideo[]> => {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}&hl=en`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" },
    });
    if (!res.ok) throw new Error(`YouTube search failed [${res.status}]`);
    const html = await res.text();
    const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    if (!m) return [];
    const out: YtVideo[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== "object" || out.length >= 40) return;
      if (n.videoRenderer?.videoId) {
        const v = n.videoRenderer;
        const owner = v.ownerText?.runs?.[0];
        const path = owner?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
        out.push({
          id: v.videoId,
          title: v.title?.runs?.map((r: any) => r.text).join("") ?? "Untitled",
          channel: owner?.text ?? "Unknown channel",
          channelUrl: path ? `https://www.youtube.com${path}` : null,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          duration: v.lengthText?.simpleText ?? null,
          views: v.shortViewCountText?.simpleText ?? v.viewCountText?.simpleText ?? null,
        });
        return;
      }
      for (const k in n) walk(n[k]);
    };
    walk(JSON.parse(m[1]));
    return out;
  });

export const searchTikTok = createServerFn({ method: "GET" })
  .inputValidator(q)
  .handler(async ({ data }): Promise<TtVideo[]> => {
    const { firecrawlSearch } = await import("./firecrawl.server");
    const results = await firecrawlSearch(`site:tiktok.com ${data.query}`, 25);
    const seen = new Set<string>();
    const out: TtVideo[] = [];
    for (const r of results) {
      const m = r.url.match(/tiktok\.com\/@([^/?#]+)\/video\/(\d+)/);
      if (!m || seen.has(m[2])) continue;
      seen.add(m[2]);
      out.push({ id: m[2], author: m[1], url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`, title: r.title ?? "" });
    }
    return out;
  });
