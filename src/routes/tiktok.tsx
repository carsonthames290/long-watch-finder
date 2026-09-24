import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { searchTikTok, type TtVideo } from "@/lib/media.functions";
import { ChevronUp, ChevronDown, Heart, ThumbsDown } from "lucide-react";

export const Route = createFileRoute("/tiktok")({
  head: () => ({
    meta: [
      { title: "For You — Longform" },
      { name: "description", content: "A TikTok For You feed that learns what you like, with credit to every creator." },
      { property: "og:title", content: "For You — Longform" },
      { property: "og:description", content: "Scroll TikToks in a feed that learns from what you like." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TikTokPage,
});

const STARTERS = ["funny", "trending", "cooking", "pets", "sports", "music", "dance", "life hacks", "gaming", "travel", "art", "comedy skits"];
const KEY = "fyp-taste-v1";
type Taste = { topics: Record<string, number>; authors: Record<string, number>; liked: string[]; seen: string[] };
const emptyTaste = (): Taste => ({ topics: {}, authors: {}, liked: [], seen: [] });

function loadTaste(): Taste {
  try { return { ...emptyTaste(), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return emptyTaste(); }
}

function pickWeighted(weights: Record<string, number>, n: number): string[] {
  const pool = Object.entries(weights).filter(([, w]) => w > 0);
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i]![1]; if (r <= 0) break; }
    out.push(pool[i]![0]); pool.splice(i, 1);
  }
  return out;
}

function nextTopics(t: Taste): string[] {
  const liked = pickWeighted(t.topics, 2);
  const creators = pickWeighted(t.authors, 1).map((a) => `@${a}`);
  const disliked = new Set(Object.entries(t.topics).filter(([, w]) => w < 0).map(([k]) => k));
  const fresh = STARTERS.filter((s) => !disliked.has(s) && !liked.includes(s)).sort(() => Math.random() - 0.5);
  const topics = [...liked, ...creators];
  while (topics.length < 4 && fresh.length) topics.push(fresh.shift()!);
  return topics;
}

function TikTokPage() {
  const search = useServerFn(searchTikTok);
  const [taste, setTaste] = useState<Taste>(emptyTaste);
  const [videos, setVideos] = useState<TtVideo[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [input, setInput] = useState("");
  const tasteRef = useRef(taste);
  tasteRef.current = taste;
  const loadingRef = useRef(false);
  const wheelLock = useRef(0);

  const saveTaste = (t: Taste) => { setTaste(t); localStorage.setItem(KEY, JSON.stringify(t)); };

  const loadMore = useCallback(async (topics?: string[], replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true; setLoading(true); setError(false);
    try {
      const t = tasteRef.current;
      let res = await search({ data: { topics: topics ?? nextTopics(t) } });
      if (!res.length) res = await search({ data: { topics: ["funny", "trending", "pets"] } });
      const seen = new Set(t.seen);
      setVideos((prev) => {
        const have = new Set(replace ? [] : prev.map((v) => v.id));
        const fresh = res.filter((v) => !have.has(v.id) && !seen.has(v.id));
        const extra = fresh.length ? fresh : res.filter((v) => !have.has(v.id));
        return replace ? extra : [...prev, ...extra];
      });
      if (replace) setIndex(0);
    } catch { setError(true); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [search]);

  useEffect(() => { const t = loadTaste(); setTaste(t); tasteRef.current = t; loadMore(); }, [loadMore]);

  const current = videos[index];

  // mark seen + prefetch
  useEffect(() => {
    if (!current) return;
    const t = tasteRef.current;
    if (!t.seen.includes(current.id)) saveTaste({ ...t, seen: [...t.seen, current.id].slice(-500) });
    if (index >= videos.length - 3) loadMore();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((d: number) => setIndex((i) => Math.max(0, Math.min(videos.length - 1, i + d))), [videos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 600 || Math.abs(e.deltaY) < 20) return;
    wheelLock.current = now; go(e.deltaY > 0 ? 1 : -1);
  };
  const touchY = useRef<number | null>(null);

  const like = () => {
    if (!current) return;
    const t = tasteRef.current;
    const isLiked = t.liked.includes(current.id);
    const d = isLiked ? -3 : 3;
    saveTaste({
      ...t,
      liked: isLiked ? t.liked.filter((x) => x !== current.id) : [...t.liked, current.id],
      topics: current.topic.startsWith("@") ? t.topics : { ...t.topics, [current.topic]: (t.topics[current.topic] ?? 0) + d },
      authors: { ...t.authors, [current.author]: (t.authors[current.author] ?? 0) + d },
    });
  };
  const notInterested = () => {
    if (!current) return;
    const t = tasteRef.current;
    saveTaste({
      ...t,
      topics: current.topic.startsWith("@") ? t.topics : { ...t.topics, [current.topic]: (t.topics[current.topic] ?? 0) - 2 },
      authors: { ...t.authors, [current.author]: (t.authors[current.author] ?? 0) - 3 },
    });
    setVideos((v) => v.filter((x) => x.topic !== current.topic || x.id === current.id).filter((x, i) => i <= index || x.author !== current.author));
    go(1);
  };

  const liked = current ? taste.liked.includes(current.id) : false;
  const topTastes = Object.entries(taste.topics).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteNav />
      <form className="mx-auto mt-3 flex w-full max-w-md gap-2 px-6" onSubmit={(e) => { e.preventDefault(); const q = input.trim(); if (q) loadMore([q], true); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search, or just scroll your For You feed" />
        <Button type="submit">Go</Button>
        {input && <Button type="button" variant="ghost" onClick={() => { setInput(""); loadMore(undefined, true); }}>For You</Button>}
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {topTastes.length ? `Learning you like: ${topTastes.join(", ")}` : "Like videos and your feed will learn what you enjoy."}
      </p>

      <div
        className="relative flex flex-1 items-center justify-center gap-4 overflow-hidden px-4 py-3"
        onWheel={onWheel}
        onTouchStart={(e) => (touchY.current = e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => { const s = touchY.current, end = e.changedTouches[0]?.clientY; if (s != null && end != null && Math.abs(s - end) > 50) go(s > end ? 1 : -1); touchY.current = null; }}
      >
        {current ? (
          <>
            <div className="flex h-full flex-col items-center gap-2">
              <div className="aspect-[9/16] h-[calc(100%-2rem)] max-w-full overflow-hidden rounded-2xl bg-muted">
                <iframe key={current.id} src={`https://www.tiktok.com/player/v1/${current.id}?autoplay=1&rel=0`} className="h-full w-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title={`TikTok by @${current.author}`} />
              </div>
              <p className="text-sm text-muted-foreground">
                Video by <a href={`https://www.tiktok.com/@${current.author}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">@{current.author}</a> ·{" "}
                <a href={current.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">View on TikTok</a>
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button size="icon" variant="secondary" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous video"><ChevronUp /></Button>
              <Button size="icon" variant={liked ? "default" : "secondary"} onClick={like} aria-label="Like"><Heart className={liked ? "fill-current" : ""} /></Button>
              <Button size="icon" variant="secondary" onClick={notInterested} aria-label="Not interested"><ThumbsDown /></Button>
              <Button size="icon" variant="secondary" onClick={() => go(1)} disabled={index >= videos.length - 1} aria-label="Next video"><ChevronDown /></Button>
              <span className="text-xs text-muted-foreground">{index + 1}/{videos.length}{loading ? "+" : ""}</span>
            </div>
          </>
        ) : loading ? <p className="text-muted-foreground">Building your feed…</p>
          : error ? <Button onClick={() => loadMore()}>Couldn't load — try again</Button>
          : <Button onClick={() => loadMore(undefined, true)}>No TikToks found — reload feed</Button>}
      </div>
      <p className="pb-3 text-center text-xs text-muted-foreground">Scroll beside the video, use the arrows, or press ↑ ↓. All videos belong to their creators on TikTok. Not affiliated with TikTok.</p>
    </div>
  );
}
