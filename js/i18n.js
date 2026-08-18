/* =========================================================================
   i18n.js — EN / PT for the whole app.

   Before the redesign only the gate was bilingual; the app body was hardcoded
   pt-PT. Now every UI string goes through t(). Because screens are rendered as
   template strings, t() is called inside the templates — the [data-i18n]
   attribute sweep only works on the static markup in index.html (the gate).

   Gate keys below are ported VERBATIM from the previous dictionary so the
   auth flow's copy and error mapping are unchanged.
   ========================================================================= */

let LANG = 'en', APP_READY = false;

const I18N = {

en:{
  /* ---------- gate (unchanged) ---------- */
  signin:"Sign in",signup:"Sign up",createacc:"Create account",
  forgot:"Forgot your password?",noacc:"Don't have an account?",haveacc:"Already have an account?",
  ph_email:"Your email",ph_pw:"Password",ph_name:"Your name",ph_pw2:"Confirm password",
  a_eye:"Show password",
  e_email:"Enter a valid email.",e_pwreq:"Enter your password.",e_name:"Enter your name.",
  e_pwrule:"Min. 8 characters, with a letter, a number and a symbol.",
  e_match:"Passwords do not match.",
  e_realmail:"Use a real email (Gmail, Outlook, iCloud, Yahoo, Proton…).",
  pw_short:"Password needs at least 8 characters.",pw_letter:"Include at least one letter.",
  pw_digit:"Include at least one number.",pw_symbol:"Include at least one symbol (e.g. ! @ # $ %).",
  g_check:"Check the highlighted fields.",g_signing:"Signing in…",g_creating:"Creating account…",
  g_created:"Account created! Now sign in with your password.",
  g_connecting:"Server still connecting. Wait 2s and try again.",
  g_noserver:"No connection to the server. Check your internet and reload the page.",
  g_srverr:"Could not connect to the server.",
  err_notconfirmed:'Account not confirmed. Turn off "Confirm email" in Supabase and try again.',
  err_rate:'Too many attempts. Wait ~15 min or turn off "Confirm email" in Supabase.',
  err_noaccount:'Wrong email or password. If you have no account yet, tap "Sign up".',
  err_apikey:"Invalid API key — check the key in Supabase.",
  err_exists:'This email already has an account. Go to "Sign in".',
  err_weak:"Password too weak.",err_unknown:"Unknown error.",
  reset_needemail:"Write your email first, then tap again.",
  reset_sending:"Sending recovery link…",
  reset_sent:"We sent you a recovery link. Check your inbox.",
  signedout:"Signed out",
  idle_logout:"Signed out for your security after a period of inactivity. Please sign in again.",

  /* ---------- chrome ---------- */
  app_name:"Vanilson",  nav_home:"Home",nav_train:"Train",nav_goals:"Goals",nav_profile:"Profile",
  a_theme:"Switch theme",a_lang:"Language",a_close:"Close",
  /* ---------- home ---------- */
  h_hello:"Welcome back",
  h_today:"Today's session",h_today_rest:"Rest day",
  h_start:"Start session",  h_rest_cta:"See recovery plan",
  h_streak:"Streak",h_streak_u:"days",
  h_week:"Your week",
  h_snapshot:"Snapshot",
  h_sessions:"Sessions",h_sess_u:"logged",
    h_thisweek:"This week",h_tw_u:"done",
  h_goals:"Goal progress",
  h_goal_none_t:"No goal yet",
  h_goal_none_p:"Set a target and the dashboard starts tracking it for real.",
  h_goal_new:"Create a goal",
  h_community:"Community",
  h_community_t:"Shared goals are coming",
  h_community_p:"Phase 2 adds a feed where goals you share can be liked and commented on by other people.",
  cm_someone:"Someone",
  cm_placeholder:"Share something with the community…",
  cm_post:"Post",
  cm_share_goal:"Share my goal",
  cm_empty:"No posts yet — be the first.",
  cm_comment_ph:"Add a comment…",
  cm_send:"Send",
  cm_delete:"Delete",
  cm_del_confirm:"Delete this?",
  cm_posted:"Posted",
  cm_liked:"You like this",
  cm_err:"Couldn't do that — try again.",
  cm_goal_share:"is going for",
  cm_edit:"Edit",
  cm_edited:"Updated",
  cm_react:"React",
  cm_tagall:"Show all",
  cm_tagnone:"No posts with that tag yet.",
  h_progress:"Progress",
  h_history:"Recent sessions",

  /* ---------- train ---------- */
    tr_block:"Training block",
  tr_warm:"Warm-up",tr_focus:"Focus",
  tr_cardio:"Cardio",tr_core:"Core",
  tr_add:"Add exercise",
  tr_save:"Save today's session",
  tr_savehint:"Logs save themselves as you type. This files the session into your history.",
  tr_removed:"removed from this day",tr_restore:"Restore",
  tr_moveup:"Move up",tr_movedown:"Move down",
  tr_err:"Could not render this day.",
  tr_rest_t:"Recovery day",
  tr_rest_p:"Growth happens between sessions. Move gently, eat well, sleep long.",
  tr_rest_walk:"Easy walk",tr_rest_walk_s:"20–30 min, conversational pace",
  tr_rest_mob:"Mobility",tr_rest_mob_s:"10 min on hips and shoulders",
  tr_rest_sleep:"Sleep",tr_rest_sleep_s:"7–9 h — the real anabolic window",
  tr_notes:"Notes",tr_notes_ph:"How did the week feel? Aches, sleep, appetite…",

  /* ---------- exercise card ---------- */
  p_sets:"Sets",p_reps:"Reps",p_rpe:"RPE",p_load:"Load",p_rest:"Rest",
  lg_t:"Your log",lg_auto:"saves automatically",
  lg_w:"Weight",lg_r:"Reps done",lg_s:"Sets",
  lg_ph:"Notes on this exercise…",
  t_exec:"Technique",t_err:"Fix it",t_prog:"Blocks",
  e_steps:"How to do it",e_safe:"Stay safe",e_breath:"Breathing",
  e_watch:"Watch the movement",
  e_video_none:"No demo video for this one yet.",
  e_video_loading:"Loading video…",
  e_video_fail:"The video could not load. Check your connection.",
  e_video_blocked:"The author does not allow this video to play outside YouTube.",
  e_video_gone:"This video is no longer available.",
  e_video_retry:"Try again",
  e_video_close:"Close video",
  vt_title:"Video self-test",
  vt_row_s:"Check every demo video really plays",
  vt_open:"Open",
  vt_sub:"Opens a real player for every demo video, one at a time, and reports which ones fail. Anything that fails is tested a second time — YouTube throttles rapid embeds and would otherwise report healthy videos as dead. Leave this open until it finishes.",
  vt_start:"Run the test",
  vt_testing:"Testing",
  vt_retesting:"Re-testing the failures",
  vt_all_ok:"videos, all playing.",
  vt_failed:"could not play.",
  vt_ok:"plays",
  vt_blocked:"embedding off",
  vt_gone:"gone",
  vt_noanswer:"no answer",
  vt_noapi:"API blocked",
  vt_fail:"failed",
  rt_title:"Rest",
  rt_start:"Rest",
  rt_go:"Start",
  rt_pause:"Pause",
  rt_again:"Again",
  rt_done:"Go!",
  rs_title:"Your rest time",
  rs_sub:"How long you rest is your call. Pick a preset or type your own — it is remembered for this exercise, on every day and every block.",
  rs_sec:"Seconds",
  rs_plan:"The plan suggests",
  rs_reset:"Use the plan's",
  rs_reset_ok:"Back to the plan's rest",
  rs_saved:"Rest set to",
  rs_bad:"Use at least 5 seconds",
  er_t:"Common mistakes",er_e:"Mistake",er_c:"Correction",
  er_note:"Technique before load. Every time.",
  mg_pri:"Primary",mg_sec:"Secondary",
  pg_t:"Across the 12-week cycle",
  pg_cap:"Sets per block · the highlighted row is your current block",
  pg_ov:"Editing an exercise overrides it for this day only.",

  /* ---------- shared actions ---------- */
  b_edit:"Edit",b_del:"Delete",b_save:"Save",b_cancel:"Cancel",b_close:"Close",  b_rmday:"Remove from day",b_update:"Update",

  /* ---------- exercise modal ---------- */
  m_add:"Add exercise",m_edit:"Edit exercise",
  m_name:"Exercise name",m_name_ph:"E.g.: Bulgarian Split Squat",
  m_eq:"Equipment",m_eq_ph:"E.g.: Dumbbells",
  m_sets:"Sets",m_reps:"Reps",m_load:"Load",m_load_ph:"— fill in",
  m_rest:"Rest",m_rest_ph:"90 s",
  m_custom:"Your exercise",
  m_video:"Demo video",m_video_ph:"Paste a YouTube link",
  m_video_hint:"Required. Plays inside the card, like the built-in exercises.",
  m_video_opt:"Optional here — leave it as it is to keep the current video.",
  m_video_bad:"That doesn't look like a YouTube link.",
  m_video_req:"Add a demo video — every exercise has one.",
  m_photo:"Photo",
  m_photo_hint:"Wrong photo? Upload the real one — only you see it.",
  m_photo_change:"Change photo",
  m_photo_reset:"Reset to auto",
  m_photo_up:"Uploading photo…",
  m_photo_ok:"Photo updated",
  m_photo_err:"Couldn't upload that photo.",
  m_photo_big:"That image is too large (max 8 MB).",

  /* ---------- goals ---------- */
  g_title:"Goals",
  g_new:"New goal",g_edit:"Edit goal",
  g_none_t:"No goals yet",
  g_none_p:"A goal turns this app from a logbook into a plan. Start with one.",
  g_f_title:"What are you after?",g_f_title_ph:"E.g.: Get to 85 kg",
  g_f_type:"Measured in",
  g_f_start:"Starting value",g_f_target:"Target",g_f_current:"Where you are now",
  g_f_deadline:"Target date",g_f_photo:"Cover",
  g_f_notes:"Why it matters",g_f_notes_ph:"The reason you'll come back on a bad week…",
  g_type_weight:"Body weight (kg)",
  g_type_bodyfat:"Body fat (%)",
  g_type_lift:"A lift (kg)",
  g_type_sessions:"Sessions done",
  g_type_custom:"Something else",
  g_prog:"progress",
  g_hit:"Hit",  g_togo:"to go",g_due:"by",g_overdue:"Past due",g_nodate:"No date",
  g_update_t:"Update progress",
  g_del_c:"Delete this goal? This cannot be undone.",
  
  /* ---------- trainers ---------- */
  c_title:"Your trainers",
  c_new:"Add trainer",c_edit:"Edit trainer",
  c_none_t:"No trainers yet",
  c_none_p:"Keep your coaches, their specialities and what they have you working on in one place.",
  c_f_name:"Name",c_f_name_ph:"E.g.: Ana Ferreira",
  c_f_photo:"Photo",
  c_f_spec:"Speciality",c_f_spec_ph:"E.g.: Hypertrophy, Mobility",
  c_f_bio:"About them",c_f_bio_ph:"Background, style, anything worth remembering…",
  c_f_phone:"Phone",c_f_email:"Email",c_f_insta:"Instagram",
  c_f_avail:"Availability",c_f_avail_ph:"E.g.: Weekday mornings, Sat 10–12",
  c_f_days:"Days they coach you",
  c_f_plans:"Plans they set you",c_f_plans_ph:"One per line",
  c_f_notes:"Notes",c_f_notes_ph:"Private notes on your work together…",
  c_f_active:"Currently training with them",
  c_active:"Active",c_inactive:"Inactive",
  c_plans:"Plans",c_days:"Schedule",
  c_sessions:"Sessions together",c_sess_none:"No sessions logged yet.",
  c_sess_add:"Log a session",c_sess_date:"Date",c_sess_note:"What you worked on",
  c_del_c:"Delete this trainer? This cannot be undone.",
  c_del_s:"Delete this session? This cannot be undone.",
  c_with:"with",

  /* ---------- profile ---------- */
    pr_edit:"Edit profile",
  pf_name:"Name",pf_photo:"Photo",
  pf_height:"Height (cm)",
  pf_wstart:"Starting weight (kg)",pf_wcur:"Current weight (kg)",pf_wtarget:"Target weight (kg)",
  pf_days:"Training days",
  pr_trainers:"Trainers",
  pr_progress:"Progress",
  pr_history:"Session history",
  pr_settings:"Settings",
  pr_theme:"Appearance",pr_theme_d:"Dark",pr_theme_l:"Light",
  pr_lang:"Language",
  pr_export:"Export data",pr_export_s:"Download a JSON backup",
  pr_import:"Import data",pr_import_s:"Restore from a JSON backup",
    pr_synced:"Synced to the cloud",pr_local:"Saved on this device",
  pr_signout:"Sign out",

  /* ---------- onboarding ---------- */
  ob_skip:"Skip",ob_next:"Continue",ob_back:"Back",ob_finish:"Enter the app",
  ob1_t:"Built around your six days",
  ob1_p:"Your plan, your loads, your history. Let's set up the parts only you can answer — it takes a minute, and you can skip any of it.",
  ob1_cta:"Set me up",
  ob2_t:"Where are you now?",
  ob2_p:"These numbers drive your dashboard. Rough is fine — you can change them any time.",
  ob3_t:"Which days do you train?",
  ob3_p:"Tap the days you plan to be in the gym.",
  ob4_t:"Pick one goal",
  ob4_p:"One clear target beats five vague ones. You can add more later.",
  ob5_t:"Training with anyone?",
  ob5_p:"Add a coach now, or leave it — you can manage trainers from your profile.",
  ob_added:"You're set. Let's train.",

  /* ---------- history ---------- */
  hi_empty:"Nothing logged yet. Finish a session and it lands here.",
  hi_norec:"No entries recorded",
  hi_w_ph:"kg",hi_r_ph:"reps",hi_n_ph:"note",
  hi_del_c:"Delete this session from your history?",

  /* ---------- chart ---------- */
  ch_t:"Load over time",
  ch_empty:"Log a weight on a few sessions and your progression appears here.",

  /* ---------- toasts ---------- */
  ts_saved:"Saved",ts_deleted:"Deleted",
  ts_sess:"Session saved to your history",
  ts_needlog:"Log at least one weight, rep or note first.",
  ts_needname:"Give it a name first.",
  ts_export:"Backup downloaded",ts_import:"Data restored",
  ts_invalid:"That file isn't a valid backup.",ts_readerr:"Could not read that file.",
  ts_goalhit:"🔥 Goal reached!",
  ts_restored:"Exercises restored",ts_removed:"Removed from this day",
  ts_changes:"Changes saved",

  /* ---------- shared catalogue ---------- */
  sh_conflict:"Someone edited this before you. Reloaded — check it and save again.",
  sh_pushed:"Published — everyone sees it now",
  sh_offline:"Shared catalogue unavailable. Using the built-in plan.",
  sh_live:"Live",
  sh_remote:"Updated by someone else",
  sh_seeded:"Built-in plan published to the shared catalogue",
  sh_backfilled:"Shared {n} exercise photo(s) with everyone",
  sh_img_local:"This photo can't be shared — upload a file so everyone sees it",
  sh_diag:"Test image sharing",
  sh_diag_run:"Testing against the live database…",
  sh_diag_pass:"All good — an image saved 'for everyone' does reach other accounts.",
  sh_diag_fail:"A step failed below — that line is exactly why images don't reach others.",
  sh_scope:"Who is this change for?",
  sh_me:"Only me",sh_all:"Everyone",
  sh_scope_me:"Stays on your account. Nobody else sees it.",
  sh_scope_all:"Goes into the shared plan. Everyone sees it, live.",
  rm_scope:"Remove this exercise for whom?",
  rm_scope_hint:"“Everyone” takes it out of the shared day for all users. Reversible — you can add it back.",
  sh_cat:"Shared catalogue",
  sh_cat_live:"Live · %e exercises, %d days",
  sh_cat_off:"Not connected — using the built-in plan",
  sh_cat_empty:"Empty. Publish the built-in plan to start it.",
  sh_publish:"Publish",

  /* ---------- units / misc ---------- */
  u_x:"×",
  misc_of:"of",},

pt:{
  /* ---------- gate (inalterado) ---------- */
  signin:"Entrar",signup:"Criar conta",createacc:"Criar conta",
  forgot:"Esqueceste a palavra-passe?",noacc:"Não tens conta?",haveacc:"Já tens conta?",
  ph_email:"O teu email",ph_pw:"Palavra-passe",ph_name:"O teu nome",ph_pw2:"Confirmar palavra-passe",
  a_eye:"Mostrar palavra-passe",
  e_email:"Escreve um email válido.",e_pwreq:"Escreve a tua palavra-passe.",e_name:"Escreve o teu nome.",
  e_pwrule:"Mín. 8 caracteres, com letra, número e símbolo.",
  e_match:"As palavras-passe não coincidem.",
  e_realmail:"Usa um email real (Gmail, Outlook, iCloud, Yahoo, Proton…).",
  pw_short:"A palavra-passe precisa de pelo menos 8 caracteres.",pw_letter:"Inclui pelo menos uma letra.",
  pw_digit:"Inclui pelo menos um número.",pw_symbol:"Inclui pelo menos um símbolo (ex.: ! @ # $ %).",
  g_check:"Verifica os campos assinalados.",g_signing:"A entrar…",g_creating:"A criar conta…",
  g_created:"Conta criada! Agora faz Entrar com a tua palavra-passe.",
  g_connecting:"Servidor ainda a ligar. Espera 2s e tenta.",
  g_noserver:"Sem ligação ao servidor. Verifica a internet e recarrega a página.",
  g_srverr:"Erro ao ligar ao servidor.",
  err_notconfirmed:'Conta por confirmar. No Supabase desliga "Confirm email" e tenta de novo.',
  err_rate:'Demasiadas tentativas. Espera ~15 min ou desliga "Confirm email" no Supabase.',
  err_noaccount:'Email ou palavra-passe errados. Se ainda não tens conta, carrega em "Criar conta".',
  err_apikey:"Chave de API inválida — verifica a chave no Supabase.",
  err_exists:'Este email já tem conta. Vai a "Entrar".',
  err_weak:"Palavra-passe demasiado fraca.",err_unknown:"Erro desconhecido.",
  reset_needemail:"Escreve primeiro o teu email e carrega outra vez.",
  reset_sending:"A enviar link de recuperação…",
  reset_sent:"Enviámos-te um link de recuperação. Vê a tua caixa de correio.",
  signedout:"Sessão terminada",
  idle_logout:"Sessão terminada por segurança após um período de inatividade. Inicia sessão novamente.",

  /* ---------- estrutura ---------- */
  app_name:"Vanilson",  nav_home:"Início",nav_train:"Treino",nav_goals:"Metas",nav_profile:"Perfil",
  a_theme:"Mudar tema",a_lang:"Idioma",a_close:"Fechar",
  /* ---------- início ---------- */
  h_hello:"Bem-vindo de volta",
  h_today:"Treino de hoje",h_today_rest:"Dia de descanso",
  h_start:"Começar treino",  h_rest_cta:"Ver plano de recuperação",
  h_streak:"Sequência",h_streak_u:"dias",
  h_week:"A tua semana",
  h_snapshot:"Resumo",
  h_sessions:"Sessões",h_sess_u:"registadas",
    h_thisweek:"Esta semana",h_tw_u:"feitos",
  h_goals:"Progresso das metas",
  h_goal_none_t:"Ainda sem meta",
  h_goal_none_p:"Define um objetivo e o painel passa a acompanhá-lo a sério.",
  h_goal_new:"Criar uma meta",
  h_community:"Comunidade",
  h_community_t:"Metas partilhadas a caminho",
  h_community_p:"A Fase 2 traz um mural onde as metas que partilhas podem receber gostos e comentários de outras pessoas.",
  cm_someone:"Alguém",
  cm_placeholder:"Partilha algo com a comunidade…",
  cm_post:"Publicar",
  cm_share_goal:"Partilhar a minha meta",
  cm_empty:"Ainda sem publicações — sê o primeiro.",
  cm_comment_ph:"Comenta…",
  cm_send:"Enviar",
  cm_delete:"Apagar",
  cm_del_confirm:"Apagar isto?",
  cm_posted:"Publicado",
  cm_liked:"Gostas disto",
  cm_err:"Não deu — tenta outra vez.",
  cm_goal_share:"está a caminho de",
  cm_edit:"Editar",
  cm_edited:"Atualizado",
  cm_react:"Reagir",
  cm_tagall:"Ver tudo",
  cm_tagnone:"Ainda sem publicações com essa tag.",
  h_progress:"Progresso",
  h_history:"Sessões recentes",

  /* ---------- treino ---------- */
    tr_block:"Bloco de treino",
  tr_warm:"Aquecimento",tr_focus:"Objetivo",
  tr_cardio:"Cardio",tr_core:"Core",
  tr_add:"Adicionar exercício",
  tr_save:"Guardar sessão de hoje",
  tr_savehint:"Os registos gravam sozinhos enquanto escreves. Isto arquiva a sessão no histórico.",
  tr_removed:"removidos deste dia",tr_restore:"Restaurar",
  tr_moveup:"Mover para cima",tr_movedown:"Mover para baixo",
  tr_err:"Não foi possível mostrar este dia.",
  tr_rest_t:"Dia de recuperação",
  tr_rest_p:"O crescimento acontece entre treinos. Move-te com calma, come bem, dorme muito.",
  tr_rest_walk:"Caminhada leve",tr_rest_walk_s:"20–30 min, ritmo de conversa",
  tr_rest_mob:"Mobilidade",tr_rest_mob_s:"10 min de ancas e ombros",
  tr_rest_sleep:"Sono",tr_rest_sleep_s:"7–9 h — a verdadeira janela anabólica",
  tr_notes:"Notas",tr_notes_ph:"Como correu a semana? Dores, sono, apetite…",

  /* ---------- cartão de exercício ---------- */
  p_sets:"Séries",p_reps:"Reps",p_rpe:"RPE",p_load:"Carga",p_rest:"Descanso",
  lg_t:"O teu registo",lg_auto:"grava sozinho",
  lg_w:"Peso",lg_r:"Reps feitas",lg_s:"Séries",
  lg_ph:"Notas sobre este exercício…",
  t_exec:"Técnica",t_err:"Corrigir",t_prog:"Blocos",
  e_steps:"Como executar",e_safe:"Segurança",e_breath:"Respiração",
  e_watch:"Ver o movimento",
  e_video_none:"Ainda sem vídeo de demonstração para este.",
  e_video_loading:"A carregar vídeo…",
  e_video_fail:"Não foi possível carregar o vídeo. Verifica a ligação.",
  e_video_blocked:"O autor não permite reproduzir este vídeo fora do YouTube.",
  e_video_gone:"Este vídeo já não está disponível.",
  e_video_retry:"Tentar outra vez",
  e_video_close:"Fechar vídeo",
  vt_title:"Teste aos vídeos",
  vt_row_s:"Confirma que cada vídeo abre mesmo",
  vt_open:"Abrir",
  vt_sub:"Abre um leitor a sério para cada vídeo de demonstração, um de cada vez, e diz quais falham. O que falhar é testado uma segunda vez — o YouTube trava embeds seguidos e daria vídeos bons como mortos. Deixa isto aberto até acabar.",
  vt_start:"Correr o teste",
  vt_testing:"A testar",
  vt_retesting:"A repetir os que falharam",
  vt_all_ok:"vídeos, todos a abrir.",
  vt_failed:"não abriram.",
  vt_ok:"abre",
  vt_blocked:"embed desligado",
  vt_gone:"já não existe",
  vt_noanswer:"sem resposta",
  vt_noapi:"API bloqueada",
  vt_fail:"falhou",
  rt_title:"Descanso",
  rt_start:"Descansar",
  rt_go:"Começar",
  rt_pause:"Pausa",
  rt_again:"Outra vez",
  rt_done:"Bora!",
  rs_title:"O teu tempo de descanso",
  rs_sub:"Quanto descansas é decisão tua. Escolhe um valor ou escreve o teu — fica guardado para este exercício, em todos os dias e todos os blocos.",
  rs_sec:"Segundos",
  rs_plan:"O plano sugere",
  rs_reset:"Usar o do plano",
  rs_reset_ok:"De volta ao descanso do plano",
  rs_saved:"Descanso definido para",
  rs_bad:"Usa pelo menos 5 segundos",
  er_t:"Erros comuns",er_e:"Erro",er_c:"Correção",
  er_note:"Técnica antes da carga. Sempre.",
  mg_pri:"Principal",mg_sec:"Secundário",
  pg_t:"Ao longo do ciclo de 12 semanas",
  pg_cap:"Séries por bloco · a linha destacada é o teu bloco atual",
  pg_ov:"Editar um exercício substitui-o apenas neste dia.",

  /* ---------- ações comuns ---------- */
  b_edit:"Editar",b_del:"Eliminar",b_save:"Guardar",b_cancel:"Cancelar",b_close:"Fechar",  b_rmday:"Remover do dia",b_update:"Atualizar",

  /* ---------- modal de exercício ---------- */
  m_add:"Adicionar exercício",m_edit:"Editar exercício",
  m_name:"Nome do exercício",m_name_ph:"Ex.: Agachamento Búlgaro",
  m_eq:"Equipamento",m_eq_ph:"Ex.: Halteres",
  m_sets:"Séries",m_reps:"Reps",m_load:"Carga",m_load_ph:"— preencher",
  m_rest:"Descanso",m_rest_ph:"90 s",
  m_custom:"Exercício teu",
  m_video:"Vídeo de demonstração",m_video_ph:"Cola um link do YouTube",
  m_video_hint:"Obrigatório. Toca dentro do cartão, como nos exercícios do plano.",
  m_video_opt:"Opcional aqui — deixa como está para manter o vídeo atual.",
  m_video_bad:"Isso não parece um link do YouTube.",
  m_video_req:"Adiciona um vídeo — todos os exercícios têm um.",
  m_photo:"Foto",
  m_photo_hint:"Foto errada? Envia a certa — só tu a vês.",
  m_photo_change:"Trocar foto",
  m_photo_reset:"Repor automática",
  m_photo_up:"A enviar foto…",
  m_photo_ok:"Foto atualizada",
  m_photo_err:"Não deu para enviar essa foto.",
  m_photo_big:"Essa imagem é demasiado grande (máx. 8 MB).",

  /* ---------- metas ---------- */
  g_title:"Metas",
  g_new:"Nova meta",g_edit:"Editar meta",
  g_none_t:"Ainda sem metas",
  g_none_p:"Uma meta transforma esta app de caderno em plano. Começa com uma.",
  g_f_title:"O que queres alcançar?",g_f_title_ph:"Ex.: Chegar aos 85 kg",
  g_f_type:"Medido em",
  g_f_start:"Valor inicial",g_f_target:"Objetivo",g_f_current:"Onde estás agora",
  g_f_deadline:"Data alvo",g_f_photo:"Capa",
  g_f_notes:"Porque importa",g_f_notes_ph:"A razão que te faz voltar numa semana má…",
  g_type_weight:"Peso corporal (kg)",
  g_type_bodyfat:"Massa gorda (%)",
  g_type_lift:"Uma carga (kg)",
  g_type_sessions:"Sessões feitas",
  g_type_custom:"Outra coisa",
  g_prog:"progresso",
  g_hit:"Atingida",  g_togo:"em falta",g_due:"até",g_overdue:"Prazo passado",g_nodate:"Sem data",
  g_update_t:"Atualizar progresso",
  g_del_c:"Eliminar esta meta? Não dá para voltar atrás.",
  
  /* ---------- treinadores ---------- */
  c_title:"Os teus treinadores",
  c_new:"Adicionar treinador",c_edit:"Editar treinador",
  c_none_t:"Ainda sem treinadores",
  c_none_p:"Guarda num só lugar os teus treinadores, as especialidades e o que te põem a fazer.",
  c_f_name:"Nome",c_f_name_ph:"Ex.: Ana Ferreira",
  c_f_photo:"Foto",
  c_f_spec:"Especialidade",c_f_spec_ph:"Ex.: Hipertrofia, Mobilidade",
  c_f_bio:"Sobre a pessoa",c_f_bio_ph:"Percurso, estilo, o que vale a pena recordar…",
  c_f_phone:"Telefone",c_f_email:"Email",c_f_insta:"Instagram",
  c_f_avail:"Disponibilidade",c_f_avail_ph:"Ex.: Manhãs de semana, Sáb 10–12",
  c_f_days:"Dias em que te treina",
  c_f_plans:"Planos que te deu",c_f_plans_ph:"Um por linha",
  c_f_notes:"Notas",c_f_notes_ph:"Notas privadas sobre o trabalho em conjunto…",
  c_f_active:"A treinar com esta pessoa atualmente",
  c_active:"Ativo",c_inactive:"Inativo",
  c_plans:"Planos",c_days:"Horário",
  c_sessions:"Sessões em conjunto",c_sess_none:"Ainda sem sessões registadas.",
  c_sess_add:"Registar sessão",c_sess_date:"Data",c_sess_note:"O que trabalharam",
  c_del_c:"Eliminar este treinador? Não dá para voltar atrás.",
  c_del_s:"Eliminar esta sessão? Não dá para voltar atrás.",
  c_with:"com",

  /* ---------- perfil ---------- */
    pr_edit:"Editar perfil",
  pf_name:"Nome",pf_photo:"Foto",
  pf_height:"Altura (cm)",
  pf_wstart:"Peso inicial (kg)",pf_wcur:"Peso atual (kg)",pf_wtarget:"Peso alvo (kg)",
  pf_days:"Dias de treino",
  pr_trainers:"Treinadores",
  pr_progress:"Progresso",
  pr_history:"Histórico de sessões",
  pr_settings:"Definições",
  pr_theme:"Aparência",pr_theme_d:"Escuro",pr_theme_l:"Claro",
  pr_lang:"Idioma",
  pr_export:"Exportar dados",pr_export_s:"Descarregar cópia em JSON",
  pr_import:"Importar dados",pr_import_s:"Restaurar de uma cópia JSON",
    pr_synced:"Sincronizado na nuvem",pr_local:"Guardado neste dispositivo",
  pr_signout:"Terminar sessão",

  /* ---------- integração inicial ---------- */
  ob_skip:"Ignorar",ob_next:"Continuar",ob_back:"Voltar",ob_finish:"Entrar na app",
  ob1_t:"Feita à volta dos teus seis dias",
  ob1_p:"O teu plano, as tuas cargas, o teu histórico. Vamos definir o que só tu sabes — leva um minuto e podes ignorar tudo.",
  ob1_cta:"Configurar",
  ob2_t:"Onde estás agora?",
  ob2_p:"Estes números alimentam o teu painel. Aproximado serve — podes mudar quando quiseres.",
  ob3_t:"Em que dias treinas?",
  ob3_p:"Toca nos dias em que contas ir ao ginásio.",
  ob4_t:"Escolhe uma meta",
  ob4_p:"Um objetivo claro vale mais que cinco vagos. Podes acrescentar mais depois.",
  ob5_t:"Treinas com alguém?",
  ob5_p:"Acrescenta um treinador agora, ou deixa para depois — geres isso no perfil.",
  ob_added:"Está tudo pronto. Vamos treinar.",

  /* ---------- histórico ---------- */
  hi_empty:"Ainda sem registos. Termina uma sessão e ela aparece aqui.",
  hi_norec:"Sem entradas registadas",
  hi_w_ph:"kg",hi_r_ph:"reps",hi_n_ph:"nota",
  hi_del_c:"Eliminar esta sessão do histórico?",

  /* ---------- gráfico ---------- */
  ch_t:"Carga ao longo do tempo",
  ch_empty:"Registra um peso em algumas sessões e a tua progressão aparece aqui.",

  /* ---------- avisos ---------- */
  ts_saved:"Guardado",ts_deleted:"Eliminado",
  ts_sess:"Sessão guardada no histórico",
  ts_needlog:"Registra primeiro pelo menos um peso, rep ou nota.",
  ts_needname:"Dá-lhe primeiro um nome.",
  ts_export:"Cópia descarregada",ts_import:"Dados restaurados",
  ts_invalid:"Esse ficheiro não é uma cópia válida.",ts_readerr:"Não foi possível ler o ficheiro.",
  ts_goalhit:"🔥 Meta alcançada!",
  ts_restored:"Exercícios restaurados",ts_removed:"Removido deste dia",
  ts_changes:"Alterações guardadas",

  /* ---------- catálogo partilhado ---------- */
  sh_conflict:"Alguém editou isto antes de ti. Recarreguei — confere e guarda outra vez.",
  sh_pushed:"Publicado — já toda a gente vê",
  sh_offline:"Catálogo partilhado indisponível. A usar o plano do próprio ficheiro.",
  sh_live:"Ao vivo",
  sh_remote:"Alterado por outra pessoa",
  sh_seeded:"Plano de origem publicado no catálogo partilhado",
  sh_backfilled:"Partilhei {n} foto(s) de exercício com toda a gente",
  sh_img_local:"Esta foto não dá para partilhar — envia um ficheiro para toda a gente a ver",
  sh_diag:"Testar partilha de imagem",
  sh_diag_run:"A testar na base de dados real…",
  sh_diag_pass:"Tudo certo — uma imagem guardada 'para todos' chega às outras contas.",
  sh_diag_fail:"Um passo abaixo falhou — essa linha é exactamente o motivo de a imagem não chegar.",
  sh_scope:"Esta alteração é para quem?",
  sh_me:"Só eu",sh_all:"Todos",
  rm_scope:"Remover este exercício para quem?",
  rm_scope_hint:"“Todos” tira-o do dia partilhado para toda a gente. Reversível — podes voltar a adicioná-lo.",
  sh_scope_me:"Fica na tua conta. Mais ninguém vê.",
  sh_scope_all:"Entra no plano partilhado. Toda a gente vê, ao vivo.",
  sh_cat:"Catálogo partilhado",
  sh_cat_live:"Ao vivo · %e exercícios, %d dias",
  sh_cat_off:"Sem ligação — a usar o plano do ficheiro",
  sh_cat_empty:"Vazio. Publica o plano de origem para o arrancar.",
  sh_publish:"Publicar",

  /* ---------- unidades / diversos ---------- */
  u_x:"×",
  misc_of:"de",}
};

/* Look up a key in the active language, falling back to English, then to the
   key itself so a missing string is visible in testing rather than blank. */
function t(k){
  const d = I18N[LANG] || I18N.en;
  return d[k] !== undefined ? d[k] : (I18N.en[k] !== undefined ? I18N.en[k] : k);
}

/* Sweeps the STATIC markup (the gate). Rendered screens call t() directly. */
function applyLang(){
  document.documentElement.setAttribute('lang', LANG);
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{ el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  ['lgPT','lgEN'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.toggle('on', LANG === (id.slice(-2)==='PT' ? 'pt' : 'en'));
  });
  if(APP_READY && typeof rerender === 'function'){ try{ rerender(); }catch(e){} }
}

function setLang(l){
  LANG = (l === 'pt') ? 'pt' : 'en';
  STATE.lang = LANG;
  saveState();
  applyLang();
  if(typeof gClearAll === 'function') gClearAll();
  if(typeof gateMsg === 'function') gateMsg('');
}

/* ---- bilingual data helpers (data.js stores {pt,en} objects) ---- */

/* Resolve a bilingual field. Plain strings pass through untouched. */
function L(v){
  if(v == null) return '';
  if(typeof v !== 'object' || Array.isArray(v)) return v;
  return v[LANG] !== undefined ? v[LANG] : (v.pt !== undefined ? v.pt : v.en);
}
/* L() for the list-shaped fields (steps, safe, errs, mus). Since these can now
   arrive from the shared catalogue, a row published without them hands back an
   empty {} and L() returns undefined — and `L(e.steps).map(...)` threw, which
   made the whole exercise card render as nothing. Never hand .map() a non-array. */
function LA(v){ const r = L(v); return Array.isArray(r) ? r : []; }

/* The programming data stores loads/reps/rests as pt-PT fragments
   ("— preencher", "base + carga"). Translate them on the way out. */
const DTXT = [
  [/— preencher/g,'— fill in'],[/base \+ carga/g,'base + load'],[/carga B2/g,'B2 load'],
  [/pesada/g,'heavy'],[/moderada/g,'moderate'],[/peso corporal/g,'bodyweight'],
  [/\/mão/g,'/hand'],[/\/lado/g,'/side']
];
function dtxt(s){
  if(s == null) return '';
  if(LANG === 'pt') return s;
  let o = String(s);
  DTXT.forEach(m=>{ o = o.replace(m[0], m[1]); });
  return o;
}

function exName(e){ return LANG === 'en' ? (e.nEN || e.nPT) : e.nPT; }
function musName(k){ return LANG === 'en' ? (MUSNAME_EN[k] || k) : (MUSNAME[k] || k); }
