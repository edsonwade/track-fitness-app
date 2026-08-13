/* =========================================================================
   photos.js — the single place that knows which image file goes where.

   Everything else in the app asks for a *logical* image (a movement pattern,
   a day cover, a coach avatar) and never names a file. Swapping the whole
   photo set is therefore an edit to this file plus the files in img/.

   All photography is real people from Pexels — see img/attribution.md.
   ========================================================================= */

const IMG = 'img/';

/* Neutral "no photo yet" tile for a user-created exercise that has no photo of
   its own. It is a plain dumbbell glyph, deliberately NOT a photo of a real
   person or a real exercise — a custom card must never borrow another
   exercise's image and pass it off as the user's. Inline SVG data-URI so it
   needs no file and works over file://. */
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E"
  + "%3Crect width='120' height='120' fill='%232a2a2a'/%3E"
  + "%3Cg fill='none' stroke='%23707070' stroke-width='5' stroke-linecap='round'%3E"
  + "%3Cpath d='M42 60h36'/%3E"
  + "%3Crect x='22' y='46' width='13' height='28' rx='3'/%3E"
  + "%3Crect x='85' y='46' width='13' height='28' rx='3'/%3E"
  + "%3C/g%3E%3C/svg%3E";

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
  pallof:'ex-pallof.jpg'
};

function exPhoto(exId){
  if(EX_PHOTO_URL[exId]) return EX_PHOTO_URL[exId];        /* reviewed, from the DB */
  if(EX_IMG[exId])       return IMG + EX_IMG[exId];        /* local, per exercise   */
  const pat = EX_PATTERN[exId];
  if(pat) return IMG + PATTERN_IMG[pat];                   /* shipped built-in       */
  /* Unknown id = an exercise the USER created. EX_PATTERN is exhaustive for every
     shipped exercise, so we only get here for a user's own slug. Never hand it a
     system movement photo it did not choose — show the neutral placeholder, the
     same contract as customPhoto(). This is the "app generated a photo I never
     added" bug for exercises published to Everyone. */
  return PLACEHOLDER_IMG;
}

/* Photo for a user-created exercise. Never empty (contract of exPhoto()), but
   it only ever returns a photo the USER actually provided — the one they set by
   hand (stored full-URL on the record, same shape EX_PHOTO_URL uses) or one
   uploaded to their private bucket. With neither, it returns the neutral
   placeholder. It must NOT name-match or pattern-guess: borrowing another
   exercise's stock photo showed the user an image they never added. */
function customPhoto(c){
  if(c){
    if(c.photo) return c.photo;
    if(EX_PHOTO_URL['c' + c.id]) return EX_PHOTO_URL['c' + c.id];
  }
  return PLACEHOLDER_IMG;
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
