import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SiteNav } from "@/components/SiteNav";
import { readFavorites, writeFavorites, type Favorite } from "@/lib/catalog";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Longform — your own video library" },
      {
        name: "description",
        content:
          "Longform is a browser-only video library: search YouTube, scroll a TikTok For You feed, and keep everything you save on your own device.",
      },
      { property: "og:title", content: "Longform — your own video library" },
      {
        property: "og:description",
        content: "Search YouTube, scroll TikTok, and save what you love — all stored in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [playing, setPlaying] = useState<Favorite | null>(null);

  useEffect(() => setFavs(readFavorites()), []);

  const remove = (id: string) => {
    const next = favs.filter((f) => f.id !== id);
    setFavs(next);
    writeFavorites(next);
  };

  return (
    <div className="min-h-screen">
      <SiteNav />

      <header className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <Badge variant="outline" className="mb-5 border-primary/40 text-primary">Runs entirely in your browser</Badge>
        <h1 className="text-5xl font-bold sm:text-6xl">Longform</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Search YouTube, scroll a For You feed of TikTok creators, and keep everything you save right
          here. Nothing is stored on a server — your library lives on this device, so the site works
          anywhere you host it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/youtube">Search YouTube</Link></Button>
          <Button asChild variant="secondary"><Link to="/tiktok">Open For You feed</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-5 text-2xl font-semibold">Saved</h2>

        {favs.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favs.map((f) => (
              <div key={`${f.kind}-${f.id}`} className="panel overflow-hidden">
                <button
                  onClick={() => setPlaying(f)}
                  className="block aspect-video w-full overflow-hidden bg-muted text-left"
                >
                  {f.kind === "youtube" ? (
                    <img src={`https://i.ytimg.com/vi/${f.id}/hqdefault.jpg`} alt={f.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">TikTok · @{f.id}</div>
                  )}
                </button>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium">{f.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      By <a href={f.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{f.author}</a>
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(f.id)} aria-label="Remove"><Trash2 /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nothing saved yet — tap the heart on a video or creator and it shows up here.
          </p>
        )}

        <p className="mt-16 text-center text-xs text-muted-foreground">
          All videos are streamed from and belong to their creators on YouTube and TikTok. Longform is not
          affiliated with either.
        </p>
      </main>

      <Dialog open={!!playing} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="pr-8 text-base">{playing?.title ?? "Video"}</DialogTitle>
          {playing ? (
            <div className={`${playing.kind === "youtube" ? "aspect-video" : "aspect-[9/16] max-h-[70vh]"} mx-auto w-full overflow-hidden rounded-lg bg-black`}>
              <iframe
                src={playing.kind === "youtube"
                  ? `https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1`
                  : `https://www.tiktok.com/embed/@${playing.id}`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : null}
          {playing ? (
            <a href={playing.url} target="_blank" rel="noreferrer" className="text-sm text-accent underline-offset-4 hover:underline">
              Open {playing.author}'s page
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
