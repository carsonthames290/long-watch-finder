
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  max_pages integer NOT NULL DEFAULT 40,
  last_scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO anon, authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources public read" ON public.sources FOR SELECT USING (true);
CREATE POLICY "sources public insert" ON public.sources FOR INSERT WITH CHECK (true);
CREATE POLICY "sources public update" ON public.sources FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "sources public delete" ON public.sources FOR DELETE USING (true);

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
  embed_url text NOT NULL UNIQUE,
  watch_url text,
  page_url text,
  provider text NOT NULL DEFAULT 'other',
  title text,
  description text,
  thumbnail_url text,
  duration_seconds integer,
  published_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos public read" ON public.videos FOR SELECT USING (true);
CREATE INDEX videos_first_seen_idx ON public.videos (first_seen_at DESC);

CREATE TABLE public.scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running',
  pages_scanned integer NOT NULL DEFAULT 0,
  videos_found integer NOT NULL DEFAULT 0,
  new_videos integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT ON public.scan_runs TO anon, authenticated;
GRANT ALL ON public.scan_runs TO service_role;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_runs public read" ON public.scan_runs FOR SELECT USING (true);

CREATE TABLE public.scan_lock (
  id text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scan_lock TO service_role;
ALTER TABLE public.scan_lock ENABLE ROW LEVEL SECURITY;
