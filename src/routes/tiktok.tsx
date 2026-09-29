import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { ChevronUp, ChevronDown, Heart, ThumbsDown } from "lucide-react";
import { readTaste, writeTaste, emptyTaste, tiktokParts, readFavorites, writeFavorites, type Taste } from "@/lib/catalog";
import { fetchTag, TT_TAGS, type TtVideo } from "@/lib/tt-client";

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

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}

/** Pick tags weighted by taste, plus one random discovery tag. */
function pickTags(t: Taste, n = 2) {
  const scored = TT_TAGS.map((tag) => ({ tag, s: (t.tags[tag] ?? 0) + Math.random() * 3 }))
    .filter((x) => (t.tags[x.tag] ?? 0) > -4)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.tag);
  const rest = TT_TAGS.filter((x) => !scored.includes(x));
  return [...scored, rest[Math.floor(Math.random() * rest.length)]!];
}

function TikTokPage() {
  const [taste, setTaste] = useState<Taste>(emptyTaste);
  const [feed, setFeed] = useState<TtVideo[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const seen = useRef(new Set<string>());
  const busy = useRef(false);
  const wheelLock = useRef(0);
  const touchY = useRef<number | null>(null);

  const load = useCallback(async (tags: string[], replace = false) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(tags.map(fetchTag));
      const t = readTaste();
      const fresh = results
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .filter((v) => !seen.current.has(v.id) && (t.creators[v.author] ?? 0) > -3);
      const ranked = shuffle(fresh).sort((a, b) => (t.creators[b.author] ?? 0) - (t.creators[a.author] ?? 0));
      ranked.forEach((v) => seen.current.add(v.id));
      if (replace) { setFeed(ranked); setIndex(0); } else setFeed((f) => [...f, ...ranked]);
      if (!ranked.length) setError("Couldn't load videos right now. Try again.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = readTaste();
    setTaste(t);
    void load(pickTags(t), true);
  }, [load]);

  // auto-load more near the end
  useEffect(() => {
    if (feed.length && index >= feed.length - 5) void load(pickTags(readTaste()));
  }, [index, feed.length, load]);

  const current = feed[index];

  const go = useCallback((d: number) => {
    setIndex((i) => Math.max(0, Math.min(feed.length - 1, i + d)));
  }, [feed.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const save = (t: Taste) => { setTaste(t); writeTaste(t); };

  const like = () => {
    if (!current) return;
    save({
      creators: { ...taste.creators, [current.author]: (taste.creators[current.author] ?? 0) + 3 },
      tags: { ...taste.tags, [current.tag]: (taste.tags[current.tag] ?? 0) + 2 },
    });
    setLiked((s) => new Set(s).add(current.id));
    const favs = readFavorites();
    if (!favs.some((f) => f.id === current.id)) {
      writeFavorites([{ kind: "tiktok", id: current.id, author: current.author, title: `TikTok by @${current.author}`, url: `https://www.tiktok.com/@${current.author}/video/${current.id}` }, ...favs]);
    }
  };

  const notInterested = () => {
    if (!current) return;
    save({
      creators: { ...taste.creators, [current.author]: (taste.creators[current.author] ?? 0) - 4 },
      tags: { ...taste.tags, [current.tag]: (taste.tags[current.tag] ?? 0) - 1 },
    });
    setFeed((f) => f.filter((v) => v.author !== current.author || f.indexOf(v) < index));
  };

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const parts = tiktokParts(q);
    if (parts) {
      setFeed((f) => [...f.slice(0, index + 1), { ...parts, tag: "link" }, ...f.slice(index + 1)]);
      setIndex((i) => (feed.length ? i + 1 : 0));
      return;
    }
    seen.current.clear();
    void load([q.replace(/^#/, "")], true);
  };

  const topTags = Object.entries(taste.tags).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteNav />
      <form className="mx-auto mt-3 flex w-full max-w-md gap-2 px-6" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="A topic (e.g. cats) or a TikTok link" />
        <Button type="submit">Go</Button>
        <Button type="button" variant="ghost" onClick={() => { setInput(""); seen.current.clear(); void load(pickTags(taste), true); }}>For You</Button>
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {topTags.length ? `Learning you like: ${topTags.join(", ")}` : "Like videos and your feed learns what you enjoy."}
      </p>

      <div
        className="relative flex flex-1 items-center justify-center gap-4 overflow-hidden px-4 py-3"
        onWheel={(e) => {
          const now = Date.now();
          if (now - wheelLock.current < 600 || Math.abs(e.deltaY) < 20) return;
          wheelLock.current = now;
          go(e.deltaY > 0 ? 1 : -1);
        }}
        onTouchStart={(e) => (touchY.current = e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const s = touchY.current, end = e.changedTouches[0]?.clientY;
          if (s != null && end != null && Math.abs(s - end) > 50) go(s > end ? 1 : -1);
          touchY.current = null;
        }}
      >
        {current ? (
          <>
            <div className="flex h-full flex-col items-center gap-2">
              <div className="aspect-[9/16] h-[calc(100%-2rem)] max-w-full overflow-hidden rounded-2xl bg-muted">
                <iframe
                  key={current.id}
                  src={`https://www.tiktok.com/player/v1/${current.id}?autoplay=1&loop=1&rel=0&description=1&music_info=1`}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={`TikTok by @${current.author}`}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Video by{" "}
                <a href={`https://www.tiktok.com/@${current.author}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">@{current.author}</a>{" "}·{" "}
                <a href={`https://www.tiktok.com/@${current.author}/video/${current.id}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">View on TikTok</a>
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button size="icon" variant="secondary" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous"><ChevronUp /></Button>
              <Button size="icon" variant={liked.has(current.id) ? "default" : "secondary"} onClick={like} aria-label="Like"><Heart className={liked.has(current.id) ? "fill-current" : ""} /></Button>
              <Button size="icon" variant="secondary" onClick={notInterested} aria-label="Not interested"><ThumbsDown /></Button>
              <Button size="icon" variant="secondary" onClick={() => go(1)} disabled={index >= feed.length - 1} aria-label="Next"><ChevronDown /></Button>
              <span className="text-xs text-muted-foreground">{index + 1}/{feed.length}</span>
            </div>
          </>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading your feed…</p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
            <Button onClick={() => void load(pickTags(taste), true)}>Reload feed</Button>
          </div>
        )}
      </div>
      <p className="pb-3 text-center text-xs text-muted-foreground">
        Scroll beside the video, use the arrows, or press ↑ ↓. All videos belong to their creators on TikTok. Not affiliated with TikTok.
      </p>
    </div>
  );
}
