/** Browser-side TikTok discovery via a CORS reader of public hashtag pages. */

export type TtVideo = { id: string; author: string; tag: string };

export const TT_TAGS = [
  "funny", "comedy", "cooking", "food", "pets", "cats", "dogs", "sports",
  "basketball", "soccer", "music", "dance", "art", "science", "space",
  "nature", "gaming", "lifehack", "magic", "travel", "fitness", "cars",
];

export async function fetchTag(tag: string): Promise<TtVideo[]> {
  const clean = tag.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  if (!clean) return [];
  const res = await fetch(`https://r.jina.ai/https://www.tiktok.com/tag/${clean}`, {
    headers: { "X-Engine": "browser", Accept: "text/plain" },
  });
  if (!res.ok) throw new Error(String(res.status));
  const text = await res.text();
  const seen = new Set<string>();
  const out: TtVideo[] = [];
  for (const m of text.matchAll(/tiktok\.com\/@([\w.]+)\/video\/(\d{8,})/g)) {
    const id = m[2]!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, author: m[1]!, tag: clean });
  }
  return out;
}
