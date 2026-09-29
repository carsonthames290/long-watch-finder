import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteNav } from "@/components/SiteNav";
import { searchYouTubeInBrowser, type YtVideo } from "@/lib/yt-client";
import { YT_TOPICS, youtubeId, readFavorites, writeFavorites, type Favorite } from "@/lib/catalog";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/youtube")({
  head: () => ({
    meta: [
      { title: "YouTube search — Longform" },
      { name: "description", content: "Search YouTube and watch results right here, with full credit to every creator." },
      { property: "og:title", content: "YouTube search — Longform" },
      { property: "og:description", content: "Search YouTube and watch results in place, credited to their creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YouTubePage,
});

function YouTubePage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<YtVideo | null>(null);
  const [favs, setFavs] = useState<Favorite[]>([]);

  useEffect(() => setFavs(readFavorites()), []);

  const res = useQuery({
    queryKey: ["yt", query],
    queryFn: () => searchYouTubeInBrowser(query),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const direct = youtubeId(q);
    if (direct) {
      setPlaying({
        id: direct,
        title: "Video on YouTube",
        channel: "its creator on YouTube",
        channelUrl: null,
        thumbnail: `https://i.ytimg.com/vi/${direct}/hqdefault.jpg`,
        duration: null,
        views: null,
      });
      return;
    }
    setPlaying(null);
    setQuery(q);
  };

  const toggleFav = (v: YtVideo) => {
    const url = `https://www.youtube.com/watch?v=${v.id}`;
    const exists = favs.some((f) => f.id === v.id);
    const next: Favorite[] = exists
      ? favs.filter((f) => f.id !== v.id)
      : [{ kind: "youtube", id: v.id, author: v.channel, title: v.title, url }, ...favs];
    setFavs(next);
    writeFavorites(next);
  };

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <form
          className="mx-auto flex max-w-2xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search YouTube, or paste a video link" className="h-11" />
          <Button type="submit" size="lg">Search</Button>
        </form>

        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2">
          {YT_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => { setInput(t); submit(t); }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>

        {playing && (
          <section className="mt-8">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={playing.title}
              />
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{playing.title}</h2>
                <Credit v={playing} />
              </div>
              <Button variant={favs.some((f) => f.id === playing.id) ? "default" : "secondary"} size="icon" onClick={() => toggleFav(playing)} aria-label="Save">
                <Heart className={favs.some((f) => f.id === playing.id) ? "fill-current" : ""} />
              </Button>
            </div>
          </section>
        )}

        {res.isFetching ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}</div>
        ) : res.error ? (
          <div className="mt-8 text-center">
            <p className="text-destructive">Search didn't work right now.</p>
            <Button className="mt-3" variant="secondary" onClick={() => res.refetch()}>Try again</Button>
          </div>
        ) : res.data ? (
          res.data.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {res.data.map((v) => (
                <div key={v.id} className="text-left">
                  <button
                    onClick={() => { setPlaying(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="relative block aspect-video w-full overflow-hidden rounded-xl bg-muted"
                  >
                    <img src={v.thumbnail} alt={v.title} loading="lazy" className="h-full w-full object-cover" />
                    {v.duration && <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 text-xs">{v.duration}</span>}
                  </button>
                  <p className="mt-2 line-clamp-2 font-medium">{v.title}</p>
                  <Credit v={v} />
                </div>
              ))}
            </div>
          ) : <p className="mt-8 text-muted-foreground">No videos found.</p>
        ) : <p className="mt-8 text-center text-muted-foreground">Type something to search YouTube.</p>}

        <p className="mt-16 text-center text-xs text-muted-foreground">All videos are streamed from and belong to their creators on YouTube. Longform is not affiliated with YouTube.</p>
      </main>
    </div>
  );
}

function Credit({ v }: { v: YtVideo }) {
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      By {v.channelUrl ? <a href={v.channelUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{v.channel}</a> : v.channel}
      {v.views ? ` · ${v.views}` : ""} ·{" "}
      <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">Watch on YouTube</a>
    </p>
  );
}
