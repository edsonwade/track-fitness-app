/* =========================================================================
   ui.js — every screen, plus the event layer.

   Two conventions replace the old inline-onclick approach:
     data-act="name" [data-a1 data-a2]  -> click,  dispatched via ACTIONS
     data-inp="name" [data-a1 data-a2]  -> input,  dispatched via INPUTS
   One listener each, delegated on document. Handlers therefore do NOT need to
   be globals, and template strings never contain executable code — which also
   removes the quote-escaping hazards the old markup had.
   ========================================================================= */

/* ---------- view state ---------- */
let view = 'home';           /* home | train | goals | profile */
let curDay = null;
let curBlock = 'b1';
let openCard = null;
let openTab = {};
let chartSel = null;
let progChartInst = null;
let editSid = null;
/* 'me' | 'all' — âmbito escolhido no editor de exercício. Vive fora do sheet
   porque o toggle não pode re-renderizar o formulário: destruiria o que a
   pessoa já escreveu nos campos. */
let exScope = 'me';
/* Foto escolhida no editor, à espera de Guardar. `exPhotoDraft` guarda o URL
   já enviado para o bucket; `exPhotoReset` marca "voltar à automática". Ambos
   vivem fora do sheet pela mesma razão que exScope: trocar a foto não pode
   re-renderizar o formulário e apagar o que a pessoa já escreveu. Repostos
   sempre que o sheet abre. */
let exPhotoDraft = null;
let exPhotoDraftPath = null;   /* caminho REAL no bucket devolvido pelo upload */
let exPhotoReset = false;

/* =========================================================================
   ICONS — a single-weight stroked set drawn for this design.
   ========================================================================= */
const IC = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS = {
  home:      IC('<path d="M4 11.2 12 5l8 6.2V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>'),
  dumbbell:  IC('<path d="M6.5 7v10M17.5 7v10M4 9.5v5M20 9.5v5M6.5 12h11"/>'),
  target:    IC('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>'),
  user:      IC('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.7-5.5 7-5.5s6.1 1.9 7 5.5"/>'),
  play:      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.87l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>',
  chevron:   IC('<path d="m6 9 6 6 6-6"/>', 2),
  chevronR:  IC('<path d="m9 6 6 6-6 6"/>', 2),
  arrowUp:   IC('<path d="M12 19V5M6 11l6-6 6 6"/>', 2),
  arrowDown: IC('<path d="M12 5v14M6 13l6 6 6-6"/>', 2),
  back:      IC('<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>', 2),
  plus:      IC('<path d="M12 5v14M5 12h14"/>', 2),
  close:     IC('<path d="m6 6 12 12M18 6 6 18"/>', 2),
  edit:      IC('<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5 17.5 9.5"/>'),
  trash:     IC('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>'),
  heart:     IC('<path d="M12 20s-7-4.6-9.3-8.6A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 9.3 5.4C19 15.4 12 20 12 20Z"/>'),
  smile:     IC('<circle cx="12" cy="12" r="8.4"/><path d="M8.5 14.2a4.3 4.3 0 0 0 7 0"/><path d="M9 9.5v.2M15 9.5v.2" stroke-width="2.2"/>'),
  check:     IC('<path d="m5 13 4.5 4.5L19 7"/>', 2.2),
  sun:       IC('<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/>'),
  moon:      IC('<path d="M20 14.5A7.5 7.5 0 1 1 10.2 4.3 6 6 0 0 0 20 14.5Z"/>'),
  phone:     IC('<path d="M6 3h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2L20 14v3a2 2 0 0 1-2.2 2A15 15 0 0 1 5 5.2A2 2 0 0 1 6 3z"/>'),
  mail:      IC('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  insta:     IC('<rect x="4" y="4" width="16" height="16" rx="4.4"/><circle cx="12" cy="12" r="3.4"/><circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none"/>'),
  calendar:  IC('<rect x="3.5" y="5.5" width="17" height="15" rx="2.4"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/>'),
  clock:     IC('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6V12l3 2"/>'),
  chart:     IC('<path d="M4 19h16M7.5 19v-6M12 19V7m4.5 12v-9"/>', 2),
  download:  IC('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'),
  upload:    IC('<path d="M12 16V5m0 0-4 4m4-4 4 4M5 20h14"/>'),
  logout:    IC('<path d="M15 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M11 12H4m0 0 3.5-3.5M4 12l3.5 3.5"/>'),
  info:      IC('<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5M12 8.2v.2"/>'),
  spark:     IC('<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9z"/>'),
  flag:      IC('<path d="M6 20V4.5h12l-2.2 4 2.2 4H6"/>'),
  book:      IC('<path d="M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M17 7.5h2v12H8"/>')
};

/* =========================================================================
   small helpers
   ========================================================================= */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function todayId(){ const j = new Date().getDay(); return j === 0 ? 7 : j; }
function fmtDate(iso){
  try{ return new Date(iso).toLocaleString(LANG === 'en' ? 'en-GB' : 'pt-PT',
    { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }
  catch(e){ return iso; }
}
function fmtDay(iso){
  try{ return new Date(iso).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'pt-PT',
    { day:'2-digit', month:'short' }); }
  catch(e){ return iso; }
}
function fmtShort(iso){
  try{ const d = new Date(iso);
    return ('0'+d.getDate()).slice(-2) + '/' + ('0'+(d.getMonth()+1)).slice(-2); }
  catch(e){ return ''; }
}
function el(id){ return document.getElementById(id); }
function setHTML(id, html){ const n = el(id); if(n) n.innerHTML = html; }

function toast(msg){
  let n = el('toast');
  if(!n){ n = document.createElement('div'); n.id = 'toast'; n.className = 'toast'; document.body.appendChild(n); }
  n.textContent = msg;
  n.classList.add('is-on');
  clearTimeout(n._t);
  n._t = setTimeout(()=> n.classList.remove('is-on'), 2200);
}

/* =========================================================================
   reusable pieces
   ========================================================================= */
function ring(pct, size){
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - Math.max(0,Math.min(100,pct)) / 100);
  return `<div class="ring" style="--ring-size:${size || '4.5rem'}">
    <svg viewBox="0 0 60 60">
      <circle class="ring__track" cx="30" cy="30" r="${r}" fill="none" stroke-width="5"/>
      <circle class="ring__val" cx="30" cy="30" r="${r}" fill="none" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </svg>
    <span class="ring__mid"><span>${pct}<small>%</small></span></span>
  </div>`;
}
function tile(label, value, sub, mod){
  return `<div class="tile ${mod || ''}">
    <span class="tile__l">${label}</span>
    <span class="tile__v">${value}</span>
    ${sub ? `<span class="tile__s">${sub}</span>` : ''}
  </div>`;
}
function sectionHead(title, actLabel, act){
  return `<div class="shead"><h2 class="shead__t">${title}</h2>
    ${actLabel ? `<button class="shead__act" data-act="${act}">${actLabel}</button>` : ''}</div>`;
}

/* ---- INLINE VIDEO --------------------------------------------------------
   A facade: the poster is a local photo, and nothing from YouTube is fetched
   until the user taps, so opening a day does not spin up six embeds.

   **The iframe is what plays; the IFrame API is only an observer.** It used to
   be the other way round — `new YT.Player(div)` built the frame and the card
   waited for `onReady` before clearing "Loading video…". That handshake is a
   postMessage round-trip, and it does not complete in every context (a strict
   embedded webview, a blocked third-party frame, a page opened over file://
   where `origin` is "null"). When it does not, `onReady` never fires, `onError`
   never fires either, and the card sits on "Loading video…" until a 10-second
   watchdog — which reads exactly like "the video never opens", because it is.

   Now the iframe is written straight into the card and the placeholder is
   cleared on the frame's own `load` event, which fires whether or not the API
   is reachable. The API is still attached afterwards, on the same iframe, for
   the one thing only it can tell us: `onError`, i.e. deleted / private /
   embedding disabled. If the API never answers, the video plays anyway.

   There is deliberately no outbound link anywhere in here. The video plays in
   the card, or the card explains why it cannot. It never opens a tab. */

/* Accepts a full URL (watch / youtu.be / shorts / embed) or a bare id. */
function ytId(input){
  const s = String(input || '').trim();
  if(!s) return '';
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

function videoBlock(vid, poster, label){
  if(!vid){
    return `<div class="note">${ICONS.info}<div>${t('e_video_none')}</div></div>`;
  }
  /* The label rides on the element because closing the video rebuilds this
     same facade from the host's own attributes, with no re-render. */
  return `<div class="vplayer" data-act="playvid" data-a1="${esc(vid)}" data-a2="${esc(poster)}"
      data-label="${esc(label || '')}">
      ${videoPoster(vid, poster, label)}
    </div>`;
}
/* Video for a user-created exercise: only the link the user actually pasted.
   No name-matching — a custom exercise must never show a built-in demo the user
   never added. With no link, customCard's videoBlock() shows the "no demo yet"
   note, exactly like the CARDIO entries. */
function customVideo(c){
  return (c && c.vid) || '';
}
/* Deliberately WITHOUT `enablejsapi`. With it, the IFrame API is allowed to
   adopt this frame, and adopting rewrites its src to add a widget id. Closing
   the video removes the frame while the API still holds that widget, so the
   next open handed YouTube a widget id belonging to a frame that no longer
   exists — and the player came up blank, on every card, until a full reload.
   That was the "opens once, then a white box for ever" report. A plain frame
   has no such state: every open is a first open. */
function ytEmbedSrc(vid){
  return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid)
    + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
}
function videoPoster(vid, poster, label){
  return `<img class="vplayer__poster" src="${esc(poster)}" alt="${esc(label || '')}" loading="lazy">
    <span class="vplayer__scrim"></span>
    <button class="vplayer__play" type="button" aria-label="${t('e_watch')}">
      <span class="vplayer__ring">${ICONS.play}</span>
    </button>
    <span class="vplayer__cap">${t('e_watch')}</span>`;
}

/* ---- YouTube IFrame API, loaded lazily on the first play ----
   NOTE: the API claims the global name `YT`, which is why this app's video-id
   map in data.js is called VIDEOS. Do not rename it back. */
let ytApi = 'idle';            /* idle | loading | ready | failed */
const ytApiWaiting = [];
function ensureYTApi(cb){
  /* The script may have arrived after the timeout gave up on it. */
  if(window.YT && window.YT.Player) ytApi = 'ready';
  if(ytApi === 'ready') return cb(null);
  ytApiWaiting.push(cb);
  if(ytApi === 'loading') return;
  /* 'failed' falls through on purpose: "Try again" has to mean a real retry,
     not an instant replay of the last failure. */
  ytApi = 'loading';
  const flush = err => ytApiWaiting.splice(0).forEach(fn=> fn(err));
  const timer = setTimeout(()=>{ if(ytApi !== 'ready'){ ytApi = 'failed'; flush(new Error('api-timeout')); } }, 8000);
  window.onYouTubeIframeAPIReady = ()=>{ clearTimeout(timer); ytApi = 'ready'; flush(null); };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.async = true;
  s.onerror = ()=>{ clearTimeout(timer); ytApi = 'failed'; flush(new Error('api-load')); };
  document.head.appendChild(s);
}
/* https://developers.google.com/youtube/iframe_api_reference#onError
   Used by the self-test, which is the only place that builds YT.Player objects
   now. The cards play a plain iframe and never see an error code. */
function ytErrMsg(code){
  if(code === 101 || code === 150) return t('e_video_blocked');
  if(code === 100) return t('e_video_gone');
  return t('e_video_fail');
}
function videoFail(host, vid, poster, msg){
  host.classList.remove('is-playing');
  host.innerHTML = `<div class="vplayer__fail">
      <p>${esc(msg)}</p>
      <div class="flexr">
        <button class="btn btn--ghost btn--sm" type="button"
          data-act="playvid" data-a1="${esc(vid)}" data-a2="${esc(poster)}">${t('e_video_retry')}</button>
        <button class="btn btn--ghost btn--sm" type="button"
          data-act="closevid">${t('e_video_close')}</button>
      </div>
    </div>`;
}

/* ---- VIDEO SELF-TEST -----------------------------------------------------
   data.js already states the rule: oEmbed answers 200 for a video whose owner
   has disabled embedding, and such a video never raises onError — it simply
   never answers, which is what leaves a card spinning. The only check that
   counts is a real youtube-nocookie player reaching onReady, and it has to run
   in a browser that can actually reach YouTube. That is why this lives in the
   app instead of in a script: no tooling outside the user's own browser can
   answer the question.

   Two rules are what make the answer trustworthy:
     * one probe at a time, spaced out — YouTube throttles rapid embeds and
       starts refusing perfectly healthy videos after a handful of them;
     * nothing is reported broken until it has failed twice, the second time in
       a pass of its own, after the queue has gone quiet.
   The ids come from whatever the app is really using, so a catalogue published
   to Supabase is what gets tested, not the fallback plan in data.js. */
let VT = null;
/* Every run carries a token. Tapping "run" twice used to leave the first
   stepper alive on the second run's list: both incremented the same cursor, so
   nine of forty videos were skipped and the failures-only pass inherited them
   as failures. A stale stepper now finds its token superseded and stops. */
let vtToken = 0;

function vtRows(){
  const byVid = {};
  const push = (vid, name, where)=>{
    if(!vid) return;
    if(byVid[vid]){
      if(byVid[vid].where.indexOf(where) < 0) byVid[vid].where.push(where);
      return;
    }
    byVid[vid] = { vid, name, where:[where], code:null };
  };
  DAYS.forEach(d=>{
    const wd = L(d.wd) || String(d.id);
    (d.items || []).forEach(it=>{
      const e = EX[it.ex];
      push(VIDEOS[it.ex], e ? exName(e) : it.ex, wd);
    });
    (d.cardio || []).forEach(id=>{
      const c = CARDIO[id];
      push(VIDEOS[id], c ? exName(c) : id, wd);
    });
    ((STATE.custom && STATE.custom[d.id]) || []).forEach(c=> push(customVideo(c), c.name, wd));
  });
  return Object.keys(byVid).map(k=> byVid[k]);
}

/* One real player, off-screen, destroyed either way. */
function vtProbe(vid, ms, cb){
  const box = document.createElement('div');
  box.className = 'vtprobe';
  document.body.appendChild(box);
  let done = false, player = null;
  const fin = code=>{
    if(done) return;
    done = true;
    clearTimeout(to);
    try{ if(player && player.destroy) player.destroy(); }catch(_){}
    box.remove();
    cb(code);
  };
  const to = setTimeout(()=> fin('noanswer'), ms);
  ensureYTApi(err=>{
    if(err || !window.YT || !window.YT.Player) return fin('noapi');
    try{
      player = new window.YT.Player(box, {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        playerVars:{ autoplay:0, rel:0, playsinline:1, controls:0 },
        events:{
          onReady: ()=> fin('ok'),
          onError: e=>{
            const c = e && e.data;
            fin(c === 101 || c === 150 ? 'blocked' : (c === 100 ? 'gone' : 'fail'));
          }
        }
      });
    }catch(_){ fin('fail'); }
  });
}

function vtStatusText(code){
  if(code === 'ok')      return t('vt_ok');
  if(code === 'blocked') return t('vt_blocked');
  if(code === 'gone')    return t('vt_gone');
  if(code === 'noapi')   return t('vt_noapi');
  if(code === 'noanswer')return t('vt_noanswer');
  return t('vt_fail');
}

function vtStart(){
  const my = ++vtToken;
  VT = { rows: vtRows(), queue: null, at: 0, pass: 1, running: true, tested: 0, token: my };
  VT.queue = VT.rows.map((r, i)=> i);
  VT.total = VT.queue.length;
  vtRender();
  vtStep(my);
}
function vtStop(){
  vtToken++;
  if(VT) VT.running = false;
  /* The probe in flight still owns a YouTube frame; its own deadline would
     clear it within fifteen seconds, but not while the user is already back on
     their workout. Take it out now — its callback is a no-op by then. */
  Array.prototype.forEach.call(document.querySelectorAll('.vtprobe'), n=> n.remove());
}
function vtStep(my){
  if(!VT || !VT.running || my !== vtToken) return;
  /* The sheet was closed — stop rather than keep hammering YouTube. */
  if(!el('vtBody')){ VT.running = false; return; }
  if(VT.at >= VT.queue.length){
    const bad = VT.rows.filter(r=> r.code && r.code !== 'ok');
    if(VT.pass === 1 && bad.length){
      /* Second pass, failures only: a throttled probe looks exactly like a
         dead video, and calling a healthy video dead is the worse mistake. */
      VT.pass = 2;
      VT.at = 0;
      /* `code && code !== 'ok'` and not just `!== 'ok'`: an untested row has a
         null code and must never be inherited into the failures pass. */
      VT.queue = VT.rows.map((r, i)=> i).filter(i=> VT.rows[i].code && VT.rows[i].code !== 'ok');
      VT.tested = 0;
      VT.total = VT.queue.length;
      vtRender();
      setTimeout(()=> vtStep(my), 1500);
      return;
    }
    VT.running = false;
    VT.finished = true;
    vtRender();
    return;
  }
  const row = VT.rows[VT.queue[VT.at]];
  VT.current = row.vid;
  vtRender();
  vtProbe(row.vid, 15000, code=>{
    if(my !== vtToken) return;
    row.code = code;
    VT.at++;
    VT.tested++;
    VT.current = null;
    vtRender();
    /* Spacing is not politeness, it is accuracy: back to back probes get
       throttled and start answering "noanswer" for everything. */
    setTimeout(()=> vtStep(my), 700);
  });
}

function vtRender(){
  if(!VT || !el('vtBody')) return;
  const done = VT.rows.filter(r=> r.code).length;
  const bad = VT.rows.filter(r=> r.code && r.code !== 'ok');
  let head;
  if(VT.finished){
    head = bad.length
      ? `<b>${bad.length}</b> / ${VT.rows.length} ${t('vt_failed')}`
      : `<b>${VT.rows.length}</b> ${t('vt_all_ok')}`;
  }else if(VT.pass === 2){
    head = `${t('vt_retesting')} ${VT.tested}/${VT.total}`;
  }else{
    head = `${t('vt_testing')} ${done}/${VT.rows.length}`;
  }
  const pct = VT.rows.length ? Math.round(done / VT.rows.length * 100) : 0;
  const rows = VT.rows.map(r=>{
    const state = r.code ? (r.code === 'ok' ? 'ok' : 'bad') : (VT.current === r.vid ? 'run' : 'wait');
    return `<div class="vtrow vtrow--${state}">
      <span class="vtrow__dot"></span>
      <span class="vtrow__n">${esc(r.name)}<span class="vtrow__w">${esc(r.where.join(' · '))}</span></span>
      <span class="vtrow__s">${r.code ? esc(vtStatusText(r.code)) : (VT.current === r.vid ? '…' : '')}</span>
    </div>`;
  }).join('');
  setHTML('vtBody', `<p class="vt__head">${head}</p>
    <div class="vt__bar"><span style="width:${pct}%"></span></div>
    <div class="vt__list">${rows}</div>`);
}
/* Rest is set per exercise, in seconds, with the plan's number offered as a
   starting point and never as a rule. */
function restSheet(exId, planSecs){
  /* Read the stored value directly. Going through restFor() with no rest text
     would hand back its 90-second fallback, so an exercise the user had never
     touched opened this sheet showing 1:30 while its card said 2:00. */
  const own = STATE.restSec && STATE.restSec[exId];
  const cur = (typeof own === 'number' && own > 0) ? own : planSecs;
  const chips = [30, 45, 60, 90, 120, 180, 240].map(s=>
    `<button class="setchip ${s === cur ? 'is-on' : ''}" type="button"
      data-act="restpick" data-a1="${s}">${rtFmt(s)}</button>`).join('');
  openSheet(t('rs_title'), `
    <p class="u-mut" style="font-size:var(--t-xs)">${t('rs_sub')}</p>
    <div class="setchips mt4">${chips}</div>
    <label class="field mt4"><span class="field__l">${t('rs_sec')}</span>
      <input class="input" id="restVal" type="number" inputmode="numeric"
        min="5" max="900" step="5" value="${cur}"></label>
    <p class="u-mut mt2" style="font-size:var(--t-xxs)">${t('rs_plan')} ${rtFmt(planSecs)}</p>`,
    `<button class="btn btn--ghost" data-act="restreset" data-a1="${esc(exId)}">${t('rs_reset')}</button>
     <button class="btn btn--acc" data-act="restsave" data-a1="${esc(exId)}">${t('b_save')}</button>`);
}

function vtSheet(){
  openSheet(t('vt_title'), `
    <p class="u-mut" style="font-size:var(--t-xs)">${t('vt_sub')}</p>
    <div id="vtBody" class="mt4"></div>`, `
    <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
    <button class="btn btn--acc" data-act="vtrun">${t('vt_start')}</button>`);
}

/* ---- REST TIMER ----------------------------------------------------------
   The point of this is to not leave the app between sets, so three things are
   load-bearing:

   * It lives in a bar appended to <body>, not inside #view. Anything inside
     #view dies on the next rerender(), and rerender() happens every time a set
     chip elsewhere is tapped or a tab is switched — the timer would vanish
     mid-rest.
   * It never calls rerender() itself. The bar writes into its own text node
     each second, exactly like the set chips flip their own class: a re-render
     here would blow away a half-typed weight in the field above.
   * The countdown is computed from a wall-clock deadline, not by subtracting 1
     per tick. Phone screens sleep and background tabs get throttled to one tick
     a minute; a tick-counting timer comes back thinking 8 seconds have passed
     when the real answer is 3 minutes. */
let RT = null;
let rtAudio = null;

/* "2–3 min" → 120. "45 s" → 45. The lower bound of a range is the honest
   default: it is the number the plan says you may go from, and +30 s is one
   tap away. Unparseable rest text falls back to 90 s rather than to nothing. */
function restSeconds(txt){
  const s = String(txt == null ? '' : txt).toLowerCase().replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if(!m) return 90;
  const n = parseFloat(m[1]);
  if(!isFinite(n) || n <= 0) return 90;
  /* "min" anywhere, or a bare small number like "2–3", reads as minutes. */
  const isMin = /min|'/.test(s) || (!/\bs\b|sec|"/.test(s) && n <= 10);
  return Math.round(isMin ? n * 60 : n);
}
/* The plan's rest is a suggestion; the user's own value wins. Keyed by exercise
   id so a choice made on Monday still holds in every block and on every day
   that exercise appears — nobody wants to set the same number four times. */
function restFor(exId, planRest){
  const own = STATE.restSec && STATE.restSec[exId];
  if(typeof own === 'number' && own > 0) return own;
  return restSeconds(planRest);
}
function rtFmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  return m + ':' + String(sec % 60).padStart(2, '0');
}
/* A beep built in the page: the app ships no audio files and asks for no
   permissions. Created on the tap that starts the timer, which is what unlocks
   audio on iOS — build it later and the alarm is silent. */
function rtBeep(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!rtAudio) rtAudio = new AC();
    if(rtAudio.state === 'suspended') rtAudio.resume();
    const now = rtAudio.currentTime;
    [0, 0.3, 0.6].forEach(off=>{
      const osc = rtAudio.createOscillator();
      const gain = rtAudio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + off);
      gain.gain.setValueAtTime(0.0001, now + off);
      gain.gain.exponentialRampToValueAtTime(0.35, now + off + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.22);
      osc.connect(gain).connect(rtAudio.destination);
      osc.start(now + off);
      osc.stop(now + off + 0.25);
    });
  }catch(_){}
}
function rtWarm(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!rtAudio) rtAudio = new AC();
    if(rtAudio.state === 'suspended') rtAudio.resume();
  }catch(_){}
}
function rtEl(){
  let bar = document.getElementById('rtimer');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'rtimer';
    bar.className = 'rtimer';
    document.body.appendChild(bar);
  }
  return bar;
}
function rtLeft(){
  if(!RT) return 0;
  return RT.running ? Math.max(0, (RT.deadline - Date.now()) / 1000) : RT.rest;
}
function rtStart(seconds, label){
  rtWarm();
  if(RT && RT.tick) clearInterval(RT.tick);
  RT = { total: seconds, rest: seconds, running: true, label: label || '',
         deadline: Date.now() + seconds * 1000, done: false };
  rtBuild(RT.label);
  rtPaint();
  RT.tick = setInterval(rtPaint, 250);
}
function rtStop(){
  if(RT && RT.tick) clearInterval(RT.tick);
  RT = null;
  const bar = document.getElementById('rtimer');
  if(bar) bar.remove();
}
function rtToggle(){
  if(!RT) return;
  if(RT.running){
    RT.rest = rtLeft();
    RT.running = false;
  }else{
    if(RT.done){ RT.rest = RT.total; RT.done = false; }
    RT.deadline = Date.now() + RT.rest * 1000;
    RT.running = true;
    rtWarm();
  }
  rtPaint();
}
/* ±30 moves the *set* rest as well as the time left, so +30 then −30 lands back
   exactly where it started and "again" repeats what you actually chose — not
   the longest value the timer happened to reach. */
function rtAdd(sec){
  if(!RT) return;
  sec = parseInt(sec, 10) || 0;
  const left = Math.max(0, rtLeft() + sec);
  RT.total = Math.max(5, RT.total + sec);
  /* +30 on a finished timer is the obvious "give me a bit more" gesture. */
  if(RT.done && left > 0){ RT.done = false; RT.running = true; }
  if(RT.running) RT.deadline = Date.now() + left * 1000;
  else RT.rest = left;
  rtPaint();
}
function rtReset(){
  if(!RT) return;
  RT.done = false;
  RT.rest = RT.total;
  RT.deadline = Date.now() + RT.total * 1000;
  rtPaint();
}
/* Structure once, values four times a second. Rewriting the whole bar on every
   tick would destroy and rebuild the very button under the user's finger —
   the same reason a set chip flips its own class instead of re-rendering. */
function rtBuild(label){
  const bar = rtEl();
  bar.innerHTML = `<span class="rtimer__fill"></span>
    <div class="rtimer__in">
      <span class="rtimer__t">
        <span class="rtimer__v">0:00</span>
        <span class="rtimer__l">${esc(label || t('rt_title'))}</span>
      </span>
      <button class="rtimer__b" type="button" data-act="rtadd" data-a1="-30" aria-label="-30s">&minus;30</button>
      <button class="rtimer__b" type="button" data-act="rtadd" data-a1="30" aria-label="+30s">+30</button>
      <button class="rtimer__b rtimer__b--wide" type="button" data-act="rttoggle"></button>
      <button class="rtimer__x" type="button" data-act="rtstop" aria-label="${t('a_close')}">${ICONS.close}</button>
    </div>`;
  return bar;
}
function rtPaint(){
  if(!RT) return;
  const bar = document.getElementById('rtimer') || rtBuild(RT.label);
  const left = rtLeft();
  if(RT.running && left <= 0 && !RT.done){
    RT.done = true;
    RT.running = false;
    RT.rest = 0;
    rtBeep();
    if(navigator.vibrate) try{ navigator.vibrate([300, 120, 300]); }catch(_){}
  }
  const pct = RT.total ? Math.max(0, Math.min(100, (left / RT.total) * 100)) : 0;
  bar.classList.toggle('is-done', !!RT.done);
  const fill = bar.querySelector('.rtimer__fill');
  const val  = bar.querySelector('.rtimer__v');
  const lab  = bar.querySelector('.rtimer__l');
  const tog  = bar.querySelector('[data-act="rttoggle"]');
  const text = RT.done ? t('rt_done') : rtFmt(left);
  if(fill) fill.style.width = pct + '%';
  if(val && val.textContent !== text) val.textContent = text;
  if(lab && lab.textContent !== (RT.label || t('rt_title'))) lab.textContent = RT.label || t('rt_title');
  const tt = RT.done ? t('rt_again') : (RT.running ? t('rt_pause') : t('rt_go'));
  if(tog && tog.textContent !== tt) tog.textContent = tt;
}

/* =========================================================================
   SHEETS — one container, filled per use.
   ========================================================================= */
function openSheet(title, body, foot){
  setHTML('sheetBody', `
    <span class="sheet__grip"></span>
    <div class="sheet__h">
      <h2 class="sheet__t">${title}</h2>
      <button class="iconbtn iconbtn--bare sheet__x" data-act="closesheet"
        aria-label="${t('a_close')}">${ICONS.close}</button>
    </div>
    ${body}
    ${foot ? `<div class="sheet__foot">${foot}</div>` : ''}`);
  el('sheet').classList.add('is-open');
  syncScrollLock();
}
function closeSheet(){ el('sheet').classList.remove('is-open'); syncScrollLock(); }

/* Overlay scroll lock. #gate, #onboard and #sheet are position:fixed over a
   document taller than the viewport, so without this the page underneath keeps
   scrolling behind them: the gate would hand a half-scrolled page to onboarding,
   and closing a sheet dropped you somewhere other than where you opened it. */
function overlayOpen(){
  const g = el('gate'), o = el('onboard'), s = el('sheet');
  return !!((g && g.style.display !== 'none')
    || (o && !o.classList.contains('hidden'))
    || (s && s.classList.contains('is-open')));
}
function syncScrollLock(){
  const on = overlayOpen(), root = document.documentElement;
  if(on && !root.classList.contains('ovl-lock')) window.scrollTo(0, 0);
  root.classList.toggle('ovl-lock', on);
}
function fieldVal(id){ const n = el(id); return n ? String(n.value == null ? '' : n.value).trim() : ''; }

/* =========================================================================
   HOME
   ========================================================================= */
function renderHome(){
  const td = todayId();
  const day = DAYS.find(d=> d.id === td);
  const isRest = day.type === 'rest';
  const coaches = trainersForDay(td);
  const g = primaryGoal();
  const p = STATE.profile;
  const name = p.name ? p.name.split(' ')[0] : '';

  let html = `<div class="screen wrap">`;

  /* greeting */
  html += `<div class="flexr mt4">
    <div class="avatar avatar--lg">${p.photo
      ? `<img src="${coachPhoto(p.photo)}" alt="">`
      : `<span style="display:grid;place-items:center;height:100%;color:var(--ink-3)">${ICONS.user}</span>`}</div>
    <div>
      <p class="u-eyebrow">${t('h_hello')}</p>
      <h1 class="u-display u-display--name" style="font-size:var(--t-xl)">${esc(name || t('app_name'))}</h1>
    </div>
    <button class="iconbtn push" data-act="theme" aria-label="${t('a_theme')}">
      ${STATE.theme === 'light' ? ICONS.sun : ICONS.moon}</button>
  </div>`;

  /* today's session */
  html += sectionHead(isRest ? t('h_today_rest') : t('h_today'));
  html += `<article class="pcard pcard--tap pcard--hero" data-act="opentrain" data-a1="${td}">
    <div class="pcard__media">
      <img class="pcard__img" src="${dayPhoto(td)}" alt="">
    </div>
    <span class="pcard__badge">${L(day.wd)}</span>
    <div class="pcard__body">
      <p class="u-eyebrow">${L(day.eyebrow)}</p>
      <h3 class="pcard__title">${L(day.name)}</h3>
      <div class="pcard__meta">
        ${isRest ? `<span>${t('tr_rest_p')}</span>`
                 : LA(day.mus).map(m=>`<span>${esc(m)}</span>`).join('')}
      </div>
      ${coaches.length ? `<div class="pcard__meta"><span>${t('c_with')} <b>${esc(coaches.map(c=>c.name).join(', '))}</b></span></div>` : ''}
      <div class="mt4"><span class="btn btn--acc btn--sm">
        ${isRest ? t('h_rest_cta') : t('h_start')} ${ICONS.chevronR}</span></div>
    </div>
  </article>`;

  /* snapshot tiles */
  const streak = streakDays();
  html += sectionHead(t('h_snapshot'));
  html += `<div class="tiles">
    ${tile(t('h_streak'), streak + (streak ? ' 🔥' : ''), t('h_streak_u'), streak >= 3 ? 'tile--acc' : '')}
    ${tile(t('h_thisweek'), sessionsThisWeek(), t('h_tw_u'))}
    ${tile(t('h_sessions'), STATE.sessions.length, t('h_sess_u'))}
  </div>`;

  /* goal progress — real numbers, no placeholders */
  html += sectionHead(t('h_goals'), STATE.goals.length ? t('b_edit') : '', 'gotogoals');
  if(g){
    const pct = goalPct(g), rem = goalRemaining(g);
    html += `<div class="card">
      <div class="flexr">
        ${ring(pct)}
        <div style="flex:1;min-width:0">
          <p class="u-eyebrow">${g.hitAt ? t('g_hit') : t('g_prog')}</p>
          <h3 style="font-weight:700;font-size:var(--t-md);display:flex;align-items:center;gap:.4rem">
            ${esc(g.title)}${g.hitAt ? '<span class="flame">🔥</span>' : ''}</h3>
          <p class="u-mut" style="font-size:var(--t-xs);margin-top:.15rem">
            ${esc(g.current)}${esc(g.unit)} ${t('misc_of')} ${esc(g.target)}${esc(g.unit)}
            ${rem !== null && !g.hitAt ? ` · ${rem}${esc(g.unit)} ${t('g_togo')}` : ''}</p>
        </div>
      </div>
      <div class="pbar mt4"><i class="pbar__f" style="width:${pct}%"></i></div>
      <div class="pbar__cap">
        <span>${esc(g.start)}${esc(g.unit)}</span>
        <span>${g.deadline ? t('g_due') + ' ' + fmtDay(g.deadline) : t('g_nodate')}</span>
        <span>${esc(g.target)}${esc(g.unit)}</span>
      </div>
      <button class="btn btn--ghost btn--block mt4" data-act="goalprog" data-a1="${g.id}">
        ${ICONS.spark} ${t('g_update_t')}</button>
    </div>`;
  } else {
    html += `<div class="empty">
      <div class="empty__media"><img src="${onboardPhoto('goal')}" alt=""></div>
      <div class="empty__body">
        <h3 class="empty__t">${t('h_goal_none_t')}</h3>
        <p class="empty__p">${t('h_goal_none_p')}</p>
        <button class="btn btn--acc" data-act="goalnew">${ICONS.plus} ${t('h_goal_new')}</button>
      </div>
    </div>`;
  }

  /* week */
  html += sectionHead(t('h_week'));
  html += `<div class="wstrip">${DAYS.map(d=>`
    <button class="wday ${d.id === td ? 'is-on' : ''} ${d.type === 'rest' ? 'is-rest' : ''}"
      data-act="opentrain" data-a1="${d.id}">
      <span class="wday__d">${L(d.wd)}</span>
      <span class="wday__n">${L(d.short)}</span>
      ${d.id === td ? '<i class="wday__today"></i>' : ''}
    </button>`).join('')}</div>`;

  /* progress chart */
  html += sectionHead(t('h_progress'));
  html += chartHTML();

  /* recent sessions */
  html += sectionHead(t('h_history'), STATE.sessions.length ? t('pr_history') : '', 'gotoprofile');
  html += STATE.sessions.length
    ? `<div class="rows">${STATE.sessions.slice(0,3).map(sn=>`
        <div class="row">
          <div class="row__t">
            <p class="row__n">${esc(sn.dayName.split(' — ')[0])}</p>
            <p class="row__s">${fmtDate(sn.date)} · ${esc(sn.block)}</p>
          </div>
          <span class="row__v">${sn.entries.length}</span>
        </div>`).join('')}</div>`
    : `<div class="empty empty--flat"><p class="empty__p" style="margin:0">${t('hi_empty')}</p></div>`;

  /* Community — live feed when the tables are reachable, else the static
     "coming soon" panel so file:// and offline are exactly the old app. */
  html += sectionHead(t('h_community'));
  html += communitySection();

  html += `</div>`;
  setHTML('view', html);
  try{ initProgChart(); }catch(e){}
}

/* =========================================================================
   COMMUNITY — the live feed on Home. State/network live in community.js;
   everything drawn here goes through esc(). Falls back to the static panel
   whenever the tables aren't reachable, so file:// and offline are unchanged.
   ========================================================================= */
/* Inline-edit and filter state live outside the render (like exScope) so a
   redraw never destroys a half-typed edit or the active tag. */
let commEditPost = null;      /* id of the post being edited inline    */
let commEditComment = null;   /* id of the comment being edited inline */
let commTagFilter = null;     /* active #hashtag filter (lowercased)   */
let commReactFor = null;      /* id of the post whose reaction palette is open */

/* The reaction palette. People tap any of these; each toggles their own, and a
   person can hold several different ones on the same post. */
const REACTIONS = ['👍','❤️','🔥','😮','😂','🎉'];

/* Up to two initials from a display name, for the avatar chip. */
function initials(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

/* Is `name` (a single @token) one of the known members? Matches a full name or
   its first word, case-insensitive — so @Vanilson lights up "Vanilson Muhongo". */
function communityIsMember(name){
  const n = String(name || '').toLowerCase();
  return (COMMUNITY.members || []).some(m=>{
    const full = (m.name || '').toLowerCase();
    return full === n || full.split(/\s+/)[0] === n;
  });
}

/* Post/comment text with #hashtags and @mentions highlighted. Escape FIRST,
   then wrap tags in controlled spans over the already-safe text: a tag can only
   contain letters/digits/_, never <>&"', so the injected markup can't be
   hijacked by user input. Hashtags become chips that filter the feed. */
function renderBody(text){
  let s = esc(String(text || ''));
  s = s.replace(/(^|[\s(])#([\p{L}\p{N}_]{1,40})/gu, (m, pre, tag)=>
    `${pre}<a class="ctag" data-act="ctag" data-a1="${esc(tag.toLowerCase())}">#${tag}</a>`);
  s = s.replace(/(^|[\s(])@([\p{L}\p{N}_]{1,40})/gu, (m, pre, name)=>
    communityIsMember(name) ? `${pre}<span class="cment">@${name}</span>` : m);
  return s;
}

/* A post carries the tag if its body has it as a real #hashtag (word start). */
function postHasTag(p, tag){
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[\\s(])#' + safe + '(?![\\p{L}\\p{N}_])', 'iu').test(p.body || '');
}

function communitySection(){
  if(!COMMUNITY.ready){
    return `<div class="soon">
      <p class="soon__t">${t('h_community_t')}</p>
      <p class="soon__p">${t('h_community_p')}</p>
    </div>`;
  }
  const g = primaryGoal();
  const composer = `<div class="ccompose">
    <textarea class="textarea" id="cBody" rows="2" placeholder="${t('cm_placeholder')}" data-inp="cmention"></textarea>
    <div class="flexr flexr--wrap">
      ${g ? `<button class="btn btn--ghost btn--sm" data-act="cpostgoal">${t('cm_share_goal')}</button>` : ''}
      <button class="btn btn--acc btn--sm" data-act="cpostnote">${t('cm_post')}</button>
    </div>
  </div>`;

  let posts = COMMUNITY.posts;
  let filterBar = '';
  if(commTagFilter){
    posts = posts.filter(p=> postHasTag(p, commTagFilter));
    filterBar = `<div class="cfilter">
      <span class="cfilter__t">#${esc(commTagFilter)}</span>
      <button class="btn btn--ghost btn--sm" data-act="ctagclear">${t('cm_tagall')}</button>
    </div>`;
  }

  const feed = posts.length
    ? `<div class="cfeed">${posts.map(communityPost).join('')}</div>`
    : `<div class="empty empty--flat"><p class="empty__p" style="margin:0">${t(commTagFilter ? 'cm_tagnone' : 'cm_empty')}</p></div>`;

  return composer + filterBar + feed;
}

/* A photo-free snapshot of the goal the dashboard leads with — a still, not a
   live reference, so sharing a goal never exposes the rest of private state. */
function goalSnapshot(){
  const g = primaryGoal();
  if(!g) return null;
  return { title: g.title || '', pct: goalPct(g), photo: g.photo ? goalPhoto(g.photo) : '' };
}

/* The reaction strip under a post: one chip per emoji people have used (count,
   lit when it's mine), then an "add reaction" button that opens the palette. */
function reactionRow(p){
  const rmap = COMMUNITY.reactions[p.id] || {};
  const present = [];
  REACTIONS.forEach(e=>{ if(rmap[e] && rmap[e].count) present.push(e); });
  Object.keys(rmap).forEach(e=>{ if(REACTIONS.indexOf(e) < 0 && rmap[e].count) present.push(e); });

  const chips = present.map(e=>{
    const cell = rmap[e];
    return `<button class="creact ${cell.mine ? 'is-on' : ''}" data-act="creact"
      data-a1="${esc(p.id)}" data-a2="${esc(e)}" aria-pressed="${cell.mine}">
      <span class="creact__e">${e}</span><span class="creact__n">${cell.count}</span></button>`;
  }).join('');

  const open = commReactFor === p.id;
  const addBtn = `<button class="creact creact--add ${open ? 'is-open' : ''}" data-act="creactopen"
    data-a1="${esc(p.id)}" aria-label="${t('cm_react')}" aria-expanded="${open}">${ICONS.smile}</button>`;
  const palette = open ? `<div class="cpalette">${REACTIONS.map(e=>{
    const on = rmap[e] && rmap[e].mine;
    return `<button class="cpalette__e ${on ? 'is-on' : ''}" data-act="creact"
      data-a1="${esc(p.id)}" data-a2="${esc(e)}">${e}</button>`;
  }).join('')}</div>` : '';

  return `<div class="creacts">${chips}${addBtn}</div>${palette}`;
}

function communityPost(p){
  const mine = p.author === (USER && USER.id);
  const name = communityName(p.author);
  const comments = COMMUNITY.comments[p.id] || [];
  const goal = (p.kind === 'goal' && p.goal) ? p.goal : null;

  const goalCard = goal ? `<div class="cgoal">
      ${goal.photo ? `<span class="cgoal__img"><img src="${esc(goal.photo)}" alt=""></span>` : ''}
      <div class="cgoal__body">
        <p class="cgoal__t">${esc(goal.title || '')}</p>
        <div class="cbar"><span style="width:${Math.max(0, Math.min(100, goal.pct|0))}%"></span></div>
      </div>
      <span class="cgoal__pct">${goal.pct|0}%</span>
    </div>` : '';

  /* body: static text with tags, or an inline editor when this post is being
     edited (only ever your own — the edit button only renders for mine). */
  const bodyBlock = (mine && commEditPost === p.id)
    ? `<div class="cedit">
        <textarea class="textarea" id="cedit_p_${esc(p.id)}" rows="2" data-inp="cmention">${esc(p.body || '')}</textarea>
        <div class="flexr flexr--wrap">
          <button class="btn btn--ghost btn--sm" data-act="cpcanceledit">${t('b_cancel')}</button>
          <button class="btn btn--acc btn--sm" data-act="cpsavepost" data-a1="${esc(p.id)}">${t('b_save')}</button>
        </div>
      </div>`
    : (p.body ? `<p class="cpost__b">${renderBody(p.body)}</p>` : '');

  const thread = comments.map(c=>{
    const cmine = c.author === (USER && USER.id);
    const cname = communityName(c.author);
    if(cmine && commEditComment === c.id){
      return `<div class="ccmt ccmt--edit">
        <input class="input" id="cedit_c_${esc(c.id)}" value="${esc(c.body || '')}" data-inp="cmention">
        <button class="btn btn--ghost btn--sm" data-act="ccmtcancel">${t('b_cancel')}</button>
        <button class="btn btn--acc btn--sm" data-act="ccmtsave" data-a1="${esc(c.id)}">${t('b_save')}</button>
      </div>`;
    }
    return `<div class="ccmt">
      <span class="cavatar cavatar--sm">${esc(initials(cname))}</span>
      <span class="ccmt__body">
        <span class="ccmt__n">${esc(cname)}</span>
        <span class="ccmt__b">${renderBody(c.body || '')}</span>
      </span>
      ${cmine ? `<span class="ccmt__acts">
        <button class="ccmt__x" data-act="ccmtedit" data-a1="${esc(c.id)}" aria-label="${t('cm_edit')}">${ICONS.edit}</button>
        <button class="ccmt__x" data-act="cdelcomment" data-a1="${esc(c.id)}" aria-label="${t('cm_delete')}">${ICONS.close}</button>
      </span>` : ''}
    </div>`;
  }).join('');

  return `<article class="cpost">
    <header class="cpost__h">
      <span class="cavatar">${esc(initials(name))}</span>
      <span class="cpost__id">
        <span class="cpost__n">${esc(name)}</span>
        <span class="cpost__d">${esc(fmtDate(p.created_at))}</span>
      </span>
      ${mine ? `<span class="cpost__acts">
        <button class="cpost__x" data-act="cpeditpost" data-a1="${esc(p.id)}" aria-label="${t('cm_edit')}">${ICONS.edit}</button>
        <button class="cpost__x" data-act="cdelpost" data-a1="${esc(p.id)}" aria-label="${t('cm_delete')}">${ICONS.trash}</button>
      </span>` : ''}
    </header>
    ${bodyBlock}
    ${goalCard}
    <div class="cpost__f">
      ${reactionRow(p)}
    </div>
    <div class="cthread">
      ${thread}
      <div class="caddc">
        <input class="input" id="ccm_${esc(p.id)}" placeholder="${t('cm_comment_ph')}" data-inp="cmention">
        <button class="btn btn--ghost btn--sm" data-act="caddcomment" data-a1="${esc(p.id)}">${t('cm_send')}</button>
      </div>
    </div>
  </article>`;
}

/* Realtime told us the feed changed. Don't repaint over an open inline editor
   or while the user is typing anywhere in the community — the same care the log
   fields and set chips take elsewhere. */
function onCommunityRefreshed(){
  if(commEditPost || commEditComment) return;
  const a = document.activeElement;
  if(a && a.closest && a.closest('.cfeed, .ccompose')) return;
  if(typeof rerender === 'function' && view === 'home') rerender();
}

/* A background catalogue refresh (realtime, reconnect, the 45s heartbeat) must
   NOT repaint over an open sheet or a field being typed in — that is the
   "fica sempre a piscar / às vezes sai de onde estás a alterar" report. Same
   care onCommunityRefreshed takes for the wall. shared.js calls this instead of
   rerender() directly, and only when the catalogue actually changed. */
function catalogRepaint(){
  const sheet = el('sheet');
  if(sheet && sheet.classList.contains('is-open')) return;   /* a editar num sheet */
  const a = document.activeElement;
  if(a && a.closest && a.closest('#view')){
    const tag = (a.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || a.isContentEditable) return;  /* a escrever */
  }
  if(typeof rerender === 'function') rerender();
}

/* ---- @mention autocomplete ---------------------------------------------
   One shared dropdown appended to <body>, positioned under the focused field.
   Driven by INPUTS.cmention on every community text field; picking inserts the
   member's first-name handle. No re-render, so it never eats what's typed. */
function mentionBox(){
  let b = document.getElementById('cmentionbox');
  if(!b){
    b = document.createElement('div');
    b.id = 'cmentionbox';
    b.className = 'cment-box';
    b.style.display = 'none';
    document.body.appendChild(b);
  }
  return b;
}
function hideMentionBox(){ const b = document.getElementById('cmentionbox'); if(b) b.style.display = 'none'; }
function mentionToken(node){
  const upto = node.value.slice(0, node.selectionStart == null ? node.value.length : node.selectionStart);
  const m = upto.match(/@([\p{L}\p{N}_]*)$/u);
  return m ? m[1] : null;
}
function showMentions(node){
  const tok = mentionToken(node);
  if(tok === null){ hideMentionBox(); return; }
  const q = tok.toLowerCase();
  const seen = {};
  const hits = (COMMUNITY.members || []).filter(m=>{
    const h = (m.name || '').split(/\s+/)[0];
    if(!h || seen[h.toLowerCase()]) return false;
    seen[h.toLowerCase()] = 1;
    return h.toLowerCase().indexOf(q) === 0;
  }).slice(0, 6);
  if(!hits.length){ hideMentionBox(); return; }
  const box = mentionBox();
  box.innerHTML = hits.map(m=>{
    const h = esc((m.name || '').split(/\s+/)[0]);
    return `<button type="button" class="cment-opt" data-act="cmentionpick" data-a1="${h}" data-a2="${esc(node.id)}">@${h}</button>`;
  }).join('');
  const r = node.getBoundingClientRect();
  box.style.left = Math.round(r.left) + 'px';
  box.style.top  = Math.round(r.bottom + 4) + 'px';
  box.style.width = Math.round(r.width) + 'px';
  box.style.display = 'block';
}
function insertMention(fieldId, handle){
  const node = el(fieldId);
  if(!node) return;
  const pos = node.selectionStart == null ? node.value.length : node.selectionStart;
  const before = node.value.slice(0, pos).replace(/@([\p{L}\p{N}_]*)$/u, '@' + handle + ' ');
  const after = node.value.slice(pos);
  node.value = before + after;
  hideMentionBox();
  node.focus();
  const caret = before.length;
  try{ node.setSelectionRange(caret, caret); }catch(e){}
}

/* =========================================================================
   TRAIN — day view with the week schedule integrated
   ========================================================================= */
/* A lista de exercícios do dia — built-ins (não escondidos) + os próprios —
   fundida numa só sequência e ordenada pela ordem PESSOAL do utilizador
   (STATE.order[dia]). Uma chave sem posição guardada vai para o fim, na ordem
   natural, por isso um exercício novo aparece no fim e nada some. É esta função
   que renderTrain e o exmove partilham, para verem sempre a mesma ordem.
   O `i` do built-in continua a ser o índice em d.items — é a identidade que o
   abrir/fechar e o log usam, e reordenar não lhe pode mexer. */
function orderedEntries(dayId){
  const d = DAYS.find(x=> x.id === dayId);
  if(!d) return [];
  const entries = [];
  (d.items || []).forEach((it,i)=>{
    if(STATE.hidden[dayId + ':' + it.ex]) return;
    entries.push({ key: it.ex, kind:'built', it, i });
  });
  (STATE.custom[dayId] || []).forEach(c=>{
    entries.push({ key: 'c' + c.id, kind:'custom', c });
  });
  const ord = (STATE.order && STATE.order[dayId]) || [];
  const pos = {}; ord.forEach((k,idx)=>{ pos[k] = idx; });
  entries.forEach((e,n)=>{ e._n = n; });
  entries.sort((a,b)=>{
    const pa = (a.key in pos) ? pos[a.key] : (ord.length + a._n);
    const pb = (b.key in pos) ? pos[b.key] : (ord.length + b._n);
    return pa - pb;
  });
  return entries;
}

/* Os controlos ↑/↓ de cada cartão. Ficam SEMPRE visíveis (não é preciso abrir o
   cartão), desativados no topo/fim. Só aparecem quando há mais do que um, senão
   não há nada para reordenar. `key` identifica o cartão na ordem pessoal. */
function moveRail(m){
  if(!m) return '';
  return `<div class="excard__move">
    <button type="button" class="movebtn" data-act="exmove" data-a1="${esc(m.key)}" data-a2="up"
      ${m.first ? 'disabled' : ''} aria-label="${t('tr_moveup')}">${ICONS.arrowUp}</button>
    <button type="button" class="movebtn" data-act="exmove" data-a1="${esc(m.key)}" data-a2="down"
      ${m.last ? 'disabled' : ''} aria-label="${t('tr_movedown')}">${ICONS.arrowDown}</button>
  </div>`;
}

function renderTrain(){
  const td = todayId();
  if(!curDay) curDay = td;
  const d = DAYS.find(x=> x.id === curDay);
  const bk = BLOCKS.find(b=> b.k === curBlock);

  let html = `<div class="screen wrap">`;

  /* integrated schedule strip */
  html += `<div class="wstrip mt4">${DAYS.map(x=>`
    <button class="wday ${x.id === curDay ? 'is-on' : ''} ${x.type === 'rest' ? 'is-rest' : ''}"
      data-act="setday" data-a1="${x.id}">
      <span class="wday__d">${L(x.wd)}</span>
      <span class="wday__n">${L(x.short)}</span>
      ${x.id === td ? '<i class="wday__today"></i>' : ''}
    </button>`).join('')}</div>`;

  /* day hero */
  html += `<article class="pcard pcard--wide mt4">
    <div class="pcard__media"><img class="pcard__img" src="${dayPhoto(d.id)}" alt=""></div>
    ${d.id === td ? `<span class="pcard__badge">${L(d.wd)}</span>` : ''}
    <div class="pcard__body">
      <p class="u-eyebrow">${L(d.eyebrow)}</p>
      <h1 class="pcard__title">${L(d.name)}</h1>
      <div class="pcard__meta">${LA(d.mus).map(m=>`<span>${esc(m)}</span>`).join('')}</div>
    </div>
  </article>`;

  if(d.type === 'rest'){ html += restBlock(); html += `</div>`; setHTML('view', html); return; }

  const coaches = trainersForDay(d.id);
  if(coaches.length){
    html += `<div class="rows mt4">${coaches.map(c=>`
      <div class="row">
        <span class="avatar"><img src="${coachPhoto(c.photo)}" alt=""></span>
        <div class="row__t"><p class="row__n">${esc(c.name)}</p>
          <p class="row__s">${esc(c.specialty || t('c_title'))}</p></div>
        <span class="badge badge--acc">${t('c_with')}</span>
      </div>`).join('')}</div>`;
  }

  /* block selector */
  html += sectionHead(t('tr_block'));
  html += `<div class="seg">${BLOCKS.map(b=>`
    <button class="seg__b ${b.k === curBlock ? 'is-on' : ''}" data-act="setblock" data-a1="${b.k}">
      ${L(b.t)}</button>`).join('')}</div>
    <p class="u-mut tc" style="font-size:var(--t-xxs);margin-top:var(--s2)">${L(bk.s)}</p>`;

  /* warm-up + focus */
  html += `<div class="stack mt6">
    <div class="note">${ICONS.spark}<div><b>${t('tr_warm')}</b> ${L(d.warm)}</div></div>
    <div class="note">${ICONS.flag}<div><b>${t('tr_focus')}</b> ${L(d.goal)}</div></div>
  </div>`;

  /* cardio */
  if(d.cardio){
    html += sectionHead(t('tr_cardio'));
    html += d.cardio.map(cardioCard).join('');
    html += sectionHead(t('tr_core'));
  } else {
    html += sectionHead(L(d.name), '', '') ;
  }

  /* exercises — built-ins + custom, in the user's personal order, with ↑/↓ */
  const entries = orderedEntries(curDay);
  const many = entries.length > 1;
  html += entries.map((e, pos)=>{
    const meta = many ? { key:e.key, first: pos === 0, last: pos === entries.length - 1 } : null;
    return e.kind === 'built' ? exCard(e.it, e.i, meta) : customCard(e.c, meta);
  }).join('');

  const hidden = d.items.filter(it=> STATE.hidden[curDay + ':' + it.ex]).length;
  if(hidden){
    html += `<p class="u-mut tc" style="font-size:var(--t-xs);margin-top:var(--s4)">
      ${hidden} ${t('tr_removed')} · <button class="u-acc" style="font-weight:700"
      data-act="restorehidden">${t('tr_restore')}</button></p>`;
  }

  html += `<button class="btn btn--ghost btn--block mt6" data-act="exadd">${ICONS.plus} ${t('tr_add')}</button>`;
  html += `<button class="btn btn--acc btn--block mt4" data-act="savesession">${ICONS.check} ${t('tr_save')}</button>`;
  html += `<p class="u-mut tc" style="font-size:var(--t-xxs);margin-top:var(--s3)">${t('tr_savehint')}</p>`;

  html += `</div>`;
  setHTML('view', html);
}

function restBlock(){
  const recos = [
    ['tr_rest_walk','tr_rest_walk_s', ICONS.spark],
    ['tr_rest_mob','tr_rest_mob_s', ICONS.target],
    ['tr_rest_sleep','tr_rest_sleep_s', ICONS.moon]
  ];
  return `<div class="card mt4">
    <h2 class="u-display" style="font-size:var(--t-xl)">${t('tr_rest_t')}</h2>
    <p class="u-mut mt4" style="font-size:var(--t-sm)">${t('tr_rest_p')}</p>
    <div class="rows mt6">${recos.map(([a,b,icon])=>`
      <div class="row">
        <span class="u-acc" style="display:grid;place-items:center;width:1.5rem">${icon}</span>
        <div class="row__t"><p class="row__n">${t(a)}</p><p class="row__s">${t(b)}</p></div>
      </div>`).join('')}</div>
    <div class="field mt6">
      <span class="field__l">${t('tr_notes')}</span>
      <textarea class="textarea" data-inp="restnote"
        placeholder="${t('tr_notes_ph')}">${esc(STATE.restNote || '')}</textarea>
    </div>
  </div>`;
}

function cardioCard(id){
  const c = CARDIO[id];
  return `<article class="card card--flush mt4">
    <div class="pcard__media" style="aspect-ratio:16/9">
      <img class="pcard__img" src="${cardioPhoto(id)}" alt="">
    </div>
    <div style="padding:var(--s5)">
      <h3 style="font-weight:700">${esc(exName(c))}</h3>
      <p class="u-mut" style="font-size:var(--t-xs)">${esc(LANG === 'en' ? c.nPT : c.nEN)}</p>
      <div class="tiles tiles--2 mt4">
        ${tile(t('p_rest'), esc(c.dur))}
        ${tile(t('p_load'), `<span style="font-size:var(--t-sm)">${esc(L(c.intens))}</span>`)}
      </div>
      <p class="u-mut mt4" style="font-size:var(--t-sm)"><b style="color:var(--ink)">${t('tr_focus')}</b> ${esc(L(c.obj))}</p>
      <ul class="bullets mt4">${L(c.tips).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <div class="mt4">${videoBlock(VIDEOS[id], cardioPhoto(id), exName(c))}</div>
    </div>
  </article>`;
}

/* Poster for a built-in on the current day: a photo the user set by hand wins
   over the auto-match, exactly like customPhoto() does for their own exercises.
   The override lives on the day-scoped ovr record, so it needs curDay — which is
   why exPhoto() (day-agnostic) can't do this itself. */
function exPosterFor(exId){
  const o = STATE.ovr && STATE.ovr[curDay + ':' + exId];
  return (o && o.photo) ? o.photo : exPhoto(exId);
}

/* Video for a built-in on the current day: a link the user typed in the edit
   form (stored on the day-scoped ovr) wins over the shipped demo. Without this,
   an edited video was saved to ovr.vid but the card kept playing VIDEOS[exId] —
   the "I changed the video, it saved, then it came back to the old one" report. */
function exVideoFor(exId){
  const o = STATE.ovr && STATE.ovr[curDay + ':' + exId];
  return (o && o.vid) || VIDEOS[exId] || '';
}

/* Write the chosen photo into the user's PRIVATE state — always private, even
   when the prescription is published to everyone. Only touches state when the
   user actually changed the photo this session (uploaded or reset), so an edit
   that left the photo alone keeps whatever was there. For built-ins the photo
   rides on the day-scoped ovr record; a photo-only ovr is harmless — every
   prescription field falls back to the plan (see exCard). */
function applyPhotoOverride(mode, id){
  if(!exPhotoDraft && !exPhotoReset) return;
  const photo = exPhotoReset ? '' : exPhotoDraft;
  if(mode === 'custom'){
    const c = (STATE.custom[curDay] || []).find(x=> x.id === parseInt(id,10));
    if(c){ if(photo) c.photo = photo; else delete c.photo; }
  }else if(mode === 'builtin'){
    const key = curDay + ':' + id;
    if(photo){ STATE.ovr[key] = Object.assign({}, STATE.ovr[key], { photo }); }
    else if(STATE.ovr[key]){
      delete STATE.ovr[key].photo;
      if(!Object.keys(STATE.ovr[key]).length) delete STATE.ovr[key];
    }
  }
  saveState();
}

/* ---- built-in exercise card ---- */
function exCard(it, i, meta){
  const e = EX[it.ex];
  const base = it[curBlock];
  const isOpen = openCard === i;
  const tab = openTab[i] || 'exec';
  const lg = getLog(curDay, curBlock, it.ex);
  const ovr = STATE.ovr && STATE.ovr[curDay + ':' + it.ex];
  const p = ovr
    ? { s:ovr.s || base.s, r:ovr.r || base.r, rpe:base.rpe, l:ovr.l || base.l, rest:ovr.rest || base.rest }
    : base;
  const nm = (ovr && ovr.name) || exName(e);

  return `<article class="excard ${isOpen ? 'is-open' : ''}">
    <div class="excard__top">
    <button class="excard__h" data-act="toggleex" data-a1="${i}">
      <span class="excard__thumb"><img src="${exPosterFor(it.ex)}" alt="" loading="lazy"></span>
      <span class="excard__t">
        <span class="excard__n">${esc(nm)}</span>
        <span class="excard__sub">${esc((ovr && ovr.eq) || L(e.eq))}</span>
      </span>
      <span class="excard__spec">
        <span class="excard__sr">${esc(p.s)}${t('u_x')}${esc(dtxt(p.r))}</span>
        <span class="excard__rpe">RPE ${esc(p.rpe)}</span>
      </span>
      <span class="excard__chev">${ICONS.chevron}</span>
    </button>
    ${moveRail(meta)}
    </div>
    <div class="excard__body">
      ${specStrip(p)}
      ${it.note ? `<p class="exnote">${esc(L(it.note))}</p>` : ''}
      ${logBlock(it.ex, p.s, lg, p.rest, nm)}
      <div class="panels">
        <div class="seg" style="margin-bottom:var(--s4)">
          ${[['exec','t_exec'],['err','t_err'],['prog','t_prog']].map(([k,lbl])=>`
            <button class="seg__b ${tab === k ? 'is-on' : ''}" data-act="settab" data-a1="${i}" data-a2="${k}">
              ${t(lbl)}</button>`).join('')}
        </div>
        <div class="panel ${tab === 'exec' ? 'is-on' : ''}">${execPanel(it.ex, e)}</div>
        <div class="panel ${tab === 'err' ? 'is-on' : ''}">${errPanel(e)}</div>
        <div class="panel ${tab === 'prog' ? 'is-on' : ''}">${blockPanel(it)}</div>
        <div class="flexr flexr--wrap mt6">
          <button class="btn btn--ghost btn--sm" data-act="exeditbuilt" data-a1="${esc(it.ex)}">${ICONS.edit} ${t('b_edit')}</button>
          <button class="btn btn--danger btn--sm" data-act="exremove" data-a1="${esc(it.ex)}">${ICONS.trash} ${t('b_rmday')}</button>
        </div>
      </div>
    </div>
  </article>`;
}

function specStrip(p){
  return `<div class="specs">
    <div class="spec"><span class="spec__l">${t('p_sets')}</span><span class="spec__v">${esc(p.s)}</span></div>
    <div class="spec"><span class="spec__l">${t('p_reps')}</span><span class="spec__v">${esc(dtxt(p.r))}</span></div>
    <div class="spec"><span class="spec__l">${t('p_rpe')}</span><span class="spec__v spec__v--acc">${esc(p.rpe)}</span></div>
    <div class="spec"><span class="spec__l">${t('p_load')}</span><span class="spec__v">${esc(dtxt(p.l))}</span></div>
    <div class="spec"><span class="spec__l">${t('p_rest')}</span><span class="spec__v">${esc(p.rest)}</span></div>
  </div>`;
}

/* Shared by built-in and custom exercises so logging behaviour can never
   drift between the two paths (it used to be duplicated). */
function logBlock(exId, sets, lg, rest, name){
  const plan = restSeconds(rest);
  const secs = restFor(exId, rest);
  const own = secs !== plan;
  return `<div class="log">
    <div class="log__h"><b>${t('lg_t')}</b><span>${t('lg_auto')}</span></div>
    <div class="grid2">
      <label class="field"><span class="field__l">${t('lg_w')}</span>
        <input class="input" type="text" inputmode="decimal" value="${esc(lg.w || '')}"
          data-inp="log" data-a1="${esc(exId)}" data-a2="w"></label>
      <label class="field"><span class="field__l">${t('lg_r')}</span>
        <input class="input" type="text" value="${esc(lg.r || '')}"
          data-inp="log" data-a1="${esc(exId)}" data-a2="r"></label>
    </div>
    <div class="log__row">
      <span class="field__l">${t('lg_s')}</span>
      <div class="setchips">${setChips(exId, sets, lg.done)}</div>
    </div>
    <div class="log__row">
      <span class="field__l">${t('p_rest')}</span>
      <button class="btn btn--acc btn--sm restbtn" data-act="rest"
        data-a1="${secs}" data-a2="${esc(name || '')}">
        ${ICONS.clock} ${t('rt_start')} ${rtFmt(secs)}</button>
      <button class="iconbtn iconbtn--sm resttune ${own ? 'is-own' : ''}" data-act="restedit"
        data-a1="${esc(exId)}" data-a2="${plan}" aria-label="${t('rs_title')}">${ICONS.edit}</button>
    </div>
    <textarea class="textarea mt4" placeholder="${t('lg_ph')}"
      data-inp="log" data-a1="${esc(exId)}" data-a2="note">${esc(lg.note || '')}</textarea>
  </div>`;
}
function setChips(exId, sets, done){
  sets = parseInt(sets, 10) || 0;
  done = done || [];
  if(!sets) return `<span class="u-mut" style="font-size:var(--t-xs)">—</span>`;
  let h = '';
  for(let k = 0; k < sets; k++){
    h += `<button class="setchip ${done[k] ? 'is-on' : ''}" data-act="toggleset"
      data-a1="${esc(exId)}" data-a2="${k}">${k+1}</button>`;
  }
  return h;
}

function execPanel(id, e){
  return `${videoBlock(exVideoFor(id), exPosterFor(id), exName(e))}
    <h4 class="blkt">${t('e_steps')}</h4>
    <ol class="steps">${LA(e.steps).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
    <h4 class="blkt">${t('e_safe')}</h4>
    <ul class="bullets">${LA(e.safe).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
    <div class="muslist">
      <div class="musrow"><span class="musrow__k">${t('mg_pri')}</span>
        <span class="musrow__v musrow__v--pri">${(e.pri || []).map(musName).map(esc).join(', ') || '—'}</span></div>
      <div class="musrow"><span class="musrow__k">${t('mg_sec')}</span>
        <span class="musrow__v">${(e.sec || []).map(musName).map(esc).join(', ') || '—'}</span></div>
    </div>
    <div class="note">${ICONS.info}<div><b>${t('e_breath')}</b> ${esc(L(e.breath))}</div></div>`;
}
function errPanel(e){
  return `<h4 class="blkt">${t('er_t')}</h4>
    ${LA(e.errs).map(x=>`<div class="ecpair">
      <div class="ec ec--err"><p class="ec__h">${t('er_e')}</p>${esc(x.e)}</div>
      <div class="ec ec--fix"><p class="ec__h">${t('er_c')}</p>${esc(x.c)}</div>
    </div>`).join('')}
    <div class="note">${ICONS.info}<div>${t('er_note')}</div></div>`;
}
function blockPanel(it){
  return `<h4 class="blkt">${t('pg_t')}</h4>
    <div class="pglist">${BLOCKS.map(b=>{
      const p = it[b.k];
      return `<div class="pgrow ${b.k === curBlock ? 'is-cur' : ''}">
        <span class="pgrow__b">${L(b.t)}</span>
        <span class="pgrow__v">${esc(p.s)}${t('u_x')}${esc(dtxt(p.r))}</span>
        <span class="pgrow__v">RPE ${esc(p.rpe)}</span>
      </div>`; }).join('')}</div>
    <p class="u-mut tc" style="font-size:var(--t-xxs);margin-top:var(--s3)">${t('pg_cap')}</p>
    <div class="note">${ICONS.info}<div>${t('pg_ov')}</div></div>`;
}

/* ---- user-created exercise ---- */
function customCard(c, meta){
  const key = 'c' + c.id;
  const isOpen = openCard === key;
  const lg = getLog(curDay, curBlock, key);
  return `<article class="excard ${isOpen ? 'is-open' : ''}">
    <div class="excard__top">
    <button class="excard__h" data-act="togglecustom" data-a1="${c.id}">
      <span class="excard__thumb"><img src="${customPhoto(c)}" alt=""></span>
      <span class="excard__t">
        <span class="excard__n">${esc(c.name)}</span>
        <span class="excard__sub">${esc(c.eq || t('m_custom'))}</span>
      </span>
      <span class="excard__spec">
        <span class="excard__sr">${esc(c.s || '—')}${t('u_x')}${esc(c.r || '—')}</span>
        <span class="excard__rpe">${esc(c.l || '')}</span>
      </span>
      <span class="excard__chev">${ICONS.chevron}</span>
    </button>
    ${moveRail(meta)}
    </div>
    <div class="excard__body">
      ${specStrip({ s:c.s || '—', r:c.r || '—', rpe:'—', l:c.l || '—', rest:c.rest || '—' })}
      ${logBlock(key, c.s, lg, c.rest, c.name)}
      <div class="panels">
        ${videoBlock(customVideo(c), customPhoto(c), c.name)}
        <div class="flexr flexr--wrap mt6">
          <button class="btn btn--ghost btn--sm" data-act="exeditcustom" data-a1="${c.id}">${ICONS.edit} ${t('b_edit')}</button>
          <button class="btn btn--danger btn--sm" data-act="exdelcustom" data-a1="${c.id}">${ICONS.trash} ${t('b_del')}</button>
        </div>
      </div>
    </div>
  </article>`;
}

/* =========================================================================
   GOALS
   ========================================================================= */
function renderGoals(){
  let html = `<div class="screen wrap">`;
  html += `<div class="mt4"><p class="u-eyebrow">${t('nav_goals')}</p>
    <h1 class="u-display" style="font-size:var(--t-xxl)">${t('g_title')}</h1></div>`;

  if(!STATE.goals.length){
    html += `<div class="empty mt6">
      <div class="empty__media"><img src="${onboardPhoto('goal')}" alt=""></div>
      <div class="empty__body">
        <h3 class="empty__t">${t('g_none_t')}</h3>
        <p class="empty__p">${t('g_none_p')}</p>
        <button class="btn btn--acc" data-act="goalnew">${ICONS.plus} ${t('g_new')}</button>
      </div></div>`;
  } else {
    html += `<div class="stack mt6">${STATE.goals.map(goalCard).join('')}</div>`;
  }

  html += `</div>
    <button class="fab" data-act="goalnew">${ICONS.plus} ${t('g_new')}</button>`;
  setHTML('view', html);
}
function goalCard(g){
  const pct = goalPct(g), rem = goalRemaining(g);
  const overdue = g.deadline && !g.hitAt && new Date(g.deadline).getTime() < Date.now();
  return `<div class="goal ${g.hitAt ? 'is-hit' : ''}">
    <span class="goal__media"><img src="${goalPhoto(g.photo)}" alt="" loading="lazy"></span>
    <div class="goal__t">
      <p class="goal__n">${esc(g.title)}${g.hitAt ? '<span class="flame">🔥</span>' : ''}</p>
      <p class="goal__s">
        ${esc(g.current)}${esc(g.unit)} / ${esc(g.target)}${esc(g.unit)}
        ${g.hitAt ? ` · ${t('g_hit')}` : (rem !== null ? ` · ${rem}${esc(g.unit)} ${t('g_togo')}` : '')}
        ${overdue ? ` · <span style="color:var(--neg)">${t('g_overdue')}</span>` : (g.deadline ? ` · ${t('g_due')} ${fmtDay(g.deadline)}` : '')}
      </p>
      <div class="pbar"><i class="pbar__f" style="width:${pct}%"></i></div>
      <div class="flexr" style="margin-top:var(--s3)">
        <button class="btn btn--ghost btn--sm" data-act="goalprog" data-a1="${g.id}">${ICONS.spark} ${t('b_update')}</button>
        <button class="iconbtn iconbtn--sm push" data-act="goaledit" data-a1="${g.id}"
          aria-label="${t('b_edit')}">${ICONS.edit}</button>
        <button class="iconbtn iconbtn--sm" data-act="goaldel" data-a1="${g.id}"
          aria-label="${t('b_del')}" style="color:var(--neg)">${ICONS.trash}</button>
      </div>
    </div>
  </div>`;
}
function goalForm(g){
  g = g || { type:'weight', photo: GOAL_PRESETS[0] };
  const types = [['weight','g_type_weight'],['bodyfat','g_type_bodyfat'],['lift','g_type_lift'],
                 ['sessions','g_type_sessions'],['custom','g_type_custom']];
  return `<label class="field"><span class="field__l">${t('g_f_title')}</span>
      <input class="input" id="gTitle" value="${esc(g.title || '')}" placeholder="${t('g_f_title_ph')}"></label>
    <label class="field"><span class="field__l">${t('g_f_type')}</span>
      <select class="select" id="gType">${types.map(([k,lbl])=>`
        <option value="${k}" ${g.type === k ? 'selected' : ''}>${t(lbl)}</option>`).join('')}</select></label>
    <div class="grid2" style="margin-bottom:var(--s4)">
      <label class="field"><span class="field__l">${t('g_f_start')}</span>
        <input class="input" id="gStart" inputmode="decimal" value="${esc(g.start || '')}"></label>
      <label class="field"><span class="field__l">${t('g_f_target')}</span>
        <input class="input" id="gTarget" inputmode="decimal" value="${esc(g.target || '')}"></label>
    </div>
    <div class="grid2" style="margin-bottom:var(--s4)">
      <label class="field"><span class="field__l">${t('g_f_current')}</span>
        <input class="input" id="gCurrent" inputmode="decimal" value="${esc(g.current || '')}"></label>
      <label class="field"><span class="field__l">${t('g_f_deadline')}</span>
        <input class="input" id="gDeadline" type="date" value="${esc(g.deadline || '')}"></label>
    </div>
    <div class="field"><span class="field__l">${t('g_f_photo')}</span>
      <div class="ppick" id="gPhoto">${GOAL_PRESETS.map(f=>`
        <button type="button" class="ppick__o ${((g.photo || GOAL_PRESETS[0]) === f) ? 'is-on' : ''}"
          data-act="pickphoto" data-a1="gPhoto" data-a2="${f}">
          <img src="${goalPhoto(f)}" alt=""></button>`).join('')}</div></div>
    <label class="field"><span class="field__l">${t('g_f_notes')}</span>
      <textarea class="textarea" id="gNotes" placeholder="${t('g_f_notes_ph')}">${esc(g.notes || '')}</textarea></label>`;
}

/* =========================================================================
   PROFILE  (+ trainers CRUD)
   ========================================================================= */
function renderProfile(){
  const p = STATE.profile;
  let html = `<div class="screen wrap">`;

  html += `<div class="tc mt6">
    <div class="avatar avatar--xl" style="margin:0 auto">${p.photo
      ? `<img src="${coachPhoto(p.photo)}" alt="">`
      : `<span style="display:grid;place-items:center;height:100%;color:var(--ink-3)">${ICONS.user}</span>`}</div>
    <h1 class="u-display u-display--name mt4" style="font-size:var(--t-xl)">${esc(p.name || t('app_name'))}</h1>
    <p class="u-mut" style="font-size:var(--t-xs)">${USER ? esc(USER.email) : t('pr_local')}</p>
    <button class="btn btn--ghost btn--sm mt4" data-act="profedit">${ICONS.edit} ${t('pr_edit')}</button>
  </div>`;

  html += `<div class="tiles mt6">
    ${tile(t('pf_wcur'), (p.weightCurrent || '—') + '<small> kg</small>')}
    ${tile(t('pf_wtarget'), (p.weightTarget || '—') + '<small> kg</small>')}
    ${tile(t('pf_height'), (p.heightCm || '—') + '<small> cm</small>')}
  </div>`;

  /* trainers */
  html += sectionHead(t('pr_trainers'), t('c_new'), 'trainernew');
  if(!STATE.trainers.length){
    html += `<div class="empty">
      <div class="empty__media"><img src="${onboardPhoto('trainer')}" alt=""></div>
      <div class="empty__body">
        <h3 class="empty__t">${t('c_none_t')}</h3>
        <p class="empty__p">${t('c_none_p')}</p>
        <button class="btn btn--acc" data-act="trainernew">${ICONS.plus} ${t('c_new')}</button>
      </div></div>`;
  } else {
    html += `<div class="stack">${STATE.trainers.map(trainerCard).join('')}</div>`;
  }

  /* progress + history */
  html += sectionHead(t('pr_progress'));
  html += chartHTML();
  html += sectionHead(t('pr_history'));
  html += historyHTML();

  /* settings */
  html += sectionHead(t('pr_settings'));
  html += `<div class="card">
    <div class="switch">
      <div><p class="switch__t">${t('pr_theme')}</p>
        <p class="switch__s">${STATE.theme === 'light' ? t('pr_theme_l') : t('pr_theme_d')}</p></div>
      <button class="switch__box ${STATE.theme === 'light' ? 'is-on' : ''}"
        data-act="theme" aria-label="${t('a_theme')}"></button>
    </div>
    <div class="switch">
      <div><p class="switch__t">${t('pr_lang')}</p>
        <p class="switch__s">${LANG === 'pt' ? 'Português' : 'English'}</p></div>
      <div class="seg" style="width:9rem">
        <button class="seg__b ${LANG === 'pt' ? 'is-on' : ''}" data-act="lang" data-a1="pt">PT</button>
        <button class="seg__b ${LANG === 'en' ? 'is-on' : ''}" data-act="lang" data-a1="en">EN</button>
      </div>
    </div>
    <div class="switch">
      <div><p class="switch__t">${t('pr_export')}</p><p class="switch__s">${t('pr_export_s')}</p></div>
      <button class="iconbtn" data-act="export" aria-label="${t('pr_export')}">${ICONS.download}</button>
    </div>
    <div class="switch">
      <div><p class="switch__t">${t('pr_import')}</p><p class="switch__s">${t('pr_import_s')}</p></div>
      <button class="iconbtn" data-act="import" aria-label="${t('pr_import')}">${ICONS.upload}</button>
    </div>
    <div class="switch">
      <div><p class="switch__t">${t('vt_title')}</p><p class="switch__s">${t('vt_row_s')}</p></div>
      <button class="btn btn--ghost btn--sm" data-act="vidtest">${t('vt_open')}</button>
    </div>
    ${catalogRowHTML()}
  </div>`;

  html += `<div class="card mt4">
    <div class="flexr">
      <span class="dot ${USER ? 'dot--on' : 'dot--off'}"></span>
      <div style="flex:1"><p class="switch__t">${USER ? t('pr_synced') : t('pr_local')}</p>
        <p class="switch__s">${USER ? esc(USER.email) : ''}</p></div>
    </div>
    ${USER ? `<button class="btn btn--danger btn--block mt4" data-act="signout">${ICONS.logout} ${t('pr_signout')}</button>` : ''}
  </div>`;

  html += `</div>`;
  setHTML('view', html);
  try{ initProgChart(); }catch(e){}
}

function trainerCard(c){
  const days = (c.preferredDays || []).map(id=>{
    const d = DAYS.find(x=> x.id === id); return d ? L(d.wd) : '';
  }).filter(Boolean);
  return `<div class="card card--2">
    <div class="flexr">
      <span class="avatar avatar--lg"><img src="${coachPhoto(c.photo)}" alt="" loading="lazy"></span>
      <div style="flex:1;min-width:0">
        <p class="row__n">${esc(c.name)}</p>
        <p class="row__s">${esc(c.specialty || '—')}</p>
        <span class="badge ${c.active ? 'badge--pos' : 'badge--off'}" style="margin-top:.3rem">
          ${c.active ? t('c_active') : t('c_inactive')}</span>
      </div>
    </div>
    ${c.bio ? `<p class="u-mut mt4" style="font-size:var(--t-xs)">${esc(c.bio)}</p>` : ''}
    ${(c.phone || c.email || c.instagram) ? `<div class="flexr flexr--wrap mt4" style="font-size:var(--t-xs)">
      ${c.phone ? `<span class="flexr" style="gap:.3rem"><span class="u-acc" style="width:1rem">${ICONS.phone}</span>${esc(c.phone)}</span>` : ''}
      ${c.email ? `<span class="flexr" style="gap:.3rem"><span class="u-acc" style="width:1rem">${ICONS.mail}</span>${esc(c.email)}</span>` : ''}
      ${c.instagram ? `<span class="flexr" style="gap:.3rem"><span class="u-acc" style="width:1rem">${ICONS.insta}</span>${esc(c.instagram)}</span>` : ''}
    </div>` : ''}
    ${c.availability ? `<p class="u-mut mt4" style="font-size:var(--t-xs)">
      <b style="color:var(--ink)">${t('c_f_avail')}:</b> ${esc(c.availability)}</p>` : ''}
    ${days.length ? `<p class="u-mut" style="font-size:var(--t-xs);margin-top:var(--s2)">
      <b style="color:var(--ink)">${t('c_days')}:</b> ${esc(days.join(' · '))}</p>` : ''}
    ${(c.plans || []).length ? `<div class="mt4"><p class="field__l">${t('c_plans')}</p>
      <ul class="bullets">${c.plans.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${c.notes ? `<div class="note">${ICONS.book}<div>${esc(c.notes)}</div></div>` : ''}
    <div class="mt4">
      <p class="field__l">${t('c_sessions')} (${(c.sessions||[]).length})</p>
      ${(c.sessions || []).length
        ? `<div class="rows" style="margin-top:var(--s2)">${c.sessions.slice(0,4).map(s=>`
            <div class="row">
              <div class="row__t"><p class="row__n">${fmtDay(s.date)}</p>
                <p class="row__s">${esc(s.note || '—')}</p></div>
              <button class="iconbtn iconbtn--bare" data-act="trsessdel" data-a1="${c.id}" data-a2="${s.id}"
                aria-label="${t('b_del')}">${ICONS.close}</button>
            </div>`).join('')}</div>`
        : `<p class="u-mut" style="font-size:var(--t-xs);margin-top:var(--s2)">${t('c_sess_none')}</p>`}
    </div>
    <div class="flexr flexr--wrap mt4">
      <button class="btn btn--ghost btn--sm" data-act="trsessnew" data-a1="${c.id}">${ICONS.plus} ${t('c_sess_add')}</button>
      <button class="btn btn--ghost btn--sm" data-act="traineredit" data-a1="${c.id}">${ICONS.edit} ${t('b_edit')}</button>
      <button class="btn btn--danger btn--sm" data-act="trainerdel" data-a1="${c.id}">${ICONS.trash}</button>
    </div>
  </div>`;
}
function trainerForm(c){
  c = c || { active:true, photo: COACH_PRESETS[0], preferredDays:[] };
  return `<label class="field"><span class="field__l">${t('c_f_name')}</span>
      <input class="input" id="cName" value="${esc(c.name || '')}" placeholder="${t('c_f_name_ph')}"></label>
    <div class="field"><span class="field__l">${t('c_f_photo')}</span>
      <div class="ppick" id="cPhoto">${COACH_PRESETS.map(f=>`
        <button type="button" class="ppick__o ${((c.photo || COACH_PRESETS[0]) === f) ? 'is-on' : ''}"
          data-act="pickphoto" data-a1="cPhoto" data-a2="${f}">
          <img src="${coachPhoto(f)}" alt=""></button>`).join('')}</div></div>
    <label class="field"><span class="field__l">${t('c_f_spec')}</span>
      <input class="input" id="cSpec" value="${esc(c.specialty || '')}" placeholder="${t('c_f_spec_ph')}"></label>
    <label class="field"><span class="field__l">${t('c_f_bio')}</span>
      <textarea class="textarea" id="cBio" placeholder="${t('c_f_bio_ph')}">${esc(c.bio || '')}</textarea></label>
    <div class="grid2" style="margin-bottom:var(--s4)">
      <label class="field"><span class="field__l">${t('c_f_phone')}</span>
        <input class="input" id="cPhone" type="tel" value="${esc(c.phone || '')}"></label>
      <label class="field"><span class="field__l">${t('c_f_email')}</span>
        <input class="input" id="cEmail" type="email" value="${esc(c.email || '')}"></label>
    </div>
    <label class="field"><span class="field__l">${t('c_f_insta')}</span>
      <input class="input" id="cInsta" value="${esc(c.instagram || '')}" placeholder="@"></label>
    <label class="field"><span class="field__l">${t('c_f_avail')}</span>
      <input class="input" id="cAvail" value="${esc(c.availability || '')}" placeholder="${t('c_f_avail_ph')}"></label>
    <div class="field"><span class="field__l">${t('c_f_days')}</span>
      <div class="hscroll" id="cDays">${DAYS.map(d=>`
        <button type="button" class="chip ${(c.preferredDays||[]).indexOf(d.id) > -1 ? 'is-on' : ''}"
          data-act="toggleday" data-a1="cDays" data-a2="${d.id}">${L(d.wd)}</button>`).join('')}</div></div>
    <label class="field"><span class="field__l">${t('c_f_plans')}</span>
      <textarea class="textarea" id="cPlans" placeholder="${t('c_f_plans_ph')}">${esc((c.plans||[]).join('\n'))}</textarea></label>
    <label class="field"><span class="field__l">${t('c_f_notes')}</span>
      <textarea class="textarea" id="cNotes" placeholder="${t('c_f_notes_ph')}">${esc(c.notes || '')}</textarea></label>
    <div class="switch">
      <div><p class="switch__t">${t('c_f_active')}</p></div>
      <button type="button" class="switch__box ${c.active !== false ? 'is-on' : ''}"
        id="cActive" data-act="toggleswitch"></button>
    </div>`;
}

/* =========================================================================
   HISTORY + CHART
   ========================================================================= */
function historyHTML(){
  if(!STATE.sessions.length){
    return `<div class="empty empty--flat"><p class="empty__p" style="margin:0">${t('hi_empty')}</p></div>`;
  }
  return `<div class="stack">${STATE.sessions.slice(0,40).map(sn=>{
    const editing = editSid === sn.id;
    const body = sn.entries.map((en,ix)=> editing
      ? `<div style="padding:var(--s3) 0;border-bottom:1px solid var(--line)">
           <p class="row__n">${esc(en.name)}</p>
           <div class="grid2" style="margin-top:var(--s2)">
             <input class="input" value="${esc(en.w)}" placeholder="${t('hi_w_ph')}"
               data-inp="sessedit" data-a1="${sn.id}:${ix}:w">
             <input class="input" value="${esc(en.reps)}" placeholder="${t('hi_r_ph')}"
               data-inp="sessedit" data-a1="${sn.id}:${ix}:reps">
           </div>
           <input class="input mt4" value="${esc(en.note)}" placeholder="${t('hi_n_ph')}"
             data-inp="sessedit" data-a1="${sn.id}:${ix}:note">
         </div>`
      : `<div class="flexr" style="padding:var(--s2) 0;font-size:var(--t-xs)">
           <span style="flex:1;min-width:0">${esc(en.name)}</span>
           <span class="u-mut">${en.w ? `<b style="color:var(--ink)">${esc(en.w)} kg</b>` : '—'}${en.reps ? ' · ' + esc(en.reps) : ''}</span>
         </div>`
    ).join('') || `<p class="u-mut" style="font-size:var(--t-xs)">${t('hi_norec')}</p>`;
    return `<div class="card card--2">
      <div class="flexr" style="margin-bottom:var(--s2)">
        <b style="font-size:var(--t-sm)">${fmtDate(sn.date)}</b>
        <span class="u-mut push" style="font-size:var(--t-xxs)">${esc(sn.dayName.split(' — ')[0])} · ${esc(sn.block)}</span>
      </div>
      ${body}
      <div class="flexr flexr--wrap mt4">
        ${editing
          ? `<button class="btn btn--acc btn--sm" data-act="hicloseedit">${ICONS.check} ${t('b_save')}</button>`
          : `<button class="btn btn--ghost btn--sm" data-act="hiedit" data-a1="${sn.id}">${ICONS.edit} ${t('b_edit')}</button>`}
        <button class="btn btn--danger btn--sm" data-act="hidel" data-a1="${sn.id}">${ICONS.trash}</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function chartData(){
  const map = {};
  (STATE.sessions || []).slice().reverse().forEach(sn=>{
    (sn.entries || []).forEach(en=>{
      const w = parseFloat(String(en.w || '').replace(',','.'));
      if(en.w && !isNaN(w)){ (map[en.name] = map[en.name] || []).push({ date:sn.date, w }); }
    });
  });
  return map;
}
function chartHTML(){
  const map = chartData(), names = Object.keys(map);
  if(!names.length){
    return `<div class="empty empty--flat"><p class="empty__p" style="margin:0">${t('ch_empty')}</p></div>`;
  }
  if(!chartSel || names.indexOf(chartSel) < 0) chartSel = names[0];
  return `<div class="chart">
    <div class="chart__h"><b>${t('ch_t')}</b>
      <select class="select" data-inp="chartsel">${names.map(n=>`
        <option ${n === chartSel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="chart__wrap"><canvas id="progChart"></canvas></div>
  </div>`;
}
function initProgChart(){
  if(!window.Chart) return;
  const cv = el('progChart');
  if(!cv) return;
  const map = chartData();
  if(!chartSel || !map[chartSel]) return;
  const pts = map[chartSel];
  if(progChartInst){ try{ progChartInst.destroy(); }catch(e){} progChartInst = null; }

  /* Chart.js cannot read CSS custom properties, so pull the computed values. */
  const cs = getComputedStyle(document.documentElement);
  /* Two accent tokens, and the split matters here: --acc-fill is the bright lime
     meant to sit *behind* something, so it stays on the area gradient; the line
     and its points are a drawn mark, so they take --acc, which the light theme
     darkens. Using --acc-fill on the stroke left the series barely visible on
     the light background. */
  const accent = cs.getPropertyValue('--acc-fill').trim() || '#d9ff47';
  const stroke = cs.getPropertyValue('--acc').trim() || accent;
  const grid = cs.getPropertyValue('--line').trim();
  const tick = cs.getPropertyValue('--ink-3').trim();
  const surf = cs.getPropertyValue('--surface-1').trim();

  const g = cv.getContext('2d').createLinearGradient(0,0,0,200);
  g.addColorStop(0, hexA(accent,.34));
  g.addColorStop(1, hexA(accent,0));

  progChartInst = new Chart(cv,{
    type:'line',
    data:{ labels: pts.map(p=> fmtShort(p.date)),
      datasets:[{ data: pts.map(p=> p.w), borderColor:stroke, backgroundColor:g, fill:true,
        tension:.35, borderWidth:3, pointRadius:4, pointHoverRadius:7,
        pointBackgroundColor:stroke, pointBorderColor:surf, pointBorderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false, animation:{ duration:600 },
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{ label: c=> c.parsed.y + ' kg' } } },
      scales:{ y:{ grid:{ color:grid }, border:{ display:false },
                   ticks:{ color:tick, callback: v=> v + ' kg' } },
               x:{ grid:{ display:false }, border:{ display:false },
                   ticks:{ color:tick, maxRotation:0 } } } }
  });
}
/* accepts #rgb / #rrggbb and returns rgba() — Chart.js needs a real colour */
function hexA(hex,a){
  let h = String(hex).replace('#','').trim();
  if(h.length === 3) h = h.split('').map(c=> c+c).join('');
  const n = parseInt(h,16);
  if(isNaN(n)) return `rgba(217,255,71,${a})`;
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/* =========================================================================
   ONBOARDING — 5 steps, skippable at any point
   ========================================================================= */
let obStep = 0;
let obDraft = {};
const OB_STEPS = ['welcome','body','days','goal','trainer'];

function renderOnboarding(){
  const step = OB_STEPS[obStep];
  const p = STATE.profile;
  let body = '';

  if(step === 'welcome'){
    body = `<h1 class="ob__t">${t('ob1_t')}</h1><p class="ob__p">${t('ob1_p')}</p>
      <label class="field"><span class="field__l">${t('pf_name')}</span>
        <input class="input" id="obName" value="${esc(obDraft.name !== undefined ? obDraft.name : p.name)}"
          placeholder="${t('ph_name')}"></label>
      <div class="field"><span class="field__l">${t('pf_photo')}</span>
        <div class="ppick" id="obPhoto">${COACH_PRESETS.map(f=>`
          <button type="button" class="ppick__o ${((obDraft.photo || p.photo || COACH_PRESETS[0]) === f) ? 'is-on' : ''}"
            data-act="pickphoto" data-a1="obPhoto" data-a2="${f}">
            <img src="${coachPhoto(f)}" alt=""></button>`).join('')}</div></div>`;
  }
  if(step === 'body'){
    body = `<h1 class="ob__t">${t('ob2_t')}</h1><p class="ob__p">${t('ob2_p')}</p>
      <div class="grid2" style="margin-bottom:var(--s4)">
        <label class="field"><span class="field__l">${t('pf_wcur')}</span>
          <input class="input" id="obWCur" inputmode="decimal"
            value="${esc(obDraft.weightCurrent !== undefined ? obDraft.weightCurrent : p.weightCurrent)}"></label>
        <label class="field"><span class="field__l">${t('pf_wtarget')}</span>
          <input class="input" id="obWTar" inputmode="decimal"
            value="${esc(obDraft.weightTarget !== undefined ? obDraft.weightTarget : p.weightTarget)}"></label>
      </div>
      <label class="field"><span class="field__l">${t('pf_height')}</span>
        <input class="input" id="obH" inputmode="numeric"
          value="${esc(obDraft.heightCm !== undefined ? obDraft.heightCm : p.heightCm)}"></label>`;
  }
  if(step === 'days'){
    const sel = obDraft.trainingDays || p.trainingDays || [];
    body = `<h1 class="ob__t">${t('ob3_t')}</h1><p class="ob__p">${t('ob3_p')}</p>
      <div class="hscroll" id="obDays">${DAYS.map(d=>`
        <button type="button" class="chip ${sel.indexOf(d.id) > -1 ? 'is-on' : ''}"
          data-act="toggleday" data-a1="obDays" data-a2="${d.id}">${L(d.wd)}</button>`).join('')}</div>`;
  }
  if(step === 'goal'){
    body = `<h1 class="ob__t">${t('ob4_t')}</h1><p class="ob__p">${t('ob4_p')}</p>
      ${goalForm(obDraft.goal || { type:'weight', photo:GOAL_PRESETS[0],
        start:(obDraft.weightCurrent || p.weightCurrent || ''),
        current:(obDraft.weightCurrent || p.weightCurrent || ''),
        target:(obDraft.weightTarget || p.weightTarget || '') })}`;
  }
  if(step === 'trainer'){
    body = `<h1 class="ob__t">${t('ob5_t')}</h1><p class="ob__p">${t('ob5_p')}</p>
      ${trainerForm(obDraft.trainer || { active:true, photo:COACH_PRESETS[1], preferredDays:[] })}`;
  }

  const last = obStep === OB_STEPS.length - 1;
  setHTML('onboard', `
    <div class="ob__media">
      <div class="ob__prog">${OB_STEPS.map((_,i)=>`<i class="${i <= obStep ? 'is-on' : ''}"></i>`).join('')}</div>
      <img src="${onboardPhoto(step)}" alt="">
    </div>
    <div class="ob__body">${body}</div>
    <div class="ob__foot">
      ${obStep > 0 ? `<button class="iconbtn" data-act="obback" aria-label="${t('ob_back')}">${ICONS.back}</button>` : ''}
      <button class="btn btn--acc" data-act="obnext">
        ${last ? t('ob_finish') : (obStep === 0 ? t('ob1_cta') : t('ob_next'))} ${ICONS.chevronR}</button>
      <button class="btn btn--quiet btn--sm" data-act="obskip">${t('ob_skip')}</button>
    </div>`);
  el('onboard').classList.remove('hidden');
  syncScrollLock();
}
function obCollect(){
  const step = OB_STEPS[obStep];
  if(step === 'welcome'){ if(el('obName')) obDraft.name = fieldVal('obName'); }
  if(step === 'body'){
    if(el('obWCur')) obDraft.weightCurrent = fieldVal('obWCur');
    if(el('obWTar')) obDraft.weightTarget = fieldVal('obWTar');
    if(el('obH')) obDraft.heightCm = fieldVal('obH');
  }
  if(step === 'days'){
    const box = el('obDays');
    if(box) obDraft.trainingDays = [...box.querySelectorAll('.chip.is-on')]
      .map(b=> parseInt(b.dataset.a2,10));
  }
  if(step === 'goal' && el('gTitle')) obDraft.goal = readGoalForm();
  if(step === 'trainer' && el('cName')) obDraft.trainer = readTrainerForm();
}
function obFinish(){
  const prof = {};
  if(obDraft.name !== undefined) prof.name = obDraft.name;
  if(obDraft.photo !== undefined) prof.photo = obDraft.photo;
  if(obDraft.heightCm !== undefined) prof.heightCm = obDraft.heightCm;
  if(obDraft.weightCurrent !== undefined){
    prof.weightCurrent = obDraft.weightCurrent;
    if(!STATE.profile.weightStart) prof.weightStart = obDraft.weightCurrent;
  }
  if(obDraft.weightTarget !== undefined) prof.weightTarget = obDraft.weightTarget;
  if(obDraft.trainingDays && obDraft.trainingDays.length) prof.trainingDays = obDraft.trainingDays;
  updateProfile(prof);

  if(obDraft.goal && obDraft.goal.title) addGoal(obDraft.goal);
  if(obDraft.trainer && obDraft.trainer.name) addTrainer(obDraft.trainer);

  finishOnboarding();
  obDraft = {}; obStep = 0;
  el('onboard').classList.add('hidden');
  syncScrollLock();
  toast(t('ob_added'));
  go('home');
}

/* =========================================================================
   form readers
   ========================================================================= */
function readGoalForm(){
  const box = el('gPhoto');
  const on = box && box.querySelector('.ppick__o.is-on');
  return {
    title: fieldVal('gTitle'),
    type: fieldVal('gType') || 'weight',
    start: fieldVal('gStart'),
    target: fieldVal('gTarget'),
    current: fieldVal('gCurrent'),
    deadline: fieldVal('gDeadline'),
    photo: on ? on.dataset.a2 : GOAL_PRESETS[0],
    notes: fieldVal('gNotes')
  };
}
function readTrainerForm(){
  const box = el('cPhoto');
  const on = box && box.querySelector('.ppick__o.is-on');
  const daysBox = el('cDays');
  const act = el('cActive');
  return {
    name: fieldVal('cName'),
    photo: on ? on.dataset.a2 : COACH_PRESETS[0],
    specialty: fieldVal('cSpec'),
    bio: fieldVal('cBio'),
    phone: fieldVal('cPhone'),
    email: fieldVal('cEmail'),
    instagram: fieldVal('cInsta'),
    availability: fieldVal('cAvail'),
    plans: fieldVal('cPlans').split('\n').map(s=> s.trim()).filter(Boolean),
    notes: fieldVal('cNotes'),
    preferredDays: daysBox ? [...daysBox.querySelectorAll('.chip.is-on')].map(b=> parseInt(b.dataset.a2,10)) : [],
    active: act ? act.classList.contains('is-on') : true
  };
}

/* =========================================================================
   session saving
   ========================================================================= */
function saveSession(){
  const d = DAYS.find(x=> x.id === curDay);
  const entries = [];
  d.items.forEach(it=>{
    if(STATE.hidden[curDay + ':' + it.ex]) return;
    const o = STATE.ovr[curDay + ':' + it.ex] || {};
    const p = it[curBlock];
    const lg = getLog(curDay, curBlock, it.ex);
    const nd = (lg.done || []).filter(Boolean).length;
    const ss = o.s || p.s;
    entries.push({ name:o.name || exName(EX[it.ex]), alvo:ss + '×' + dtxt(o.r || p.r),
      w:lg.w || '', reps:lg.r || '', done:nd + '/' + (parseInt(ss,10) || 0), note:lg.note || '' });
  });
  (STATE.custom[curDay] || []).forEach(c=>{
    const lg = getLog(curDay, curBlock, 'c' + c.id);
    const nd = (lg.done || []).filter(Boolean).length;
    entries.push({ name:c.name, alvo:(c.s || '') + '×' + (c.r || ''),
      w:lg.w || '', reps:lg.r || '', done:nd + '/' + (parseInt(c.s,10) || 0), note:lg.note || '' });
  });
  if(!entries.some(e=> e.w || e.reps || e.note)){ toast(t('ts_needlog')); return; }

  STATE.sessions.unshift({ id: nextId(), date: new Date().toISOString(),
    dayName: L(d.name), block: L(BLOCKS.find(b=> b.k === curBlock).t), entries });
  saveState();
  toast(t('ts_sess'));
  go('home');
}

/* =========================================================================
   ROUTER
   ========================================================================= */
function go(v, dayId){
  view = v;
  if(v === 'train' && dayId) curDay = dayId;
  openCard = null;
  rerender();
  window.scrollTo({ top:0, behavior:'smooth' });
}
function rerender(){
  normState();
  /* A malformed day or a corrupt imported state should surface a message, not
     a blank screen — the pre-redesign app guarded renderDay the same way. */
  try{
    if(view === 'train') renderTrain();
    else if(view === 'goals') renderGoals();
    else if(view === 'profile') renderProfile();
    else renderHome();
  }catch(err){
    setHTML('view', `<div class="screen wrap"><div class="note mt6">${ICONS.info}
      <div><b>${t('tr_err')}</b><br><span class="u-mut" style="font-size:var(--t-xs)">${esc(err && err.message || err)}</span></div>
    </div></div>`);
    if(window.console) console.error('render failed', err);
  }
  document.querySelectorAll('.tab').forEach(b=> b.classList.toggle('is-on', b.dataset.a1 === view));
}
function boot(){
  applyTheme();
  if(needsOnboarding()){ obStep = 0; renderOnboarding(); return; }
  el('onboard').classList.add('hidden');
  syncScrollLock();
  rerender();
}

/* =========================================================================
   ACTIONS (click)
   ========================================================================= */
const ACTIONS = {
  /* nav */
  nav:        (el2,v)=> go(v),
  opentrain:  (el2,id)=> go('train', parseInt(id,10)),
  gotogoals:  ()=> go('goals'),
  gotoprofile:()=> go('profile'),
  setday:     (el2,id)=>{ curDay = parseInt(id,10); openCard = null; renderTrain(); window.scrollTo({top:0,behavior:'smooth'}); },
  setblock:   (el2,k)=>{ curBlock = k; renderTrain(); },
  theme:      ()=> toggleTheme(),
  lang:       (el2,l)=> setLang(l),

  /* exercise card */
  toggleex:     (el2,i)=>{ i = parseInt(i,10); openCard = openCard === i ? null : i; renderTrain(); },
  togglecustom: (el2,id)=>{ const k = 'c' + id; openCard = openCard === k ? null : k; renderTrain(); },
  settab:       (el2,i,k)=>{ i = parseInt(i,10); openTab[i] = k; openCard = i; renderTrain(); },
  toggleset:    (btn,exId,k)=>{
    const lg = getLog(curDay, curBlock, exId);
    const arr = (lg.done || []).slice();
    k = parseInt(k,10);
    arr[k] = !arr[k];
    setLog(curDay, curBlock, exId, { done:arr });
    btn.classList.toggle('is-on');   /* no re-render: keeps scroll and focus */
  },

  /* inline video — the iframe plays, the API only reports errors */
  playvid: (box, vid, poster)=>{
    const host = box.closest('.vplayer') || box;
    const label = host.getAttribute('data-label') || '';
    /* While a player is mounted the host must stop being a play button: a tap
       on the loading strip used to restart the whole load and reset its
       deadline, which is one of the ways "it never opens" was reached. */
    host.removeAttribute('data-act');
    host.classList.add('is-playing');
    host.innerHTML = `<div class="vplayer__loading">${t('e_video_loading')}</div>
      <iframe class="vplayer__frame" src="${esc(ytEmbedSrc(vid))}" title="${esc(label)}"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <button class="vplayer__close" type="button" data-act="closevid"
        aria-label="${t('e_video_close')}">${ICONS.close}</button>`;
    const frame = host.querySelector('iframe');
    let settled = false;
    /* `is-playing` is dropped by closevid, so it doubles as "this attempt is
       still the current one" — without it a deadline or a late onError could
       paint a failure over a card the user already closed. */
    const live = ()=> host.classList.contains('is-playing') && frame.isConnected;
    const watchdog = setTimeout(()=>{
      if(settled || !live()) return;
      settled = true;
      videoFail(host, vid, poster, t('e_video_fail'));
    }, 10000);
    /* `load` fires for the frame itself, with no round-trip to the API — this
       is what guarantees the placeholder always comes down. */
    frame.addEventListener('load', ()=>{
      settled = true;
      clearTimeout(watchdog);
      const wait = host.querySelector('.vplayer__loading');
      if(wait) wait.remove();
    });
    /* No IFrame API here on purpose — see ytEmbedSrc(). Telling a deleted video
       apart from a slow one is worth something, but not worth a player that
       only works once per page load. That answer now lives in the video
       self-test (Profile → Settings), which builds its own players off-card and
       destroys each one before starting the next. */
  },

  /* Close the video and put the poster back. Rebuilt in place, without a
     re-render, so the card keeps its scroll position and any typed log. */
  closevid: (btn)=>{
    const host = btn.closest('.vplayer');
    if(!host) return;
    const vid = host.getAttribute('data-a1');
    const poster = host.getAttribute('data-a2');
    const label = host.getAttribute('data-label') || '';
    host.classList.remove('is-playing');
    host.setAttribute('data-act', 'playvid');
    host.innerHTML = videoPoster(vid, poster, label);
  },

  /* exercises: add / edit / remove */
  /* O âmbito volta sempre a 'me' ao abrir. Publicar para toda a gente tem de
     ser um gesto deliberado, não a herança da última vez. */
  catseed: ()=> seedCatalog(),

  /* Diagnóstico de partilha de imagem: corre o caminho real contra a base e
     mostra passo a passo o que acontece — prova (ou desmascara) o "para todos". */
  imgdiag: async (btn)=>{
    if(btn) btn.disabled = true;
    toast(t('sh_diag_run'));
    let steps = [];
    try{ steps = await runImageDiagnostic(); }
    catch(e){ steps = [{ step:'erro inesperado', ok:false, detail:String(e) }]; }
    if(btn) btn.disabled = false;
    const rows = steps.map(s=> `<div class="row">
        <span style="font-size:1.1rem;line-height:1">${s.ok ? '✅' : '❌'}</span>
        <div class="row__t"><p class="row__n">${esc(s.step)}</p>
          ${s.detail ? `<p class="row__s" style="word-break:break-all">${esc(s.detail)}</p>` : ''}</div>
      </div>`).join('');
    const allOk = steps.length && steps.every(s=> s.ok);
    openSheet(t('sh_diag'), `
      <p class="u-mut" style="margin:0 0 var(--s3);font-size:var(--t-sm)">
        ${allOk ? t('sh_diag_pass') : t('sh_diag_fail')}</p>
      <div class="rows">${rows}</div>`, `
      <button class="btn btn--acc" data-act="closesheet">${t('b_close')}</button>`);
  },

  exscope: (btn, scope)=>{
    exScope = scope;
    const seg = btn.parentNode;
    Array.prototype.forEach.call(seg.children, b=> b.classList.toggle('is-on', b === btn));
    const hint = el('exScopeHint');
    if(hint) hint.textContent = t(scope === 'all' ? 'sh_scope_all' : 'sh_scope_me');
  },

  /* Repor a foto automática: marca o reset e mostra já a foto que o auto-match
     devolveria, para a pré-visualização não mentir. Não re-renderiza o sheet. */
  exphotoreset: ()=>{
    exPhotoReset = true; exPhotoDraft = null; exPhotoDraftPath = null;
    const img = el('exPhotoImg');
    if(!img) return;
    const inp = document.querySelector('#fExPhoto input[type="file"]');
    const key = inp && inp.dataset.a1;
    img.src = (key && EX[key])
      ? exPhoto(key)
      : customPhoto({ name: fieldVal('exName'), eq: fieldVal('exEq') });
  },

  exadd: ()=>{
    exScope = SHARED.ready ? 'all' : 'me'; exPhotoDraft = null; exPhotoDraftPath = null; exPhotoReset = false;
    openSheet(t('m_add'), exFormHTML({}, { photoKey:'new', photo:customPhoto({}) }), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="exsave" data-a1="add">${t('b_save')}</button>`);
  },
  exeditcustom: (el2,id)=>{
    const c = (STATE.custom[curDay] || []).find(x=> x.id === parseInt(id,10));
    if(!c) return;
    exScope = SHARED.ready ? 'all' : 'me'; exPhotoDraft = null; exPhotoDraftPath = null; exPhotoReset = false;
    openSheet(t('m_edit'), exFormHTML(c, { isEdit:true, photoKey:'c'+c.id, photo:customPhoto(c) }), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="exsave" data-a1="custom" data-a2="${c.id}">${t('b_save')}</button>`);
  },
  exeditbuilt: (el2,exId)=>{
    const e = EX[exId];
    const it = DAYS.find(d=> d.id === curDay).items.find(x=> x.ex === exId);
    const b = it[curBlock];
    const o = STATE.ovr[curDay + ':' + exId] || {};
    exScope = SHARED.ready ? 'all' : 'me'; exPhotoDraft = null; exPhotoDraftPath = null; exPhotoReset = false;
    openSheet(t('m_edit'), exFormHTML({
      name:o.name || exName(e), eq:o.eq || L(e.eq), s:o.s || b.s,
      r:o.r || dtxt(b.r), l:o.l || dtxt(b.l), rest:o.rest || b.rest,
      /* Prefill the current video so an edit that leaves this field untouched
         keeps it — an override's own video first, else the built-in's YT id
         (ytId() accepts a bare 11-char id). */
      vid:o.vid || VIDEOS[exId] || ''
    }, { isEdit:true, photoKey:exId, photo:exPosterFor(exId) }), `<button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="exsave" data-a1="builtin" data-a2="${esc(exId)}">${t('b_save')}</button>`);
  },
  exsave: async (el2, mode, id)=>{
    const name = fieldVal('exName');
    if(!name){ toast(t('ts_needname')); return; }
    /* A demo video is required only when CREATING an exercise — every new one
       should ship with a way to see it done. Editing is a PATCH: the video is
       optional, an untouched field keeps the current video, and a field the
       user cleared reverts to the built-in default. A broken link is never
       saved, in any mode. */
    const raw = fieldVal('exVid');
    const vid = ytId(raw);
    const vf = el('fExVid');
    if(mode === 'add'){
      if(!raw){ if(vf) vf.classList.add('is-bad'); toast(t('m_video_req')); return; }
      if(!vid){ if(vf) vf.classList.add('is-bad'); toast(t('m_video_bad')); return; }
    } else if(raw && !vid){
      if(vf) vf.classList.add('is-bad'); toast(t('m_video_bad')); return;
    }
    if(vf) vf.classList.remove('is-bad');
    const obj = { name, eq:fieldVal('exEq'), s:fieldVal('exSets'),
      r:fieldVal('exReps'), l:fieldVal('exLoad'), rest:fieldVal('exRest') };
    /* Only carry the video when one was actually provided, so a blank field on
       edit does not wipe the existing video. */
    if(vid) obj.vid = vid;

    /* The photo is always private, independent of the me/all toggle — persist
       it up-front so it survives even when the prescription is published. */
    applyPhotoOverride(mode, id);

    /* Para toda a gente: a alteração vai à nuvem e volta pelo realtime.
       Nada é escrito no estado privado — se a escrita falhar ou colidir, o
       sheet fica aberto com o que a pessoa escreveu, para não se perder. */
    if(exScope === 'all' && SHARED.ready){
      let res;
      if(mode === 'builtin'){
        const patch = { ...langPatchName(id, name), ...langPatchEq(id, obj.eq), status:'published' };
        /* omit video_id when blank so an edit that left it alone keeps the
           shared row's current video instead of nulling it */
        if(vid) patch.video_id = vid;
        res = await saveSharedExercise(id, patch);
        /* A foto que vai para toda a gente: a acabada de enviar (exPhotoDraft)
           ou, se não mexeu na foto agora, a que já estava no ovr privado. Reset
           explícito não publica nada. Calculada ANTES de gravar o item para
           viajar DENTRO dele — o canal fiável que já chega a toda a gente. */
        const photoUrl = exPhotoReset ? ''
          : (exPhotoDraft || (STATE.ovr[curDay + ':' + id] && STATE.ovr[curDay + ':' + id].photo) || '');
        if(res.ok) res = await patchSharedItem(curDay, id, curBlock,
          { s:obj.s, r:obj.r, l:obj.l, rest:obj.rest },
          photoUrl ? { photo: photoUrl } : null);
        if(res.ok){
          /* O plano partilhado passa a ser a fonte de verdade deste exercício.
             Um override privado (s/r/l/rest/name/eq) que tivesse ficado de uma
             edição "só eu" anterior tapava esta alteração no exCard() e fazia a
             edição parecer que "voltava ao início". Limpa-o — guarda só a foto,
             que continua privada como feedback imediato. Sem foto, remove o
             registo por inteiro. */
          const okey = curDay + ':' + id, oprev = STATE.ovr[okey];
          if(oprev){
            if(oprev.photo) STATE.ovr[okey] = { photo: oprev.photo };
            else delete STATE.ovr[okey];
            saveState();
          }
          /* ...e publica a foto PARA TODA A GENTE (regista em exercise_images +
             liga image_slug). Não é fatal: o texto/vídeo já foram; se falhar,
             avisa mas deixa o save fechar na mesma. */
          if(photoUrl){
            const ppath = (photoUrl === exPhotoDraft) ? exPhotoDraftPath : null;
            const pr = await linkSharedPhoto(id, photoUrl, ppath);
            if(pr.skipped) toast('⚠ ' + t('sh_img_local'));
            else if(!pr.ok) toast(pr.msg ? ('⚠ ' + pr.msg) : t('sh_offline'));
          }
        }
      } else {
        /* A foto do autor viaja com o exercício, mas SEMPRE em privado: fica no
           ovr do próprio, com a chave (slug) que publishExercise devolve. Sem
           isto, um exercício novo publicado perdia a foto e o cartão caía na foto
           de padrão do sistema — o "gerou uma foto que eu não escolhi". Um custom
           promovido leva a foto que já tinha, se não a mudou agora. */
        const cRec = mode === 'custom'
          ? (STATE.custom[curDay] || []).find(x=> x.id === parseInt(id,10)) : null;
        const carryPhoto = exPhotoReset ? '' : (exPhotoDraft || (cRec && cRec.photo) || '');
        res = await publishExercise(obj, curDay, curBlock, carryPhoto);
        if(res.ok){
          if(res.key && carryPhoto){
            STATE.ovr[curDay + ':' + res.key] =
              Object.assign({}, STATE.ovr[curDay + ':' + res.key], { photo: carryPhoto });
            /* publica a foto PARA TODA A GENTE — sem isto o exercício novo
               aparecia sem imagem a toda a gente menos ao autor. Não fatal. */
            const cpath = (carryPhoto === exPhotoDraft) ? exPhotoDraftPath : null;
            const pr = await linkSharedPhoto(res.key, carryPhoto, cpath);
            if(pr.skipped) toast('⚠ ' + t('sh_img_local'));
            else if(!pr.ok) toast(pr.msg ? ('⚠ ' + pr.msg) : t('sh_offline'));
          }
          /* promovido: a cópia privada sairia a dobrar na lista do dia */
          if(mode === 'custom'){
            STATE.custom[curDay] = (STATE.custom[curDay] || []).filter(x=> x.id !== parseInt(id,10));
          }
          saveState();
        }
      }
      if(!reportShared(res)) return;
      closeSheet(); renderTrain();
      return;
    }

    if(mode === 'add'){
      if(!STATE.custom[curDay]) STATE.custom[curDay] = [];
      const rec = Object.assign({ id: nextId() }, obj);
      if(exPhotoDraft && !exPhotoReset) rec.photo = exPhotoDraft;
      STATE.custom[curDay].push(rec);
    } else if(mode === 'custom'){
      const c = (STATE.custom[curDay] || []).find(x=> x.id === parseInt(id,10));
      if(c) Object.assign(c, obj);   /* obj has no photo key; c.photo (set above) survives */
    } else if(mode === 'builtin'){
      /* merge, not replace, so the photo applyPhotoOverride() set is not lost —
         the form prefills every prescription field, so merging still overwrites
         them all with the current values. */
      STATE.ovr[curDay + ':' + id] = Object.assign({}, STATE.ovr[curDay + ':' + id], obj);
    }
    saveState(); closeSheet(); renderTrain(); toast(t('ts_saved'));
  },
  exdelcustom: (el2,id)=>{
    if(!confirm(t('g_del_c'))) return;
    STATE.custom[curDay] = (STATE.custom[curDay] || []).filter(x=> x.id !== parseInt(id,10));
    saveState(); renderTrain(); toast(t('ts_deleted'));
  },
  /* Remover: agora TUDO é público. Com o catálogo ligado, remover tira o
     exercício do dia partilhado para toda a gente (removeSharedItem), com uma
     confirmação porque afeta todos. Sem catálogo, esconde só localmente. */
  exremove: (el2,exId)=>{
    if(!SHARED.ready){
      STATE.hidden[curDay + ':' + exId] = true;
      saveState(); renderTrain(); toast(t('ts_removed'));
      return;
    }
    if(!confirm(t('rm_scope_hint'))) return;
    ACTIONS.exremoveall(el2, exId);
  },
  exremoveme: (el2,exId)=>{
    STATE.hidden[curDay + ':' + exId] = true;
    saveState(); closeSheet(); renderTrain(); toast(t('ts_removed'));
  },
  exremoveall: async (btn,exId)=>{
    if(btn) btn.disabled = true;
    const res = await removeSharedItem(curDay, exId);
    if(btn) btn.disabled = false;
    if(!reportShared(res)) return;
    closeSheet(); renderTrain();
  },
  restorehidden: ()=>{
    DAYS.find(x=> x.id === curDay).items.forEach(it=>{ delete STATE.hidden[curDay + ':' + it.ex]; });
    saveState(); renderTrain(); toast(t('ts_restored'));
  },
  /* Reordenar: troca o cartão com o vizinho na ordem PESSOAL do dia e guarda a
     sequência inteira de chaves visíveis em STATE.order[dia]. Trabalha sobre a
     mesma lista fundida que o render (orderedEntries), por isso built-ins e
     exercícios próprios movem-se na mesma sequência. Privado — cada um tem a sua
     ordem; não toca no catálogo partilhado. */
  exmove: (btn, key, dir)=>{
    const keys = orderedEntries(curDay).map(e=> e.key);
    const idx = keys.indexOf(key);
    if(idx < 0) return;
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if(j < 0 || j >= keys.length) return;         /* já no topo/fim */
    const tmp = keys[idx]; keys[idx] = keys[j]; keys[j] = tmp;
    STATE.order = STATE.order || {};
    STATE.order[curDay] = keys;
    saveState(); renderTrain();
    /* mantém o cartão movido à vista depois do re-render */
    const moved = document.querySelector('[data-act="exmove"][data-a1="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
    if(moved && moved.scrollIntoView) moved.scrollIntoView({ block:'center', behavior:'smooth' });
  },
  savesession: ()=> saveSession(),

  /* community — writes live in community.js; these just gather input, call,
     and repaint. rerender() after our own write shows the result and clears
     the field the user typed in. */
  cpostnote: async (btn)=>{
    const body = (el('cBody') || {}).value || '';
    if(!body.trim()){ toast(t('ts_needname')); return; }
    btn.disabled = true;
    const res = await postToCommunity({ kind:'note', body });
    btn.disabled = false;
    if(!res.ok){ toast(t(res.reason === 'empty' ? 'ts_needname' : 'cm_err')); return; }
    toast(t('cm_posted')); if(view === 'home') rerender();
  },
  cpostgoal: async (btn)=>{
    const goal = goalSnapshot();
    if(!goal){ toast(t('cm_err')); return; }
    btn.disabled = true;
    const res = await postToCommunity({ kind:'goal', body:(el('cBody')||{}).value || '', goal });
    btn.disabled = false;
    if(!res.ok){ toast(t('cm_err')); return; }
    toast(t('cm_posted')); if(view === 'home') rerender();
  },
  /* open/close the emoji palette for a post (pure re-render, nothing typed to lose) */
  creactopen: (btn, id)=>{ commReactFor = (commReactFor === id ? null : id); if(view === 'home') rerender(); },
  /* toggle one emoji reaction on a post, then close the palette */
  creact: async (btn, id, emoji)=>{
    btn.disabled = true;
    const res = await toggleReaction(id, emoji);
    btn.disabled = false;
    if(!res.ok){ toast(t('cm_err')); return; }
    commReactFor = null;
    if(view === 'home') rerender();
  },
  caddcomment: async (btn, id)=>{
    const inp = el('ccm_' + id);
    const body = inp ? inp.value : '';
    if(!body.trim()){ return; }
    btn.disabled = true;
    const res = await commentOnPost(id, body);
    btn.disabled = false;
    if(!res.ok){ toast(t(res.reason === 'empty' ? 'ts_needname' : 'cm_err')); return; }
    if(view === 'home') rerender();
  },
  cdelpost: async (btn, id)=>{
    if(!confirm(t('cm_del_confirm'))) return;
    const res = await softDeleteCommunity('post', id);
    if(!res.ok){ toast(t('cm_err')); return; }
    if(view === 'home') rerender();
  },
  cdelcomment: async (btn, id)=>{
    if(!confirm(t('cm_del_confirm'))) return;
    const res = await softDeleteCommunity('comment', id);
    if(!res.ok){ toast(t('cm_err')); return; }
    if(view === 'home') rerender();
  },
  /* edit own post / comment — inline. Enter edit mode is a pure re-render;
     the guard in onCommunityRefreshed keeps realtime from wiping the editor. */
  cpeditpost: (btn, id)=>{ commEditComment = null; commEditPost = id; hideMentionBox(); if(view === 'home') rerender(); },
  cpcanceledit: ()=>{ commEditPost = null; if(view === 'home') rerender(); },
  cpsavepost: async (btn, id)=>{
    const node = el('cedit_p_' + id);
    const body = node ? node.value : '';
    if(!body.trim()){ toast(t('ts_needname')); return; }
    btn.disabled = true;
    const res = await updatePost(id, body);
    btn.disabled = false;
    if(!res.ok){ toast(t(res.reason === 'empty' ? 'ts_needname' : 'cm_err')); return; }
    commEditPost = null; toast(t('cm_edited')); if(view === 'home') rerender();
  },
  ccmtedit: (btn, id)=>{ commEditPost = null; commEditComment = id; hideMentionBox(); if(view === 'home') rerender(); },
  ccmtcancel: ()=>{ commEditComment = null; if(view === 'home') rerender(); },
  ccmtsave: async (btn, id)=>{
    const node = el('cedit_c_' + id);
    const body = node ? node.value : '';
    if(!body.trim()){ toast(t('ts_needname')); return; }
    btn.disabled = true;
    const res = await updateComment(id, body);
    btn.disabled = false;
    if(!res.ok){ toast(t(res.reason === 'empty' ? 'ts_needname' : 'cm_err')); return; }
    commEditComment = null; toast(t('cm_edited')); if(view === 'home') rerender();
  },
  /* hashtags: tap a #tag to filter the feed; clear to show all */
  ctag: (btn, tag)=>{ commTagFilter = tag || null; hideMentionBox(); if(view === 'home') rerender(); },
  ctagclear: ()=>{ commTagFilter = null; if(view === 'home') rerender(); },
  /* @mention: insert the picked member into the field the dropdown belongs to */
  cmentionpick: (btn, handle, fieldId)=> insertMention(fieldId, handle),

  /* goals */
  goalnew: ()=>{
    openSheet(t('g_new'), goalForm(null), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="goalsave">${t('b_save')}</button>`);
  },
  goaledit: (el2,id)=>{
    const g = getGoal(parseInt(id,10));
    if(!g) return;
    openSheet(t('g_edit'), goalForm(g), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="goalsave" data-a1="${g.id}">${t('b_save')}</button>`);
  },
  goalsave: (el2,id)=>{
    const data = readGoalForm();
    if(!data.title){ toast(t('ts_needname')); return; }
    let justHit = false;
    if(id){ const r = updateGoal(parseInt(id,10), data); justHit = r && r.justHit; }
    else { const g = addGoal(data); justHit = !!g.hitAt; }
    closeSheet(); rerender();
    toast(justHit ? t('ts_goalhit') : t('ts_saved'));
  },
  goalprog: (el2,id)=>{
    const g = getGoal(parseInt(id,10));
    if(!g) return;
    openSheet(t('g_update_t'), `
      <p class="u-mut" style="font-size:var(--t-sm);margin-bottom:var(--s4)">${esc(g.title)}</p>
      <label class="field"><span class="field__l">${t('g_f_current')} (${esc(g.unit || '')})</span>
        <input class="input" id="gpVal" inputmode="decimal" value="${esc(g.current)}" autofocus></label>
      <div class="pbar"><i class="pbar__f" style="width:${goalPct(g)}%"></i></div>
      <div class="pbar__cap"><span>${esc(g.start)}${esc(g.unit)}</span><span>${esc(g.target)}${esc(g.unit)}</span></div>`,
      `<button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
       <button class="btn btn--acc" data-act="goalprogsave" data-a1="${g.id}">${t('b_update')}</button>`);
  },
  goalprogsave: (el2,id)=>{
    const r = updateGoal(parseInt(id,10), { current: fieldVal('gpVal') });
    closeSheet(); rerender();
    toast(r && r.justHit ? t('ts_goalhit') : t('ts_saved'));
  },
  goaldel: (el2,id)=>{
    if(!confirm(t('g_del_c'))) return;
    delGoal(parseInt(id,10)); rerender(); toast(t('ts_deleted'));
  },

  /* trainers */
  trainernew: ()=>{
    openSheet(t('c_new'), trainerForm(null), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="trainersave">${t('b_save')}</button>`);
  },
  traineredit: (el2,id)=>{
    const c = getTrainer(parseInt(id,10));
    if(!c) return;
    openSheet(t('c_edit'), trainerForm(c), `
      <button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
      <button class="btn btn--acc" data-act="trainersave" data-a1="${c.id}">${t('b_save')}</button>`);
  },
  trainersave: (el2,id)=>{
    const data = readTrainerForm();
    if(!data.name){ toast(t('ts_needname')); return; }
    if(id) updateTrainer(parseInt(id,10), data); else addTrainer(data);
    closeSheet(); rerender(); toast(t('ts_saved'));
  },
  trainerdel: (el2,id)=>{
    if(!confirm(t('c_del_c'))) return;
    delTrainer(parseInt(id,10)); rerender(); toast(t('ts_deleted'));
  },
  trsessnew: (el2,id)=>{
    openSheet(t('c_sess_add'), `
      <label class="field"><span class="field__l">${t('c_sess_date')}</span>
        <input class="input" id="tsDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
      <label class="field"><span class="field__l">${t('c_sess_note')}</span>
        <textarea class="textarea" id="tsNote"></textarea></label>`,
      `<button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
       <button class="btn btn--acc" data-act="trsesssave" data-a1="${id}">${t('b_save')}</button>`);
  },
  trsesssave: (el2,id)=>{
    addTrainerSession(parseInt(id,10), { date: fieldVal('tsDate'), note: fieldVal('tsNote') });
    closeSheet(); rerender(); toast(t('ts_saved'));
  },
  trsessdel: (el2,tid,sid)=>{
    /* same guard as trainerdel: there is no undo for either, and a logged
       session is a real record, not a draft. */
    if(!confirm(t('c_del_s'))) return;
    delTrainerSession(parseInt(tid,10), parseInt(sid,10)); rerender(); toast(t('ts_deleted'));
  },

  /* profile */
  profedit: ()=>{
    const p = STATE.profile;
    openSheet(t('pr_edit'), `
      <label class="field"><span class="field__l">${t('pf_name')}</span>
        <input class="input" id="pName" value="${esc(p.name)}"></label>
      <div class="field"><span class="field__l">${t('pf_photo')}</span>
        <div class="ppick" id="pPhoto">${COACH_PRESETS.map(f=>`
          <button type="button" class="ppick__o ${((p.photo || COACH_PRESETS[0]) === f) ? 'is-on' : ''}"
            data-act="pickphoto" data-a1="pPhoto" data-a2="${f}">
            <img src="${coachPhoto(f)}" alt=""></button>`).join('')}</div></div>
      <div class="grid2" style="margin-bottom:var(--s4)">
        <label class="field"><span class="field__l">${t('pf_wstart')}</span>
          <input class="input" id="pWStart" inputmode="decimal" value="${esc(p.weightStart)}"></label>
        <label class="field"><span class="field__l">${t('pf_wcur')}</span>
          <input class="input" id="pWCur" inputmode="decimal" value="${esc(p.weightCurrent)}"></label>
      </div>
      <div class="grid2" style="margin-bottom:var(--s4)">
        <label class="field"><span class="field__l">${t('pf_wtarget')}</span>
          <input class="input" id="pWTar" inputmode="decimal" value="${esc(p.weightTarget)}"></label>
        <label class="field"><span class="field__l">${t('pf_height')}</span>
          <input class="input" id="pH" inputmode="numeric" value="${esc(p.heightCm)}"></label>
      </div>
      <div class="field"><span class="field__l">${t('pf_days')}</span>
        <div class="hscroll" id="pDays">${DAYS.map(d=>`
          <button type="button" class="chip ${(p.trainingDays||[]).indexOf(d.id) > -1 ? 'is-on' : ''}"
            data-act="toggleday" data-a1="pDays" data-a2="${d.id}">${L(d.wd)}</button>`).join('')}</div></div>`,
      `<button class="btn btn--ghost" data-act="closesheet">${t('b_cancel')}</button>
       <button class="btn btn--acc" data-act="profsave">${t('b_save')}</button>`);
  },
  profsave: ()=>{
    const box = el('pPhoto'), on = box && box.querySelector('.ppick__o.is-on');
    const daysBox = el('pDays');
    updateProfile({
      name: fieldVal('pName'),
      photo: on ? on.dataset.a2 : '',
      weightStart: fieldVal('pWStart'),
      weightCurrent: fieldVal('pWCur'),
      weightTarget: fieldVal('pWTar'),
      heightCm: fieldVal('pH'),
      trainingDays: daysBox ? [...daysBox.querySelectorAll('.chip.is-on')].map(b=> parseInt(b.dataset.a2,10)) : STATE.profile.trainingDays
    });
    closeSheet(); rerender(); toast(t('ts_saved'));
  },

  /* history */
  hiedit:      (el2,id)=>{ editSid = parseInt(id,10); rerender(); },
  hicloseedit: ()=>{ editSid = null; saveState(); rerender(); toast(t('ts_changes')); },
  hidel:       (el2,id)=>{
    if(!confirm(t('hi_del_c'))) return;
    const n = parseInt(id,10);
    deleteSession(n); if(editSid === n) editSid = null; rerender(); toast(t('ts_deleted'));
  },

  /* settings */
  export:  ()=> exportData(),
  import:  ()=> el('importFile').click(),
  signout: ()=> authSignOut(),

  /* form widgets */
  pickphoto: (btn, boxId)=>{
    const box = el(boxId);
    if(box) box.querySelectorAll('.ppick__o').forEach(o=> o.classList.remove('is-on'));
    btn.classList.add('is-on');
  },
  toggleday:    (btn)=> btn.classList.toggle('is-on'),
  toggleswitch: (btn)=> btn.classList.toggle('is-on'),

  /* onboarding */
  obnext: ()=>{
    obCollect();
    const box = el('obPhoto'), on = box && box.querySelector('.ppick__o.is-on');
    if(on) obDraft.photo = on.dataset.a2;
    if(obStep === OB_STEPS.length - 1){ obFinish(); return; }
    obStep++; renderOnboarding();
  },
  obback: ()=>{ obCollect(); if(obStep > 0) obStep--; renderOnboarding(); },
  obskip: ()=>{ obCollect(); obFinish(); },

  /* sheet */
  /* Closing the sheet has to stop the run, or a cancelled test keeps probing
     YouTube in the background for another forty videos. */
  closesheet: ()=>{ vtStop(); closeSheet(); },

  vidtest: ()=> vtSheet(),
  vtrun:   ()=> vtStart(),

  /* rest timer — never re-renders, so a set in progress is never disturbed */
  rest:     (btn, secs, name)=> rtStart(parseInt(secs, 10) || 90, name),

  /* the user's own rest time, per exercise */
  restedit: (btn, exId, planSecs)=> restSheet(exId, parseInt(planSecs, 10) || 90),
  restpick: (btn, secs)=>{
    /* Sets the field and flips its own classes — no re-render, or the number
       the user is halfway through typing would vanish. */
    const f = el('restVal');
    if(f) f.value = secs;
    const wrap = btn.parentNode;
    Array.prototype.forEach.call(wrap.children, b=> b.classList.toggle('is-on', b === btn));
  },
  restsave: (btn, exId)=>{
    const raw = parseInt(fieldVal('restVal'), 10);
    if(!isFinite(raw) || raw < 5){ toast(t('rs_bad')); return; }
    STATE.restSec[exId] = Math.min(900, raw);
    saveState();
    closeSheet();
    rerender();
    toast(t('rs_saved') + ' ' + rtFmt(STATE.restSec[exId]));
  },
  restreset: (btn, exId)=>{
    delete STATE.restSec[exId];
    saveState();
    closeSheet();
    rerender();
    toast(t('rs_reset_ok'));
  },
  rtadd:    (btn, s)=> rtAdd(s),
  rttoggle: ()=> rtToggle(),
  rtstop:   ()=> rtStop(),

  /* gate (static markup keeps data-act too, so one dispatcher serves both) */
  authin:    ()=> authSignIn(),
  authup:    ()=> authSignUp(),
  authreset: ()=> authReset(),
  setauth:   (el2,v)=> setAuth(v),
  geye:      (btn,id)=> gEye(id, btn)
};

function exFormHTML(c, opts){
  opts = opts || {};
  const isEdit = !!opts.isEdit;
  const photoKey = esc(opts.photoKey || 'ex');
  const poster = esc(opts.photo || '');
  return `<label class="field"><span class="field__l">${t('m_name')}</span>
      <input class="input" id="exName" value="${esc(c.name || '')}" placeholder="${t('m_name_ph')}"></label>
    <label class="field"><span class="field__l">${t('m_eq')}</span>
      <input class="input" id="exEq" value="${esc(c.eq || '')}" placeholder="${t('m_eq_ph')}"></label>
    <div class="grid2" style="margin-bottom:var(--s4)">
      <label class="field"><span class="field__l">${t('m_sets')}</span>
        <input class="input" id="exSets" inputmode="numeric" value="${esc(c.s || '')}" placeholder="3"></label>
      <label class="field"><span class="field__l">${t('m_reps')}</span>
        <input class="input" id="exReps" value="${esc(c.r || '')}" placeholder="10-12"></label>
    </div>
    <div class="grid2" style="margin-bottom:var(--s4)">
      <label class="field"><span class="field__l">${t('m_load')}</span>
        <input class="input" id="exLoad" value="${esc(c.l || '')}" placeholder="${t('m_load_ph')}"></label>
      <label class="field"><span class="field__l">${t('m_rest')}</span>
        <input class="input" id="exRest" value="${esc(c.rest || '')}" placeholder="${t('m_rest_ph')}"></label>
    </div>
    <div class="field" id="fExVid">
      <span class="field__l">${t('m_video')}</span>
      <input class="input" id="exVid" value="${esc(c.vid || '')}" placeholder="${t('m_video_ph')}">
      <span class="field__hint">${t(isEdit ? 'm_video_opt' : 'm_video_hint')}</span>
      <span class="field__err">${t('m_video_bad')}</span>
    </div>
    <div class="field" id="fExPhoto">
      <span class="field__l">${t('m_photo')}</span>
      <div class="exphoto">
        <span class="exphoto__thumb"><img id="exPhotoImg" src="${poster}" alt=""></span>
        <div class="exphoto__ctrl">
          <label class="btn btn--ghost btn--sm exphoto__pick">${t('m_photo_change')}
            <input type="file" accept="image/*" data-inp="exphoto" data-a1="${photoKey}" hidden></label>
          <button type="button" class="btn btn--ghost btn--sm" data-act="exphotoreset">${t('m_photo_reset')}</button>
        </div>
      </div>
      <span class="field__hint">${t('m_photo_hint')}</span>
    </div>
    ${scopeFieldHTML()}`;
}

/* Estado do catálogo partilhado, e o botão de o arrancar enquanto está vazio.
   Dizer só "ao vivo" não chega: sem a contagem não se distingue "ligado e
   sincronizado" de "ligado a uma base vazia". */
function catalogRowHTML(){
  const n = Object.keys(SHARED.ex).length;
  const d = Object.keys(SHARED.days).length;
  let sub, btn = '';
  if(!SHARED.ready)   sub = t('sh_cat_off');
  else if(!n && !d){  sub = t('sh_cat_empty');
                      btn = `<button class="btn btn--acc btn--sm" data-act="catseed">${t('sh_publish')}</button>`; }
  else sub = t('sh_cat_live').replace('%e', n).replace('%d', d);

  /* Diagnóstico de partilha de imagem: prova, no dispositivo real e contra a base
     real, se uma foto publicada "para todos" chega mesmo a outra conta — e, se não
     chegar, diz PORQUÊ (RLS, permissão, coluna). Só quando o catálogo está ligado. */
  const diag = SHARED.ready
    ? `<button class="btn btn--ghost btn--sm" data-act="imgdiag">${t('sh_diag')}</button>` : '';

  return `<div class="switch">
      <div><p class="switch__t">${t('sh_cat')}</p><p class="switch__s">${esc(sub)}</p></div>
      ${btn}
    </div>
    ${diag}`;
}

/* Já não há escolha privado/público: com o catálogo ligado, TUDO o que se cria
   ou edita é para toda a gente. Em vez do toggle (que criava os "dois sistemas"
   e a confusão de coisas que só o autor via), mostra-se uma nota fixa a deixar
   claro que a alteração é partilhada. Sem catálogo ligado, fica local e não há
   nada a dizer. */
function scopeFieldHTML(){
  if(!SHARED.ready) return '';
  return `<div class="field">
      <span class="field__hint">${ICONS.info} ${t('sh_scope_all')}</span>
    </div>`;
}

/* =========================================================================
   INPUTS (input / change)
   ========================================================================= */
const INPUTS = {
  log: (node, exId, field)=> setLog(curDay, curBlock, exId, { [field]: node.value }),
  restnote: (node)=>{ STATE.restNote = node.value; saveState(); },
  chartsel: (node)=>{ chartSel = node.value; initProgChart(); },
  sessedit: (node, ref)=>{
    const [id, ix, field] = ref.split(':');
    editSessionEntry(parseInt(id,10), parseInt(ix,10), field, node.value);
  },
  /* gate: clear a field's error state as soon as the user edits it */
  gclr: (node, fieldId)=> gClr(fieldId),
  gpw:  ()=> gPw(),
  importfile: (node)=> importData(node),

  /* Foto do exercício: encolhe e envia já ao escolher o ficheiro, e troca a
     miniatura para feedback imediato. O URL fica em espera até Guardar. */
  exphoto: async (node, key)=>{
    const file = node.files && node.files[0];
    if(!file) return;
    if(file.size > 8 * 1024 * 1024){ toast(t('m_photo_big')); node.value = ''; return; }
    toast(t('m_photo_up'));
    const res = await uploadExercisePhoto(file, key);
    node.value = '';
    if(!res.ok){ toast(t('m_photo_err')); return; }
    exPhotoDraft = res.url; exPhotoDraftPath = res.path || null; exPhotoReset = false;
    const img = el('exPhotoImg');
    if(img) img.src = res.url;
    toast(t('m_photo_ok'));
  },

  /* @mention autocomplete — updates the shared dropdown as the user types in
     any community text field. Pure DOM, no re-render, so it never eats input. */
  cmention: (node)=> showMentions(node)
};

/* =========================================================================
   EVENT WIRING — two listeners for the whole app
   ========================================================================= */
document.addEventListener('click', e=>{
  const node = e.target.closest('[data-act]');
  if(!node) return;
  const fn = ACTIONS[node.dataset.act];
  if(!fn) return;
  fn(node, node.dataset.a1, node.dataset.a2);
});
document.addEventListener('input', e=>{
  const node = e.target.closest('[data-inp]');
  if(!node) return;
  const fn = INPUTS[node.dataset.inp];
  if(fn) fn(node, node.dataset.a1, node.dataset.a2);
});
document.addEventListener('change', e=>{
  const node = e.target.closest('[data-inp]');
  if(!node) return;
  const fn = INPUTS[node.dataset.inp];
  if(fn) fn(node, node.dataset.a1, node.dataset.a2);
});
/* Form submit (the gate). Native submit means Enter works with no extra
   keyboard handling — and no risk of firing the handler twice. */
document.addEventListener('submit', e=>{
  const form = e.target.closest('[data-submit]');
  if(!form) return;
  e.preventDefault();
  const fn = ACTIONS[form.dataset.submit];
  if(fn) fn(form);
});
/* tapping the scrim closes a sheet */
document.addEventListener('click', e=>{
  if(e.target.id === 'sheet') closeSheet();
});
/* dismiss the @mention dropdown when clicking away from it and its field */
document.addEventListener('click', e=>{
  if(typeof hideMentionBox !== 'function') return;
  const t = e.target;
  if(t.closest && (t.closest('#cmentionbox') || t.closest('[data-inp="cmention"]'))) return;
  hideMentionBox();
});
/* Esc closes an open sheet, or the mention dropdown if one is showing */
document.addEventListener('keydown', e=>{
  if(e.key !== 'Escape') return;
  const mb = document.getElementById('cmentionbox');
  if(mb && mb.style.display !== 'none'){ hideMentionBox(); return; }
  if(el('sheet').classList.contains('is-open')) closeSheet();
});

/* =========================================================================
   INIT
   ========================================================================= */
loadState()
  .then(()=>{ applyTheme(); initGate(); initCloud(); APP_READY = true; if(USER) boot(); })
  .catch(()=>{ applyTheme(); initGate(); APP_READY = true; });
