CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign text NOT NULL DEFAULT 'Learner',
  kind text NOT NULL DEFAULT 'streak',
  body text NOT NULL DEFAULT '',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feed_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read the feed" ON public.feed_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can create their own posts" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own posts" ON public.feed_posts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own posts" ON public.feed_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX feed_posts_created_at_idx ON public.feed_posts (created_at DESC);

CREATE TRIGGER feed_posts_updated_at BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();