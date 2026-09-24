import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Longform — auto-scanned video library" },
      {
        name: "description",
        content:
          "Longform watches a site you choose and collects every video it finds, including multi-hour recordings, into one clean library.",
      },
      { property: "og:title", content: "Longform — auto-scanned video library" },
      {
        property: "og:description",
        content:
          "Point Longform at a site and it keeps finding new long-form videos for you, hour after hour.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Video = {
  id: string;
  embed_url: string;
  watch_url: string | null;
  page_url: string | null;
  provider: string;
  title: string | null;
  thumbnail_url: string | null;
  first_seen_at: string;
};

type Source = {
  id: string;
  url: string;
  active: boolean;
  last_scanned_at: string | null;
};

type Run = {
  id: string;
  status: string;
  pages_scanned: number;
  new_videos: number;
  error: string | null;
  started_at: string;
};

function Home() {
  const qc = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [playing, setPlaying] = useState<Video | null>(null);

  const videos = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, embed_url, watch_url, page_url, provider, title, thumbnail_url, first_seen_at")
        .order("first_seen_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Video[];
    },
  });

  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("id, url, active, last_scanned_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Source[];
    },
  });

  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scan_runs")
        .select("id, status, pages_scanned, new_videos, error, started_at")
        .order("started_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? []) as Run[];
    },
    refetchInterval: 15000,
  });

  const addSource = useMutation({
    mutationFn: async (url: string) => {
      const parsed = new URL(url);
      const { error } = await supabase.from("sources").insert({ url: parsed.origin + parsed.pathname });
      if (error) throw error;
    },
    onSuccess: () => {
      setSourceUrl("");
      toast.success("Site added — scanning will pick it up.");
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("Invalid URL") ? "That web address doesn't look right." : e.message),
  });

  const removeSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  const scanNow = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/hooks/scan", { method: "POST" });
      const json = (await res.json()) as { status: string; message: string };
      if (!res.ok) throw new Error(json.message || "Scan failed");
      return json;
    },
    onSuccess: (json) => {
      toast(json.message);
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lastRun = runs.data?.[0];

  return (
    <div className="min-h-screen">
      <Toaster />
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <Badge variant="outline" className="mb-5 border-primary/40 text-primary">
          Always watching
        </Badge>
        <h1 className="text-5xl font-bold sm:text-6xl">Longform</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Point it at a site. It keeps checking the pages and collects every video it finds —
          including the two-hour ones — into one library you can play right here.
        </p>

        <form
          className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (sourceUrl.trim()) addSource.mutate(sourceUrl.trim());
          }}
        >
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://the-site-you-want-scanned.com"
            className="h-12"
          />
          <Button type="submit" size="lg" disabled={addSource.isPending}>
            Add site
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Button
            variant="secondary"
            onClick={() => scanNow.mutate()}
            disabled={scanNow.isPending}
          >
            {scanNow.isPending ? "Scanning…" : "Scan now"}
          </Button>
          <span>
            {lastRun
              ? `Last check: ${new Date(lastRun.started_at).toLocaleString()} · ${lastRun.pages_scanned} pages · ${lastRun.new_videos} new`
              : "No scan has run yet."}
          </span>
        </div>
        {lastRun?.error ? (
          <p className="mt-2 text-sm text-destructive">{lastRun.error}</p>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {sources.data?.length ? (
          <section className="panel mb-10 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Watched sites
            </h2>
            <ul className="flex flex-col gap-2">
              {sources.data.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{s.url}</span>
                  <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                    {s.last_scanned_at
                      ? new Date(s.last_scanned_at).toLocaleDateString()
                      : "not scanned yet"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSource.mutate(s.id)}
                    >
                      Remove
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <h2 className="mb-5 text-2xl font-semibold">Library</h2>

        {videos.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-xl" />
            ))}
          </div>
        ) : videos.data?.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.data.map((v) => (
              <button
                key={v.id}
                onClick={() => setPlaying(v)}
                className="panel group overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt={v.title ?? "Video"}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {v.provider}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 font-medium">{v.title ?? v.embed_url}</p>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{v.page_url}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nothing collected yet. Add a site above and hit “Scan now”.
          </p>
        )}
      </main>

      <Dialog open={!!playing} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="pr-8 text-base">{playing?.title ?? "Video"}</DialogTitle>
          {playing ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {playing.provider === "file" ? (
                <video src={playing.embed_url} controls className="h-full w-full" />
              ) : (
                <iframe
                  src={playing.embed_url}
                  title={playing.title ?? "Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
            </div>
          ) : null}
          {playing?.watch_url ? (
            <a
              href={playing.watch_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              Open on the original site
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
