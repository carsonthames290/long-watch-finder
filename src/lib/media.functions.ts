import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YtVideo = { id: string; title: string; channel: string; channelUrl: string | null; thumbnail: string; duration: string | null; views: string | null };
export type TtVideo = { id: string; author: string; url: string; title: string; topic: string };

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
    walk(JSON.parse(m[1]!));
    return out;
  });

export const searchTikTok = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ topics: z.array(z.string().trim().min(1).max(80)).min(1).max(5) }).parse(d))
  .handler(async ({ data }): Promise<TtVideo[]> => {
    const { firecrawlSearch } = await import("./firecrawl.server");
    const fetchTopic = async (topic: string) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await firecrawlSearch(`site:tiktok.com ${topic}`, 20);
          return r.map((x) => ({ ...x, topic }));
        } catch (e) {
          console.error("tiktok search failed", topic, attempt, e);
          await new Promise((res) => setTimeout(res, 800));
        }
      }
      return [];
    };
    let lists = await Promise.all(data.topics.map(fetchTopic));
    const hasVideo = (l: { url: string }[]) => l.some((x) => /tiktok\.com\/@[^/]+\/video\/\d+/.test(x.url));
    if (!lists.some(hasVideo)) {
      // fallback so the feed is never empty
      lists = [await fetchTopic("funny"), await fetchTopic("trending")];
    }
    const seen = new Set<string>();
    const out: TtVideo[] = [];
    // interleave topics so the feed is mixed
    const max = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) {
      for (const l of lists) {
        const r = l[i];
        if (!r) continue;
        const m = r.url.match(/tiktok\.com\/@([^/?#]+)\/video\/(\d+)/);
        const author = m?.[1], id = m?.[2];
        if (!author || !id || seen.has(id)) continue;
        seen.add(id);
        out.push({ id, author, url: `https://www.tiktok.com/@${author}/video/${id}`, title: r.title ?? "", topic: r.topic });
      }
    }
    return out;
  });
