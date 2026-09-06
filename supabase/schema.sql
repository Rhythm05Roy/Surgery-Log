  -- ============================================================
  -- OT Log — Supabase schema (PostgreSQL)
  -- Run the whole file once in the Supabase SQL editor.
  -- The file is IDEMPOTENT: it can be re-run safely.
  -- Assumes standard `auth.users` from Supabase Auth.
  -- ============================================================

  -- ---------- PROFILES (one row per signed-up user / doctor) ----------
  create table if not exists public.profiles (
    id              uuid primary key references auth.users (id) on delete cascade,
    name            text not null default '',
    designation     text not null default '',
    specialization  text not null default '',
    degrees         text not null default '',
    affiliation     text not null default '',
    registration_no text not null default '',
    phone           text not null default '',
    email           text not null default '',
    address         text not null default '',
    photo_path      text,               -- storage object path (private bucket)
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
  );

  alter table public.profiles enable row level security;

  drop policy if exists "profiles: own select" on public.profiles;
  create policy "profiles: own select" on public.profiles
    for select using (auth.uid() = id);
  drop policy if exists "profiles: own insert" on public.profiles;
  create policy "profiles: own insert" on public.profiles
    for insert with check (auth.uid() = id);
  drop policy if exists "profiles: own update" on public.profiles;
  create policy "profiles: own update" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);
  drop policy if exists "profiles: own delete" on public.profiles;
  create policy "profiles: own delete" on public.profiles
    for delete using (auth.uid() = id);

  -- Auto-create a profile row the moment an account is created, so the app
  -- never has to special-case "user exists but has no profile".
  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.profiles (id, email, name)
    values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
    return new;
  end $$;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

  -- ---------- CONSULTANTS ----------
  create table if not exists public.consultants (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users (id) on delete cascade,
    name        text not null,
    designation text not null default '',
    expertise   text not null default '',
    degrees     text not null default '',
    affiliation text not null default '',
    phone       text not null default '',
    email       text not null default '',
    notes       text not null default '',
    photo_path  text,                    -- storage object path
    created_at  timestamptz not null default now()
  );
  create index if not exists consultants_user_idx on public.consultants (user_id);

  alter table public.consultants enable row level security;

  drop policy if exists "consultants: own select" on public.consultants;
  create policy "consultants: own select" on public.consultants
    for select using (auth.uid() = user_id);
  drop policy if exists "consultants: own insert" on public.consultants;
  create policy "consultants: own insert" on public.consultants
    for insert with check (auth.uid() = user_id);
  drop policy if exists "consultants: own update" on public.consultants;
  create policy "consultants: own update" on public.consultants
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "consultants: own delete" on public.consultants;
  create policy "consultants: own delete" on public.consultants
    for delete using (auth.uid() = user_id);

  -- ---------- OPERATING THEATRES ----------
  create table if not exists public.ots (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users (id) on delete cascade,
    name       text not null,
    created_at timestamptz not null default now()
  );
  create unique index if not exists ots_user_name_idx on public.ots (user_id, lower(name));
  create index if not exists ots_user_idx on public.ots (user_id);

  alter table public.ots enable row level security;
  drop policy if exists "ots: own select" on public.ots;
  create policy "ots: own select" on public.ots for select using (auth.uid() = user_id);
  drop policy if exists "ots: own insert" on public.ots;
  create policy "ots: own insert" on public.ots for insert with check (auth.uid() = user_id);
  drop policy if exists "ots: own update" on public.ots;
  create policy "ots: own update" on public.ots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "ots: own delete" on public.ots;
  create policy "ots: own delete" on public.ots for delete using (auth.uid() = user_id);

  -- ---------- ASSIST POSITIONS ----------
  create table if not exists public.positions (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users (id) on delete cascade,
    name       text not null,
    created_at timestamptz not null default now()
  );
  create unique index if not exists positions_user_name_idx on public.positions (user_id, lower(name));
  create index if not exists positions_user_idx on public.positions (user_id);

  alter table public.positions enable row level security;
  drop policy if exists "positions: own select" on public.positions;
  create policy "positions: own select" on public.positions for select using (auth.uid() = user_id);
  drop policy if exists "positions: own insert" on public.positions;
  create policy "positions: own insert" on public.positions for insert with check (auth.uid() = user_id);
  drop policy if exists "positions: own update" on public.positions;
  create policy "positions: own update" on public.positions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "positions: own delete" on public.positions;
  create policy "positions: own delete" on public.positions for delete using (auth.uid() = user_id);

  -- ---------- SURGERY RECORDS ----------
  -- Names are denormalized (snapshot) so history survives list edits/deletes:
  --   ot_name / assist_position_name stay as typed at log time.
  --   consultant_id is set null when a consultant is deleted; consultant_name is kept.
  create table if not exists public.records (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid not null references auth.users (id) on delete cascade,
    record_date          date not null,
    patient_name         text not null check (char_length(btrim(patient_name)) > 0),
    age                  smallint check (age between 0 and 120),
    diagnosis            text not null default '',
    ot_name              text not null default '',
    assist_position_name text not null default '',
    consultant_id        uuid references public.consultants (id) on delete set null,
    consultant_name      text not null default '',
    attachments          jsonb not null default '[]',
    created_at           timestamptz not null default now()
  );
  create index if not exists records_user_idx on public.records (user_id);
  create index if not exists records_date_idx on public.records (user_id, record_date desc);

  alter table public.records enable row level security;
  drop policy if exists "records: own select" on public.records;
  create policy "records: own select" on public.records for select using (auth.uid() = user_id);
  drop policy if exists "records: own insert" on public.records;
  create policy "records: own insert" on public.records for insert with check (auth.uid() = user_id);
  drop policy if exists "records: own update" on public.records;
  create policy "records: own update" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "records: own delete" on public.records;
  create policy "records: own delete" on public.records for delete using (auth.uid() = user_id);

  -- updated_at keeper
  create or replace function public.touch_updated_at()
  returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end $$;

  drop trigger if exists profiles_touch on public.profiles;
  create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

  -- ============================================================
  -- STORAGE — private bucket for photos + record attachments
  --   Recommended object paths:
  --     <user_id>/profile/<uuid>.<ext>
  --     <user_id>/consultants/<uuid>.<ext>
  --     <user_id>/records/<uuid>.<ext>
  --   Access is scoped by RLS to the owner's folder. Keep PRIVATE.
  -- ============================================================
  insert into storage.buckets (id, name, public)
  values ('otlog', 'otlog', false)
  on conflict (id) do nothing;

  drop policy if exists "otlog: read own files" on storage.objects;
  create policy "otlog: read own files" on storage.objects
    for select
    using (bucket_id = 'otlog' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "otlog: upload own files" on storage.objects;
  create policy "otlog: upload own files" on storage.objects
    for insert
    with check (
      bucket_id = 'otlog'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "otlog: update own files" on storage.objects;
  create policy "otlog: update own files" on storage.objects
    for update
    using (bucket_id = 'otlog' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'otlog' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "otlog: delete own files" on storage.objects;
  create policy "otlog: delete own files" on storage.objects
    for delete
    using (bucket_id = 'otlog' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Signed URLs are short-lived by design. Do NOT make this bucket public:
  -- it holds patient documents (PHI).

  -- ============================================================
  -- v2 — diagnosis tags + detailed patient age
  -- Re-runnable.
  -- ============================================================
  create table if not exists public.tags (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users (id) on delete cascade,
    type       text not null check (type in ('indication', 'comorbidity', 'prehistory')),
    name       text not null,
    created_at timestamptz not null default now()
  );
  create unique index if not exists tags_user_type_name_idx
    on public.tags (user_id, type, lower(name));
  create index if not exists tags_user_idx on public.tags (user_id);

  alter table public.tags enable row level security;
  drop policy if exists "tags: own select" on public.tags;
  create policy "tags: own select" on public.tags for select using (auth.uid() = user_id);
  drop policy if exists "tags: own insert" on public.tags;
  create policy "tags: own insert" on public.tags for insert with check (auth.uid() = user_id);
  drop policy if exists "tags: own update" on public.tags;
  create policy "tags: own update" on public.tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "tags: own delete" on public.tags;
  create policy "tags: own delete" on public.tags for delete using (auth.uid() = user_id);

  -- Fine-grained age (years stay in existing `age` column; months/days added).
  alter table public.records add column if not exists age_months smallint;
  alter table public.records add column if not exists age_days smallint;
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'records_age_months_check'
        and conrelid = 'public.records'::regclass
    ) then
      alter table public.records
        add constraint records_age_months_check check (age_months between 0 and 11);
      alter table public.records
        add constraint records_age_days_check check (age_days between 0 and 30);
    end if;
  end $$;

  -- Patient name is OPTIONAL in the app, so the non-empty DB constraint is dropped.
  do $$
  begin
    if exists (
      select 1 from pg_constraint
      where conname = 'records_patient_name_check'
        and conrelid = 'public.records'::regclass
    ) then
      alter table public.records drop constraint records_patient_name_check;
    end if;
  end $$;
  alter table public.records alter column patient_name drop not null;

  -- ============================================================
  -- v3 — self-service account deletion (irreversible).
  -- The app cannot delete a user via the anon key, so this runs as the
  -- table owner and removes the user's rows, files, then the auth user.
  -- ============================================================
  create or replace function public.delete_own_account()
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    target uuid := auth.uid();
  begin
    if target is null then
      raise exception 'not authenticated';
    end if;

    delete from public.records     where user_id = target;
    delete from public.consultants where user_id = target;
    delete from public.tags        where user_id = target;
    delete from public.ots         where user_id = target;
    delete from public.positions   where user_id = target;
    delete from public.profiles    where id = target;

    delete from storage.objects
      where bucket_id = 'otlog'
        and (storage.foldername(name))[1] = target::text;

    delete from auth.users where id = target;
  end $$;

  revoke all on function public.delete_own_account() from public;
  grant execute on function public.delete_own_account() to authenticated;
