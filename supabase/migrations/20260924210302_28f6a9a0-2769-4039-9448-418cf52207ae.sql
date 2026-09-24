
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url text NOT NULL UNIQUE,
  last_scanned_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages public read" ON public.pages FOR SELECT USING (true);
CREATE INDEX pages_queue_idx ON public.pages (source_id, last_scanned_at NULLS FIRST);
