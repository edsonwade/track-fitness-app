/* =========================================================================
   community.js — o mural da Comunidade (Fase 2).

   Estado, leitura, realtime e escrita. NÃO desenha nada: a renderização vive
   toda no ui.js, como o resto da app. Este ficheiro só sabe falar com as três
   tabelas de 002_community.sql e guardar o resultado em COMMUNITY.

   Ao contrário do user_state, aqui a leitura é CRUZADA — toda a gente vê tudo.
   É isso que faz um mural, e é por isso que isto vive em tabelas próprias e
   nunca no estado privado. Escrever continua preso ao dono (RLS author = uid).

   Carrega DEPOIS de store.js e shared.js: lê `sb`, `USER` e `t()`. Tudo
   degrada para o painel estático quando não há tabelas ou rede — `SHARED`/
   `COMMUNITY.ready` a falso é exactamente a app pré-nuvem, e o file:// continua
   a funcionar.
   ========================================================================= */

const COMMUNITY = {
  ready:false, live:false,
  posts:[],        /* [{id, author, body, kind, goal, created_at}] mais recente primeiro */
  comments:{},     /* postId -> [{id, author, body, created_at}] ordem cronológica       */
  reactions:{},    /* postId -> { emoji: {count, mine} }  — reações por emoji             */
  names:{},        /* uuid   -> nome visível (de profiles)                                */
  members:[]       /* [{id, name}] únicos, para o autocomplete de @menções                */
};

let commChan = null, commTimer = null;

/* Nome de quem publicou. profiles pode não ter linha (perfil por criar) ou a
   leitura pode falhar sem derrubar o mural — cai-se num rótulo genérico. */
function communityName(uid){
  return (uid && COMMUNITY.names[uid]) || t('cm_someone');
}

/* ---- leitura ------------------------------------------------------------
   Uma passagem, quatro selects em paralelo. Um erro nas publicações,
   comentários ou gostos desliga o mural (volta ao painel estático); um erro
   só nos perfis não — os nomes são acessórios, o resto do mural fica de pé. */
async function communityPull(){
  if(!sb || !USER) return false;
  try{
    const [posts, comments, reacts, profs] = await Promise.all([
      sb.from('community_posts').select('*').eq('deleted', false)
        .order('created_at', { ascending:false }).limit(100),
      sb.from('post_comments').select('*').eq('deleted', false)
        .order('created_at', { ascending:true }),
      sb.from('post_reactions').select('post_id, author, emoji'),
      sb.from('profiles').select('id, name')
    ]);
    if(posts.error || comments.error){
      throw (posts.error || comments.error);
    }

    COMMUNITY.posts = posts.data || [];

    COMMUNITY.comments = {};
    (comments.data || []).forEach(c=>{
      (COMMUNITY.comments[c.post_id] = COMMUNITY.comments[c.post_id] || []).push(c);
    });

    /* Reações são acessórias: se a tabela ainda não existe (migração 002 por
       correr) o mural fica de pé na mesma, apenas sem reações — como os nomes. */
    COMMUNITY.reactions = {};
    if(!reacts.error) (reacts.data || []).forEach(r=>{
      const m = COMMUNITY.reactions[r.post_id] || (COMMUNITY.reactions[r.post_id] = {});
      const cell = m[r.emoji] || (m[r.emoji] = { count:0, mine:false });
      cell.count++;
      if(r.author === USER.id) cell.mine = true;
    });

    COMMUNITY.names = {}; COMMUNITY.members = [];
    if(!profs.error) (profs.data || []).forEach(p=>{
      if(p.name){ COMMUNITY.names[p.id] = p.name; COMMUNITY.members.push({ id:p.id, name:p.name }); }
    });

    COMMUNITY.ready = true;
    return true;
  }catch(e){
    COMMUNITY.ready = false;
    return false;
  }
}

/* ---- escrita ------------------------------------------------------------
   Tudo em nome de USER.id (a RLS recusa o resto). Cada escrita relê o mural e
   devolve {ok}. O ui.js re-renderiza a partir daí. */
async function postToCommunity(data){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  const kind = data.kind === 'goal' ? 'goal' : 'note';
  const body = (data.body || '').trim().slice(0, 2000);
  if(kind === 'note' && !body) return { ok:false, reason:'empty' };
  const row = { author: USER.id, body, kind };
  if(kind === 'goal' && data.goal) row.goal = data.goal;
  try{
    const { error } = await sb.from('community_posts').insert(row);
    if(error) throw error;
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

async function commentOnPost(postId, body){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  body = (body || '').trim().slice(0, 1000);
  if(!body) return { ok:false, reason:'empty' };
  try{
    const { error } = await sb.from('post_comments').insert({ post_id: postId, author: USER.id, body });
    if(error) throw error;
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

/* Editar o texto de uma publicação ou comentário SEU. A RLS (cp_update/
   pc_update com author = auth.uid()) recusa mexer no de outra pessoa, por isso
   o `.eq('author', USER.id)` é cinto e suspensórios: mesmo que a UI escapasse,
   a base não deixava. Só se toca no `body` — o gosto, a meta e o dono ficam. */
async function updatePost(id, body){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  body = (body || '').trim().slice(0, 2000);
  if(!body) return { ok:false, reason:'empty' };
  try{
    const { data, error } = await sb.from('community_posts')
      .update({ body }).eq('id', id).eq('author', USER.id).select('id');
    if(error) throw error;
    if(!data || !data.length) return { ok:false, reason:'denied' };
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

async function updateComment(id, body){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  body = (body || '').trim().slice(0, 1000);
  if(!body) return { ok:false, reason:'empty' };
  try{
    const { data, error } = await sb.from('post_comments')
      .update({ body }).eq('id', id).eq('author', USER.id).select('id');
    if(error) throw error;
    if(!data || !data.length) return { ok:false, reason:'denied' };
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

/* Reagir/desreagir com um emoji = insert/delete da própria linha (a chave
   composta post_id+author+emoji garante uma reação de cada tipo por pessoa, mas
   permite várias reações diferentes). Tirar uma reação é um DELETE verdadeiro —
   não destrói conteúdo de ninguém. */
async function toggleReaction(postId, emoji){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  emoji = String(emoji || '').trim();
  if(!emoji) return { ok:false, reason:'empty' };
  const cell = COMMUNITY.reactions[postId] && COMMUNITY.reactions[postId][emoji];
  const mine = !!(cell && cell.mine);
  try{
    if(mine){
      const { error } = await sb.from('post_reactions').delete()
        .eq('post_id', postId).eq('author', USER.id).eq('emoji', emoji);
      if(error) throw error;
    }else{
      const { error } = await sb.from('post_reactions')
        .insert({ post_id: postId, author: USER.id, emoji });
      if(error) throw error;
    }
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

/* Remover uma publicação ou comentário próprio: soft-delete (deleted = true),
   nunca DELETE — a RLS só deixa mexer no que é teu. */
async function softDeleteCommunity(what, id){
  if(!sb || !USER) return { ok:false, reason:'offline' };
  const tbl = what === 'comment' ? 'post_comments' : 'community_posts';
  try{
    const { error } = await sb.from(tbl).update({ deleted:true })
      .eq('id', id).eq('author', USER.id);
    if(error) throw error;
    await communityPull();
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}

/* ---- realtime -----------------------------------------------------------
   Um canal, três tabelas, qualquer evento dispara um pull inteiro agrupado em
   400 ms — o mesmo padrão do catálogo partilhado. O ui.js decide se re-renderiza
   (não o faz se a pessoa estiver a escrever um comentário, para não o apagar). */
function communitySubscribe(){
  if(!sb || !USER || commChan) return;
  try{
    commChan = sb.channel('community')
      .on('postgres_changes', { event:'*', schema:'public', table:'community_posts' }, onCommunityChange)
      .on('postgres_changes', { event:'*', schema:'public', table:'post_comments'   }, onCommunityChange)
      .on('postgres_changes', { event:'*', schema:'public', table:'post_reactions'   }, onCommunityChange)
      .subscribe(status=>{ COMMUNITY.live = (status === 'SUBSCRIBED'); });
  }catch(e){ COMMUNITY.live = false; }
}
function onCommunityChange(){
  clearTimeout(commTimer);
  commTimer = setTimeout(async ()=>{
    const ok = await communityPull();
    if(ok && typeof onCommunityRefreshed === 'function') onCommunityRefreshed();
  }, 400);
}
function communityUnsubscribe(){
  if(commChan && sb){ try{ sb.removeChannel(commChan); }catch(e){} }
  commChan = null; COMMUNITY.live = false;
}

/* Garante que a linha em `profiles` tem o nome visível do utilizador. Sem isto
   o mural mostrava "Alguém": o registo guarda o nome em `full_name` mas o
   trigger do 001 lê `name`, por isso o perfil ficava sem nome utilizável. A app
   já tem o nome em STATE.profile.name — escreve-o no próprio perfil (a RLS de
   profiles permite id = auth.uid()). Corrige contas novas e antigas. */
async function ensureCommunityProfile(){
  if(!sb || !USER) return;
  const name = ((typeof STATE !== 'undefined' && STATE.profile && STATE.profile.name) || '').trim();
  if(!name) return;
  try{ await sb.from('profiles').upsert({ id: USER.id, name }); }catch(e){}
}

/* Ponto de entrada único, chamado do store.js quando há sessão. O pull é
   assíncrono e a Home já desenhou o painel estático antes de ele acabar — por
   isso, quando chega, pede-se um repaint (a mesma porta que o realtime usa),
   senão o mural só aparecia na próxima renderização. */
async function communitySync(){
  await ensureCommunityProfile();
  const ok = await communityPull();
  if(ok){
    communitySubscribe();
    if(typeof onCommunityRefreshed === 'function') onCommunityRefreshed();
  }
  return ok;
}
