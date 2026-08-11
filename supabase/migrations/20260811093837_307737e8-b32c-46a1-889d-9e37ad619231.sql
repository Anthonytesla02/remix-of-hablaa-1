CREATE TABLE public.profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  callsign text not null default '',
  lang_id text not null default 'spanish',
  timeline_id text not null default 'standard_90',
  tier_id text not null default 'field_op_30',
  persona_id text not null default 'undercover_traveler',
  started_at bigint not null default 0,
  xp integer not null default 0,
  weekly_xp integer not null default 0,
  credits integer not null default 50,
  streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_day text,
  last_login_day text,
  freezes integer not null default 0,
  badges text[] not null default '{}',
  league_tier integer not null default 1,
  ghost_seed integer not null default 0,
  sts_streak integer not null default 0,
  shadow_reps integer not null default 0,
  perfect_week boolean not null default true,
  settings jsonb not null default '{"rate":1,"captions":true}'::jsonb,
  quests jsonb not null default '{"day":"","list":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.srs_cards (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  lang text not null,
  target text not null,
  translation text not null,
  due_at bigint not null,
  ease double precision not null default 2.5,
  lapses integer not null default 0,
  interval_days double precision not null default 0,
  reps integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_cards TO authenticated;
GRANT ALL ON public.srs_cards TO service_role;
ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cards" ON public.srs_cards FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.completed_days (
  user_id uuid references auth.users(id) on delete cascade not null,
  day_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, day_key)
);

GRANT SELECT, INSERT, DELETE ON public.completed_days TO authenticated;
GRANT ALL ON public.completed_days TO service_role;
ALTER TABLE public.completed_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own completed days" ON public.completed_days FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.session_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date bigint not null,
  day_key text not null,
  xp integer not null default 0,
  accuracy double precision not null default 1,
  items integer not null default 0,
  cover_intact boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, DELETE ON public.session_history TO authenticated;
GRANT ALL ON public.session_history TO service_role;
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own history" ON public.session_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();