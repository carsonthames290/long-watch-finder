const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

function key(): string {
  const k = process.env["FIRECRAWL_API_KEY"];
  if (!k) throw new Error("FIRECRAWL_API_KEY is not configured");
  return k;
}

async function call(path: string, body: unknown) {
  const res = await fetch(`${FIRECRAWL_V2}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  if (!res.ok) {
    const err = new Error(
      `Firecrawl ${path} failed [${res.status}]: ${json?.error ?? text.slice(0, 300)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json;
}

export async function firecrawlMap(url: string, limit = 200): Promise<string[]> {
  const data = await call("/map", { url, limit, includeSubdomains: false });
  const links: unknown = data?.links ?? data?.data?.links;
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => (typeof l === "string" ? l : (l as { url?: string })?.url))
    .filter((l): l is string => typeof l === "string");
}

export type ScrapedPage = {
  html: string;
  markdown: string;
  links: string[];
  title?: string;
  description?: string;
};

export async function firecrawlScrape(url: string): Promise<ScrapedPage> {
  const data = await call("/scrape", {
    url,
    formats: ["html", "markdown", "links"],
    onlyMainContent: false,
  });
  const doc = data?.data ?? data ?? {};
  return {
    html: typeof doc.html === "string" ? doc.html : "",
    markdown: typeof doc.markdown === "string" ? doc.markdown : "",
    links: Array.isArray(doc.links) ? doc.links.filter((l: unknown) => typeof l === "string") : [],
    title: doc?.metadata?.title,
    description: doc?.metadata?.description,
  };
}

export async function firecrawlSearch(query: string, limit = 20): Promise<{ url: string; title?: string; description?: string }[]> {
  const data = await call("/search", { query, limit });
  const d = data?.data;
  const web = Array.isArray(d) ? d : Array.isArray(d?.web) ? d.web : [];
  return web.filter((r: any) => typeof r?.url === "string");
}
