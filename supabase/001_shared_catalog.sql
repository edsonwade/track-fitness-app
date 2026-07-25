-- =========================================================================
-- 001_shared_catalog.sql — biblioteca de exercícios + planos PARTILHADOS
--
-- Corre isto inteiro no SQL Editor do Supabase (Run). É idempotente: podes
-- correr outra vez sem estragar nada.
--
-- O que faz:
--   * profiles          — nome visível de quem editou
--   * exercise_images   — registo de imagens REVISTAS (nunca se chama Pexels
--                         nem Commons em runtime; a app lê só desta tabela)
--   * shared_exercises  — catálogo de exercícios, todos leem, todos editam
--   * shared_days       — planos de treino, todos leem, todos editam
--   * catalog_edits     — quem mudou o quê (porque toda a gente pode editar)
--   * Realtime ligado nas tabelas partilhadas
--   * bucket 'exercise-media' com leitura pública
--
-- O que NÃO toca: user_state. Cargas, séries, histórico, metas e treinadores
-- continuam privados, RLS auth.uid() = user_id, exactamente como está.
-- =========================================================================

-- ---- 0. perfis -----------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- cria o perfil automaticamente ao registar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---- 1. imagens revistas -------------------------------------------------
-- A app NUNCA pede imagens a uma API externa. Pexels/Commons servem só para
-- eu ir buscar o ficheiro durante a criação de conteúdo; o que fica é a linha
-- aqui + o ficheiro no bucket. reviewed=false não é servido à app.
create table if not exists public.exercise_images (
  slug         text primary key,               -- 'squat-barbell-back'
  storage_path text not null,                  -- caminho no bucket exercise-media
  alt_pt       text,
  alt_en       text,
  credit       text,                           -- autor, para atribuição
  license      text,                           -- 'CC BY-SA 4.0', 'Pexels License', ...
  source_url   text,
  reviewed     boolean not null default false, -- só true chega à app
  created_at   timestamptz not null default now()
);

alter table public.exercise_images enable row level security;

drop policy if exists eximg_read   on public.exercise_images;
drop policy if exists eximg_write  on public.exercise_images;
drop policy if exists eximg_update on public.exercise_images;

create policy eximg_read   on public.exercise_images for select to authenticated using (reviewed);
create policy eximg_write  on public.exercise_images for insert to authenticated with check (true);
create policy eximg_update on public.exercise_images for update to authenticated
  using (true) with check (true);


-- ---- 2. função de versão (concorrência optimista) ------------------------
-- Toda a gente pode editar a mesma linha. Sem isto, duas edições em paralelo
-- perdem-se em silêncio. O cliente envia a versão que leu; se já mudou, o
-- update não aplica nenhuma linha e a app avisa em vez de sobrescrever.
create or replace function public.bump_version()
returns trigger language plpgsql as $$
begin
  new.version    := old.version + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;


-- ---- 3. catálogo de exercícios partilhado --------------------------------
create table if not exists public.shared_exercises (
  id          uuid primary key default gen_random_uuid(),
  ex_key      text unique not null,   -- 'legpress' para os built-in, slug para novos
  name_pt     text not null,
  name_en     text not null,
  eq          jsonb default '{}'::jsonb,  -- {pt,en} — mesma forma que EX[id].eq
  anim        text,                       -- chave de animação/ícone
  pri         text[] default '{}',        -- músculos primários (chaves de MUSNAME)
  sec         text[] default '{}',
  kind        text default 'acc' check (kind in ('comp','acc','iso','core','cardio')),
  video_id    text,                   -- id YouTube, validado no cliente por ytId()
  image_slug  text references public.exercise_images(slug),
  steps       jsonb default '{}'::jsonb,   -- {pt:[],en:[]}
  errs        jsonb default '{}'::jsonb,   -- {pt:[{e,c}],en:[...]}
  safe        jsonb default '{}'::jsonb,
  breath      jsonb default '{}'::jsonb,
  status      text not null default 'draft' check (status in ('draft','published')),
  deleted     boolean not null default false,
  version     integer not null default 1,
  created_by  uuid references auth.users,
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- `create table if not exists` acima NÃO acrescenta colunas quando a tabela já
-- existe, por isso uma coluna acrescentada a este ficheiro depois de alguém já
-- o ter corrido nunca chegava a aparecer — e o upsert falhava com PGRST204
-- 'Could not find the <coluna> column'. Repetir cada coluna como ALTER
-- idempotente é o que torna este ficheiro mesmo re-executável.
alter table public.shared_exercises
  add column if not exists eq         jsonb   default '{}'::jsonb,
  add column if not exists anim       text,
  add column if not exists pri        text[]  default '{}',
  add column if not exists sec        text[]  default '{}',
  add column if not exists kind       text    default 'acc',
  add column if not exists video_id   text,
  add column if not exists image_slug text,
  add column if not exists steps      jsonb   default '{}'::jsonb,
  add column if not exists errs       jsonb   default '{}'::jsonb,
  add column if not exists safe       jsonb   default '{}'::jsonb,
  add column if not exists breath     jsonb   default '{}'::jsonb,
  add column if not exists status     text    not null default 'draft',
  add column if not exists deleted    boolean not null default false,
  add column if not exists version    integer not null default 1,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table public.shared_days
  add column if not exists name    jsonb not null default '{}'::jsonb,
  add column if not exists short   jsonb default '{}'::jsonb,
  add column if not exists eyebrow jsonb default '{}'::jsonb,
  add column if not exists mus     jsonb default '{}'::jsonb,
  add column if not exists warm    jsonb default '{}'::jsonb,
  add column if not exists goal    jsonb default '{}'::jsonb,
  add column if not exists theme   text,
  add column if not exists type    text,
  add column if not exists items   jsonb not null default '[]'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

-- ...e `add column if not exists` também não corrige o TIPO de uma coluna que
-- já existe. Uma base antiga tinha `eq` como text, o que devolvia a string JSON
-- em vez do objecto e punha {"pt":…,"en":…} em cru no ecrã.
do $$
declare c record;
begin
  for c in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public'
      and ( (table_name = 'shared_exercises'
             and column_name in ('eq','steps','errs','safe','breath'))
         or (table_name = 'shared_days'
             and column_name in ('name','short','eyebrow','mus','warm','goal','items')) )
      and data_type <> 'jsonb'
  loop
    execute format(
      'alter table public.%I alter column %I type jsonb using
         case when %I is null or btrim(%I::text) = '''' then ''{}''::jsonb
              else %I::text::jsonb end',
      c.table_name, c.column_name, c.column_name, c.column_name, c.column_name);
  end loop;
end $$;

create index if not exists shared_exercises_live
  on public.shared_exercises (status) where not deleted;

alter table public.shared_exercises enable row level security;

drop policy if exists sx_read   on public.shared_exercises;
drop policy if exists sx_insert on public.shared_exercises;
drop policy if exists sx_update on public.shared_exercises;

-- lê-se o que está publicado; um rascunho só é visível a quem o criou
create policy sx_read on public.shared_exercises for select to authenticated
  using (status = 'published' or created_by = auth.uid());

create policy sx_insert on public.shared_exercises for insert to authenticated
  with check (created_by = auth.uid());

create policy sx_update on public.shared_exercises for update to authenticated
  using (true) with check (true);

-- Sem policy de DELETE: apagar de vez está fora do alcance de qualquer user.
-- Remover = deleted = true, recuperável.

drop trigger if exists sx_bump on public.shared_exercises;
create trigger sx_bump before update on public.shared_exercises
  for each row execute function public.bump_version();


-- ---- 4. planos de treino partilhados -------------------------------------
-- Uma linha por dia. `items` guarda a mesma forma que DAYS[n].items já tem
-- ({ex, b1, b2, b3, dl, note}), por isso prog() continua a viver no cliente.
create table if not exists public.shared_days (
  id          uuid primary key default gen_random_uuid(),
  day_no      integer not null unique check (day_no between 1 and 7),
  name        jsonb not null default '{}'::jsonb,   -- {pt,en}
  short       jsonb default '{}'::jsonb,
  eyebrow     jsonb default '{}'::jsonb,
  mus         jsonb default '{}'::jsonb,
  warm        jsonb default '{}'::jsonb,
  goal        jsonb default '{}'::jsonb,
  theme       text,
  type        text,
  items       jsonb not null default '[]'::jsonb,
  version     integer not null default 1,
  created_by  uuid references auth.users,
  updated_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.shared_days enable row level security;

drop policy if exists sd_read   on public.shared_days;
drop policy if exists sd_insert on public.shared_days;
drop policy if exists sd_update on public.shared_days;

create policy sd_read   on public.shared_days for select to authenticated using (true);
create policy sd_insert on public.shared_days for insert to authenticated with check (created_by = auth.uid());
create policy sd_update on public.shared_days for update to authenticated using (true) with check (true);

drop trigger if exists sd_bump on public.shared_days;
create trigger sd_bump before update on public.shared_days
  for each row execute function public.bump_version();


-- ---- 5. histórico de edições --------------------------------------------
-- Toda a gente edita tudo, por isso tem de dar para ver quem mexeu e repor.
create table if not exists public.catalog_edits (
  id        bigint generated always as identity primary key,
  tbl       text not null,          -- 'shared_exercises' | 'shared_days'
  row_id    uuid not null,
  action    text not null,          -- 'insert' | 'update'
  actor     uuid references auth.users,
  before    jsonb,
  after     jsonb,
  at        timestamptz not null default now()
);

alter table public.catalog_edits enable row level security;

drop policy if exists ce_read on public.catalog_edits;
create policy ce_read on public.catalog_edits for select to authenticated using (true);
-- ninguém escreve directamente; só o trigger (security definer)

create or replace function public.log_catalog_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.catalog_edits (tbl, row_id, action, actor, before, after)
  values (tg_table_name, new.id, lower(tg_op), auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return null;
end $$;

drop trigger if exists sx_log on public.shared_exercises;
create trigger sx_log after insert or update on public.shared_exercises
  for each row execute function public.log_catalog_edit();

drop trigger if exists sd_log on public.shared_days;
create trigger sd_log after insert or update on public.shared_days
  for each row execute function public.log_catalog_edit();


-- ---- 6. Realtime ---------------------------------------------------------
-- Sem isto o websocket liga mas nunca recebe eventos.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.shared_exercises';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.shared_days';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.exercise_images';
  exception when duplicate_object then null; end;
end $$;

-- REPLICA IDENTITY FULL para o payload do realtime trazer a linha antiga
alter table public.shared_exercises replica identity full;
alter table public.shared_days      replica identity full;


-- ---- 7. bucket das imagens ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;

drop policy if exists exmedia_read   on storage.objects;
drop policy if exists exmedia_write  on storage.objects;
drop policy if exists exmedia_update on storage.objects;

create policy exmedia_read on storage.objects for select
  using (bucket_id = 'exercise-media');

create policy exmedia_write on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-media');

create policy exmedia_update on storage.objects for update to authenticated
  using (bucket_id = 'exercise-media') with check (bucket_id = 'exercise-media');
