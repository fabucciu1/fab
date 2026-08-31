/* =========================================================
   GymRec — chrono de récup + suivi de séance + nutrition
   Aucune dépendance, tout est stocké en local (localStorage).
   ========================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };

/* ---------------------------------------------------------
   1. Bibliothèque d'exercices
   bw  = fraction du poids de corps réellement déplacée
   rom = amplitude moyenne du mouvement en mètres
   --------------------------------------------------------- */
const GROUPES = ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Cardio', 'Autre'];

// pdc = true : le poids du corps est la charge de référence (records exprimés PDC inclus)
const LIB = [
  ['Développé couché',          'Pectoraux', 120, 0.40, 0.00, false],
  ['Développé incliné',         'Pectoraux', 120, 0.40, 0.00, false],
  ['Écarté poulie',             'Pectoraux',  75, 0.55, 0.00, false],
  ['Dips',                      'Pectoraux',  90, 0.45, 0.95, true],
  ['Pompes',                    'Pectoraux',  60, 0.35, 0.65, true],
  ['Tractions',                 'Dos',       120, 0.55, 0.95, true],
  ['Rowing barre',              'Dos',       120, 0.45, 0.00, false],
  ['Tirage vertical',           'Dos',        90, 0.55, 0.00, false],
  ['Tirage horizontal',         'Dos',        90, 0.50, 0.00, false],
  ['Soulevé de terre',          'Dos',       180, 0.55, 0.45, false],
  ['Développé militaire',       'Épaules',   120, 0.50, 0.00, false],
  ['Élévations latérales',      'Épaules',    60, 0.45, 0.00, false],
  ['Oiseau / rear delt',        'Épaules',    60, 0.40, 0.00, false],
  ['Curl biceps',               'Bras',       60, 0.40, 0.00, false],
  ['Curl marteau',              'Bras',       60, 0.40, 0.00, false],
  ['Extension triceps poulie',  'Bras',       60, 0.35, 0.00, false],
  ['Barre au front',            'Bras',       75, 0.40, 0.00, false],
  ['Squat',                     'Jambes',    180, 0.55, 0.85, false],
  ['Presse à cuisses',          'Jambes',    150, 0.45, 0.00, false],
  ['Fentes',                    'Jambes',    120, 0.45, 0.85, false],
  ['Leg extension',             'Jambes',     90, 0.45, 0.00, false],
  ['Leg curl',                  'Jambes',     90, 0.40, 0.00, false],
  ['Hip thrust',                'Jambes',    120, 0.30, 0.50, false],
  ['Mollets debout',            'Jambes',     60, 0.15, 0.85, false],
  ['Crunch',                    'Abdos',      45, 0.30, 0.35, true],
  ['Relevé de jambes',          'Abdos',      60, 0.45, 0.35, true],
  ['Gainage',                   'Abdos',      45, 0.05, 0.00, true],
].map(([nom, groupe, rest, rom, bw, pdc]) => ({ nom, groupe, rest, rom, bw, pdc }));

const DEFAULT_ROM = 0.45;

/* ---------------------------------------------------------
   2. État + persistance
   --------------------------------------------------------- */
const KEY = 'gymrec.v1';
const KEY_ANCIENNE = 'fabfit.v1';   // ancien nom de l'app : on récupère les données existantes

const defaultProfile = {
  poids: 80, taille: 178, age: 30, sexe: 'h',
  activite: 1.375, objectif: 'hypertrophie',
  restDefault: 90, autoTimer: true, son: true,
};

let state = {
  profile: { ...defaultProfile },
  modeles: [],       // séances réutilisables (§18)
  session: null,     // séance en cours
  history: [],       // séances terminées
  recapId: null,     // séance dont le récap reste à afficher (§48)
  editId: null,      // modèle en cours d'édition
};

function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {                                  // migration depuis l'ancienne clé
      raw = localStorage.getItem(KEY_ANCIENNE);
      if (raw) { localStorage.setItem(KEY, raw); localStorage.removeItem(KEY_ANCIENNE); }
    }
    if (!raw) return;
    const d = JSON.parse(raw);
    state.profile = { ...defaultProfile, ...(d.profile || {}) };
    state.modeles = d.modeles || [];
    state.session = d.session || null;
    state.history = d.history || [];
    state.recapId = d.recapId || null;
  } catch (e) { console.warn('Chargement impossible', e); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Sauvegarde impossible', e); }
}

const uid = () => Math.random().toString(36).slice(2, 9);
// Les noms d'exercices sont saisis par l'utilisateur : jamais injectés bruts en HTML
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------------------------------------------
   3. Calculs : volume, calories, macros
   --------------------------------------------------------- */

// Masse réellement déplacée sur une série : sert au calcul de la dépense énergétique
function masseSerie(exo, set, poids) {
  return set.charge + (exo.bw || 0) * poids;
}

// Charge de référence pour les records : la barre seule, sauf pour les mouvements
// au poids du corps (tractions, dips, pompes…) où le corps EST la charge.
function masseRecord(exo, set, poids) {
  return set.charge + (exo.pdc ? (exo.bw || 0) * poids : 0);
}

function volumeSeance(session, poids) {
  let sets = 0, reps = 0, tonnage = 0, travailJ = 0, rpeSomme = 0, rpeNb = 0;
  for (const exo of session.exercices) {
    for (const s of exo.sets) {
      sets++;
      reps += s.reps;
      tonnage += s.charge * s.reps;
      if (s.rpe) { rpeSomme += s.rpe; rpeNb++; }
      const m = masseSerie(exo, s, poids);
      // travail mécanique concentrique + surcoût excentrique (facteur 1.2)
      travailJ += m * 9.81 * (exo.rom || DEFAULT_ROM) * s.reps * 1.2;
    }
  }
  return { sets, reps, tonnage, travailJ, rpeMoyen: rpeNb ? rpeSomme / rpeNb : null };
}

/* --- Marge à l'échec et 1RM estimé ------------------------------------
   En interne le moteur raisonne en RPE (échelle 6-10) ; côté écran on ne
   parle que de reps en réserve. RIR = 10 − RPE. Epley corrigé de la marge :
   8 reps avec 2 en réserve valent un maximum de 10 reps.                */
const RIR = rpe => (rpe ? 10 - rpe : 0);
function e1RM(masse, reps, rpe) {
  const n = reps + RIR(rpe);
  return masse * (1 + n / 30);
}

function dureeSeance(session) {
  if (!session || !session.start) return 0;
  const fin = session.end || Date.now();
  return Math.max(0, Math.round((fin - session.start) / 1000)); // secondes
}

/**
 * Dépense énergétique = coût de présence (MET 3) + coût mécanique du travail
 * (rendement musculaire ~22 %) + EPOC (surconsommation post-effort).
 */
function calories(session, profile) {
  const P = profile.poids;
  const secondes = dureeSeance(session);
  const minutes = secondes / 60;
  const { travailJ, reps, sets, tonnage, rpeMoyen } = volumeSeance(session, P);

  const kcalBase = 3.0 * 3.5 * P / 200 * minutes;      // MET 3 : debout, déplacements, échauffement
  // Plus les séries sont proches de l'échec, plus le coût métabolique dépasse le travail pur
  const fRpe = rpeMoyen ? clamp(1 + (rpeMoyen - 7) * 0.035, 0.9, 1.15) : 1;
  const kcalMeca = travailJ / 0.22 / 4184 * fRpe;      // rendement 22 %
  const densite = secondes ? clamp((reps * 3) / secondes, 0, 0.6) : 0;
  const epocPct = 0.06 + densite * 0.10;               // 6 % → 12 % selon la densité
  const kcalEpoc = (kcalBase + kcalMeca) * epocPct;

  return {
    base: kcalBase, meca: kcalMeca, epoc: kcalEpoc,
    total: kcalBase + kcalMeca + kcalEpoc,
    minutes, densite, reps, sets, tonnage, travailJ, rpeMoyen, fRpe,
  };
}

const OBJECTIFS = {
  hypertrophie: {
    label: 'Hypertrophie',
    post: { p: 0.40, g: 1.00, l: 0.15 },
    jour: { prot: 1.9, lip: 0.9, delta: +0.12 },
    note: "Surplus calorique léger et glucides généreux : on recharge le glycogène et on maximise la synthèse protéique dans les 2 h qui suivent.",
  },
  stabilite: {
    label: 'Stabilité',
    post: { p: 0.35, g: 0.70, l: 0.15 },
    jour: { prot: 1.7, lip: 0.9, delta: 0 },
    note: "Maintenance : on couvre la dépense de la séance sans excédent, protéines suffisantes pour conserver la masse musculaire.",
  },
  seche: {
    label: 'Sèche',
    post: { p: 0.45, g: 0.35, l: 0.10 },
    jour: { prot: 2.2, lip: 0.8, delta: -0.18 },
    note: "Déficit maîtrisé : protéines hautes pour protéger le muscle, glucides concentrés autour de l'entraînement, lipides réduits sur cette collation.",
  },
};

function macrosPost(kcalSeance, profile) {
  const P = profile.poids;
  const o = OBJECTIFS[profile.objectif] || OBJECTIFS.hypertrophie;
  // Plus la séance a coûté cher, plus la recharge glucidique est importante
  const intensite = clamp(kcalSeance / (P * 4.5), 0.7, 1.25);
  const prot = o.post.p * P;
  const gluc = o.post.g * P * intensite;
  const lip  = o.post.l * P;
  return {
    prot: round(prot), gluc: round(gluc), lip: round(lip),
    kcal: round(prot * 4 + gluc * 4 + lip * 9),
    intensite, note: o.note, label: o.label,
  };
}

function besoinsJour(kcalSeance, profile) {
  const { poids: P, taille: T, age: A, sexe, activite } = profile;
  const bmr = sexe === 'h'
    ? 10 * P + 6.25 * T - 5 * A + 5
    : 10 * P + 6.25 * T - 5 * A - 161;
  const o = OBJECTIFS[profile.objectif] || OBJECTIFS.hypertrophie;
  const maintien = bmr * activite + kcalSeance;
  const cible = maintien * (1 + o.jour.delta);
  const prot = o.jour.prot * P;
  const lip  = o.jour.lip * P;
  const gluc = Math.max(0, (cible - prot * 4 - lip * 9) / 4);
  return { bmr, maintien, cible, prot, lip, gluc };
}

// Traduction des macros en aliments courants
function aliments(m) {
  const dosesWhey = m.prot / 24;              // 1 dose de 30 g ≈ 24 g de protéines
  const gPoulet   = (m.prot * 0.5) / 0.31;    // moitié des protéines en solide
  const gRiz      = (m.gluc * 0.65) / 0.28;   // riz blanc cuit : 28 g de glucides /100 g
  const nBanane   = (m.gluc * 0.35) / 23;     // 1 banane ≈ 23 g de glucides
  const gAmandes  = m.lip / 0.50;             // amandes : 50 g de lipides /100 g
  return [
    ['Whey (tout en shaker)', `${round(dosesWhey, 1)} dose${dosesWhey >= 2 ? 's' : ''} (~${round(dosesWhey * 30)} g)`],
    ['ou blanc de poulet + 1 dose', `${round(gPoulet)} g de poulet`],
    ['Riz blanc cuit', `${round(gRiz)} g`],
    ['Banane', `${round(nBanane, 1)}`],
    ['Amandes', `${round(gAmandes)} g`],
  ];
}

/* ---------------------------------------------------------
   3 bis. Records par exercice
   --------------------------------------------------------- */
const cle = nom => nom.trim().toLowerCase();

// Historique + séance en cours, pour que les records tiennent compte du jour même
function toutesLesSeances() {
  const l = [...state.history];
  if (state.session) l.push({ ...state.session, poidsCorps: state.profile.poids });
  return l;
}

function records() {
  const map = new Map();
  for (const seance of toutesLesSeances()) {
    const P = seance.poidsCorps || state.profile.poids;
    for (const exo of seance.exercices || []) {
      if (!exo.sets || !exo.sets.length) continue;
      const k = cle(exo.nom);
      let r = map.get(k);
      if (!r) {
        r = { nom: exo.nom, groupe: exo.groupe, pdc: !!exo.pdc, seances: 0, sets: 0, reps: 0, tonnage: 0,
              e1rm: null, masse: null, serie: null, volSeance: null, derniere: 0, rpeSomme: 0, rpeNb: 0 };
        map.set(k, r);
      }
      r.seances++;
      let volSeance = 0;
      for (const set of exo.sets) {
        const m = set.mref != null ? set.mref : masseRecord(exo, set, P);
        const perf = { date: set.ts || seance.start, reps: set.reps, charge: set.charge, rpe: set.rpe || null, masse: m };
        const e = e1RM(m, set.reps, set.rpe);
        const vol = m * set.reps;
        r.sets++; r.reps += set.reps; r.tonnage += set.charge * set.reps;
        volSeance += vol;
        if (set.rpe) { r.rpeSomme += set.rpe; r.rpeNb++; }
        if (!r.e1rm  || e   > r.e1rm.v)  r.e1rm  = { v: e, ...perf };
        if (!r.masse || m   > r.masse.v) r.masse = { v: m, ...perf };
        if (!r.serie || vol > r.serie.v) r.serie = { v: vol, ...perf };
        r.derniere = Math.max(r.derniere, perf.date);
      }
      if (!r.volSeance || volSeance > r.volSeance.v) r.volSeance = { v: volSeance, date: seance.start };
    }
  }
  return [...map.values()];
}

const recordDe = nom => records().find(r => cle(r.nom) === cle(nom)) || null;

// Une entrée par séance où l'exercice a été travaillé, du plus ancien au plus récent
function serieExercice(nom) {
  const out = [];
  for (const seance of toutesLesSeances()) {
    const P = seance.poidsCorps || state.profile.poids;
    let e1 = 0, volume = 0, reps = 0, sets = 0, rpeS = 0, rpeN = 0, best = null;
    for (const exo of seance.exercices || []) {
      if (cle(exo.nom) !== cle(nom)) continue;
      for (const set of exo.sets) {
        const m = set.mref != null ? set.mref : masseRecord(exo, set, P);
        const e = e1RM(m, set.reps, set.rpe);
        sets++; reps += set.reps; volume += m * set.reps;
        if (set.rpe) { rpeS += set.rpe; rpeN++; }
        if (e > e1) { e1 = e; best = { reps: set.reps, masse: m, rpe: set.rpe }; }
      }
    }
    if (sets) out.push({
      t: seance.start, encours: !seance.end,
      e1rm: e1, volume, sets, reps, best,
      rpe: rpeN ? rpeS / rpeN : null,
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

function filtrerPeriode(serie, periode) {
  if (periode === '12') return serie.slice(-12);
  if (periode === '90') { const l = Date.now() - 90 * 86400000; return serie.filter(d => d.t >= l); }
  return serie;
}

/* ---------------------------------------------------------
   4. Formatage
   --------------------------------------------------------- */
const pad = n => String(n).padStart(2, '0');
const mmss = s => `${pad(Math.floor(Math.abs(s) / 60))}:${pad(Math.abs(s) % 60)}`;
function hhmm(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function dureeTxt(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h${pad(m)}` : `${m} min`;
}
function dateTxt(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ---------------------------------------------------------
   5. Chronomètre de récupération
   --------------------------------------------------------- */
const timer = { duree: 90, restant: 90, endAt: 0, running: false, tick: null, wakeLock: null };
const CIRC = 2 * Math.PI * 88;

let audioCtx = null;
function bip(freq = 880, ms = 140, gain = 0.25) {
  if (!state.profile.son) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* son indisponible */ }
}
function vibrer(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

async function garderEcranAllume(on) {
  try {
    if (on && 'wakeLock' in navigator && !timer.wakeLock) {
      timer.wakeLock = await navigator.wakeLock.request('screen');
      timer.wakeLock.addEventListener('release', () => { timer.wakeLock = null; });
    } else if (!on && timer.wakeLock) {
      await timer.wakeLock.release(); timer.wakeLock = null;
    }
  } catch (e) { /* non supporté */ }
}

function setDuree(sec, autoStart = false) {
  timer.duree = Math.max(5, Math.round(sec));
  timer.restant = timer.duree;
  timer.running = false;
  clearInterval(timer.tick);
  renderTimer();
  if (autoStart) startTimer();
}

function startTimer() {
  if (timer.restant <= 0) timer.restant = timer.duree;
  timer.endAt = Date.now() + timer.restant * 1000;
  timer.running = true;
  clearInterval(timer.tick);
  timer.tick = setInterval(onTick, 100);
  garderEcranAllume(true);
  bip(660, 90, 0.15);
  renderTimer();
}
function pauseTimer() {
  timer.running = false;
  clearInterval(timer.tick);
  garderEcranAllume(false);
  renderTimer();
}
let dernierBip = null;
function onTick() {
  const restant = (timer.endAt - Date.now()) / 1000;
  timer.restant = restant;
  const s = Math.ceil(restant);
  if (s > 0 && s <= 3 && dernierBip !== s) { dernierBip = s; bip(760, 110); vibrer(60); }
  if (restant <= 0) {
    timer.restant = 0; timer.running = false;
    clearInterval(timer.tick);
    dernierBip = null;
    garderEcranAllume(false);
    bip(1040, 500, 0.3); vibrer([120, 80, 120, 80, 200]);
    setTimeout(() => bip(1320, 400, 0.25), 260);
    toast('Récup terminée — go !');
  }
  renderTimer();
}

function renderTimer() {
  const restant = Math.max(0, timer.restant);
  const affiche = Math.ceil(restant);
  $('#timerDisplay').textContent = mmss(affiche);
  const ratio = timer.duree ? clamp(restant / timer.duree, 0, 1) : 0;
  $('#ringFg').style.strokeDashoffset = String(CIRC * (1 - ratio));
  $('#btnToggle').textContent = timer.running ? 'Pause' : (restant > 0 && restant < timer.duree ? 'Reprendre' : 'Démarrer');
  $('.timer-card').classList.toggle('done', !timer.running && restant === 0);
  $('#timerLabel').textContent = timer.running ? 'Récupération' : (restant === 0 ? 'Série suivante' : 'En pause');
  $$('#presets .chip').forEach(c => c.classList.toggle('active', +c.dataset.sec === timer.duree));
}

/* ---------------------------------------------------------
   6. Séance
   --------------------------------------------------------- */
function demarrerSeance(modeleId) {
  const m = state.modeles.find(x => x.id === modeleId);
  state.session = {
    id: uid(), start: Date.now(), end: null,
    nom: m ? m.nom : 'Séance libre', modeleId: m ? m.id : null,
    exercices: (m ? m.exercices : []).map(e => ({ ...e, id: uid(), sets: [], chargeSuivante: null })),
    curExo: 0,
    finDerniereSerie: null,   // pour mesurer le repos réel (§29)
    attente: null,            // question de feedback en cours (§23-24)
    reco: null,               // recommandation inter-séries (§30)
    saisie: null,
  };
  state.recapId = null;
  save(); renderAll(); allerA('rec');
  toast('Séance démarrée à ' + hhmm(state.session.start));
}

function terminerSeance() {
  const s = state.session;
  if (!s) return;
  const v = volumeSeance(s, state.profile.poids);
  if (v.sets === 0 && !confirm('Aucune série enregistrée. Terminer quand même ?')) return;
  s.end = Date.now();
  const k = calories(s, state.profile);
  const repos = [];
  for (const exo of s.exercices) for (const set of exo.sets) if (set.reposAvant) repos.push(set.reposAvant);
  const fini = {
    ...s,
    duree: dureeSeance(s),
    reposMoyen: repos.length ? Math.round(repos.reduce((a, b) => a + b, 0) / repos.length) : null,
    sets: v.sets, reps: v.reps, tonnage: v.tonnage,
    rpeMoyen: v.rpeMoyen ? round(v.rpeMoyen, 1) : null,
    kcal: round(k.total),
    poidsCorps: state.profile.poids,
    objectif: state.profile.objectif,
    macros: macrosPost(k.total, state.profile),
  };
  state.history.unshift(fini);
  state.session = null;
  state.recapId = fini.id;      // le récap s'affiche à la place de l'écran du jour (§48)
  pauseTimer();
  save(); renderAll(); allerA('today');
}

// Fiche d'un exercice, avec son plan (§18) : séries, reps et charge visées
function ficheExercice(nom, groupe, rest, plan = {}) {
  const ref = LIB.find(e => e.nom.toLowerCase() === nom.trim().toLowerCase());
  return {
    id: uid(),
    nom: ref ? ref.nom : nom.trim(),
    groupe: groupe || (ref ? ref.groupe : 'Autre'),
    rest: rest || (ref ? ref.rest : state.profile.restDefault),
    rom: ref ? ref.rom : DEFAULT_ROM,
    bw: ref ? ref.bw : 0,
    pdc: ref ? !!ref.pdc : false,
    series: plan.series || 4,
    repsCible: plan.repsCible || 10,
    chargeCible: plan.chargeCible != null ? plan.chargeCible : null,
    chargeSuivante: null,
    sets: [],
  };
}

function ajouterExercice(nom, groupe, rest) {
  if (!state.session) demarrerSeance(null);
  state.session.exercices.push(ficheExercice(nom, groupe, rest));
  save(); renderSeance();
}

function ajouterSerie(exoId, reps, charge) {
  const s = state.session;
  const exo = s.exercices.find(e => e.id === exoId);
  if (!exo || !reps) return;
  const avant = recordDe(exo.nom);                       // records d'avant cette série
  const now = Date.now();
  const set = {
    reps: +reps, charge: +charge || 0, ts: now,
    // le repos réellement pris, mesuré et non déclaré (§29) : il nourrit le modèle de récupération
    reposAvant: s.finDerniereSerie ? Math.round((now - s.finDerniereSerie) / 1000) : null,
    rir: null, rpe: null, difficulte: null,
    // 1RM de référence avant cette série : le record se juge contre lui
    ref: avant && avant.e1rm ? avant.e1rm.v : null,
  };
  set.masse = masseSerie(exo, set, state.profile.poids); // figées : le poids de corps peut changer
  set.mref  = masseRecord(exo, set, state.profile.poids);

  exo.sets.push(set);
  s.finDerniereSerie = now;
  s.saisie = null;
  s.curExo = s.exercices.indexOf(exo);
  s.reco = null;

  // séries prévues faites : on enchaîne, une décision à la fois (§10)
  if (exo.series && exo.sets.length >= exo.series) {
    const suivant = s.exercices.findIndex(e => !e.series || e.sets.length < e.series);
    if (suivant >= 0) s.curExo = suivant;
  }
  // Le 1RM estimé croît avec la marge : sans réponse on compare au plancher
  // (marge nulle), puis de nouveau quand la marge est connue. Un record n'est
  // donc jamais manqué si le pratiquant ignore la question.
  verifierRecord(exo, set);

  if (feedbackRequis(exo, set)) {
    s.attente = { exoId, i: exo.sets.length - 1, etape: 'difficulte' };   // §23 : une question, un tap
  } else {
    s.attente = null;
    poserRir(exo, set, rirAppris(exo.nom), 'historique');                 // §27 : ne pas redemander ce qu'on sait
  }

  save(); renderSeance(); renderRecords(); renderProgres();
  setDuree(exo.rest, state.profile.autoTimer);
  vibrer(40);
}

// Un record se juge sur le 1RM estimé, qui dépend du RIR : on l'évalue une fois
// le RIR connu, et on ne le signale qu'une seule fois.
function verifierRecord(exo, set) {
  const ref = set.ref;
  if (!ref || set.pr) return;
  const e = e1RM(set.mref, set.reps, set.rpe);
  if (e > ref + 0.01) {
    set.pr = true;
    toast(`🏆 Record ${exo.nom} : 1RM estimé ${round(e)} kg`);
    bip(880, 130); setTimeout(() => bip(1100, 130), 150); setTimeout(() => bip(1320, 280), 300);
    vibrer([80, 60, 80, 60, 160]);
  }
}

/* ---------------------------------------------------------
   6 bis. Feedback, RIR et recommandation
   Le pratiquant ne saisit jamais un RIR : il répond à une question
   simple (§24), GymRec en déduit la donnée interne (§25).
   --------------------------------------------------------- */

// Difficulté ressentie → reps en réserve. Grille volontairement grossière :
// la question binaire l'affine quand la confiance est faible.
const RIR_PAR_DIFFICULTE = { facile: 3, bien: 2, dur: 1 };

function setsDe(nom) {
  const out = [];
  for (const seance of toutesLesSeances())
    for (const exo of seance.exercices || [])
      if (cle(exo.nom) === cle(nom)) out.push(...exo.sets);
  return out;
}

const nbFeedbacks = nom => setsDe(nom).filter(x => x.difficulte).length;

// Ce que GymRec a appris de cet exercice : le RIR habituel du pratiquant
function rirAppris(nom) {
  const notes = setsDe(nom).filter(x => x.rir != null).slice(-5);
  if (!notes.length) return 2;
  return Math.round(notes.reduce((a, x) => a + x.rir, 0) / notes.length);
}

/* Active learning (§27) : beaucoup de questions au début, puis seulement
   quand la confiance est faible ou la série atypique. */
function feedbackRequis(exo, set) {
  if (nbFeedbacks(exo.nom) < 3) return true;                       // confiance faible
  if (exo.repsCible && set.reps !== exo.repsCible) return true;    // objectif non tenu
  const precedent = exo.sets[exo.sets.length - 2];
  if (precedent && precedent.charge !== set.charge) return true;   // la charge a changé
  return false;
}

const confianceFaible = nom => nbFeedbacks(nom) < 3;

function poserRir(exo, set, rir, source) {
  set.rir = rir;
  set.rpe = 10 - rir;            // le moteur (1RM estimé, calories) raisonne en RPE
  set.rirSource = source;
  verifierRecord(exo, set);
  calculerReco(exo, set);
}

function repondreDifficulte(d) {
  const s = state.session, a = s && s.attente;
  if (!a) return;
  const exo = s.exercices.find(e => e.id === a.exoId);
  const set = exo.sets[a.i];
  set.difficulte = d;
  if (confianceFaible(exo.nom)) {
    a.etape = 'encore2';         // on précise, tant qu'on connaît mal le pratiquant
  } else {
    s.attente = null;
    poserRir(exo, set, RIR_PAR_DIFFICULTE[d], 'feedback');
  }
  save(); renderSeance();
}

function repondreQuestion(oui) {
  const s = state.session, a = s && s.attente;
  if (!a) return;
  const exo = s.exercices.find(e => e.id === a.exoId);
  const set = exo.sets[a.i];
  if (a.etape === 'encore2') {
    if (oui) { s.attente = null; poserRir(exo, set, 2, 'question'); }
    else a.etape = 'encore1';
  } else {
    s.attente = null;
    poserRir(exo, set, oui ? 1 : 0, 'question');
  }
  save(); renderSeance();
}

/* Règles d'adaptation du MVP (§31). Le pas suit la charge : on ne propose pas
   +5 kg sur un curl à 12 kg. */
const pasCharge = c => (c >= 60 ? 5 : c >= 20 ? 2.5 : 1);

function calculerReco(exo, set) {
  const cible = exo.repsCible || set.reps;
  const pas = pasCharge(set.charge);
  // la marge fait foi : la question binaire est plus précise que le ressenti
  const marge = set.rir != null ? set.rir : RIR_PAR_DIFFICULTE[set.difficulte] || 2;
  let charge = set.charge, motif;

  if (set.reps >= cible && marge >= 3) {
    charge = set.charge + pas;
    motif = `Objectif atteint avec ${marge} reps en réserve : la charge peut monter.`;
  } else if (set.reps < cible - 1 || (marge === 0 && set.reps < cible)) {
    charge = Math.max(0, set.charge - pas);
    motif = `Objectif non atteint (${set.reps} au lieu de ${cible}) : on redescend pour garder la qualité d'exécution.`;
  }
  // intelligence silencieuse (§11) : on ne dérange que si la consigne change
  state.session.reco = charge === set.charge
    ? null
    : { exoId: exo.id, charge, reps: cible, motif, change: true };
}

function accepterReco() {
  const s = state.session, r = s && s.reco;
  if (!r) return;
  const exo = s.exercices.find(e => e.id === r.exoId);
  exo.chargeSuivante = r.charge;
  s.reco = null; s.saisie = null;
  save(); renderSeance();
  toast(`Prochaine série : ${r.charge} kg × ${r.reps}`);
}

function refuserReco() {
  state.session.reco = null;
  save(); renderSeance();
}

/* ---------------------------------------------------------
   6 ter. Séance courante et modèles
   --------------------------------------------------------- */
function exoCourant() {
  const s = state.session;
  if (!s || !s.exercices.length) return null;
  return s.exercices[Math.min(s.curExo || 0, s.exercices.length - 1)];
}

// Valeurs pré-remplies de la prochaine série : le plan d'abord, sinon la série précédente
function saisiePour(exo) {
  const s = state.session;
  if (!s.saisie || s.saisie.exoId !== exo.id) {
    const last = exo.sets[exo.sets.length - 1];
    s.saisie = {
      exoId: exo.id,
      reps: exo.repsCible || (last ? last.reps : 10),
      charge: exo.chargeSuivante != null ? exo.chargeSuivante
            : exo.chargeCible != null ? exo.chargeCible
            : last ? last.charge : 0,
    };
  }
  return s.saisie;
}

// Durée estimée d'une séance : temps sous tension + récupérations
function dureeEstimee(modele) {
  let sec = 0;
  for (const e of modele.exercices) sec += (e.series || 4) * ((e.repsCible || 10) * 3 + (e.rest || 90));
  return sec;
}

function modeleDepuisSeance(seance, nom) {
  return {
    id: uid(), nom,
    exercices: seance.exercices.map(e => ({
      nom: e.nom, groupe: e.groupe, rest: e.rest, rom: e.rom, bw: e.bw, pdc: e.pdc,
      series: e.sets.length || e.series || 4,
      repsCible: e.repsCible || (e.sets[0] ? e.sets[0].reps : 10),
      chargeCible: e.chargeCible != null ? e.chargeCible : (e.sets[0] ? e.sets[0].charge : null),
    })),
  };
}

/* ---------------------------------------------------------
   6 quater. Insights (§50)
   Des conclusions, pas des statistiques. Chaque analyse porte son
   seuil de données : en dessous elle se tait, et dit ce qui lui manque.
   --------------------------------------------------------- */

// Ce qu'une série a réellement produit : reps × masse déplacée
const perfSet = set => set.reps * (set.mref != null ? set.mref : set.charge);

// Toutes les fois où un exercice a été travaillé, du plus ancien au plus récent
function seancesDe(nom) {
  const out = [];
  for (const seance of toutesLesSeances())
    for (const exo of seance.exercices || [])
      if (cle(exo.nom) === cle(nom) && exo.sets.length)
        out.push({ t: seance.start, exo, sets: exo.sets });
  return out.sort((a, b) => a.t - b.t);
}

const chargeMax = sets => Math.max(...sets.map(x => x.charge));

/* « Tu sembles prêt à augmenter la charge. »
   Deux séances au moins, objectif tenu, et de la marge sur les deux. */
function insightProgression() {
  const out = [];
  for (const r of records()) {
    const seances = seancesDe(r.nom);
    if (seances.length < 2) continue;
    const derniere = seances[seances.length - 1], avant = seances[seances.length - 2];
    const cible = derniere.exo.repsCible;
    const notes = derniere.sets.filter(x => x.rir != null);
    if (!cible || notes.length < 2) continue;
    if (!derniere.sets.every(x => x.reps >= cible)) continue;
    if (chargeMax(derniere.sets) !== chargeMax(avant.sets)) continue;   // la charge a déjà bougé
    const marge = notes.reduce((a, x) => a + x.rir, 0) / notes.length;
    if (marge < 2) continue;
    const c = chargeMax(derniere.sets), pas = pasCharge(c);
    out.push({
      cat: 'Progression', poids: 3,
      texte: `Tu sembles prêt à passer à ${c + pas} kg sur ${r.nom}.`,
      detail: `Sur tes deux dernières séances tu as tenu ${cible} reps à ${c} kg, avec ${round(marge, 1)} reps en réserve en moyenne.`,
    });
  }
  return out;
}

/* « Tu performes mieux avec environ 2 minutes de récupération sur cet exercice. »
   On compare ce que rend la série suivante selon le repos réellement pris. */
const PANIERS_REPOS = [
  { nom: 'moins de 1 min 30', test: r => r < 90 },
  { nom: 'environ 2 minutes', test: r => r >= 90 && r < 150 },
  { nom: 'plus de 2 min 30', test: r => r >= 150 },
];

function insightRecuperation() {
  const out = [];
  for (const r of records()) {
    const obs = [];
    for (const { sets } of seancesDe(r.nom)) {
      for (let i = 1; i < sets.length; i++) {
        const base = perfSet(sets[i - 1]);
        if (!sets[i].reposAvant || !base) continue;
        obs.push({ repos: sets[i].reposAvant, ratio: perfSet(sets[i]) / base });
      }
    }
    if (obs.length < 6) continue;
    const paniers = PANIERS_REPOS
      .map(p => ({ ...p, obs: obs.filter(o => p.test(o.repos)) }))
      .filter(p => p.obs.length >= 3)
      .map(p => ({ ...p, moy: p.obs.reduce((a, o) => a + o.ratio, 0) / p.obs.length }));
    if (paniers.length < 2) continue;
    paniers.sort((a, b) => b.moy - a.moy);
    const meilleur = paniers[0], pire = paniers[paniers.length - 1];
    if (meilleur.moy - pire.moy < 0.05) continue;      // écart trop faible pour conclure
    out.push({
      cat: 'Récupération', poids: 2,
      texte: `Tu enchaînes mieux avec ${meilleur.nom} de récupération sur ${r.nom}.`,
      detail: `Sur ${obs.length} enchaînements, la série suivante rend ${round((meilleur.moy - pire.moy) * 100)} % de plus qu'avec ${pire.nom}.`,
    });
  }
  return out;
}

/* « Tes performances diminuent fortement après environ 15 séries pecs. »
   On suit la baisse de rendement au fil des séries d'un même groupe. */
function insightVolume() {
  const parGroupe = new Map();     // groupe → [ratios par rang de série]
  let seancesParGroupe = new Map();
  for (const seance of toutesLesSeances()) {
    const parG = new Map();
    for (const exo of seance.exercices || [])
      for (const set of exo.sets) {
        if (!parG.has(exo.groupe)) parG.set(exo.groupe, []);
        parG.get(exo.groupe).push(set);
      }
    for (const [g, sets] of parG) {
      sets.sort((a, b) => a.ts - b.ts);
      const base = perfSet(sets[0]);
      if (!base || sets.length < 4) continue;
      if (!parGroupe.has(g)) { parGroupe.set(g, []); seancesParGroupe.set(g, 0); }
      seancesParGroupe.set(g, seancesParGroupe.get(g) + 1);
      const rangs = parGroupe.get(g);
      sets.forEach((x, i) => { (rangs[i] = rangs[i] || []).push(perfSet(x) / base); });
    }
  }
  const out = [];
  for (const [g, rangs] of parGroupe) {
    if (seancesParGroupe.get(g) < 3) continue;
    const moy = rangs.map(v => (v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null));
    const chute = moy.findIndex((m, i) => m != null && m < 0.85 && moy.slice(0, i).some(x => x != null && x >= 0.95));
    if (chute < 0) continue;
    out.push({
      cat: 'Volume', poids: 1,
      texte: `Tes performances baissent nettement après environ ${chute} séries pour ${g === 'Abdos' ? 'les abdos' : 'les ' + g.toLowerCase()}.`,
      detail: `Au-delà, la série rend en moyenne ${round((1 - moy[chute]) * 100)} % de moins que la première du groupe.`,
    });
  }
  return out;
}

function tousLesInsights() {
  return [...insightProgression(), ...insightRecuperation(), ...insightVolume()]
    .sort((a, b) => b.poids - a.poids)
    .slice(0, 5);
}

// Ce qu'il manque pour conclure, dit franchement plutôt que d'inventer
function manqueInsights() {
  const seances = state.history.length;
  const avecMarge = toutesLesSeances().some(s => (s.exercices || [])
    .some(e => e.sets.some(x => x.rir != null)));
  const avecRepos = toutesLesSeances().some(s => (s.exercices || [])
    .some(e => e.sets.some(x => x.reposAvant)));
  const l = [];
  if (seances < 2) l.push('au moins deux séances enregistrées');
  if (!avecMarge) l.push('des réponses aux questions qui suivent tes séries');
  if (!avecRepos) l.push('des récupérations mesurées entre les séries');
  if (seances < 3) l.push('trois séances pour analyser le volume par groupe musculaire');
  return l;
}

/* ---------------------------------------------------------
   7. Rendu
   --------------------------------------------------------- */
function ligne(label, valeur, cls = '') {
  return `<div class="line ${cls}"><span>${label}</span><span>${valeur}</span></div>`;
}

function renderSeance() {
  const s = state.session;
  const P = state.profile.poids;

  // Quel écran : le jour, le récap de la séance qui vient de finir, ou la séance en cours
  const recap = state.recapId ? state.history.find(h => h.id === state.recapId) : null;
  $('#ecranToday').classList.toggle('hidden', !!s || !!recap);
  $('#ecranRecap').classList.toggle('hidden', !recap);
  $('#ecranActif').classList.toggle('hidden', !s);
  $('#blocSeance').classList.toggle('hidden', !s);
  $('.tab-rec').classList.toggle('enregistre', !!s);
  renderTodayApercu();
  if (recap) renderRecap(recap);
  if (!s) renderToday();
  else { renderSerieCourante(); renderFeedback(); renderReco(); }

  // Bandeau
  $('#startTime').textContent = s && s.start ? hhmm(s.start) : '—';
  $('#endTime').innerHTML     = s && s.end ? hhmm(s.end)
    : (s ? '<span class="rec-live"><i></i>REC</span>' : '—');   // témoin d'enregistrement
  $('#duration').textContent  = s ? mmss(dureeSeance(s)) : '00:00';

  const vide = { sets: 0, reps: 0, tonnage: 0, travailJ: 0 };
  const v = s ? volumeSeance(s, P) : vide;
  const k = s ? calories(s, state.profile)
              : { base: 0, meca: 0, epoc: 0, total: 0, minutes: 0, densite: 0 };

  $('#stSets').textContent    = v.sets;
  $('#stReps').textContent    = v.reps;
  $('#stTonnage').textContent = v.tonnage >= 1000 ? round(v.tonnage / 1000, 1) + 't' : round(v.tonnage);
  const repos = s ? s.exercices.flatMap(e => e.sets.map(x => x.reposAvant)).filter(Boolean) : [];
  $('#stRepos').textContent   = repos.length ? mmss(Math.round(repos.reduce((a, b) => a + b, 0) / repos.length)) : '—';
  $('#stKcal').textContent    = round(k.total);

  // Exercices
  const c = $('#exoContainer');
  c.innerHTML = '';
  const exos = s ? s.exercices : [];
  $('#exoEmpty').classList.toggle('hidden', exos.length > 0);

  exos.forEach((exo, i) => {
    const last = exo.sets[exo.sets.length - 1];
    const rec = recordDe(exo.nom);
    const prTxt = rec && rec.e1rm
      ? `<span class="pr-tag">PR 1RM est. ${round(rec.e1rm.v)} kg</span>` : '';
    const vol = exo.sets.reduce((a, x) => a + x.reps * x.charge, 0);
    const reps = exo.sets.reduce((a, x) => a + x.reps, 0);
    const el = document.createElement('div');
    el.className = 'exo';
    el.innerHTML = `
      <div class="exo-head">
        <div>
          <h3>${i + 1}. ${esc(exo.nom)}</h3>
          <div class="meta">${esc(exo.groupe)} · récup ${mmss(exo.rest)} · ${exo.sets.length} série(s) · ${reps} reps · ${round(vol)} kg</div>
          <div class="meta">${prTxt}</div>
        </div>
        <button class="del" data-del="${exo.id}" title="Supprimer">×</button>
      </div>
      <ul class="sets">
        ${exo.sets.map((set, j) => `
          <li>
            <span class="n">${j + 1}</span>
            <span class="info">${set.reps} reps × ${set.charge ? set.charge + ' kg' : 'poids du corps'}
              ${set.difficulte ? `<span class="rpe">${({ facile: '😌', bien: '👌', dur: '🔥' })[set.difficulte]}</span>` : ''}${set.pr ? '<span class="pr">🏆</span>' : ''}
              <span class="vol">· 1RM est. ${round(e1RM(set.mref != null ? set.mref : masseRecord(exo, set, P), set.reps, set.rpe))} kg
                · ${round(set.reps * (set.masse != null ? set.masse : masseSerie(exo, set, P)))} kg déplacés · ${hhmm(set.ts)}</span>
            </span>
            <button class="rm" data-rmset="${exo.id}" data-i="${j}">×</button>
          </li>`).join('')}
      </ul>
      <div class="add-set">
        <input type="number" inputmode="numeric" min="1" placeholder="reps" value="${last ? last.reps : ''}" data-reps="${exo.id}">
        <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="${last ? last.charge : ''}" data-charge="${exo.id}">
        <button class="btn primary" data-addset="${exo.id}">Valider</button>
        <button class="btn ghost pdc" data-timer="${exo.id}" title="Lancer la récup">⏱</button>
      </div>`;
    c.appendChild(el);
  });

  // Détail calories
  $('#kcalDetail').innerHTML =
    ligne('Durée effective', dureeTxt(dureeSeance(s || {}))) +
    ligne('Densité (temps sous tension)', round(k.densite * 100) + ' %') +
    ligne('Effort (reps en réserve)', k.rpeMoyen ? `${round(RIR(k.rpeMoyen), 1)} · coût ×${round(k.fRpe, 2)}` : 'non renseigné') +
    ligne('Travail mécanique', round((v.travailJ || 0) / 1000) + ' kJ') +
    ligne('Coût de présence (MET 3)', round(k.base) + ' kcal') +
    ligne('Coût du travail (rendement 22 %)', round(k.meca) + ' kcal') +
    ligne('EPOC (après la séance)', round(k.epoc) + ' kcal') +
    ligne('Total', '≈ ' + round(k.total) + ' kcal', 'total');

  // Macros post-training
  const m = macrosPost(k.total, state.profile);
  $$('#objectifRow .obj').forEach(b => b.classList.toggle('active', b.dataset.obj === state.profile.objectif));
  $('#macros').innerHTML = `
    <div class="macro p"><b>${m.prot}</b><em>g protéines</em></div>
    <div class="macro g"><b>${m.gluc}</b><em>g glucides</em></div>
    <div class="macro l"><b>${m.lip}</b><em>g lipides</em></div>`;
  $('#macroNote').innerHTML =
    `<strong>${m.kcal} kcal</strong> à prendre idéalement dans les 2 h. ${m.note}`;
  $('#foodIdeas').innerHTML = aliments(m).map(([a, b]) => ligne(a, b)).join('');

  // Journée
  const j = besoinsJour(k.total, state.profile);
  $('#dailyTargets').innerHTML =
    ligne('Métabolisme de base', round(j.bmr) + ' kcal') +
    ligne('Maintien (activité + séance)', round(j.maintien) + ' kcal') +
    ligne('Protéines', round(j.prot) + ' g') +
    ligne('Glucides', round(j.gluc) + ' g') +
    ligne('Lipides', round(j.lip) + ' g') +
    ligne(`Cible du jour — ${OBJECTIFS[state.profile.objectif].label}`, round(j.cible) + ' kcal', 'total');
}

function renderHistorique() {
  const h = state.history;
  $('#histoEmpty').classList.toggle('hidden', h.length > 0);
  $('#hSessions').textContent = h.length;
  $('#hSets').textContent     = h.reduce((a, s) => a + (s.sets || 0), 0);
  $('#hTonnage').textContent  = round(h.reduce((a, s) => a + (s.tonnage || 0), 0) / 1000, 1);
  $('#hKcal').textContent     = round(h.reduce((a, s) => a + (s.kcal || 0), 0));

  $('#historyList').innerHTML = h.map(s => {
    const exos = (s.exercices || []).map(e => `${esc(e.nom)} (${e.sets.length}×)`).join(' · ');
    return `<div class="hist">
      <div class="hist-head">
        <b>${dateTxt(s.start)} — ${hhmm(s.start)} → ${s.end ? hhmm(s.end) : '?'}</b>
        <button class="rm" data-rmhist="${s.id}">×</button>
      </div>
      <div class="hist-sub">${dureeTxt(s.duree)} · ${s.sets} séries · ${s.reps} reps · ${round(s.tonnage)} kg${s.rpeMoyen ? ' · marge ' + round(RIR(s.rpeMoyen), 1) : ''} · <strong>${s.kcal} kcal</strong></div>
      <div class="hist-sub">Post-training (${OBJECTIFS[s.objectif] ? OBJECTIFS[s.objectif].label : s.objectif}) :
        ${s.macros ? `${s.macros.prot} g P / ${s.macros.gluc} g G / ${s.macros.lip} g L` : '—'}</div>
      ${exos ? `<div class="hist-exos">${exos}</div>` : ''}
    </div>`;
  }).join('');
}

let progSel = null, progPeriode = 'tout';

function renderProgres() {
  const dispo = records().sort((a, b) => b.derniere - a.derniere);
  $('#progVide').classList.toggle('hidden', dispo.length > 0);
  $('#progContenu').classList.toggle('hidden', dispo.length === 0);
  if (!dispo.length) return;

  if (!dispo.some(r => cle(r.nom) === cle(progSel || ''))) progSel = dispo[0].nom;
  const sel = $('#progExo');
  sel.innerHTML = '';
  for (const r of dispo) {
    const o = document.createElement('option');
    o.value = r.nom;
    o.textContent = `${r.nom} — ${r.seances} séance(s)`;   // noms saisis par l'utilisateur
    o.selected = cle(r.nom) === cle(progSel);
    sel.appendChild(o);
  }
  $('#progPeriode').value = progPeriode;

  const serie = filtrerPeriode(serieExercice(progSel), progPeriode);
  const kg = v => round(v) + ' kg';

  // Chiffre-phare : 1RM estimé actuel + écart depuis le début de la période
  const dernier = serie[serie.length - 1], premier = serie[0];
  $('#progHero').textContent = dernier ? round(dernier.e1rm) + ' kg' : '—';
  if (serie.length > 1) {
    const d = dernier.e1rm - premier.e1rm;
    const pct = premier.e1rm ? (d / premier.e1rm) * 100 : 0;
    $('#progHeroSub').textContent =
      `${d >= 0 ? '+' : '−'}${round(Math.abs(d))} kg (${d >= 0 ? '+' : '−'}${round(Math.abs(pct))} %) depuis le ${Viz.fmtLong(premier.t)} · ${serie.length} séances`;
  } else {
    $('#progHeroSub').textContent = dernier
      ? `Une seule séance pour l'instant — les courbes se dessineront à la prochaine.`
      : '';
  }

  const infoBase = d => [
    ['1RM estimé', kg(d.e1rm)],
    ['meilleure série', d.best ? `${d.best.reps} × ${round(d.best.masse, 1)} kg${d.best.rpe ? ' @ ' + d.best.rpe : ''}` : '—'],
    ['séries', d.sets],
  ];

  Viz.chart($('#chartE1rm'), {
    type: 'line', color: Viz.COL.e1rm, titre: `1RM estimé — ${progSel}`,
    data: serie.map(d => ({ t: d.t, v: d.e1rm, info: infoBase(d) })),
    fmt: v => round(v) + ' kg',
  });
  const volMax = Math.max(0, ...serie.map(d => d.volume));
  const fmtVol = volMax >= 2000 ? (v => round(v / 1000, 1) + ' t') : (v => round(v) + ' kg');
  Viz.chart($('#chartVol'), {
    type: 'bar', color: Viz.COL.volume, titre: `Volume par séance — ${progSel}`,
    data: serie.map(d => ({ t: d.t, v: d.volume, info: [['volume', kg(d.volume)], ['séries', d.sets], ['reps', d.reps]] })),
    fmt: fmtVol,
  });
  const avecEffort = serie.filter(d => d.rpe != null);
  Viz.chart($('#chartRpe'), {
    type: 'line', color: Viz.COL.rpe, titre: `Marge à l'échec — ${progSel}`, domaine: [0, 5],
    vide: "Pas encore de retour sur cet exercice : réponds aux questions qui suivent tes séries.",
    data: avecEffort.map(d => ({
      t: d.t, v: RIR(d.rpe),
      info: [['reps en réserve', round(RIR(d.rpe), 1)], ['séries', d.sets]],
    })),
    fmt: v => round(v, 1),
  });

  // Vue tableau : aucune valeur n'est accessible seulement au survol
  const tb = document.createElement('table');
  tb.className = 'tbl';
  tb.innerHTML = '<thead><tr><th>Date</th><th>1RM est.</th><th>Volume</th><th>Marge</th><th>Top série</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const d of [...serie].reverse()) {
    const tr = document.createElement('tr');
    for (const txt of [
      Viz.fmtJour(d.t) + (d.encours ? ' (en cours)' : ''),
      kg(d.e1rm), kg(d.volume),
      d.rpe ? round(RIR(d.rpe), 1) : '—',
      d.best ? `${d.best.reps} × ${round(d.best.masse, 1)} kg` : '—',
    ]) {
      const td = document.createElement('td');
      td.textContent = txt;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tb.appendChild(tbody);
  $('#progTable').innerHTML = '';
  $('#progTable').appendChild(tb);
}

function ouvrirProgres(nom) {
  progSel = nom;
  allerA('insights');
}

// Bascule d'onglet depuis le code (démarrage, fin de séance, lien depuis un record)
function allerA(onglet) {
  const t = $(`.tab[data-tab="${onglet}"]`);
  if (t) t.click();
}

/* ---------------------------------------------------------
   7 bis. Écran du jour, série courante, feedback, recommandation, récap
   --------------------------------------------------------- */
function renderToday() {
  const el = $('#ecranToday');
  if (state.editId) { el.innerHTML = editeurModele(); return; }
  const m = state.modeles;
  el.innerHTML = `
    <div class="card">
      <h2>Aujourd'hui</h2>
      ${m.length ? m.map(x => `
        <button class="modele" data-demarrer="${x.id}">
          <span class="modele-nom">${esc(x.nom)}</span>
          <span class="modele-meta">${x.exercices.length} exercice(s) · ${x.exercices.reduce((a, e) => a + (e.series || 4), 0)} séries · ≈ ${dureeTxt(dureeEstimee(x))}</span>
        </button>`).join('')
        : `<p class="muted small">Aucune séance enregistrée. Démarre une séance libre : tu pourras la garder comme modèle à la fin.</p>`}
      <button class="btn ${m.length ? 'ghost' : 'primary'} pleine" id="btnLibre">Séance libre</button>
    </div>
    <div class="card">
      <h2>Mes séances</h2>
      ${m.length ? m.map(x => `
        <div class="ligne-modele">
          <span class="grow">${esc(x.nom)}</span>
          <button class="btn ghost" data-editer="${x.id}">Modifier</button>
          <button class="btn danger" data-suppmod="${x.id}" title="Supprimer">×</button>
        </div>`).join('') : '<p class="muted small">Rien pour l\'instant.</p>'}
      <button class="btn primary pleine" id="btnNouveauModele">Nouvelle séance</button>
    </div>`;
}

function editeurModele() {
  const m = state.modeles.find(x => x.id === state.editId);
  if (!m) { state.editId = null; return ''; }
  return `
    <div class="card">
      <h2>Composition de la séance</h2>
      <label>Nom<input id="modNom" value="${esc(m.nom)}"></label>
      ${m.exercices.map((e, i) => `
        <div class="plan-exo">
          <div class="plan-head"><b>${esc(e.nom)}</b><button class="del" data-suppexo="${i}">×</button></div>
          <div class="plan-champs">
            <label>Séries<input type="number" min="1" max="12" value="${e.series}" data-plan="series" data-i="${i}" inputmode="numeric"></label>
            <label>Reps<input type="number" min="1" max="50" value="${e.repsCible}" data-plan="repsCible" data-i="${i}" inputmode="numeric"></label>
            <label>Charge<input type="number" min="0" step="0.5" value="${e.chargeCible != null ? e.chargeCible : ''}" data-plan="chargeCible" data-i="${i}" inputmode="decimal"></label>
            <label>Récup (s)<input type="number" min="10" step="5" value="${e.rest}" data-plan="rest" data-i="${i}" inputmode="numeric"></label>
          </div>
        </div>`).join('')}
      <form id="planForm" class="row gap plan-ajout">
        <input id="planNom" list="exoList" class="grow" placeholder="Ajouter un exercice" autocomplete="off">
        <button class="btn primary" type="submit">+</button>
      </form>
      <div class="row gap">
        <button class="btn ghost grow" id="btnFinEdit">Enregistrer</button>
        <button class="btn primary grow" data-demarrer="${m.id}">Démarrer</button>
      </div>
    </div>`;
}

function renderSerieCourante() {
  const s = state.session, exo = exoCourant();
  if (!exo) {
    $('#serieCourante').innerHTML =
      `<div class="card"><h2>Séance libre</h2>
       <p class="muted small">Ajoute un exercice plus bas pour commencer à enregistrer.</p></div>`;
    return;
  }
  const sa = saisiePour(exo);
  const n = exo.sets.length + 1;
  const total = exo.series || 0;
  const reste = total ? Math.min(n, total) : n;
  $('#serieCourante').innerHTML = `
    <div class="card serie-card">
      <div class="serie-exo">${esc(exo.nom)}</div>
      <div class="serie-charge"><b>${sa.charge || 0}</b><span>kg</span></div>
      <div class="serie-meta">${total ? `Série ${reste} / ${total}` : `Série ${n}`} · objectif ${sa.reps} reps · récup ${mmss(exo.rest)}</div>
      <div class="steppers">
        <div class="stepper"><button data-pas="reps:-1">−</button><span>${sa.reps} reps</span><button data-pas="reps:1">+</button></div>
        <div class="stepper"><button data-pas="charge:-1">−</button><span>${sa.charge} kg</span><button data-pas="charge:1">+</button></div>
      </div>
      <button class="btn primary big pleine" id="btnValiderSerie">Valider la série</button>
      ${s.exercices.length > 1 ? `
        <div class="serie-nav">
          <button class="btn ghost" data-exo="-1">← Précédent</button>
          <span class="muted small">${(s.curExo || 0) + 1} / ${s.exercices.length}</span>
          <button class="btn ghost" data-exo="1">Suivant →</button>
        </div>` : ''}
      ${total && exo.sets.length >= total ? '<p class="muted small">Séries prévues terminées.</p>' : ''}
    </div>`;
}

function renderFeedback() {
  const a = state.session && state.session.attente;
  const el = $('#feedbackCard');
  if (!a) { el.innerHTML = ''; return; }
  if (a.etape === 'difficulte') {
    el.innerHTML = `
      <div class="card fb-card">
        <h2>Comment était cette série ?</h2>
        <div class="fb-row">
          <button class="fb" data-fb="facile"><b>😌</b>Facile</button>
          <button class="fb" data-fb="bien"><b>👌</b>Bien</button>
          <button class="fb" data-fb="dur"><b>🔥</b>Dur</button>
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="card fb-card">
        <h2>${a.etape === 'encore2' ? 'Aurais-tu pu faire 2 reps de plus ?' : 'Et une seule de plus ?'}</h2>
        <div class="row gap">
          <button class="btn primary grow" data-rep="oui">Oui</button>
          <button class="btn ghost grow" data-rep="non">Non</button>
        </div>
      </div>`;
  }
}

function renderReco() {
  const r = state.session && state.session.reco;
  const el = $('#recoCard');
  if (!r) { el.innerHTML = ''; return; }
  const exo = state.session.exercices.find(e => e.id === r.exoId);
  const derniere = exo.sets[exo.sets.length - 1];
  el.innerHTML = `
    <div class="card reco-card">
      <h2>Prochaine série</h2>
      <div class="reco-val">${r.charge} kg <i>×</i> ${r.reps}</div>
      <div class="row gap">
        <button class="btn primary grow" data-reco="ok">Accepter</button>
        <button class="btn ghost grow" data-reco="non">Garder ${derniere.charge} kg</button>
      </div>
      <details class="foods"><summary>Pourquoi ?</summary><p class="muted small">${esc(r.motif)}</p></details>
    </div>`;
}

function renderRecap(f) {
  const bloc = (v, l) => `<div><b>${v}</b><em>${l}</em></div>`;
  $('#ecranRecap').innerHTML = `
    <div class="card recap-card">
      <h2>Séance terminée</h2>
      <div class="recap-nom">${esc(f.nom || 'Séance')}</div>
      <div class="recap-grid">
        ${bloc(dureeTxt(f.duree), 'durée')}
        ${bloc(f.sets, 'séries')}
        ${bloc(f.reps, 'reps')}
        ${bloc(f.tonnage >= 1000 ? round(f.tonnage / 1000, 1) + ' t' : round(f.tonnage) + ' kg', 'soulevés')}
        ${bloc(f.reposMoyen ? mmss(f.reposMoyen) : '—', 'repos moyen')}
        ${bloc('≈ ' + f.kcal, 'kcal')}
      </div>
      ${f.macros ? `<p class="muted small recap-macros">Collation : ${f.macros.prot} g de protéines, ${f.macros.gluc} g de glucides, ${f.macros.lip} g de lipides.</p>` : ''}
      ${!f.modeleId ? '<button class="btn ghost pleine" id="btnGarderModele">Garder comme séance réutilisable</button>' : ''}
      <button class="btn primary big pleine" id="btnFermerRecap">Terminé</button>
    </div>`;
}

/* Les conclusions passent avant les statistiques (§9) : une phrase,
   et le détail chiffré seulement si on le demande (§7). */
function renderConclusions() {
  const l = tousLesInsights();
  const el = $('#conclusions');
  if (!l.length) {
    el.innerHTML = `
      <div class="card">
        <h2>Conclusions</h2>
        <p class="muted small">GymRec n'a pas encore de quoi conclure honnêtement.
        Il lui faut ${manqueInsights().join(', ')}.</p>
      </div>`;
    return;
  }
  el.innerHTML = l.map(i => `
    <div class="card insight">
      <h2>${i.cat}</h2>
      <p class="insight-txt">${esc(i.texte)}</p>
      <details class="foods"><summary>Pourquoi ?</summary><p class="muted small">${esc(i.detail)}</p></details>
    </div>`).join('');
}

// §17 : l'écran du jour montre la séance passée et, s'il y en a une, la conclusion la plus utile
function renderTodayApercu() {
  const el = $('#todayApercu');
  if (!el) return;
  const d = state.history[0];
  const top = tousLesInsights()[0];
  el.innerHTML = `
    ${top ? `<div class="card insight"><h2>${top.cat}</h2>
        <p class="insight-txt">${esc(top.texte)}</p></div>` : ''}
    ${d ? `<div class="card">
        <h2>Dernière séance</h2>
        <div class="kv">
          <div class="line"><span>${esc(d.nom || 'Séance')}</span><span>${dateTxt(d.start)}</span></div>
          <div class="line"><span>Volume</span><span>${d.sets} séries · ${d.reps} reps</span></div>
          <div class="line"><span>Dépense</span><span>≈ ${d.kcal} kcal</span></div>
        </div></div>` : ''}`;
}

let triRecords = 'e1rm';
function renderRecords() {
  const list = records();
  $('#recordsEmpty').classList.toggle('hidden', list.length > 0);
  const tris = {
    e1rm:   (a, b) => (b.e1rm ? b.e1rm.v : 0) - (a.e1rm ? a.e1rm.v : 0),
    masse:  (a, b) => (b.masse ? b.masse.v : 0) - (a.masse ? a.masse.v : 0),
    recent: (a, b) => b.derniere - a.derniere,
  };
  list.sort(tris[triRecords] || tris.e1rm);

  const perf = r => r ? `${r.reps} reps × ${round(r.masse, 1)} kg${r.rpe ? ` · ${RIR(r.rpe)} en réserve` : ''}` : '—';
  $('#recordsList').innerHTML = list.map(r => `
    <div class="hist rec" data-progres="${esc(r.nom)}">
      <div class="hist-head">
        <b>${esc(r.nom)}</b>
        <span class="rec-big">${r.e1rm ? round(r.e1rm.v) + ' kg' : '—'}</span>
      </div>
      <div class="hist-sub">${esc(r.groupe)} · ${r.seances} séance(s) · ${r.sets} séries · ${r.reps} reps · ${round(r.tonnage / 1000, 1)} t${r.pdc ? ' · poids du corps inclus' : ''}
        ${r.rpeNb ? '· marge moyenne ' + round(RIR(r.rpeSomme / r.rpeNb), 1) : ''}</div>
      <div class="kv rec-kv">
        ${ligne('1RM estimé', `${r.e1rm ? round(r.e1rm.v) + ' kg' : '—'} <em>${perf(r.e1rm)} · ${dateTxt(r.e1rm.date)}</em>`)}
        ${ligne('Charge max', `${round(r.masse.v, 1)} kg <em>${perf(r.masse)} · ${dateTxt(r.masse.date)}</em>`)}
        ${ligne('Meilleure série (volume)', `${round(r.serie.v)} kg <em>${perf(r.serie)} · ${dateTxt(r.serie.date)}</em>`)}
        ${ligne('Meilleur volume sur une séance', `${round(r.volSeance.v)} kg <em>${dateTxt(r.volSeance.date)}</em>`)}
        ${ligne('Dernière fois', dateTxt(r.derniere))}
      </div>
      <button class="btn ghost voir-prog">Voir la progression</button>
    </div>`).join('');
}

function renderProfil() {
  const p = state.profile;
  $('#pPoids').value = p.poids; $('#pTaille').value = p.taille; $('#pAge').value = p.age;
  $('#pSexe').value = p.sexe; $('#pActivite').value = p.activite; $('#pObjectif').value = p.objectif;
  $('#pRest').value = p.restDefault; $('#pAutoTimer').checked = p.autoTimer;

  const j = besoinsJour(0, p);
  $('#profilInfo').innerHTML =
    ligne('Métabolisme de base (Mifflin-St Jeor)', round(j.bmr) + ' kcal') +
    ligne('Dépense hors muscu', round(j.bmr * p.activite) + ' kcal');

  $('#methodo').innerHTML = `
    <p><strong>Calories.</strong> Trois composantes : le coût d'être à la salle (MET 3 × poids × durée),
    le coût mécanique réel de tes séries (masse déplacée × 9,81 × amplitude × reps, majoré de 20 % pour
    l'excentrique, divisé par un rendement musculaire de 22 %) et l'EPOC (6 à 12 % selon la densité de la séance).
    Les exercices au poids du corps comptent la fraction de ton poids réellement déplacée.</p>
    <p><strong>Marge à l'échec.</strong> Après une série, GymRec demande simplement comment
    elle s'est passée, et au besoin « aurais-tu pu faire 2 reps de plus ? ». Il en déduit la
    marge (les reps qu'il te restait), qui sert à trois choses : le 1RM estimé
    (Epley corrigé de la marge : 8 reps avec 2 en réserve valent un maximum de 10 reps) qui
    alimente les records, l'ajustement du coût métabolique (±15 % au maximum, s'entraîner
    près de l'échec coûte plus cher que le travail mécanique pur), et la recommandation de
    charge pour la série suivante. Les questions s'espacent à mesure que GymRec te connaît.</p>
    <p><strong>Records.</strong> Calculés sur l'historique et la séance en cours, exercice par
    exercice : 1RM estimé, charge maximale (la barre seule, sauf aux tractions, dips et
    pompes où le poids du corps est la charge), meilleure
    série en volume et meilleur volume sur une séance. Un record est signalé au moment où tu
    valides la série.</p>
    <p><strong>Collation post-training.</strong> Protéines 0,35 à 0,45 g/kg selon l'objectif, glucides
    modulés par le coût de la séance, lipides volontairement bas pour ne pas ralentir la digestion.</p>
    <p><strong>Journée.</strong> Mifflin-St Jeor × facteur d'activité + calories de la séance, puis
    +12 % (hypertrophie), 0 % (stabilité) ou −18 % (sèche).</p>
    <p>Ce sont des estimations : ajuste-les selon l'évolution de ton poids sur 2 à 3 semaines.</p>`;
}

function renderAll() {
  renderSeance(); renderRecords(); renderProgres(); renderConclusions();
  renderHistorique(); renderProfil(); renderTimer();
}

/* ---------------------------------------------------------
   8. Toast
   --------------------------------------------------------- */
let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

/* ---------------------------------------------------------
   8 bis. Export d'un fichier
   Une page publiée ne peut pas déclencher un téléchargement elle-même :
   l'hôte le fait à sa place quand il expose la capacité. Partout ailleurs
   (fichier local, site statique), le lien classique suffit.
   --------------------------------------------------------- */
let hote, hoteDemande = false;
async function sauvegardeHote() {
  if (!hoteDemande) {
    hoteDemande = true;
    try { hote = window.claude && claude.use ? await claude.use('downloads') : null; }
    catch (e) { hote = null; }
  }
  return hote;
}
async function exporter(nom, contenu) {
  const h = await sauvegardeHote();
  if (h) {
    try { await h.save({ filename: nom, data: contenu }); toast('Fichier enregistré'); }
    catch (e) { if (!e || e.code !== 'declined') toast("Enregistrement indisponible ici"); }
    return;
  }
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   9. Câblage de l'interface
   --------------------------------------------------------- */
function initUI() {
  // Onglets
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.remove('active'));
    $$('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'insights') { renderProgres(); renderConclusions(); }
    window.scrollTo({ top: 0 });
  }));

  // Listes déroulantes
  $('#exoList').innerHTML = LIB.map(e => `<option value="${e.nom}">`).join('');
  $('#exoGroup').innerHTML = GROUPES.map(g => `<option>${g}</option>`).join('');

  // Séance
  $('#btnEnd').addEventListener('click', terminerSeance);

  // Écran du jour : modèles de séance
  $('#ecranToday').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.demarrer) { state.editId = null; demarrerSeance(b.dataset.demarrer); }
    else if (b.id === 'btnLibre') demarrerSeance(null);
    else if (b.id === 'btnNouveauModele') {
      const m = { id: uid(), nom: 'Nouvelle séance', exercices: [] };
      state.modeles.push(m); state.editId = m.id; save(); renderToday();
    }
    else if (b.dataset.editer) { state.editId = b.dataset.editer; renderToday(); }
    else if (b.dataset.suppmod) {
      if (confirm('Supprimer cette séance ?')) {
        state.modeles = state.modeles.filter(x => x.id !== b.dataset.suppmod);
        save(); renderToday();
      }
    }
    else if (b.id === 'btnFinEdit') { state.editId = null; save(); renderToday(); }
    else if (b.dataset.suppexo) {
      const m = state.modeles.find(x => x.id === state.editId);
      m.exercices.splice(+b.dataset.suppexo, 1); save(); renderToday();
    }
  });
  $('#ecranToday').addEventListener('change', ev => {
    const m = state.modeles.find(x => x.id === state.editId);
    if (!m) return;
    const t = ev.target;
    if (t.id === 'modNom') m.nom = t.value.trim() || 'Séance';
    else if (t.dataset.plan) {
      const v = t.value === '' ? null : Number(t.value);
      m.exercices[+t.dataset.i][t.dataset.plan] = t.dataset.plan === 'chargeCible' ? v : (v || 1);
    }
    save();
  });
  $('#ecranToday').addEventListener('submit', ev => {
    ev.preventDefault();
    const m = state.modeles.find(x => x.id === state.editId);
    const nom = $('#planNom') && $('#planNom').value.trim();
    if (!m || !nom) return;
    m.exercices.push(ficheExercice(nom, null, null));
    save(); renderToday();
  });

  // Série courante : valider en un tap, corriger sans clavier
  $('#serieCourante').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const s = state.session, exo = exoCourant();
    if (b.id === 'btnValiderSerie' && exo) {
      const sa = saisiePour(exo);
      ajouterSerie(exo.id, sa.reps, sa.charge);
    } else if (b.dataset.pas && exo) {
      const [champ, sens] = b.dataset.pas.split(':');
      const sa = saisiePour(exo);
      if (champ === 'reps') sa.reps = Math.max(1, sa.reps + (+sens));
      else sa.charge = Math.max(0, round(sa.charge + (+sens) * pasCharge(sa.charge), 1));
      save(); renderSerieCourante();
    } else if (b.dataset.exo) {
      s.curExo = (s.curExo + (+b.dataset.exo) + s.exercices.length) % s.exercices.length;
      s.saisie = null; save(); renderSeance();
    }
  });

  // Micro-feedback puis question binaire (§23-24)
  $('#feedbackCard').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.fb) repondreDifficulte(b.dataset.fb);
    else if (b.dataset.rep) repondreQuestion(b.dataset.rep === 'oui');
  });

  // Recommandation inter-séries (§30)
  $('#recoCard').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || !b.dataset.reco) return;
    b.dataset.reco === 'ok' ? accepterReco() : refuserReco();
  });

  // Récapitulatif de fin de séance (§48)
  $('#ecranRecap').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'btnFermerRecap') { state.recapId = null; save(); renderSeance(); }
    else if (b.id === 'btnGarderModele') {
      const f = state.history.find(h => h.id === state.recapId);
      const nom = prompt('Nom de la séance ?', f.nom === 'Séance libre' ? 'Ma séance' : f.nom);
      if (!nom) return;
      state.modeles.push(modeleDepuisSeance(f, nom.trim()));
      save(); renderSeance();
      toast('Séance enregistrée dans « Mes séances »');
    }
  });

  // Ajout d'exercice : pré-remplissage groupe + récup depuis la bibliothèque
  $('#exoName').addEventListener('input', () => {
    const ref = LIB.find(e => e.nom.toLowerCase() === $('#exoName').value.trim().toLowerCase());
    if (ref) { $('#exoGroup').value = ref.groupe; $('#exoRest').value = ref.rest; }
  });
  $('#exoForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const nom = $('#exoName').value.trim();
    if (!nom) return;
    ajouterExercice(nom, $('#exoGroup').value, +$('#exoRest').value);
    $('#exoName').value = '';
    $('#exoRest').value = state.profile.restDefault;
  });

  // Actions dans la liste d'exercices (délégation)
  $('#exoContainer').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.addset) {
      const id = b.dataset.addset;
      const reps = $(`[data-reps="${id}"]`).value;
      const charge = $(`[data-charge="${id}"]`).value;
      if (!reps) { toast('Indique le nombre de reps'); return; }
      ajouterSerie(id, reps, charge);
    } else if (b.dataset.del) {
      if (confirm('Supprimer cet exercice et ses séries ?')) {
        state.session.exercices = state.session.exercices.filter(e => e.id !== b.dataset.del);
        save(); renderSeance(); renderRecords(); renderProgres();
      }
    } else if (b.dataset.rmset) {
      const exo = state.session.exercices.find(e => e.id === b.dataset.rmset);
      exo.sets.splice(+b.dataset.i, 1);
      save(); renderSeance(); renderRecords(); renderProgres();
    } else if (b.dataset.timer) {
      const exo = state.session.exercices.find(e => e.id === b.dataset.timer);
      setDuree(exo.rest, true);
    }
  });
  // Entrée dans un champ = validation de la série
  $('#exoContainer').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    const id = ev.target.dataset.reps || ev.target.dataset.charge;
    if (id) { ev.preventDefault(); $(`[data-addset="${id}"]`).click(); }
  });

  // Chrono
  $('#btnToggle').addEventListener('click', () => timer.running ? pauseTimer() : startTimer());
  $('#btnPlus').addEventListener('click', () => {
    timer.duree += 15;
    if (timer.running) { timer.endAt += 15000; } else { timer.restant += 15; }
    renderTimer();
  });
  $('#btnMinus').addEventListener('click', () => {
    timer.duree = Math.max(5, timer.duree - 15);
    if (timer.running) { timer.endAt = Math.max(Date.now(), timer.endAt - 15000); }
    else { timer.restant = Math.max(0, timer.restant - 15); }
    renderTimer();
  });
  $('#btnReset').addEventListener('click', () => setDuree(timer.duree));
  $('#btnSound').addEventListener('click', () => {
    state.profile.son = !state.profile.son; save();
    $('#btnSound').textContent = state.profile.son ? '🔔 Son : on' : '🔕 Son : off';
    if (state.profile.son) bip(880, 120);
  });
  $$('#presets .chip').forEach(c => c.addEventListener('click', () => setDuree(+c.dataset.sec, true)));

  // Filtres de progression (une seule rangée, au-dessus des graphiques)
  $('#progExo').addEventListener('change', e => { progSel = e.target.value; renderProgres(); });
  $('#progPeriode').addEventListener('change', e => { progPeriode = e.target.value; renderProgres(); });
  $('#recordsList').addEventListener('click', ev => {
    const c = ev.target.closest('[data-progres]');
    if (c) ouvrirProgres(c.dataset.progres);
  });

  // Tri des records
  $$('#recordTri .tri').forEach(b => b.addEventListener('click', () => {
    triRecords = b.dataset.tri;
    $$('#recordTri .tri').forEach(x => x.classList.toggle('active', x === b));
    renderRecords();
  }));

  // Objectif (raccourci depuis la séance)
  $$('#objectifRow .obj').forEach(b => b.addEventListener('click', () => {
    state.profile.objectif = b.dataset.obj; save(); renderSeance(); renderProfil();
  }));

  // Profil
  const bind = (sel, key, cast = v => v) => $(sel).addEventListener('change', e => {
    state.profile[key] = cast(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    save(); renderSeance(); renderProfil();
  });
  bind('#pPoids', 'poids', Number); bind('#pTaille', 'taille', Number); bind('#pAge', 'age', Number);
  bind('#pSexe', 'sexe'); bind('#pActivite', 'activite', Number); bind('#pObjectif', 'objectif');
  bind('#pRest', 'restDefault', Number); bind('#pAutoTimer', 'autoTimer', Boolean);

  // Historique
  $('#historyList').addEventListener('click', ev => {
    const b = ev.target.closest('[data-rmhist]');
    if (b && confirm('Supprimer cette séance ?')) {
      state.history = state.history.filter(s => s.id !== b.dataset.rmhist);
      save(); renderHistorique(); renderRecords(); renderProgres();
    }
  });
  $('#btnExport').addEventListener('click', () => {
    exporter(`gymrec-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
  });
  $('#btnWipe').addEventListener('click', () => {
    if (confirm('Effacer toutes les séances enregistrées ?')) {
      state.history = []; save(); renderHistorique(); renderRecords(); renderProgres(); renderProgres();
    }
  });

  // Horloge + durée de séance en direct
  setInterval(() => {
    const now = new Date();
    $('#sessionClock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (state.session && !state.session.end) {
      $('#duration').textContent = mmss(dureeSeance(state.session));
    }
  }, 1000);

  // Le chrono continue à l'heure exacte même si l'onglet a été mis en veille
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && timer.running) onTick();
  });
}

/* ---------------------------------------------------------
   10. Démarrage
   --------------------------------------------------------- */
load();
initUI();
setDuree(state.profile.restDefault);
$('#btnSound').textContent = state.profile.son ? '🔔 Son : on' : '🔕 Son : off';
$('#exoRest').value = state.profile.restDefault;
renderAll();

// Mise en cache hors-ligne (ignorée si le fichier est ouvert en file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
