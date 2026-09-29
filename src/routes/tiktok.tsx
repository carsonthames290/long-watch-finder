import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { ChevronUp, ChevronDown, Heart, ThumbsDown } from "lucide-react";
import {
  TIKTOK_CREATORS,
  TIKTOK_TAGS,
  rankCreators,
  readTaste,
  writeTaste,
  emptyTaste,
  tiktokParts,
  isHandle,
  readFavorites,
  writeFavorites,
  type Creator,
  type Taste,
} from "@/lib/catalog";

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

type Pinned = { author: string; id: string } | null;

function TikTokPage() {
  const [taste, setTaste] = useState<Taste>(emptyTaste);
  const [order, setOrder] = useState<Creator[]>([]);
  const [index, setIndex] = useState(0);
  const [tag, setTag] = useState("All");
  const [input, setInput] = useState("");
  const [pinned, setPinned] = useState<Pinned>(null);
  const wheelLock = useRef(0);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    const t = readTaste();
    setTaste(t);
    setOrder(rankCreators(t));
  }, []);

  const feed = useMemo(
    () => (tag === "All" ? order : order.filter((c) => c.tag === tag)),
    [order, tag],
  );
  const current = feed[Math.min(index, Math.max(0, feed.length - 1))];

  const save = (t: Taste) => {
    setTaste(t);
    writeTaste(t);
  };

  const go = useCallback(
    (d: number) => {
      setPinned(null);
      setIndex((i) => Math.max(0, Math.min(feed.length - 1, i + d)));
    },
    [feed.length],
  );

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
    wheelLock.current = now;
    go(e.deltaY > 0 ? 1 : -1);
  };

  const like = () => {
    if (!current) return;
    save({
      creators: { ...taste.creators, [current.handle]: (taste.creators[current.handle] ?? 0) + 3 },
      tags: { ...taste.tags, [current.tag]: (taste.tags[current.tag] ?? 0) + 2 },
    });
    const favs = readFavorites();
    if (!favs.some((f) => f.id === current.handle)) {
      writeFavorites([
        { kind: "tiktok", id: current.handle, author: current.name, title: `${current.name} on TikTok`, url: `https://www.tiktok.com/@${current.handle}` },
        ...favs,
      ]);
    }
  };

  const notInterested = () => {
    if (!current) return;
    const next: Taste = {
      creators: { ...taste.creators, [current.handle]: (taste.creators[current.handle] ?? 0) - 4 },
      tags: { ...taste.tags, [current.tag]: (taste.tags[current.tag] ?? 0) - 1 },
    };
    save(next);
    setOrder((o) => o.filter((c) => c.handle !== current.handle));
  };

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const parts = tiktokParts(q);
    if (parts) {
      setPinned(parts);
      return;
    }
    const handle = q.replace(/^@/, "").replace(/^.*tiktok\.com\/@/, "").split(/[/?#]/)[0] ?? "";
    if (isHandle(handle)) {
      setPinned(null);
      setOrder((o) => [{ handle, name: `@${handle}`, tag: "Search" }, ...o.filter((c) => c.handle !== handle)]);
      setIndex(0);
      setTag("All");
      return;
    }
    const lower = q.toLowerCase();
    const matches = TIKTOK_CREATORS.filter((c) => c.name.toLowerCase().includes(lower) || c.tag.toLowerCase().includes(lower));
    if (matches.length) {
      setPinned(null);
      setOrder([...matches, ...rankCreators(taste).filter((c) => !matches.includes(c))]);
      setIndex(0);
      setTag("All");
    }
  };

  const liked = current ? (taste.creators[current.handle] ?? 0) > 0 : false;
  const topTags = Object.entries(taste.tags).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  const src = pinned
    ? `https://www.tiktok.com/player/v1/${pinned.id}?autoplay=1&rel=0`
    : current
      ? `https://www.tiktok.com/embed/@${current.handle}`
      : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteNav />

      <form
        className="mx-auto mt-3 flex w-full max-w-md gap-2 px-6"
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="A creator, a topic, or a TikTok link" />
        <Button type="submit">Go</Button>
        {(input || pinned) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setInput(""); setPinned(null); setOrder(rankCreators(taste)); setIndex(0); }}
          >
            For You
          </Button>
        )}
      </form>

      <div className="mx-auto mt-2 flex max-w-3xl flex-wrap justify-center gap-1.5 px-6">
        {TIKTOK_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => { setTag(t); setIndex(0); setPinned(null); }}
            className={`rounded-full px-2.5 py-1 text-xs ${t === tag ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {topTags.length ? `Learning you like: ${topTags.join(", ")}` : "Like what you enjoy and your feed reorders itself."}
      </p>

      <div
        className="relative flex flex-1 items-center justify-center gap-4 overflow-hidden px-4 py-3"
        onWheel={onWheel}
        onTouchStart={(e) => (touchY.current = e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const s = touchY.current, end = e.changedTouches[0]?.clientY;
          if (s != null && end != null && Math.abs(s - end) > 50) go(s > end ? 1 : -1);
          touchY.current = null;
        }}
      >
        {src ? (
          <>
            <div className="flex h-full flex-col items-center gap-2">
              <div className="aspect-[9/16] h-[calc(100%-2rem)] max-w-full overflow-hidden rounded-2xl bg-muted">
                <iframe
                  key={src}
                  src={src}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  title={pinned ? `TikTok by @${pinned.author}` : `TikToks by @${current!.handle}`}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {pinned ? (
                  <>
                    Video by{" "}
                    <a href={`https://www.tiktok.com/@${pinned.author}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">@{pinned.author}</a>{" "}
                    ·{" "}
                    <a href={`https://www.tiktok.com/@${pinned.author}/video/${pinned.id}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">View on TikTok</a>
                  </>
                ) : (
                  <>
                    Videos by{" "}
                    <a href={`https://www.tiktok.com/@${current!.handle}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">@{current!.handle}</a>{" "}
                    · {current!.name} · {current!.tag}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button size="icon" variant="secondary" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous"><ChevronUp /></Button>
              <Button size="icon" variant={liked ? "default" : "secondary"} onClick={like} aria-label="Like"><Heart className={liked ? "fill-current" : ""} /></Button>
              <Button size="icon" variant="secondary" onClick={notInterested} aria-label="Not interested"><ThumbsDown /></Button>
              <Button size="icon" variant="secondary" onClick={() => go(1)} disabled={index >= feed.length - 1} aria-label="Next"><ChevronDown /></Button>
              <span className="text-xs text-muted-foreground">{Math.min(index + 1, feed.length)}/{feed.length}</span>
            </div>
          </>
        ) : (
          <Button onClick={() => { setOrder(rankCreators(taste)); setIndex(0); }}>Reload feed</Button>
        )}
      </div>

      <p className="pb-3 text-center text-xs text-muted-foreground">
        Scroll beside the video, use the arrows, or press ↑ ↓. All videos belong to their creators on TikTok. Not affiliated with TikTok.
      </p>
    </div>
  );
}
