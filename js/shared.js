/* =========================================================================
   shared.js — o catálogo e os planos que TODA A GENTE vê.

   Isto é o oposto de store.js. store.js trata da linha privada em
   `user_state`: cargas, séries, histórico, metas, treinadores — RLS a
   `auth.uid()`, ninguém mais lhe toca. Aqui vive o que é comum: os
   exercícios e os 7 dias, em `shared_exercises` / `shared_days`, onde
   qualquer utilizador autenticado lê e escreve.

   Três regras que explicam a forma deste ficheiro:

   1. **Degrada para o plano local.** Se as tabelas não existirem (SQL por
      correr), se não houver rede, ou se o Supabase falhar, `SHARED.ready`
      fica false e a app corre exactamente como corria antes — `EX`, `VIDEOS`
      e `DAYS` do data.js. Nada aqui pode partir a app.

   2. **O merge é para dentro de `EX`/`VIDEOS`/`DAYS`.** Em vez de espalhar
      condicionais por todo o ui.js, `applyShared()` escreve por cima dos
      objectos que o ui.js já lê. São `const`, mas const impede rebind, não
      mutação. Resultado: técnica, vídeo, foto e lista do dia apanham o que
      vem da nuvem sem uma única linha nova de render.

   3. **Concorrência optimista, sempre.** Todos podem editar a mesma linha.
      Cada escrita leva a `version` que leu; se a linha já mudou, o update
      não aplica nada, avisa-se e recarrega-se. Sem isto perdiam-se edições
      em silêncio, que é o pior fim possível para um plano de treino.

   Imagens: a app NUNCA fala com o Pexels nem com o Commons em runtime. Lê
   `exercise_images` (só linhas `reviewed`) e monta o URL público do bucket.
   Se um exercício não tiver imagem revista, cai no padrão local do
   photos.js — por isso nenhum cartão pode ficar em branco.
   ========================================================================= */

const SHARED = {
  ready:  false,   /* o catálogo remoto chegou e foi aplicado */
  live:   false,   /* o canal de realtime está subscrito */
  ex:     {},      /* ex_key -> linha de shared_exercises */
  days:   {},      /* day_no -> linha de shared_days */
  img:    {},      /* slug   -> linha de exercise_images */
  ver:    {},      /* 'ex:legpress' | 'day:3' -> version lida */
  changed:false,   /* o último pull trouxe algo diferente? (evita repaints no-op) */
  _sig:   ''       /* assinatura do último catálogo aplicado */
};

let sharedChan = null, sharedTimer = null, resyncTimer = null, recoveryBound = false, heartbeat = null;

/* URL público de um ficheiro no bucket. O bucket é público, por isso é só
   concatenação — nada de assinar URLs, nada de pedido extra. */
const MEDIA_BUCKET = 'exercise-media';
function mediaUrl(path){
  return SUPA_URL + '/storage/v1/object/public/' + MEDIA_BUCKET + '/' + path;
}

/* Inverso de mediaUrl(): a partir de um URL público devolve o caminho dentro do
   bucket, ou null se o URL não for deste bucket (um data: URL, um URL externo,
   ou uma foto que a pessoa colou à mão). É o que permite registar no catálogo
   partilhado tanto uma foto acabada de enviar como uma que já vinha do ovr
   privado, tratando as duas só pelo URL. */
function mediaPathFromUrl(url){
  if(typeof url !== 'string' || !url) return null;
  const prefix = SUPA_URL + '/storage/v1/object/public/' + MEDIA_BUCKET + '/';
  return url.indexOf(prefix) === 0 ? url.slice(prefix.length) : null;
}

/* Encolhe uma imagem no browser antes de a enviar: lado maior a 1080px, JPEG
   ~0.82. Mantém o bucket leve e o upload rápido, e o cartão nunca precisa de
   um ficheiro maior do que a miniatura que desenha. Se o canvas falhar por
   algum motivo, devolve o ficheiro original em vez de rebentar. */
function downscaleImage(file, max, quality){
  return new Promise((resolve)=>{
    try{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{
        try{
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          cv.toBlob(b=> resolve(b || file), 'image/jpeg', quality || 0.82);
        }catch(e){ URL.revokeObjectURL(url); resolve(file); }
      };
      img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    }catch(e){ resolve(file); }
  });
}

/* Envia a foto que a pessoa escolheu para um exercício e devolve o URL público.
   O ficheiro fica sob a pasta do próprio utilizador. É a única imagem gerada
   pelo utilizador que a app guarda — fica PRIVADA no estado dela (o URL só é
   escrito no user_state privado); o bucket é de leitura pública mas os URLs não
   são enumeráveis nem aparecem a mais ninguém. `key` é só para nomear o ficheiro
   (id do exercício ou 'c<id>'), não é onde se guarda a referência. */
async function uploadExercisePhoto(file, key){
  if(!sb || !USER || !file) return { ok:false, reason:'offline' };
  try{
    const blob = await downscaleImage(file, 1080, 0.82);
    const safeKey = String(key || 'ex').replace(/[^a-z0-9_-]+/gi, '').slice(0, 32) || 'ex';
    const path = 'user/' + USER.id + '/' + safeKey + '-' + Date.now() + '.jpg';
    const { error } = await sb.storage.from(MEDIA_BUCKET)
      .upload(path, blob, { upsert:true, contentType:'image/jpeg' });
    if(error) throw error;
    return { ok:true, url: mediaUrl(path), path };
  }catch(e){
    console.error('uploadExercisePhoto', e);
    return { ok:false, reason:'error' };
  }
}

/* ---- leitura ------------------------------------------------------------
   Uma passagem, três tabelas, em paralelo. Qualquer erro (incluindo "relation
   does not exist", que é o que se vê antes de correr o SQL) desliga o modo
   partilhado em vez de rebentar. */
async function catalogPull(silent){
  if(!sb || !USER) return false;
  try{
    const [imgs, exs, days] = await Promise.all([
      sb.from('exercise_images').select('*'),
      sb.from('shared_exercises').select('*').eq('deleted', false),
      sb.from('shared_days').select('*')
    ]);
    if(imgs.error || exs.error || days.error) throw (imgs.error || exs.error || days.error);

    SHARED.img = {};  (imgs.data || []).forEach(r=> SHARED.img[r.slug] = r);
    SHARED.ex  = {};  (exs.data  || []).forEach(r=>{ SHARED.ex[r.ex_key] = r; SHARED.ver['ex:'+r.ex_key] = r.version; });
    SHARED.days= {};  (days.data || []).forEach(r=>{ SHARED.days[r.day_no] = r; SHARED.ver['day:'+r.day_no] = r.version; });

    /* Assinatura do catálogo: versões dos exercícios/dias + as imagens revistas.
       Se não mudou nada desde o último pull, os chamadores de fundo (heartbeat,
       reconexão, o eco da própria escrita) não precisam de redesenhar o ecrã —
       é o que tira o "fica sempre a piscar a atualizar". */
    const sig = catalogSig();
    SHARED.changed = (sig !== SHARED._sig);
    SHARED._sig = sig;

    SHARED.ready = true;
    applyShared();
    /* tenta o backfill assim que o catálogo está pronto; corre em diferido para
       não aninhar dentro deste pull, e é no-op depois da primeira vez. Cobre a
       corrida com o cloudPull() — quem ficar pronto por último é que o faz. */
    setTimeout(backfillMyImages, 0);
    return true;
  }catch(e){
    SHARED.ready = false;
    if(!silent && typeof toast === 'function') toast(t('sh_offline'));
    return false;
  }
}

/* Uma string estável que muda sempre que o catálogo muda: versão de cada
   exercício e dia, mais o caminho/estado de cada imagem revista (uma foto nova
   não bump uma `version` mas deve mesmo assim repintar). */
function catalogSig(){
  const v = Object.keys(SHARED.ver).sort().map(k=> k + '=' + SHARED.ver[k]).join('&');
  const i = Object.keys(SHARED.img).sort()
    .map(s=>{ const r = SHARED.img[s]; return s + ':' + (r.storage_path || '') + ':' + (r.reviewed ? 1 : 0); })
    .join('&');
  return v + '|' + i;
}

/* ---- merge para dentro dos objectos que o ui.js já lê ------------------- */
function applyShared(){
  /* exercícios: só o que está publicado entra: um rascunho é visível ao autor
     pela RLS, mas não deve substituir o exercício de origem para ninguém. */
  Object.keys(SHARED.ex).forEach(key=>{
    const r = SHARED.ex[key];
    if(r.status !== 'published') return;

    const base = EX[key] || {};
    EX[key] = {
      ...base,
      nPT:   r.name_pt || base.nPT,
      nEN:   r.name_en || base.nEN,
      eq:    fullJson(r.eq) || base.eq,
      anim:  r.anim || base.anim,
      pri:   (r.pri && r.pri.length) ? r.pri : (base.pri || []),
      sec:   (r.sec && r.sec.length) ? r.sec : (base.sec || []),
      steps: fullJson(r.steps)  || base.steps,
      errs:  fullJson(r.errs)   || base.errs,
      safe:  fullJson(r.safe)   || base.safe,
      breath:fullJson(r.breath) || base.breath
    };
    if(r.video_id) VIDEOS[key] = r.video_id;

    /* imagem: só slugs revistos, e só se o ficheiro estiver registado */
    const img = r.image_slug && SHARED.img[r.image_slug];
    if(img && img.reviewed) EX_PHOTO_URL[key] = mediaUrl(img.storage_path);
    else delete EX_PHOTO_URL[key];
  });

  /* dias: substitui campo a campo, e `items` inteiro quando vem preenchido */
  Object.keys(SHARED.days).forEach(no=>{
    const r = SHARED.days[no];
    const d = DAYS.find(x=> String(x.id) === String(no));
    if(!d) return;
    ['name','short','eyebrow','mus','warm','goal'].forEach(k=>{
      if(fullJson(r[k])) d[k] = r[k];
    });
    if(r.theme) d.theme = r.theme;
    if(r.type)  d.type  = r.type;
    const items = fullJson(r.items);
    if(Array.isArray(items) && items.length){
      d.items = items;
      /* A FOTO VIAJA COM O ITEM. É este o canal fiável: a outra conta já recebe
         os itens do dia (é assim que vê os exercícios), por isso recebe a foto
         pela mesma via — sem depender da tabela exercise_images à parte. Um item
         com `photo` (URL do bucket público) manda em EX_PHOTO_URL. */
      items.forEach(it=>{
        if(it && it.photo && mediaPathFromUrl(it.photo)) EX_PHOTO_URL[it.ex] = it.photo;
      });
    }
  });
}

/* jsonb vazio (`{}`) chega como objecto, não como null — tratá-lo como
   "não definido" é o que evita apagar o texto de origem com nada. */
/* Postgres hands a jsonb column back as an object, but a column left as `text`
   on an older database comes back as the JSON *string* — and Object.keys() on a
   string returns its indices, so the old check read "has content" and passed the
   raw string through. That is what rendered the equipment label on screen as
   {"pt":"Leg Press 45°","en":"45° Leg Press"}. Parse before judging. */
function fullJson(v){
  if(!v) return null;
  if(typeof v === 'string'){
    const s = v.trim();
    if(s[0] !== '{' && s[0] !== '[') return null;
    try{ v = JSON.parse(s); }catch(e){ return null; }
    if(!v) return null;
  }
  if(Array.isArray(v)) return v.length ? v : null;
  if(typeof v !== 'object') return null;
  return Object.keys(v).length ? v : null;
}

/* ---- realtime -----------------------------------------------------------
   Qualquer evento nas três tabelas dispara um pull inteiro, agrupado em
   400 ms. Aplicar o payload evento a evento seria mais rápido e menos fiável:
   um UPDATE parcial ou um evento perdido deixava a app a divergir da base, e
   o volume aqui é de dezenas de linhas, não de milhares. */
function catalogSubscribe(){
  if(!sb || !USER || sharedChan) return;
  try{
    sharedChan = sb.channel('shared-catalog')
      .on('postgres_changes', { event:'*', schema:'public', table:'shared_exercises' }, onSharedChange)
      .on('postgres_changes', { event:'*', schema:'public', table:'shared_days'      }, onSharedChange)
      .on('postgres_changes', { event:'*', schema:'public', table:'exercise_images'  }, onSharedChange)
      .subscribe(status=>{
        SHARED.live = (status === 'SUBSCRIBED');
        /* Sempre que o canal (re)liga — arranque, e sobretudo a reconexão depois
           de o telemóvel bloquear/voltar ao ecrã — reconcilia o catálogo inteiro.
           É isto que apanha os eventos que se perderam enquanto o socket esteve
           morto. Sem isto, um "para todos" feito por outra pessoa nunca chegava a
           quem tinha a app em segundo plano, e a pessoa tinha de recarregar. */
        if(status === 'SUBSCRIBED') resyncCatalog();
      });
  }catch(e){ SHARED.live = false; }
  bindCatalogRecovery();
}

/* Pull silencioso e agrupado, para reconciliar (reconexão, foco, voltar online).
   Não é o caminho dos eventos: não mostra o toast "alguém editou", só põe a app
   a par da base e redesenha. Timer próprio para não colidir com onSharedChange. */
function resyncCatalog(){
  if(!sb || !USER) return;
  clearTimeout(resyncTimer);
  resyncTimer = setTimeout(async ()=>{
    const ok = await catalogPull(true);
    /* só repinta se algo mudou de facto, e nunca por cima de uma edição aberta */
    if(ok && SHARED.changed && typeof catalogRepaint === 'function') catalogRepaint();
  }, 300);
}

/* O realtime por si só não basta num telemóvel: ao bloquear o ecrã ou trocar de
   app, o browser suspende o websocket e os eventos perdem-se. Reconciliar quando
   a aba volta a ficar visível / ganha foco / a rede volta garante que uma acção
   "para todos" aparece a toda a gente sem ninguém ter de parar e recarregar. */
function bindCatalogRecovery(){
  if(recoveryBound || typeof window === 'undefined') return;
  recoveryBound = true;
  const wake = ()=>{
    if(typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    resyncCatalog();
  };
  if(typeof document !== 'undefined') document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
  startCatalogHeartbeat();
}

/* Rede de segurança final: mesmo que o realtime, a reconexão e os eventos de
   foco falhem todos, um pull periódico faz o catálogo convergir. Só corre com a
   aba VISÍVEL e sessão activa — nada de bateria/pedidos com a app em segundo
   plano — e passa pelo resyncCatalog agrupado, por isso não duplica um pull que
   um evento acabou de disparar. Garante que um "para todos" chega a toda a gente
   sem ninguém recarregar à mão. */
function startCatalogHeartbeat(){
  if(heartbeat || typeof window === 'undefined') return;
  heartbeat = setInterval(()=>{
    if(!sb || !USER) return;
    if(typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    resyncCatalog();
  }, 45000);
}
function onSharedChange(payload){
  /* a própria escrita também volta pelo canal; não vale a pena avisar-me a
     mim mesmo de uma alteração que acabei de fazer */
  const mine = payload && payload.new && payload.new.updated_by === (USER && USER.id);
  clearTimeout(sharedTimer);
  sharedTimer = setTimeout(async ()=>{
    const ok = await catalogPull(true);
    /* O eco da própria escrita volta por aqui com a MESMA assinatura -> nada
       mudou -> não repinta nem avisa. Só uma alteração real (de outra pessoa,
       ou uma que perdemos enquanto o socket esteve morto) repinta, e mesmo essa
       nunca por cima de um sheet aberto. */
    if(ok && SHARED.changed){
      if(typeof catalogRepaint === 'function') catalogRepaint();
      if(!mine && typeof toast === 'function') toast(t('sh_remote'));
    }
  }, 400);
}
function catalogUnsubscribe(){
  if(sharedChan && sb){ try{ sb.removeChannel(sharedChan); }catch(e){} }
  sharedChan = null; SHARED.live = false;
}

/* Ponto de entrada único, chamado do store.js quando há sessão. */
async function catalogSync(){
  bindCatalogRecovery();            /* liga a recuperação mesmo se o 1º pull falhar (offline) */
  const ok = await catalogPull(true);
  if(ok) catalogSubscribe();   /* o backfill das imagens é disparado pelo catalogPull */
  return ok;
}

/* ---- escrita ------------------------------------------------------------
   `.eq('version', lida)` é o cadeado. Se ninguém mexeu, o update aplica-se e
   devolve a linha; se alguém mexeu, devolve zero linhas e nós recarregamos
   em vez de sobrescrever o trabalho do outro. */
async function saveSharedExercise(exKey, patch){
  if(!sb || !USER || !SHARED.ready) return { ok:false, reason:'offline' };
  const existing = SHARED.ex[exKey];
  try{
    if(!existing){
      const { error } = await sb.from('shared_exercises')
        .insert({ ...patch, ex_key: exKey, created_by: USER.id, updated_by: USER.id });
      if(error) throw error;
    }else{
      const sentVer = SHARED.ver['ex:' + exKey];
      const { data, error } = await sb.from('shared_exercises')
        .update(patch)
        .eq('id', existing.id)
        .eq('version', sentVer)
        .select('id');
      if(error) throw error;
      if(!data || !data.length){
        const probe = await sb.from('shared_exercises').select('version').eq('id', existing.id).maybeSingle();
        await catalogPull(true);
        return zeroRowReason('shared_exercises', existing.id, sentVer, probe.data);
      }
    }
    await catalogPull(true);
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error', msg: errText(e) }; }
}

async function saveSharedDay(dayNo, patch){
  if(!sb || !USER || !SHARED.ready) return { ok:false, reason:'offline' };
  const existing = SHARED.days[dayNo];
  try{
    if(!existing){
      const { error } = await sb.from('shared_days')
        .insert({ ...patch, day_no: Number(dayNo), created_by: USER.id, updated_by: USER.id });
      if(error) throw error;
    }else{
      const sentVer = SHARED.ver['day:' + dayNo];
      const { data, error } = await sb.from('shared_days')
        .update(patch)
        .eq('id', existing.id)
        .eq('version', sentVer)
        .select('id');
      if(error) throw error;
      if(!data || !data.length){
        const probe = await sb.from('shared_days').select('version').eq('id', existing.id).maybeSingle();
        await catalogPull(true);
        return zeroRowReason('shared_days', existing.id, sentVer, probe.data);
      }
    }
    await catalogPull(true);
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error', msg: errText(e) }; }
}

/* A mensagem verdadeira que o Postgres/Supabase devolveu. Sem isto o utilizador
   só via "sem ligação" quando na verdade era permissão, coluna ou RLS — e a
   edição desaparecia sem explicação. Mostrar a causa real é o que torna um
   "Toda a gente" que falha diagnosticável em vez de misterioso. */
function errText(e){
  if(!e) return 'erro desconhecido';
  return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || String(e);
}

/* Um UPDATE que não tocou linha nenhuma é ambíguo — e é ESTE o caso real que
   fazia a app mentir. A RLS/Postgres não lança erro quando recusa uma escrita:
   devolve simplesmente zero linhas, exactamente como um conflito de versão.
   Relemos a linha para distinguir:
     • linha desapareceu            -> apagada/id errado
     • versão IGUAL à que enviámos  -> a base RECUSOU a escrita (RLS/permissão),
                                       não houve conflito nenhum
     • versão DIFERENTE             -> conflito real, alguém mexeu primeiro
   Sem isto, uma recusa de RLS aparecia como "alguém editou isto" e revertia. */
function zeroRowReason(table, id, sentVer, curRow){
  if(!curRow) return { ok:false, reason:'error', msg:'linha não encontrada em ' + table + ' (id ' + id + ') — recarrega e tenta outra vez' };
  if(curRow.version === sentVer) return { ok:false, reason:'blocked',
    msg:'a base de dados recusou a escrita (RLS/permissão) em ' + table + ': versão ' + sentVer + ' não mudou mas nenhuma linha foi atualizada' };
  return { ok:false, reason:'conflict' };
}

/* Resposta comum às duas escritas, para o ui.js não repetir a mesma cadeia
   de ifs em cada handler. */
function reportShared(res){
  if(!res.ok && res.reason === 'conflict'){ toast(t('sh_conflict')); if(typeof rerender === 'function') rerender(); return false; }
  if(!res.ok){ toast(res.msg ? ('⚠ ' + res.msg) : t('sh_offline')); return false; }
  toast(t('sh_pushed'));
  return true;
}

/* ---- escrever a partir do editor ----------------------------------------
   O editor mostra UM nome e UM equipamento, no idioma em que a pessoa está.
   A tabela guarda os dois. Escrever só o campo do idioma corrente e deixar o
   outro como está é o que evita que editar em PT apague o texto EN. */
function langPatchName(exKey, name){
  const cur = SHARED.ex[exKey] || {};
  const base = EX[exKey] || {};
  const other = LANG === 'pt'
    ? (cur.name_en || base.nEN || name)
    : (cur.name_pt || base.nPT || name);
  return LANG === 'pt' ? { name_pt:name, name_en:other } : { name_en:name, name_pt:other };
}
function langPatchEq(exKey, eqText){
  const cur = fullJson((SHARED.ex[exKey] && SHARED.ex[exKey].eq)
                    || (EX[exKey] && EX[exKey].eq)) || {};
  const other = LANG === 'pt' ? 'en' : 'pt';
  /* Mirror into the other language the way langPatchName already does. A brand
     new exercise has nothing on the other side, so typing the equipment in EN
     left the PT label blank — the field just vanished after a language switch.
     An existing translation still wins; this only fills a gap. */
  return { eq: { ...cur, [LANG]: eqText, [other]: cur[other] || eqText } };
}

/* Um slug legível a partir do nome, porque `ex_key` aparece em chaves de
   estado e em URLs de imagem. Colisão resolve-se com sufixo, nunca
   sobrescrevendo um exercício que já existe. */
function exSlug(name){
  const COMBINING = /[̀-ͯ]/g;   /* acentos, depois de NFD */
  let s = (name || 'ex').toLowerCase()
    .normalize('NFD').replace(COMBINING, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'ex';
  if(SHARED.ex[s] || EX[s]) s += '-' + Date.now().toString(36).slice(-4);
  return s;
}

/* Os itens do dia tal como estão publicados; se o dia ainda não foi semeado,
   parte-se do plano local para não publicar um dia vazio por engano. */
function sharedItems(dayNo){
  const r = SHARED.days[dayNo];
  if(r && Array.isArray(r.items) && r.items.length) return JSON.parse(JSON.stringify(r.items));
  const d = DAYS.find(x=> String(x.id) === String(dayNo));
  return d ? JSON.parse(JSON.stringify(d.items)) : [];
}

/* Novo exercício para toda a gente: linha no catálogo + item no dia.
   Os quatro blocos saem sempre de prog() — escrevê-los à mão é o que faz a
   periodização divergir entre exercícios. O que a pessoa escreveu entra por
   cima, mas só no bloco em que está. */
async function publishExercise(obj, dayNo, block, photoUrl){
  if(!sb || !USER || !SHARED.ready) return { ok:false, reason:'offline' };
  const key = exSlug(obj.name);
  const first = await saveSharedExercise(key, {
    ...langPatchName(key, obj.name),
    ...langPatchEq(key, obj.eq || ''),
    video_id: obj.vid || null,
    kind: 'acc',
    status: 'published'
  });
  if(!first.ok) return first;

  const blocks = prog(parseInt(obj.s, 10) || 3, obj.l || '', obj.rest || '', 'acc');
  if(obj.r) blocks[block || 'b1'].r = obj.r;
  if(obj.l) blocks[block || 'b1'].l = obj.l;

  const items = sharedItems(dayNo);
  /* a foto entra no próprio item — mesmo canal fiável que leva o exercício a
     toda a gente. Só um URL do bucket público; um data:/externo é ignorado. */
  const photo = (photoUrl && mediaPathFromUrl(photoUrl)) ? { photo: photoUrl } : {};
  items.push({ ex:key, ...photo, ...blocks });
  const res = await saveSharedDay(dayNo, { items });
  /* devolve a chave (slug) criada para o autor poder guardar a SUA foto no ovr
     privado — sem a chave, um exercício novo publicado ficava sem foto e caía
     na imagem de padrão do sistema. */
  return res.ok ? { ok:true, key } : res;
}

/* Publica a foto de um exercício PARA TODA A GENTE. Isto é o que faltava: sem
   isto, a foto ficava só no ovr privado do autor e mais ninguém a via — um
   exercício novo "para todos" aparecia sem imagem a toda a gente.

   O ficheiro já está no bucket público (uploadExercisePhoto), por isso aqui só
   se REGISTA: uma linha em exercise_images (slug = ex_key, uma imagem por
   exercício, reviewed=true para ficar logo visível — a app não tem ecrã de
   revisão) e depois liga-se `image_slug` na linha do exercício. A linha da
   imagem entra primeiro porque `shared_exercises.image_slug` tem FK para
   `exercise_images.slug`.

   Só se aceita um URL que seja mesmo do bucket; um data: URL ou externo é
   ignorado em silêncio (skipped) em vez de rebentar. Não é fatal ao guardar:
   o texto/vídeo do exercício já foram publicados; se isto falhar, avisa-se. */
async function linkSharedPhoto(exKey, photoUrl, storagePath){
  if(!sb || !USER || !SHARED.ready) return { ok:false, reason:'offline' };
  /* Prefere o caminho REAL devolvido pelo upload; só cai no parse do URL para os
     casos de reaproveitamento (backfill, custom promovido). Assim uma foto
     acabada de enviar nunca é "saltada" só porque o URL não bate certo. */
  const path = storagePath || mediaPathFromUrl(photoUrl);
  if(!path) return { ok:true, skipped:true };
  try{
    const { error } = await sb.from('exercise_images')
      .upsert({ slug: exKey, storage_path: path, reviewed: true }, { onConflict:'slug' });
    if(error) throw error;
  }catch(e){ return { ok:false, reason:'error', msg: errText(e) }; }
  /* liga a imagem ao exercício; reusa a escrita com versão optimista */
  const res = await saveSharedExercise(exKey, { image_slug: exKey });
  if(!res.ok) return res;
  /* Confirma que ficou MESMO ligado. Uma escrita recusada em silêncio (RLS,
     conflito de versão) deixava o autor convencido de que partilhou quando na
     verdade a linha continuava sem image_slug — que é exactamente o bug de "para
     todos não aparece a imagem". Relê e verifica. */
  try{
    const { data } = await sb.from('shared_exercises')
      .select('image_slug').eq('ex_key', exKey).maybeSingle();
    if(!data || data.image_slug !== exKey){
      return { ok:false, reason:'unverified',
        msg:'a imagem não ficou ligada ao exercício (' + exKey + ') — recarrega e tenta outra vez' };
    }
  }catch(e){}
  return { ok:true };
}

/* ---- backfill: publica as imagens que ficaram só no privado -----------------
   O bug real: exercícios criados ANTES desta correção (ou cuja publicação da
   imagem falhou) têm a foto só no ovr privado do autor — o autor vê-a, mais
   ninguém. Isto corre uma vez por sessão, no arranque, e para CADA exercício
   PRÓPRIO do autor (created_by === eu) que esteja publicado mas cujo item do dia
   ainda não tem foto, escreve a foto NO ITEM do dia — o canal fiável que já
   chega a toda a gente. Também regista em exercise_images como bónus. Só toca
   nos exercícios do próprio; nunca empurra a minha foto para o de outra pessoa.
   Aditivo, best-effort; cada chave é tentada no máximo uma vez. */
let _backfillDone = false;
const _backfillTried = new Set();
async function backfillMyImages(){
  if(_backfillDone) return;
  if(!sb || !USER || !SHARED.ready) return;
  if(typeof STATE === 'undefined' || !STATE || !STATE.ovr) return;
  _backfillDone = true;
  let published = 0;
  for(const k of Object.keys(STATE.ovr)){
    const o = STATE.ovr[k];
    if(!o || !o.photo) continue;
    const path = mediaPathFromUrl(o.photo);
    if(!path) continue;                                   /* URL não partilhável */
    const ci = k.indexOf(':');
    const dayNo = k.slice(0, ci);
    const exKey = k.slice(ci + 1);
    const row = SHARED.ex[exKey];
    if(!row || row.status !== 'published') continue;
    if(row.created_by !== USER.id) continue;              /* só os MEUS exercícios */
    if(_backfillTried.has(k)) continue;
    _backfillTried.add(k);
    /* está neste dia partilhado e ainda sem foto? */
    const items = sharedItems(dayNo);
    const it = items.find(x=> x.ex === exKey);
    if(!it || it.photo) continue;                         /* não é deste dia, ou já tem */
    it.photo = o.photo;
    try{
      const r = await saveSharedDay(dayNo, { items });
      if(r && r.ok){
        published++;
        try{ await linkSharedPhoto(exKey, o.photo, path); }catch(e){}  /* bónus */
      }
    }catch(e){}
  }
  if(published && typeof toast === 'function' && typeof t === 'function'){
    toast(t('sh_backfilled').replace('{n}', published));
  }
}

/* Editar a prescrição de um exercício já no plano: mexe só no bloco corrente,
   porque é esse o que a pessoa tem à frente. */
async function patchSharedItem(dayNo, exKey, block, patch, itemPatch){
  const items = sharedItems(dayNo);
  const it = items.find(x=> x.ex === exKey);
  if(!it) return { ok:false, reason:'error' };
  it[block] = { ...it[block], ...patch };
  /* patch ao nível do ITEM (ex.: a foto) — viaja para toda a gente com o dia */
  if(itemPatch) Object.assign(it, itemPatch);
  return saveSharedDay(dayNo, { items });
}

/* Remover um exercício do dia PARA TODOS: tira o item de shared_days.items e
   grava. NÃO apaga a linha de shared_exercises — o catálogo não tem hard delete;
   o exercício deixa apenas de estar prescrito neste dia e some do dia de toda a
   gente pela mesma via (e realtime/recuperação) que qualquer edição do dia.
   Reversível: volta-se a adicionar. */
async function removeSharedItem(dayNo, exKey){
  if(!sb || !USER || !SHARED.ready) return { ok:false, reason:'offline' };
  const items = sharedItems(dayNo).filter(x=> x.ex !== exKey);
  return saveSharedDay(dayNo, { items });
}

/* ---- diagnóstico: prova real de que "para todos" partilha a imagem --------
   Corre no dispositivo do autor, contra a base REAL, o caminho todo: envia uma
   foto, lê-a como público (o que outra conta faria), cria um exercício de teste
   publicado, liga-lhe a imagem, e RE-PUXA o catálogo para ver se EX_PHOTO_URL
   fica preenchido — que é EXACTAMENTE o que o cliente de outra pessoa calcula.
   Se algum passo falhar, diz porquê (RLS, permissão, coluna). No fim apaga
   (soft-delete) o exercício de teste, por isso não aparece no plano de ninguém.
   Chave única por execução para nunca colidir com um teste anterior. */
async function runImageDiagnostic(){
  const steps = [];
  const add = (step, ok, detail)=> steps.push({ step, ok:!!ok, detail: detail || '' });
  if(!sb || !USER){ add('sessão iniciada', false, 'não há sessão'); return steps; }
  if(!SHARED.ready){ add('catálogo ligado', false, 'o catálogo partilhado não está ligado'); return steps; }
  const KEY = '__diag_' + Date.now().toString(36);
  let url, path;
  /* 1. enviar a foto para o bucket */
  try{
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#c8ff00'; ctx.fillRect(0, 0, 8, 8);
    const blob = await new Promise(r=> cv.toBlob(r, 'image/jpeg', 0.8));
    const up = await uploadExercisePhoto(blob, KEY);
    if(!up.ok) throw new Error(up.reason || 'upload falhou');
    url = up.url; path = up.path;
    add('1. enviar foto para o bucket', true, path);
  }catch(e){ add('1. enviar foto para o bucket', false, errText(e)); return steps; }
  /* 2. ler o URL público SEM sessão — é o que outra conta faz */
  try{
    const r = await fetch(url, { cache:'no-store' });
    add('2. ler a foto como outra conta', r.ok, 'HTTP ' + r.status + (r.ok ? '' : ' — o bucket não está público'));
  }catch(e){ add('2. ler a foto como outra conta', false, String(e)); }
  /* 3. criar o exercício partilhado de teste */
  try{
    const r = await saveSharedExercise(KEY, { name_pt:'Diagnóstico', name_en:'Diagnostic', status:'published', kind:'acc', deleted:false });
    add('3. criar exercício partilhado', r.ok, r.ok ? '' : (r.msg || r.reason || 'recusado'));
    if(!r.ok){ await _diagCleanup(KEY); return steps; }
  }catch(e){ add('3. criar exercício partilhado', false, errText(e)); await _diagCleanup(KEY); return steps; }
  /* 4. ligar a imagem (exercise_images + image_slug) */
  try{
    const r = await linkSharedPhoto(KEY, url, path);
    add('4. ligar a imagem ao exercício', r.ok && !r.skipped, r.ok ? (r.skipped ? 'saltou (URL não é do bucket)' : '') : (r.msg || r.reason || 'recusado'));
  }catch(e){ add('4. ligar a imagem ao exercício', false, errText(e)); }
  /* 5. re-puxar o catálogo e ver o que OUTRA conta veria */
  try{
    await catalogPull(true);
    const got = EX_PHOTO_URL[KEY];
    add('5. outra conta vê a imagem?', !!got && got === url, got ? got : 'SEM imagem — cairia no placeholder');
  }catch(e){ add('5. outra conta vê a imagem?', false, errText(e)); }
  await _diagCleanup(KEY);
  return steps;
}
async function _diagCleanup(KEY){
  try{ await saveSharedExercise(KEY, { deleted:true, status:'draft' }); }catch(e){}
  try{ await catalogPull(true); }catch(e){}
  try{ delete EX_PHOTO_URL[KEY]; if(typeof EX !== 'undefined') delete EX[KEY]; }catch(e){}
}

/* ---- semear -------------------------------------------------------------
   Corre uma vez, quando as tabelas estão vazias: leva os 33 exercícios e os
   7 dias do data.js para a nuvem, já publicados. Depois disto a base é a
   fonte de verdade e o data.js passa a ser só o plano de recurso. */
async function seedCatalog(){
  if(!sb || !USER) return false;
  const exRows = Object.keys(EX).map(key=>({
    ex_key: key,
    name_pt: EX[key].nPT, name_en: EX[key].nEN,
    eq: EX[key].eq || {}, anim: EX[key].anim || null,
    pri: EX[key].pri || [], sec: EX[key].sec || [],
    video_id: VIDEOS[key] || null,
    steps: EX[key].steps || {}, errs: EX[key].errs || {},
    safe: EX[key].safe || {}, breath: EX[key].breath || {},
    status: 'published', created_by: USER.id, updated_by: USER.id
  }));
  const dayRows = DAYS.map(d=>({
    day_no: d.id, name: d.name || {}, short: d.short || {}, eyebrow: d.eyebrow || {},
    mus: d.mus || {}, warm: d.warm || {}, goal: d.goal || {},
    theme: d.theme || null, type: d.type || null, items: d.items || [],
    created_by: USER.id, updated_by: USER.id
  }));
  try{
    const a = await sb.from('shared_exercises').upsert(exRows, { onConflict:'ex_key' });
    if(a.error) throw a.error;
    const b = await sb.from('shared_days').upsert(dayRows, { onConflict:'day_no' });
    if(b.error) throw b.error;
    await catalogSync();
    toast(t('sh_seeded'));
    if(typeof rerender === 'function') rerender();
    return true;
  }catch(e){
    /* A schema mismatch reads as 'offline' otherwise, which is the one thing it
       is not — say what Postgres actually said, and leave it in the console. */
    console.error('seedCatalog', e);
    toast(e && e.message ? e.message : t('sh_offline'));
    return false;
  }
}
