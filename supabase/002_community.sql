-- =========================================================================
-- 002_community.sql — o mural da COMUNIDADE (Fase 2)
--
-- Corre isto inteiro no SQL Editor do Supabase (Run). É idempotente: podes
-- correr outra vez sem estragar nada. Depende do 001 (usa public.profiles
-- para o nome visível de quem publica).
--
-- O que faz:
--   * community_posts  — publicações: uma nota ou uma meta partilhada
--   * post_comments    — comentários numa publicação
--   * post_likes       — gostos, um por pessoa e publicação
--   * Realtime ligado nas três tabelas
--
-- O modelo de privacidade é o OPOSTO do user_state. Aqui a leitura é
-- cruzada (toda a gente vê tudo) — é isso que faz um mural. Por isso vive em
-- tabelas próprias e nunca em user_state, onde a RLS é auth.uid() = user_id.
-- Escrever/apagar continua preso ao dono: só publicas como tu, só apagas o
-- que é teu. Não há DELETE — remover é deleted = true, recuperável, tal como
-- no catálogo partilhado.
-- =========================================================================

-- ---- 1. publicações ------------------------------------------------------
-- kind='note' é texto livre; kind='goal' leva um retrato da meta em `goal`
-- ({title, pct, photo}) — um instantâneo, não uma referência viva, para o
-- mural não expor o resto do estado privado de quem partilha.
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references auth.users on delete cascade,
  body       text not null default '',
  kind       text not null default 'note' check (kind in ('note','goal')),
  goal       jsonb,
  deleted    boolean not null default false,
  created_at timestamptz not null default now()
);

-- idempotente: acrescenta colunas se a tabela já existia de uma corrida antiga
alter table public.community_posts
  add column if not exists body       text    not null default '',
  add column if not exists kind       text    not null default 'note',
  add column if not exists goal       jsonb,
  add column if not exists deleted    boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create index if not exists community_posts_feed
  on public.community_posts (created_at desc) where not deleted;

alter table public.community_posts enable row level security;

drop policy if exists cp_read   on public.community_posts;
drop policy if exists cp_insert on public.community_posts;
drop policy if exists cp_update on public.community_posts;

-- leitura cruzada: o mural só faz sentido se toda a gente vir tudo
create policy cp_read on public.community_posts for select to authenticated using (true);
-- só publicas em teu nome
create policy cp_insert on public.community_posts for insert to authenticated
  with check (author = auth.uid());
-- só editas/apagas (soft) o que é teu
create policy cp_update on public.community_posts for update to authenticated
  using (author = auth.uid()) with check (author = auth.uid());
-- sem policy de DELETE: apagar de vez está fora do alcance; usa deleted = true


-- ---- 2. comentários ------------------------------------------------------
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts on delete cascade,
  author     uuid not null references auth.users on delete cascade,
  body       text not null default '',
  deleted    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.post_comments
  add column if not exists deleted    boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create index if not exists post_comments_thread
  on public.post_comments (post_id, created_at) where not deleted;

alter table public.post_comments enable row level security;

drop policy if exists pc_read   on public.post_comments;
drop policy if exists pc_insert on public.post_comments;
drop policy if exists pc_update on public.post_comments;

create policy pc_read on public.post_comments for select to authenticated using (true);
create policy pc_insert on public.post_comments for insert to authenticated
  with check (author = auth.uid());
create policy pc_update on public.post_comments for update to authenticated
  using (author = auth.uid()) with check (author = auth.uid());


-- ---- 3. gostos -----------------------------------------------------------
-- Chave composta = um gosto por pessoa e publicação, sem lógica extra no
-- cliente. Dar/tirar gosto é insert/delete da própria linha.
create table if not exists public.post_likes (
  post_id    uuid not null references public.community_posts on delete cascade,
  author     uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, author)
);

alter table public.post_likes enable row level security;

drop policy if exists pl_read   on public.post_likes;
drop policy if exists pl_insert on public.post_likes;
drop policy if exists pl_delete on public.post_likes;

create policy pl_read on public.post_likes for select to authenticated using (true);
create policy pl_insert on public.post_likes for insert to authenticated
  with check (author = auth.uid());
-- aqui um DELETE verdadeiro faz sentido: tirar um gosto não é destruir nada
create policy pl_delete on public.post_likes for delete to authenticated
  using (author = auth.uid());


-- ---- 3b. reações (emojis) ------------------------------------------------
-- Substitui o gosto único (❤️) por reações com emoji. A chave composta
-- (post_id, author, emoji) deixa cada pessoa reagir com VÁRIOS emojis
-- diferentes — um de cada tipo. Dar/tirar reação é insert/delete da própria
-- linha, tal como o gosto: tirar uma reação não destrói conteúdo de ninguém,
-- por isso aqui um DELETE verdadeiro faz sentido.
create table if not exists public.post_reactions (
  post_id    uuid not null references public.community_posts on delete cascade,
  author     uuid not null references auth.users on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, author, emoji)
);

alter table public.post_reactions enable row level security;

drop policy if exists pr_read   on public.post_reactions;
drop policy if exists pr_insert on public.post_reactions;
drop policy if exists pr_delete on public.post_reactions;

create policy pr_read on public.post_reactions for select to authenticated using (true);
create policy pr_insert on public.post_reactions for insert to authenticated
  with check (author = auth.uid());
create policy pr_delete on public.post_reactions for delete to authenticated
  using (author = auth.uid());

-- migra os gostos existentes para uma reação ❤️, sem duplicar em nova corrida
insert into public.post_reactions (post_id, author, emoji, created_at)
  select post_id, author, '❤️', created_at from public.post_likes
  on conflict do nothing;


-- ---- 4. Realtime ---------------------------------------------------------
-- Sem isto o websocket liga mas nunca recebe eventos.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.community_posts';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.post_comments';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.post_likes';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.post_reactions';
  exception when duplicate_object then null; end;
end $$;

-- payload do realtime com a linha antiga, para um UPDATE (soft-delete) trazer
-- contexto suficiente
alter table public.community_posts replica identity full;
alter table public.post_comments   replica identity full;
