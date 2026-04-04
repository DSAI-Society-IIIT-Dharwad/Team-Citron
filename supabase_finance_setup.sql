-- 1. Create the finance_keywords table
CREATE TABLE IF NOT EXISTS public.finance_keywords (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.finance_keywords ENABLE ROW LEVEL SECURITY;

-- 3. Add policies to allow users to read keywords
CREATE POLICY "Allow read access to authenticated users" 
  ON public.finance_keywords 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow read access to anyone" 
  ON public.finance_keywords 
  FOR SELECT 
  TO anon
  USING (true);

-- 4. Insert initial seed keywords
INSERT INTO public.finance_keywords (keyword)
VALUES 
  ('sip'),
  ('loan'),
  ('mutual fund'),
  ('stock'),
  ('tax'),
  ('equity'),
  ('finance'),
  ('bank'),
  ('investment'),
  ('nifty'),
  ('sensex'),
  ('hdfc'),
  ('sbi'),
  ('icici'),
  ('buy'),
  ('sell'),
  ('portfolio')
ON CONFLICT (keyword) DO NOTHING;

-- 5. Data Cleanup: Delete past transcripts that DO NOT match ANY of the keywords
DELETE FROM public.transcripts t
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.finance_keywords k 
  WHERE t.raw_text ILIKE '%' || k.keyword || '%'
);
