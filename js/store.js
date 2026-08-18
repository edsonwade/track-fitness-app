/* =========================================================================
   store.js — state, persistence, cloud sync, auth, and CRUD for the user's
   own trainers and goals.

   PRESERVATION CONTRACT: `ex`, `sessions`, `custom`, `ovr`, `hidden`,
   `restNote` and the exKey() format are carried over from the pre-redesign
   app UNCHANGED. Logged weights, reps, marked sets and saved sessions must
   survive the redesign, so nothing here may rename or reshape those keys.
   New state is additive only, and every new field is defaulted in normState()
   — otherwise it vanishes when data round-trips through an export/import or
   an older client.
   ========================================================================= */

let STATE = { ex:{}, sessions:[] };
const DBN = 'treinoVanilson';   /* unchanged: renaming it would orphan existing data */

/* ---------- IndexedDB (localStorage mirror as fallback) ---------- */
function idbOpen(){
  return new Promise((res,rej)=>{
    try{
      const r = indexedDB.open(DBN,1);
      r.onupgradeneeded = ()=> r.result.createObjectStore('kv');
      r.onsuccess = ()=> res(r.result);
      r.onerror = ()=> rej(r.error);
    }catch(e){ rej(e); }
  });
}
async function idbGet(k){
  try{
    const db = await idbOpen();
    return await new Promise(res=>{
      const t = db.transaction('kv','readonly').objectStore('kv').get(k);
      t.onsuccess = ()=> res(t.result);
      t.onerror = ()=> res(undefined);
    });
  }catch(e){ return undefined; }
}
async function idbSet(k,v){
  try{
    const db = await idbOpen();
    return await new Promise(res=>{
      const t = db.transaction('kv','readwrite').objectStore('kv').put(v,k);
      t.onsuccess = ()=> res(1);
      t.onerror = ()=> res(0);
    });
  }catch(e){ return 0; }
}

/* ---------- shape ---------- */
const DEFAULT_PROFILE = {
  name:'', photo:'', heightCm:'', weightStart:'', weightCurrent:'', weightTarget:'',
  trainingDays:[1,2,3,4,5,6], onboardedAt:null
};

function normState(){
  STATE = STATE || {};
  /* carried over — do not touch */
  if(!STATE.ex) STATE.ex = {};
  if(!STATE.sessions) STATE.sessions = [];
  if(!STATE.custom) STATE.custom = {};
  if(!STATE.hidden) STATE.hidden = {};
  if(!STATE.ovr) STATE.ovr = {};
  if(typeof STATE.restNote !== 'string') STATE.restNote = '';
  if(!STATE.theme) STATE.theme = 'dark';
  if(!STATE.lang) STATE.lang = 'en';

  /* added by the redesign */
  STATE.profile = Object.assign({}, DEFAULT_PROFILE, STATE.profile || {});
  if(!Array.isArray(STATE.profile.trainingDays) || !STATE.profile.trainingDays.length){
    STATE.profile.trainingDays = DEFAULT_PROFILE.trainingDays.slice();
  }
  if(!Array.isArray(STATE.trainers)) STATE.trainers = [];
  if(!Array.isArray(STATE.goals)) STATE.goals = [];
  /* Rest the user chose, in seconds, keyed by exercise id ('c<id>' for their
     own exercises). The plan's rest is only ever a suggestion — how long
     someone needs between sets is theirs to decide, not the app's. Absent key
     means "use the plan". Defaulted here so an older backup imports cleanly. */
  if(!STATE.restSec || typeof STATE.restSec !== 'object') STATE.restSec = {};
  /* Ordem pessoal dos exercícios por dia: STATE.order['<day>'] = ['<key>', …],
     onde key é o id do built-in (it.ex) ou 'c<id>' de um exercício próprio. É
     privada (cada um escolhe a sua ordem) e uma chave em falta cai no fim, na
     ordem natural — por isso um exercício novo aparece no fim, nunca desaparece.
     Defaultada aqui para um backup antigo importar sem se perder. */
  if(!STATE.order || typeof STATE.order !== 'object') STATE.order = {};

  STATE.trainers = STATE.trainers.map(normTrainer);
  STATE.goals = STATE.goals.map(normGoal);
}

function normTrainer(x){
  x = x || {};
  return {
    id: x.id || nextId(),
    name: x.name || '',
    photo: x.photo || '',
    specialty: x.specialty || '',
    bio: x.bio || '',
    phone: x.phone || '',
    email: x.email || '',
    instagram: x.instagram || '',
    availability: x.availability || '',
    notes: x.notes || '',
    plans: Array.isArray(x.plans) ? x.plans : [],
    preferredDays: Array.isArray(x.preferredDays) ? x.preferredDays : [],
    sessions: Array.isArray(x.sessions) ? x.sessions : [],
    active: x.active !== false,
    createdAt: x.createdAt || new Date().toISOString()
  };
}
function normGoal(x){
  x = x || {};
  return {
    id: x.id || nextId(),
    title: x.title || '',
    type: x.type || 'weight',
    unit: x.unit !== undefined ? x.unit : goalUnit(x.type || 'weight'),
    start: x.start !== undefined ? x.start : '',
    target: x.target !== undefined ? x.target : '',
    current: x.current !== undefined ? x.current : '',
    deadline: x.deadline || '',
    photo: x.photo || '',
    notes: x.notes || '',
    createdAt: x.createdAt || new Date().toISOString(),
    hitAt: x.hitAt || null
  };
}

/* Date.now() collides when two records are created in the same millisecond
   (easy to do in onboarding), so keep a monotonic counter alongside it. */
let _idSeq = 0;
function nextId(){ return Date.now() * 1000 + (_idSeq++ % 1000); }

async function loadState(){
  let s = await idbGet('state');
  if(!s){ try{ s = JSON.parse(localStorage.getItem(DBN) || 'null'); }catch(e){} }
  if(s && typeof s === 'object') STATE = s;
  normState();
  LANG = (STATE.lang === 'pt') ? 'pt' : 'en';
}
function saveLocal(){
  idbSet('state', STATE);
  try{ localStorage.setItem(DBN, JSON.stringify(STATE)); }catch(e){}
}
let _sv;
function saveState(){
  clearTimeout(_sv);
  _sv = setTimeout(()=>{ saveLocal(); cloudPush(); }, 200);
}

/* ---------- theme ---------- */
function applyTheme(){
  const th = STATE.theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', th);
}
function toggleTheme(){
  STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
  saveState();
  applyTheme();
  /* Chart.js reads theme colours at construction time, so rebuild it. */
  setTimeout(()=>{ try{ initProgChart(); }catch(e){} }, 60);
  if(typeof rerender === 'function') rerender();
}

/* =========================================================================
   EXERCISE LOGS — key format is load-bearing for data preservation
   ========================================================================= */
function exKey(d,b,x){ return d + ':' + b + ':' + x; }
function getLog(d,b,x){ return STATE.ex[exKey(d,b,x)] || {}; }
function setLog(d,b,x,patch){
  const k = exKey(d,b,x);
  STATE.ex[k] = Object.assign({}, STATE.ex[k], patch);
  saveState();
}

/* =========================================================================
   GOALS
   ========================================================================= */
const GOAL_TYPES = ['weight','bodyfat','lift','sessions','custom'];
function goalUnit(type){
  if(type === 'weight' || type === 'lift') return 'kg';
  if(type === 'bodyfat') return '%';
  return '';
}
function num(v){
  const n = parseFloat(String(v == null ? '' : v).replace(',','.'));
  return isNaN(n) ? null : n;
}

/* Works in both directions: losing weight (99 -> 70) and adding load
   (60 -> 100) both read as 0% at the start and 100% at the target. */
function goalPct(g){
  const s = num(g.start), t = num(g.target), c = num(g.current);
  if(s === null || t === null || c === null) return 0;
  if(s === t) return c === t ? 100 : 0;
  const p = (c - s) / (t - s) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}
function goalReached(g){
  const s = num(g.start), t = num(g.target), c = num(g.current);
  if(t === null || c === null) return false;
  if(s !== null && t < s) return c <= t;   /* descending target */
  return c >= t;                            /* ascending target */
}
function goalRemaining(g){
  const t = num(g.target), c = num(g.current);
  if(t === null || c === null) return null;
  return Math.round(Math.abs(t - c) * 10) / 10;
}

function addGoal(data){
  const g = normGoal(Object.assign({ id: nextId() }, data));
  g.unit = data.unit !== undefined && data.unit !== '' ? data.unit : goalUnit(g.type);
  if(goalReached(g)) g.hitAt = new Date().toISOString();
  STATE.goals.push(g);
  saveState();
  return g;
}
function updateGoal(id, data){
  const g = STATE.goals.find(x=> x.id === id);
  if(!g) return null;
  const wasHit = !!g.hitAt;
  Object.assign(g, data);
  if(data.type !== undefined && (data.unit === undefined || data.unit === '')) g.unit = goalUnit(g.type);
  /* Set hitAt on the crossing so the 🔥 fires once, and clear it if the
     target moves back out of reach. */
  if(goalReached(g)){ if(!g.hitAt) g.hitAt = new Date().toISOString(); }
  else g.hitAt = null;
  saveState();
  return { goal:g, justHit: !wasHit && !!g.hitAt };
}
function delGoal(id){
  STATE.goals = STATE.goals.filter(x=> x.id !== id);
  saveState();
}
function getGoal(id){ return STATE.goals.find(x=> x.id === id) || null; }
/* The goal the dashboard leads with: first unmet, else most recent. */
function primaryGoal(){
  return STATE.goals.find(g=> !g.hitAt) || STATE.goals[STATE.goals.length-1] || null;
}

/* =========================================================================
   TRAINERS
   ========================================================================= */
function addTrainer(data){
  const tr = normTrainer(Object.assign({ id: nextId() }, data));
  STATE.trainers.push(tr);
  saveState();
  return tr;
}
function updateTrainer(id, data){
  const tr = STATE.trainers.find(x=> x.id === id);
  if(!tr) return null;
  Object.assign(tr, data);
  saveState();
  return tr;
}
function delTrainer(id){
  STATE.trainers = STATE.trainers.filter(x=> x.id !== id);
  saveState();
}
function getTrainer(id){ return STATE.trainers.find(x=> x.id === id) || null; }
function addTrainerSession(id, entry){
  const tr = getTrainer(id);
  if(!tr) return null;
  tr.sessions.unshift({ id: nextId(), date: entry.date || new Date().toISOString().slice(0,10), note: entry.note || '' });
  saveState();
  return tr;
}
function delTrainerSession(trainerId, sessionId){
  const tr = getTrainer(trainerId);
  if(!tr) return;
  tr.sessions = tr.sessions.filter(s=> s.id !== sessionId);
  saveState();
}
/* Trainers who coach a given weekday — lets Home say "today with <name>". */
function trainersForDay(dayId){
  return STATE.trainers.filter(tr=> tr.active && (tr.preferredDays||[]).indexOf(dayId) > -1);
}

/* =========================================================================
   PROFILE
   ========================================================================= */
function updateProfile(data){
  STATE.profile = Object.assign({}, STATE.profile, data);
  saveState();
  return STATE.profile;
}
function needsOnboarding(){ return !STATE.profile || !STATE.profile.onboardedAt; }
function finishOnboarding(){
  STATE.profile.onboardedAt = new Date().toISOString();
  saveState();
}

/* =========================================================================
   SESSION HISTORY
   ========================================================================= */
function deleteSession(id){
  STATE.sessions = STATE.sessions.filter(s=> s.id !== id);
  saveState();
}
function editSessionEntry(id, ix, field, val){
  const sn = STATE.sessions.find(s=> s.id === id);
  if(sn && sn.entries[ix]){ sn.entries[ix][field] = val; saveState(); }
}
/* Sessions logged in the last 7 days — drives the streak and week tiles. */
function sessionsThisWeek(){
  const wk = Date.now() - 7*24*60*60*1000;
  return (STATE.sessions||[]).filter(s=>{
    const d = new Date(s.date).getTime();
    return !isNaN(d) && d >= wk;
  }).length;
}
/* Consecutive calendar days ending today (or yesterday) with a session. */
function streakDays(){
  const days = new Set();
  (STATE.sessions||[]).forEach(s=>{
    const d = new Date(s.date);
    if(!isNaN(d.getTime())) days.add(d.toISOString().slice(0,10));
  });
  if(!days.size) return 0;
  const key = ts => new Date(ts).toISOString().slice(0,10);
  const today = Date.now();
  let start = days.has(key(today)) ? today
            : days.has(key(today - 864e5)) ? today - 864e5
            : null;
  if(start === null) return 0;
  let n = 0;
  while(days.has(key(start - n*864e5))) n++;
  return n;
}

/* =========================================================================
   BACKUP
   ========================================================================= */
function exportData(){
  const blob = new Blob([JSON.stringify(STATE,null,2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vanilson-workout-data.json';
  document.body.appendChild(a); a.click(); a.remove();
  toast(t('ts_export'));
}
function importData(inp){
  const f = inp.files && inp.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const s = JSON.parse(r.result);
      /* An older backup has `ex` but none of the new keys — normState() fills
         them in, which is exactly how legacy data keeps working. */
      if(s && typeof s === 'object' && s.ex){
        STATE = s; normState(); saveState();
        LANG = (STATE.lang === 'pt') ? 'pt' : 'en';
        applyTheme(); applyLang();
        toast(t('ts_import'));
        if(typeof go === 'function') go('home');
      } else toast(t('ts_invalid'));
    }catch(e){ toast(t('ts_readerr')); }
  };
  r.readAsText(f);
}

/* =========================================================================
   SUPABASE — unchanged from the pre-redesign app.
   One row per user: user_state(user_id uuid pk, data jsonb, updated_at).
   RLS scopes every operation to auth.uid(), which is what makes each user's
   trainers and goals private without any extra work. Last write wins.
   The publishable key is public by design; never put a service_role key here.
   ========================================================================= */
const SUPA_URL  = 'https://loiiwelbzbweacpwpzil.supabase.co';
const SUPA_ANON = 'sb_publishable_739Cd4HJWV5VWDeOZ765XQ_QwiBDIow';

let sb = null, USER = null, signingUp = false;
const cloudConfigured = ()=> SUPA_URL.indexOf('http') === 0 && SUPA_ANON.length > 20;

/* Which user the UI was last built for. `null` means "nothing on screen yet". */
let bootedFor = null;

function applyGate(){
  const g = document.getElementById('gate');
  if(g) g.style.display = USER ? 'none' : 'flex';
  if(USER){
    gateMsg('');
    /* ⚠️ Only build the UI when the signed-in user actually changes.
       onAuthStateChange also fires for token refreshes and for the tab simply
       regaining focus, and this used to call boot() every single time — a full
       rerender() of #view. That is what made a playing video die on its own a
       second after it opened, and the card come back blank: the <iframe> was
       thrown away mid-load and rebuilt as a poster, on every card at once.
       A refreshed token changes nothing on screen and must repaint nothing. */
    if(typeof boot === 'function' && bootedFor !== USER.id){
      bootedFor = USER.id;
      boot();
    }
  }else{
    bootedFor = null;
  }
  /* arm the idle timer while signed in, clear it once signed out */
  if(typeof resetIdleTimer === 'function') resetIdleTimer();
  if(typeof syncScrollLock === 'function') syncScrollLock();
}
/* ---------- session lifetime (security) ----------
   The auth token lives in sessionStorage, NOT localStorage: sessionStorage is
   wiped when the browser (or the tab) is closed, so a closed browser means a
   closed session — reopening lands back on the sign-in screen. A plain reload
   in the same tab keeps you in, which is what you want.
   On top of that an idle timer signs the user out after INACTIVE_MS of no
   interaction, so a phone left unlocked on a bench at the gym does not stay
   logged in forever. */
const INACTIVE_MS = 30 * 60 * 1000;   /* 30 minutes */
let idleTimer = null;

/* Older builds stored the token in localStorage. Once we move to sessionStorage
   that copy is never read again but would sit there as a stale credential, so
   remove any `sb-<ref>-auth-token` left behind. */
function purgeLegacyAuth(){
  try{
    for(let i = localStorage.length - 1; i >= 0; i--){
      const k = localStorage.key(i);
      if(k && /^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k);
    }
  }catch(e){}
}

async function idleLogout(){
  if(!USER) return;
  try{ await sb.auth.signOut(); }catch(e){}
  USER = null;
  applyGate();
  gateMsg(t('idle_logout'));
}
function resetIdleTimer(){
  if(idleTimer) clearTimeout(idleTimer);
  if(!USER) return;                 /* no timer while signed out */
  idleTimer = setTimeout(idleLogout, INACTIVE_MS);
}
function startIdleWatch(){
  if(startIdleWatch.on) return;     /* attach the listeners exactly once */
  startIdleWatch.on = true;
  ['pointerdown','keydown','touchstart','visibilitychange'].forEach(ev=>{
    document.addEventListener(ev, ()=>{
      if(ev === 'visibilitychange' && document.hidden) return;
      resetIdleTimer();
    }, { passive:true });
  });
}

function initCloud(){
  if(!cloudConfigured() || !window.supabase){ gateMsg(t('g_noserver')); return; }
  purgeLegacyAuth();
  startIdleWatch();
  try{
    sb = window.supabase.createClient(SUPA_URL, SUPA_ANON, {
      auth:{
        storage: window.sessionStorage,   /* dies when the browser closes */
        persistSession: true,             /* but survives a same-tab reload */
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    sb.auth.getSession().then(({data})=>{
      USER = data && data.session ? data.session.user : null;
      applyGate();
      if(USER){ cloudPull(); catalogSync(); communitySync(); }
    });
    sb.auth.onAuthStateChange((_e, session)=>{
      if(signingUp) return;
      const was = USER && USER.id;
      USER = session ? session.user : null;
      const now = USER && USER.id;
      applyGate();
      /* o catálogo partilhado é independente do estado privado: um falha sem
         levar o outro atrás, e sair fecha o websocket para não ficar a ouvir
         alterações de um utilizador que já não está aqui.
         Só se refaz o trabalho quando o utilizador MUDA — um token renovado
         não muda dados nenhuns, e voltar a puxar tudo a cada renovação era a
         segunda razão para o ecrã se redesenhar sozinho a meio de uma série. */
      if(USER){ if(was !== now){ cloudPull(); catalogSync(); communitySync(); } }
      else { catalogUnsubscribe(); communityUnsubscribe(); }
    });
  }catch(e){ sb = null; gateMsg(t('g_srverr')); }
}
async function cloudPull(){
  if(!sb || !USER) return;
  try{
    const { data } = await sb.from('user_state').select('data').eq('user_id', USER.id).maybeSingle();
    /* Sign-in SUBSTITUI SEMPRE o estado local: com a linha da nuvem se existir,
       ou por um estado LIMPO se este utilizador ainda não tem nenhuma. Sem o
       ramo limpo, um utilizador NOVO herdava o que o anterior deixou em cache
       local — o bug "entrei noutra conta e apareceram os dados da outra" (e,
       pior, o saveState a seguir empurrava os dados da conta A para a conta B).
       Só corre com resposta REAL do servidor: um erro/offline lança e cai no
       catch, deixando o estado local como está — o modo offline continua igual. */
    const before = JSON.stringify(STATE);
    STATE = (data && data.data) ? data.data : {};
    normState(); saveLocal();
    LANG = (STATE.lang === 'pt') ? 'pt' : 'en';
    applyTheme();
    if(JSON.stringify(STATE) !== before && typeof boot === 'function') boot();
    /* STATE (com o ovr das fotos privadas) acabou de chegar; se o catálogo já
       estiver pronto, publica as imagens em falta dos meus exercícios. Cobre a
       corrida com o catalogSync() — o outro lado dispara o mesmo. */
    if(typeof backfillMyImages === 'function') setTimeout(backfillMyImages, 0);
  }catch(e){}
}
async function cloudPush(){
  if(!sb || !USER) return;
  try{
    await sb.from('user_state').upsert({ user_id: USER.id, data: STATE, updated_at: new Date().toISOString() });
  }catch(e){}
}

/* =========================================================================
   AUTH — behaviour, copy and validation unchanged.
   ========================================================================= */
function gateMsg(m, ok){
  const el = document.getElementById('gateMsg');
  if(el){ el.textContent = m || ''; el.style.color = ok ? 'var(--pos)' : ''; }
}
function authErr(m){
  m = (m || '').toLowerCase();
  if(m.indexOf('not confirmed') > -1) return t('err_notconfirmed');
  if(m.indexOf('rate limit') > -1 || m.indexOf('too many') > -1) return t('err_rate');
  if(m.indexOf('invalid login') > -1 || m.indexOf('invalid credentials') > -1) return 'NO_ACCOUNT';
  if(m.indexOf('api key') > -1) return t('err_apikey');
  if(m.indexOf('already registered') > -1 || m.indexOf('already exists') > -1 || m.indexOf('already been registered') > -1) return 'EXISTS';
  if(m.indexOf('password') > -1 && m.indexOf('weak') > -1) return t('err_weak');
  return m || t('err_unknown');
}
function pwCheck(pw){
  if((pw || '').length < 8) return t('pw_short');
  if(!/[A-Za-z]/.test(pw)) return t('pw_letter');
  if(!/[0-9]/.test(pw)) return t('pw_digit');
  if(!/[^A-Za-z0-9]/.test(pw)) return t('pw_symbol');
  return '';
}
const EMAIL_OK = ['gmail.com','googlemail.com','outlook.com','outlook.pt','hotmail.com','hotmail.pt','live.com','live.pt','msn.com','icloud.com','me.com','mac.com','yahoo.com','yahoo.pt','ymail.com','proton.me','protonmail.com','pm.me','sapo.pt','gmx.com','gmx.net','aol.com','zoho.com'];
function validEmail(e){
  e = (e || '').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'format';
  return EMAIL_OK.indexOf(e.split('@')[1]) > -1 ? 'ok' : 'domain';
}

/* ---- gate field helpers (class names unchanged: .fld / .bad / .ferr) ---- */
const G_EYE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
function gClr(id){ const e = document.getElementById(id); if(e) e.classList.remove('bad'); }
function gBad(id){ const e = document.getElementById(id); if(e) e.classList.add('bad'); }
function gClearAll(){ ['fLE','fLP','fRN','fRE','fRP','fRP2'].forEach(gClr); }
function gEye(id, btn){
  const el = document.getElementById(id);
  if(!el) return;
  const hidden = el.type === 'password';
  el.type = hidden ? 'text' : 'password';
  btn.style.color = hidden ? 'var(--g-acc-ink)' : '';
}
function gPwLevel(p){
  let n = 0;
  if((p || '').length >= 8) n++;
  if(/[A-Za-z]/.test(p)) n++;
  if(/[0-9]/.test(p)) n++;
  if(/[^A-Za-z0-9]/.test(p)) n++;
  return n;
}
function gPw(){
  gClr('fRP');
  const el = document.getElementById('rgPw'), s = document.getElementById('pwStr');
  if(s) s.setAttribute('data-lv', gPwLevel(el ? el.value : ''));
}
function setAuth(v){
  const a = document.querySelector('.auth');
  if(a) a.setAttribute('data-view', v);
  const l = document.getElementById('tgLogin'), r = document.getElementById('tgReg');
  if(l){ l.classList.toggle('on', v === 'login'); l.setAttribute('aria-selected', v === 'login'); }
  if(r){ r.classList.toggle('on', v === 'register'); r.setAttribute('aria-selected', v === 'register'); }
  gClearAll(); gateMsg('');
}
function initGate(){
  document.querySelectorAll('#gate .eye').forEach(b=>{ b.innerHTML = G_EYE; });
  LANG = (STATE.lang === 'pt') ? 'pt' : 'en';
  applyLang();
}

async function authSignIn(){
  gClearAll();
  const em = (document.getElementById('emIn')||{}).value.trim(),
        pw = (document.getElementById('pwIn')||{}).value;
  let ok = true;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){ gBad('fLE'); ok = false; }
  if(!pw){ gBad('fLP'); ok = false; }
  if(!ok){ gateMsg(t('g_check')); return; }
  if(!sb){ gateMsg(t('g_connecting')); return; }
  gateMsg(t('g_signing'));
  const { error } = await sb.auth.signInWithPassword({ email:em, password:pw });
  if(!error){ gateMsg(''); return; }
  const e = authErr(error.message);
  if(e === 'NO_ACCOUNT'){ gBad('fLE'); gBad('fLP'); gateMsg(t('err_noaccount')); }
  else gateMsg('' + e);
}
async function authSignUp(){
  gClearAll();
  const em = (document.getElementById('rgEmail')||{}).value.trim(),
        pw = (document.getElementById('rgPw')||{}).value,
        pw2 = (document.getElementById('rgPw2')||{}).value,
        nm = (document.getElementById('rgName')||{}).value.trim();
  const ee = document.getElementById('rgEmailErr'), pe_el = document.getElementById('rgPwErr');
  let ok = true;
  if(!nm){ gBad('fRN'); ok = false; }
  const ve = validEmail(em);
  if(ve === 'format'){ gBad('fRE'); if(ee) ee.textContent = t('e_email'); ok = false; }
  else if(ve === 'domain'){ gBad('fRE'); if(ee) ee.textContent = t('e_realmail'); ok = false; }
  const pe = pwCheck(pw);
  if(pe){ gBad('fRP'); if(pe_el) pe_el.textContent = pe; ok = false; }
  if(!pw2 || pw !== pw2){ gBad('fRP2'); ok = false; }
  if(!ok){ gateMsg(t('g_check')); return; }
  if(!sb){ gateMsg(t('g_connecting')); return; }
  gateMsg(t('g_creating'));
  signingUp = true;
  const { error } = await sb.auth.signUp({
    email:em, password:pw,
    options:{ emailRedirectTo: location.origin + location.pathname, data:{ full_name:nm } }
  });
  if(error){
    signingUp = false;
    const e = authErr(error.message);
    if(e === 'EXISTS'){ gBad('fRE'); if(ee) ee.textContent = t('err_exists'); gateMsg(t('err_exists')); }
    else gateMsg('' + e);
    return;
  }
  /* Register, sign straight back out, and land on login with the email
     prefilled — unchanged from before. */
  try{ await sb.auth.signOut(); }catch(e){}
  USER = null; signingUp = false; applyGate();
  ['rgPw','rgPw2'].forEach(id=>{ const el = document.getElementById(id); if(el) el.value = ''; });
  gPw();
  /* carry the name into the profile so onboarding can greet them */
  if(nm && !STATE.profile.name){ STATE.profile.name = nm; saveState(); }
  const le = document.getElementById('emIn'); if(le) le.value = em;
  setAuth('login');
  gateMsg(t('g_created'), true);
}
async function authReset(){
  gClearAll();
  if(!sb){ gateMsg(t('g_connecting')); return; }
  const em = (document.getElementById('emIn')||{}).value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){ gBad('fLE'); gateMsg(t('reset_needemail')); return; }
  gateMsg(t('reset_sending'));
  try{
    const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    if(error){ gateMsg('' + authErr(error.message)); return; }
    gateMsg(t('reset_sent'), true);
  }catch(e){ gateMsg(t('err_unknown')); }
}
async function authSignOut(){
  try{ await sb.auth.signOut(); }catch(e){}
  USER = null;
  /* Limpa o estado privado deste dispositivo. Senão, o próximo login (sobretudo
     um utilizador NOVO, sem linha na nuvem) começava a ver os dados de quem
     saiu — os pesos, metas e exercícios da conta anterior. */
  STATE = {}; normState(); saveLocal();
  toast(t('signedout'));
  applyGate();
  if(typeof boot === 'function') boot();
}
