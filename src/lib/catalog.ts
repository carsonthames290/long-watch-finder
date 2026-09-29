/** Everything here runs in the browser — no server, no API keys. */

export type Creator = { handle: string; name: string; tag: string };

/** Curated TikTok creators used to build the For You feed. */
export const TIKTOK_CREATORS: Creator[] = [
  { handle: "khaby.lame", name: "Khaby Lame", tag: "Comedy" },
  { handle: "zachking", name: "Zach King", tag: "Magic" },
  { handle: "bellapoarch", name: "Bella Poarch", tag: "Music" },
  { handle: "mrbeast", name: "MrBeast", tag: "Challenges" },
  { handle: "gordonramsayofficial", name: "Gordon Ramsay", tag: "Cooking" },
  { handle: "cznburak", name: "CZN Burak", tag: "Cooking" },
  { handle: "brittany_broski", name: "Brittany Broski", tag: "Comedy" },
  { handle: "itsjojosiwa", name: "JoJo Siwa", tag: "Dance" },
  { handle: "dylanlemay1", name: "Dylan Lemay", tag: "Food" },
  { handle: "chrisolsen", name: "Chris Olsen", tag: "Comedy" },
  { handle: "thehypehouse", name: "Hype House", tag: "Dance" },
  { handle: "nathanielbz", name: "Nathaniel B", tag: "Sports" },
  { handle: "cristiano", name: "Cristiano Ronaldo", tag: "Sports" },
  { handle: "nba", name: "NBA", tag: "Sports" },
  { handle: "nfl", name: "NFL", tag: "Sports" },
  { handle: "doggface208", name: "Doggface", tag: "Vibes" },
  { handle: "jiffpom", name: "Jiffpom", tag: "Pets" },
  { handle: "tuckerbudzyn", name: "Tucker Budzyn", tag: "Pets" },
  { handle: "thekingofrandom", name: "The King of Random", tag: "Science" },
  { handle: "5.min.crafts", name: "5-Minute Crafts", tag: "Life hacks" },
  { handle: "mrbones", name: "Mr Bones", tag: "Art" },
  { handle: "airrack", name: "Airrack", tag: "Challenges" },
  { handle: "natgeo", name: "National Geographic", tag: "Nature" },
  { handle: "nasa", name: "NASA", tag: "Space" },
];

/** Search topics offered on the YouTube page. */
export const YT_TOPICS = [
  "full length documentary",
  "long podcast episode",
  "live music full concert",
  "lofi study stream",
  "video essay",
  "gaming full playthrough",
  "history documentary",
  "space documentary",
  "cooking masterclass",
  "nature 4k relaxation",
];

export const TIKTOK_TAGS = ["All", ...Array.from(new Set(TIKTOK_CREATORS.map((c) => c.tag)))];

export const isHandle = (h: string) => /^[a-zA-Z0-9._]{1,24}$/.test(h);

/** Pull a YouTube video id out of any common YouTube link. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

/** Pull creator + id out of a TikTok link. */
export function tiktokParts(input: string): { author: string; id: string } | null {
  const m = input.trim().match(/tiktok\.com\/@([^/?#]+)\/video\/(\d+)/);
  return m ? { author: m[1]!, id: m[2]! } : null;
}

/* ---------------- local taste model (browser only) ---------------- */

export type Taste = { creators: Record<string, number>; tags: Record<string, number> };
const TASTE_KEY = "longform:taste-v2";
const FAV_KEY = "longform:favorites-v2";

export const emptyTaste = (): Taste => ({ creators: {}, tags: {} });

export function readTaste(): Taste {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    return raw ? { ...emptyTaste(), ...JSON.parse(raw) } : emptyTaste();
  } catch {
    return emptyTaste();
  }
}

export function writeTaste(t: Taste) {
  try {
    localStorage.setItem(TASTE_KEY, JSON.stringify(t));
  } catch {
    /* storage unavailable */
  }
}

export type Favorite = { kind: "youtube" | "tiktok"; id: string; author: string; title: string; url: string };

export function readFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeFavorites(list: Favorite[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    /* storage unavailable */
  }
}

/** Order creators by what the viewer has liked, with fresh ones mixed in. */
export function rankCreators(t: Taste, pool = TIKTOK_CREATORS): Creator[] {
  const score = (c: Creator) =>
    (t.creators[c.handle] ?? 0) * 3 + (t.tags[c.tag] ?? 0) + Math.random() * 2;
  return [...pool].filter((c) => (t.creators[c.handle] ?? 0) > -3).sort((a, b) => score(b) - score(a));
}
