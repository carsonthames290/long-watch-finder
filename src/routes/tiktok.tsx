import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { searchTikTok } from "@/lib/media.functions";

export const Route = createFileRoute("/tiktok")({
  head: () => ({
    meta: [
      { title: "TikTok feed — Longform" },
      { name: "description", content: "Pick a topic and scroll TikTok videos in a vertical feed, credited to every creator." },
      { property: "og:title", content: "TikTok feed — Longform" },
      { property: "og:description", content: "Scroll TikTok videos on any topic, with credit to each creator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TikTokPage,
});

function TikTokPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("trending");
  const search = useServerFn(searchTikTok);
  const res = useQuery({ queryKey: ["tt", query], queryFn: () => search({ data: { query } }) });

  return (
    <div className="flex h-screen flex-col">
      <SiteNav />
      <form className="mx-auto mt-4 flex w-full max-w-md gap-2 px-6" onSubmit={(e) => { e.preventDefault(); if (input.trim()) setQuery(input.trim()); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search TikTok (e.g. cooking)" />
        <Button type="submit">Go</Button>
      </form>
      <div className="mt-4 flex-1 snap-y snap-mandatory overflow-y-auto">
        {res.isLoading ? <p className="p-10 text-center text-muted-foreground">Finding TikToks…</p>
          : res.error ? <p className="p-10 text-center text-destructive">Couldn't load TikToks. Try again.</p>
          : !res.data?.length ? <p className="p-10 text-center text-muted-foreground">No TikToks found for “{query}”.</p>
          : res.data.map((v) => (
            <section key={v.id} className="flex h-full snap-start flex-col items-center justify-center gap-3 py-4">
              <div className="h-[calc(100%-3rem)] aspect-[9/16] max-w-full overflow-hidden rounded-2xl bg-muted">
                <iframe src={`https://www.tiktok.com/player/v1/${v.id}?rel=0`} className="h-full w-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title={`TikTok by @${v.author}`} loading="lazy" />
              </div>
              <p className="text-sm text-muted-foreground">
                Video by <a href={`https://www.tiktok.com/@${v.author}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">@{v.author}</a> ·{" "}
                <a href={v.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">View on TikTok</a>
              </p>
            </section>
          ))}
        <p className="pb-6 text-center text-xs text-muted-foreground">All videos belong to their creators on TikTok. Longform is not affiliated with TikTok.</p>
      </div>
    </div>
  );
}
