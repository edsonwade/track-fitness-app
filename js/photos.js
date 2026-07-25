/* =========================================================================
   photos.js — the single place that knows which image file goes where.

   Everything else in the app asks for a *logical* image (a movement pattern,
   a day cover, a coach avatar) and never names a file. Swapping the whole
   photo set is therefore an edit to this file plus the files in img/.

   All photography is real people from Pexels — see img/attribution.md.
   ========================================================================= */

const IMG = 'img/';

/* ---- movement patterns -------------------------------------------------
   One photo per pattern rather than per exercise: there is no well-shot
   stock photo of a "seated calf raise", and a set of weak literal matches
   reads cheaper than a set of strong pattern matches. The exact movement is
   carried by the name, the specs, the technique text and the inline video. */
const PATTERN_IMG = {
  squat:          'pat-squat.jpg',
  hinge:          'pat-hinge.jpg',
  pressFlat:      'pat-press-flat.jpg',
  pressIncline:   'pat-press-incline.jpg',
  pressOverhead:  'pat-press-overhead.jpg',
  pullVertical:   'pat-pull-vertical.jpg',
  row:            'pat-row.jpg',
  biceps:         'pat-biceps.jpg',
  triceps:        'pat-triceps.jpg',
  shoulderRaise:  'pat-shoulder-raise.jpg',
  calves:         'pat-calves.jpg',
  core:           'pat-core.jpg',
  cardioTread:    'pat-cardio-tread.jpg',
  cardioBike:     'pat-cardio-bike.jpg'
};

/* Every EX id in data.js maps to a pattern. Keep this exhaustive — an
   unmapped exercise falls back to `squat`, which is wrong but never blank. */
const EX_PATTERN = {
  /* lower — knee dominant */
  legpress: 'squat', hack: 'squat', legext: 'squat', lunge: 'squat',
  legpress_h: 'squat',
  /* lower — hip dominant */
  hipthrust: 'hinge', dbrdl: 'hinge', legcurl_seat: 'hinge', legcurl_l: 'hinge',
  /* calves */
  calf_s: 'calves', calf_seat: 'calves',
  /* chest */
  dbbench: 'pressFlat', pecdeck: 'pressFlat', incldb: 'pressIncline',
  /* shoulders */
  dbohp: 'pressOverhead', lateral: 'shoulderRaise', reardelt: 'shoulderRaise',
  /* back */
  pulldown: 'pullVertical', strarm: 'pullVertical',
  csrow: 'row', seatedrow: 'row', facepull: 'row',
  /* arms */
  dbcurl: 'biceps', hammer: 'biceps', cablecurl: 'biceps',
  pushdown: 'triceps', ohext: 'triceps', skull: 'triceps',
  cgbench: 'pressFlat', dip: 'triceps', kickback: 'triceps',
  /* core */
  plank: 'core', pallof: 'core', legraise: 'core', cablecrunch: 'core',
  birddog: 'core'
};

/* Cardio entries have their own shape in data.js, so their own mapping. */
const CARDIO_PATTERN = { treadmill: 'cardioTread', bike: 'cardioBike' };

/* ---- day covers, one per training day ---- */
const DAY_IMG = {
  1: 'day-1.jpg', 2: 'day-2.jpg', 3: 'day-3.jpg', 4: 'day-4.jpg',
  5: 'day-5.jpg', 6: 'day-6.jpg', 7: 'day-7.jpg'
};

/* ---- onboarding steps ---- */
const ONBOARD_IMG = {
  welcome: 'onboard-welcome.jpg',
  body:    'onboard-body.jpg',
  days:    'onboard-days.jpg',
  goal:    'onboard-goal.jpg',
  trainer: 'onboard-trainer.jpg'
};

/* ---- pickable presets ----
   Users choose a coach avatar / goal cover from these rather than uploading,
   which keeps the app free of file handling and of user-generated images. */
const COACH_PRESETS = ['coach-1.jpg','coach-2.jpg','coach-3.jpg','coach-4.jpg','coach-5.jpg','coach-6.jpg'];
const GOAL_PRESETS  = ['goal-1.jpg','goal-2.jpg','goal-3.jpg','goal-4.jpg','goal-5.jpg','goal-6.jpg'];

/* ---- resolvers ---------------------------------------------------------
   All return a usable path. None can return empty, so no consumer needs a
   null check and no card can render as a broken image. */
/* Imagens específicas por exercício, vindas da base de dados (uma linha
   revista em `exercise_images` + o ficheiro no bucket). `shared.js` preenche
   este mapa; aqui só se lê. Continua a ser este ficheiro o único que conhece
   os ficheiros LOCAIS — a chave é que o local nunca deixa de ser o recurso:
   sem entrada aqui, cai-se no padrão de movimento e o cartão desenha na
   mesma. Nada nesta app pede imagens a um serviço externo em runtime. */
const EX_PHOTO_URL = {};

/* Local per-exercise photography. The pattern map below is a floor, not a
   target: five knee-dominant exercises all resolving to `squat` put four
   identical thumbnails in a row on day 1, and a leg extension — a seated
   machine — showed a barbell squat, which is not a weak match but a wrong one.
   An entry here is the real movement on the real equipment. Partial by design:
   whatever is missing still falls through to its pattern. */
const EX_IMG = {
  /* lower */
  /* legpress_h is the same machine as legpress, feet placed high — the machine
     photo is the honest match, and the pattern floor (a barbell squat) was not. */
  legpress:'ex-legpress.jpg', legpress_h:'ex-legpress.jpg',
  hack:'ex-hack.jpg', legext:'ex-legext.jpg',
  lunge:'ex-lunge.jpg', dbrdl:'ex-dbrdl.jpg', hipthrust:'ex-hipthrust.jpg',
  legcurl_seat:'ex-legcurl_seat.jpg', legcurl_l:'ex-legcurl_l.jpg',
  calf_s:'ex-calf_s.jpg', calf_seat:'ex-calf_seat.jpg',
  /* chest */
  dbbench:'ex-dbbench.jpg', incldb:'ex-incldb.jpg', pecdeck:'ex-pecdeck.jpg',
  /* shoulders */
  dbohp:'ex-dbohp.jpg', lateral:'ex-lateral.jpg', reardelt:'ex-reardelt.jpg',
  /* back */
  pulldown:'ex-pulldown.jpg', strarm:'ex-strarm.jpg', csrow:'ex-csrow.jpg',
  seatedrow:'ex-seatedrow.jpg', facepull:'ex-facepull.jpg',
  /* arms */
  dbcurl:'ex-dbcurl.jpg', hammer:'ex-hammer.jpg', cablecurl:'ex-cablecurl.jpg',
  pushdown:'ex-pushdown.jpg', ohext:'ex-ohext.jpg', skull:'ex-skull.jpg',
  cgbench:'ex-cgbench.jpg', dip:'ex-dip.jpg', kickback:'ex-kickback.jpg',
  /* core */
  plank:'ex-plank.jpg', legraise:'ex-legraise.jpg', cablecrunch:'ex-cablecrunch.jpg',
  /* The only photo here that is not a Pexels still: no free stock library has a
     Pallof press, so this is a frame of the demo video the card already plays —
     which makes photo and video the same rep of the same exercise. */
  pallof:'ex-pallof.jpg',
  /* no EX id of their own — reached only by name, from exercises the user types */
  crossover:'ex-crossover.jpg', chestpress:'ex-chestpress.jpg', rowdb:'ex-rowdb.jpg',
  bbrow:'ex-bbrow.jpg'
};

function exPhoto(exId){
  if(EX_PHOTO_URL[exId]) return EX_PHOTO_URL[exId];        /* reviewed, from the DB */
  if(EX_IMG[exId])       return IMG + EX_IMG[exId];        /* local, per exercise   */
  return IMG + (PATTERN_IMG[EX_PATTERN[exId]] || PATTERN_IMG.squat);
}

/* An exercise the user typed has no id in EX_PATTERN and no `pri` muscles, so
   there is nothing to look it up by — which is why its card drew a dumbbell
   glyph on grey instead of a photo. Read the pattern out of the name and the
   equipment text instead. Longest keys first: "incline chest press" has to beat
   "chest press", and "leg curl" has to beat "curl". */
const TEXT_PATTERN = [
  ['incline chest press','pressIncline'], ['supino inclinado','pressIncline'],
  ['incline press','pressIncline'], ['inclinado','pressIncline'], ['incline','pressIncline'],
  ['overhead press','pressOverhead'], ['shoulder press','pressOverhead'],
  ['desenvolvimento','pressOverhead'], ['military','pressOverhead'], ['overhead','pressOverhead'],
  ['lateral raise','shoulderRaise'], ['elevacao lateral','shoulderRaise'],
  ['elevação lateral','shoulderRaise'], ['reverse fly','shoulderRaise'],
  ['elevacao posterior','shoulderRaise'], ['elevação posterior','shoulderRaise'],
  ['face pull','row'],
  ['lat pulldown','pullVertical'], ['pulldown','pullVertical'], ['puxada','pullVertical'],
  ['pull up','pullVertical'], ['pull-up','pullVertical'], ['chin up','pullVertical'],
  ['barra fixa','pullVertical'], ['lat','pullVertical'],
  ['bent-over row','row'], ['barbell row','row'], ['dumbbell row','row'],
  ['seated row','row'], ['cable row','row'], ['remada','row'], ['row','row'],
  ['chest press','pressFlat'], ['bench press','pressFlat'], ['supino','pressFlat'],
  ['crossover','pressFlat'], ['crucifixo','pressFlat'], ['peck deck','pressFlat'],
  ['pec deck','pressFlat'], ['chest fly','pressFlat'], ['fly','pressFlat'],
  ['bench','pressFlat'], ['press','pressFlat'],
  ['leg curl','hinge'], ['curl femoral','hinge'], ['mesa flexora','hinge'],
  ['romanian','hinge'], ['deadlift','hinge'], ['levantamento terra','hinge'],
  ['hip thrust','hinge'], ['glute','hinge'], ['gluteo','hinge'], ['glúteo','hinge'],
  ['rdl','hinge'], ['stiff','hinge'], ['hinge','hinge'],
  ['triceps','triceps'], ['tríceps','triceps'], ['pushdown','triceps'],
  ['skullcrusher','triceps'], ['testa','triceps'], ['dip','triceps'],
  ['hammer curl','biceps'], ['rosca','biceps'], ['biceps','biceps'],
  ['bíceps','biceps'], ['curl','biceps'],
  /* before the bare 'leg' below: a hanging leg raise is core, not a leg day. */
  ['leg raise','core'], ['elevacao de pernas','core'], ['elevação de pernas','core'],
  ['hanging leg','core'],
  ['leg press','squat'], ['hack','squat'], ['leg extension','squat'],
  ['cadeira extensora','squat'], ['extensora','squat'], ['agachamento','squat'],
  ['squat','squat'], ['lunge','squat'], ['afundo','squat'], ['bulgaro','squat'],
  ['búlgaro','squat'], ['step up','squat'], ['leg','squat'],
  ['calf','calves'], ['panturrilha','calves'], ['gemeos','calves'], ['gémeos','calves'],
  ['plank','core'], ['prancha','core'], ['crunch','core'], ['abdominal','core'],
  ['abs','core'], ['pallof','core'], ['bird dog','core'], ['core','core'],
  ['obliquo','core'], ['oblíquo','core'],
  ['treadmill','cardioTread'], ['passadeira','cardioTread'], ['run','cardioTread'],
  ['corrida','cardioTread'], ['elliptical','cardioTread'], ['eliptica','cardioTread'],
  ['bike','cardioBike'], ['bicicleta','cardioBike'], ['cycling','cardioBike'],
  ['remo','cardioBike'], ['rowing machine','cardioBike'],
  /* last resort: bare "lateral" is the weakest signal in the list — it has to
     lose to "remada", "prancha" and anything else that names a real movement. */
  ['lateral','shoulderRaise']
];
/* Whole words only. Plain substring matching read "Remada Unilateral" as a
   lateral raise and "Prancha lateral" as one too, because "lateral" sits inside
   "unilateral" and next to "prancha". */
const DIACRITIC = /[̀-ͯ]/g;
const flat = s => String(s).toLowerCase().normalize('NFD').replace(DIACRITIC, '');
const TEXT_PATTERN_RE = TEXT_PATTERN.map(p=>[
  new RegExp('(^|[^a-z0-9])' + flat(p[0]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    + '([^a-z0-9]|$)'), p[1]
]);
function patternFromText(){
  const hay = ' ' + Array.prototype.slice.call(arguments).filter(Boolean)
    .map(flat).join(' ') + ' ';
  for(let i = 0; i < TEXT_PATTERN_RE.length; i++){
    if(TEXT_PATTERN_RE[i][0].test(hay)) return TEXT_PATTERN_RE[i][1];
  }
  return null;
}
/* Name → a specific entry in EX_IMG. Resolving only to a movement pattern put
   "Cable Crossover", "Chest Press" and "Dumbbell Chest Press" on one photo and
   both rows on another — the exact complaint the pattern map already had. These
   are checked before the coarse patterns, longest phrase first. */
const TEXT_EX = [
  /* Ahead of the chest group on purpose: "close grip bench press" contains
     "bench press", and "supino fechado" contains "supino". Longest wins only
     because it is listed first. */
  ['close grip bench press','cgbench'], ['close-grip bench press','cgbench'],
  ['close grip bench','cgbench'], ['supino fechado','cgbench'],
  ['parallel bar dip','dip'], ['triceps dip','dip'], ['paralelas','dip'],
  ['cable kickback','kickback'], ['triceps kickback','kickback'],
  ['coice de triceps','kickback'], ['kickback','kickback'],
  ['incline chest press','incldb'], ['supino inclinado','incldb'],
  ['dumbbell chest press','dbbench'], ['supino com halteres','dbbench'],
  ['dumbbell bench','dbbench'], ['bench press','dbbench'],
  ['cable crossover','crossover'], ['crossover','crossover'],
  ['crucifixo','crossover'], ['chest fly','crossover'],
  ['pec deck','pecdeck'], ['peck deck','pecdeck'],
  ['chest press','chestpress'], ['supino na maquina','chestpress'],
  ['supino','dbbench'],
  ['lat pulldown','pulldown'], ['pulldown','pulldown'], ['puxada','pulldown'],
  ['single-arm dumbbell row','rowdb'], ['single arm dumbbell row','rowdb'],
  ['one arm dumbbell row','rowdb'], ['remada unilateral','rowdb'],
  ['dumbbell row','rowdb'], ['remada com halter','rowdb'],
  /* A bent-over barbell row is NOT a chest-supported row — free torso versus a
     pad. Sending both to ex-csrow.jpg put one photo on two different exercises
     on day 4, which read as a repeated photo because it was one. */
  ['bent-over row','bbrow'], ['bent over row','bbrow'],
  ['barbell row','bbrow'], ['remada curvada','bbrow'],
  ['chest-supported row','csrow'], ['chest supported row','csrow'],
  ['remada com apoio','csrow'],
  ['seated row','seatedrow'], ['remada sentada','seatedrow'],
  ['cable row','seatedrow'],
  ['face pull','facepull'],
  ['lateral raise','lateral'], ['elevacao lateral','lateral'],
  ['reverse fly','reardelt'], ['elevacao posterior','reardelt'],
  ['shoulder press','dbohp'], ['desenvolvimento','dbohp'],
  ['hammer curl','hammer'], ['rosca martelo','hammer'],
  ['cable curl','cablecurl'], ['rosca no cabo','cablecurl'],
  ['biceps curl','dbcurl'], ['rosca','dbcurl'],
  ['pushdown','pushdown'], ['triceps na polia','pushdown'],
  ['skullcrusher','skull'], ['triceps testa','skull'],
  ['overhead extension','ohext'],
  ['leg press','legpress'], ['hack squat','hack'],
  ['leg extension','legext'], ['cadeira extensora','legext'],
  ['lunge','lunge'], ['afundo','lunge'],
  ['hip thrust','hipthrust'], ['elevacao pelvica','hipthrust'],
  ['romanian deadlift','dbrdl'], ['stiff','dbrdl'],
  ['seated leg curl','legcurl_seat'], ['lying leg curl','legcurl_l'],
  ['leg curl','legcurl_l'], ['mesa flexora','legcurl_l'],
  ['standing calf','calf_s'], ['seated calf','calf_seat'],
  ['panturrilha sentada','calf_seat'], ['panturrilha','calf_s'],
  ['hanging leg raise','legraise'], ['elevacao de pernas','legraise'],
  ['cable crunch','cablecrunch'], ['plank','plank'], ['prancha','plank'],
  ['pallof press','pallof'], ['pallof','pallof']
];
const TEXT_EX_RE = TEXT_EX.map(p=>[
  new RegExp('(^|[^a-z0-9])' + flat(p[0]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    + '([^a-z0-9]|$)'), p[1]
]);
function exIdFromText(){
  const hay = ' ' + Array.prototype.slice.call(arguments).filter(Boolean)
    .map(flat).join(' ') + ' ';
  for(let i = 0; i < TEXT_EX_RE.length; i++){
    if(TEXT_EX_RE[i][0].test(hay)) return TEXT_EX_RE[i][1];
  }
  return null;
}
/* Photo for a user-created exercise. Same contract as exPhoto(): never empty. */
function customPhoto(c){
  if(!c) return IMG + PATTERN_IMG.squat;
  const key = 'c' + c.id;
  if(EX_PHOTO_URL[key]) return EX_PHOTO_URL[key];
  const id = exIdFromText(c.name, c.eq);
  if(id && EX_IMG[id]) return IMG + EX_IMG[id];
  const pat = patternFromText(c.name, c.eq);
  return IMG + (PATTERN_IMG[pat] || PATTERN_IMG.squat);
}
function cardioPhoto(id){
  return IMG + (PATTERN_IMG[CARDIO_PATTERN[id]] || PATTERN_IMG.cardioTread);
}
function dayPhoto(dayId){
  return IMG + (DAY_IMG[dayId] || DAY_IMG[1]);
}
function onboardPhoto(step){
  return IMG + (ONBOARD_IMG[step] || ONBOARD_IMG.welcome);
}
/* Presets are stored on the record as a bare filename, so a stored value
   survives this file being reorganised. Anything unrecognised falls back. */
function coachPhoto(file){
  return IMG + (COACH_PRESETS.indexOf(file) > -1 ? file : COACH_PRESETS[0]);
}
function goalPhoto(file){
  return IMG + (GOAL_PRESETS.indexOf(file) > -1 ? file : GOAL_PRESETS[0]);
}
/* Deterministic pick so an entity created without an explicit choice still
   gets a stable, varied image instead of everyone sharing coach-1. */
function pickPreset(list, seed){
  const n = Math.abs(parseInt(seed, 10) || 0);
  return list[n % list.length];
}
