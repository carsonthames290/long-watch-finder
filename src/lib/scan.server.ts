import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { firecrawlMap, firecrawlScrape } from "./firecrawl.server";
import { extractVideos, isScannablePage, normalizeUrl } from "./video-extract";

const LOCK_ID = "site-scan";
const LOCK_MINUTES = 10;
const PAGES_PER_RUN = 8;
const MAP_STALE_MINUTES = 60;

export type ScanResult = {
  status: "ok" | "skipped" | "paused" | "idle";
  message: string;
  pages_scanned?: number;
  new_videos?: number;
};

async function acquireLock(): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("scan_lock")
    .select("locked_until, paused_reason")
    .eq("id", LOCK_ID)
    .maybeSingle();

  if (existing?.paused_reason) return false;
  if (existing && new Date(existing.locked_until) > now) return false;

  const { error } = await supabaseAdmin
    .from("scan_lock")
    .upsert({ id: LOCK_ID, locked_until: until, updated_at: now.toISOString() });
  return !error;
}

async function releaseLock() {
  await supabaseAdmin
    .from("scan_lock")
    .update({ locked_until: new Date(0).toISOString(), updated_at: new Date().toISOString() })
    .eq("id", LOCK_ID);
}

export async function pauseScanning(reason: string) {
  await supabaseAdmin.from("scan_lock").upsert({
    id: LOCK_ID,
    locked_until: new Date(0).toISOString(),
    paused_reason: reason,
    updated_at: new Date().toISOString(),
  });
}

/** One bounded scan pass: refreshes the page list for one source when stale,
 * then scrapes a small batch of pages and stores any videos found. */
export async function runScan(): Promise<ScanResult> {
  if (!(await acquireLock())) {
    return { status: "skipped", message: "A scan is already running or scanning is paused." };
  }

  try {
    const { data: sources } = await supabaseAdmin
      .from("sources")
      .select("id, url, max_pages, last_scanned_at")
      .eq("active", true)
      .order("last_scanned_at", { ascending: true, nullsFirst: true })
      .limit(1);

    const source = sources?.[0];
    if (!source) return { status: "idle", message: "No active source to scan yet." };

    const { data: run } = await supabaseAdmin
      .from("scan_runs")
      .insert({ source_id: source.id, status: "running" })
      .select("id")
      .single();

    let pagesScanned = 0;
    let videosFound = 0;
    let newVideos = 0;
    let runError: string | null = null;

    try {
      const stale =
        !source.last_scanned_at ||
        Date.now() - new Date(source.last_scanned_at).getTime() > MAP_STALE_MINUTES * 60_000;

      if (stale) {
        const mapped = await firecrawlMap(source.url, source.max_pages);
        const urls = [source.url, ...mapped]
          .map(normalizeUrl)
          .filter((u) => isScannablePage(u, source.url))
          .slice(0, source.max_pages);
        const unique = [...new Set(urls)];
        if (unique.length) {
          await supabaseAdmin
            .from("pages")
            .upsert(
              unique.map((url) => ({ source_id: source.id, url })),
              { onConflict: "url", ignoreDuplicates: true },
            );
        }
        await supabaseAdmin
          .from("sources")
          .update({ last_scanned_at: new Date().toISOString() })
          .eq("id", source.id);
      }

      const { data: pages } = await supabaseAdmin
        .from("pages")
        .select("id, url")
        .eq("source_id", source.id)
        .order("last_scanned_at", { ascending: true, nullsFirst: true })
        .limit(PAGES_PER_RUN);

      for (const page of pages ?? []) {
        let pageError: string | null = null;
        try {
          const scraped = await firecrawlScrape(page.url);
          const videos = extractVideos(scraped.html, page.url, scraped.title);
          videosFound += videos.length;

          for (const v of videos) {
            const { data: existing } = await supabaseAdmin
              .from("videos")
              .select("id")
              .eq("embed_url", v.embed_url)
              .maybeSingle();

            if (existing) {
              await supabaseAdmin
                .from("videos")
                .update({ last_seen_at: new Date().toISOString() })
                .eq("id", existing.id);
            } else {
              const { error } = await supabaseAdmin.from("videos").insert({
                source_id: source.id,
                embed_url: v.embed_url,
                watch_url: v.watch_url,
                page_url: page.url,
                provider: v.provider,
                title: v.title ?? scraped.title ?? page.url,
                description: scraped.description ?? null,
                thumbnail_url: v.thumbnail_url,
              });
              if (!error) newVideos += 1;
            }
          }
        } catch (e) {
          pageError = e instanceof Error ? e.message : String(e);
          const status = (e as { status?: number })?.status;
          if (status === 402 || status === 403) {
            await pauseScanning(`Scanning paused: ${pageError}`);
            runError = pageError;
            break;
          }
        }
        pagesScanned += 1;
        await supabaseAdmin
          .from("pages")
          .update({ last_scanned_at: new Date().toISOString(), error: pageError })
          .eq("id", page.id);
      }
    } catch (e) {
      runError = e instanceof Error ? e.message : String(e);
      const status = (e as { status?: number })?.status;
      if (status === 402 || status === 403) await pauseScanning(`Scanning paused: ${runError}`);
    }

    if (run) {
      await supabaseAdmin
        .from("scan_runs")
        .update({
          status: runError ? "error" : "done",
          pages_scanned: pagesScanned,
          videos_found: videosFound,
          new_videos: newVideos,
          error: runError,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    return {
      status: runError ? "paused" : "ok",
      message: runError ?? `Checked ${pagesScanned} page(s), ${newVideos} new video(s).`,
      pages_scanned: pagesScanned,
      new_videos: newVideos,
    };
  } finally {
    await releaseLock();
  }
}
