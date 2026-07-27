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
  ver:    {}       /* 'ex:legpress' | 'day:3' -> version lida */
};

let sharedChan = null, sharedTimer = null;

/* URL público de um ficheiro no bucket. O bucket é público, por isso é só
   concatenação — nada de assinar URLs, nada de pedido extra. */
const MEDIA_BUCKET = 'exercise-media';
function mediaUrl(path){
  return SUPA_URL + '/storage/v1/object/public/' + MEDIA_BUCKET + '/' + path;
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
    return { ok:true, url: mediaUrl(path) };
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

    SHARED.ready = true;
    applyShared();
    return true;
  }catch(e){
    SHARED.ready = false;
    if(!silent && typeof toast === 'function') toast(t('sh_offline'));
    return false;
  }
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
    if(Array.isArray(items) && items.length) d.items = items;
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
      .subscribe(status=>{ SHARED.live = (status === 'SUBSCRIBED'); });
  }catch(e){ SHARED.live = false; }
}
function onSharedChange(payload){
  /* a própria escrita também volta pelo canal; não vale a pena avisar-me a
     mim mesmo de uma alteração que acabei de fazer */
  const mine = payload && payload.new && payload.new.updated_by === (USER && USER.id);
  clearTimeout(sharedTimer);
  sharedTimer = setTimeout(async ()=>{
    const ok = await catalogPull(true);
    if(ok){
      if(typeof rerender === 'function') rerender();
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
  const ok = await catalogPull(true);
  if(ok) catalogSubscribe();
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
      const { data, error } = await sb.from('shared_exercises')
        .update(patch)
        .eq('id', existing.id)
        .eq('version', SHARED.ver['ex:' + exKey])
        .select('id');
      if(error) throw error;
      if(!data || !data.length){ await catalogPull(true); return { ok:false, reason:'conflict' }; }
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
      const { data, error } = await sb.from('shared_days')
        .update(patch)
        .eq('id', existing.id)
        .eq('version', SHARED.ver['day:' + dayNo])
        .select('id');
      if(error) throw error;
      if(!data || !data.length){ await catalogPull(true); return { ok:false, reason:'conflict' }; }
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
async function publishExercise(obj, dayNo, block){
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
  items.push({ ex:key, ...blocks });
  return saveSharedDay(dayNo, { items });
}

/* Editar a prescrição de um exercício já no plano: mexe só no bloco corrente,
   porque é esse o que a pessoa tem à frente. */
async function patchSharedItem(dayNo, exKey, block, patch){
  const items = sharedItems(dayNo);
  const it = items.find(x=> x.ex === exKey);
  if(!it) return { ok:false, reason:'error' };
  it[block] = { ...it[block], ...patch };
  return saveSharedDay(dayNo, { items });
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
