/* =========================================================
   FabFit — chrono de récup + suivi de séance + nutrition
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
const KEY = 'fabfit.v1';

const defaultProfile = {
  poids: 80, taille: 178, age: 30, sexe: 'h',
  activite: 1.375, objectif: 'hypertrophie',
  restDefault: 90, autoTimer: true, son: true,
};

let state = {
  profile: { ...defaultProfile },
  session: null,     // séance en cours
  history: [],       // séances terminées
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    state.profile = { ...defaultProfile, ...(d.profile || {}) };
    state.session = d.session || null;
    state.history = d.history || [];
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

/* --- RPE / RIR / 1RM estimé -------------------------------------------
   RIR (reps in reserve) = 10 − RPE. Formule d'Epley corrigée du RIR :
   une série de 8 reps à RPE 8 vaut un maximum de 10 reps.               */
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
function demarrerSeance() {
  state.session = { id: uid(), start: Date.now(), end: null, exercices: [] };
  save(); renderAll();
  toast('Séance démarrée à ' + hhmm(state.session.start));
}

function terminerSeance() {
  const s = state.session;
  if (!s) return;
  const v = volumeSeance(s, state.profile.poids);
  if (v.sets === 0 && !confirm('Aucune série enregistrée. Terminer quand même ?')) return;
  s.end = Date.now();
  const k = calories(s, state.profile);
  const fini = {
    ...s,
    duree: dureeSeance(s),
    sets: v.sets, reps: v.reps, tonnage: v.tonnage,
    rpeMoyen: v.rpeMoyen ? round(v.rpeMoyen, 1) : null,
    kcal: round(k.total),
    poidsCorps: state.profile.poids,
    objectif: state.profile.objectif,
    macros: macrosPost(k.total, state.profile),
  };
  state.history.unshift(fini);
  state.session = null;
  pauseTimer();
  save(); renderAll();
  toast(`Séance enregistrée : ${dureeTxt(fini.duree)}, ${fini.sets} séries, ${fini.kcal} kcal`);
  $('.tab[data-tab="histo"]').click();
}

function ajouterExercice(nom, groupe, rest) {
  if (!state.session) demarrerSeance();
  const ref = LIB.find(e => e.nom.toLowerCase() === nom.trim().toLowerCase());
  state.session.exercices.push({
    id: uid(),
    nom: ref ? ref.nom : nom.trim(),
    groupe: groupe || (ref ? ref.groupe : 'Autre'),
    rest: rest || (ref ? ref.rest : state.profile.restDefault),
    rom: ref ? ref.rom : DEFAULT_ROM,
    bw: ref ? ref.bw : 0,
    pdc: ref ? !!ref.pdc : false,
    sets: [],
  });
  save(); renderSeance();
}

function ajouterSerie(exoId, reps, charge, rpe) {
  const exo = state.session.exercices.find(e => e.id === exoId);
  if (!exo || !reps) return;
  const avant = recordDe(exo.nom);                       // records d'avant cette série
  const set = { reps: +reps, charge: +charge || 0, rpe: rpe ? +rpe : null, ts: Date.now() };
  set.masse = masseSerie(exo, set, state.profile.poids);  // figées : le poids de corps peut changer
  set.mref  = masseRecord(exo, set, state.profile.poids);
  const e = e1RM(set.mref, set.reps, set.rpe);

  if (avant && avant.e1rm && e > avant.e1rm.v + 0.01) {
    set.pr = true;
    toast(`🏆 Record ${exo.nom} : 1RM estimé ${round(e)} kg`);
    bip(880, 130); setTimeout(() => bip(1100, 130), 150); setTimeout(() => bip(1320, 280), 300);
    vibrer([80, 60, 80, 60, 160]);
  }
  exo.sets.push(set);
  save(); renderSeance(); renderRecords(); renderProgres();
  setDuree(exo.rest, state.profile.autoTimer);
  vibrer(40);
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

  // Bandeau
  $('#startTime').textContent = s && s.start ? hhmm(s.start) : '—';
  $('#endTime').textContent   = s && s.end ? hhmm(s.end) : (s ? 'en cours' : '—');
  $('#duration').textContent  = s ? mmss(dureeSeance(s)) : '00:00';
  $('#btnStart').classList.toggle('hidden', !!s);
  $('#btnEnd').classList.toggle('hidden', !s);

  const vide = { sets: 0, reps: 0, tonnage: 0, travailJ: 0 };
  const v = s ? volumeSeance(s, P) : vide;
  const k = s ? calories(s, state.profile)
              : { base: 0, meca: 0, epoc: 0, total: 0, minutes: 0, densite: 0 };

  $('#stSets').textContent    = v.sets;
  $('#stReps').textContent    = v.reps;
  $('#stTonnage').textContent = v.tonnage >= 1000 ? round(v.tonnage / 1000, 1) + 't' : round(v.tonnage);
  $('#stRpe').textContent     = v.rpeMoyen ? round(v.rpeMoyen, 1) : '—';
  $('#stKcal').textContent    = round(k.total);

  // Exercices
  const c = $('#exoContainer');
  c.innerHTML = '';
  const exos = s ? s.exercices : [];
  $('#exoEmpty').classList.toggle('hidden', exos.length > 0);

  const RPE_OPTS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
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
              ${set.rpe ? `<span class="rpe">RPE ${set.rpe}</span>` : ''}${set.pr ? '<span class="pr">🏆</span>' : ''}
              <span class="vol">· 1RM est. ${round(e1RM(set.mref != null ? set.mref : masseRecord(exo, set, P), set.reps, set.rpe))} kg
                · ${round(set.reps * (set.masse != null ? set.masse : masseSerie(exo, set, P)))} kg déplacés · ${hhmm(set.ts)}</span>
            </span>
            <button class="rm" data-rmset="${exo.id}" data-i="${j}">×</button>
          </li>`).join('')}
      </ul>
      <div class="add-set">
        <input type="number" inputmode="numeric" min="1" placeholder="reps" value="${last ? last.reps : ''}" data-reps="${exo.id}">
        <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="${last ? last.charge : ''}" data-charge="${exo.id}">
        <select class="rpe-select" data-rpe="${exo.id}" title="RPE (difficulté ressentie)">
          <option value="">RPE</option>
          ${RPE_OPTS.map(r => `<option value="${r}" ${last && last.rpe === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <button class="btn primary" data-addset="${exo.id}">Valider</button>
        <button class="btn ghost pdc" data-timer="${exo.id}" title="Lancer la récup">⏱</button>
      </div>`;
    c.appendChild(el);
  });

  // Détail calories
  $('#kcalDetail').innerHTML =
    ligne('Durée effective', dureeTxt(dureeSeance(s || {}))) +
    ligne('Densité (temps sous tension)', round(k.densite * 100) + ' %') +
    ligne('RPE moyen', k.rpeMoyen ? `${round(k.rpeMoyen, 1)} (RIR ~${round(RIR(k.rpeMoyen), 1)}) · ×${round(k.fRpe, 2)}` : 'non renseigné') +
    ligne('Travail mécanique', round((v.travailJ || 0) / 1000) + ' kJ') +
    ligne('Coût de présence (MET 3)', round(k.base) + ' kcal') +
    ligne('Coût du travail (rendement 22 %)', round(k.meca) + ' kcal') +
    ligne('EPOC (après la séance)', round(k.epoc) + ' kcal') +
    ligne('Total estimé', round(k.total) + ' kcal', 'total');

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
      <div class="hist-sub">${dureeTxt(s.duree)} · ${s.sets} séries · ${s.reps} reps · ${round(s.tonnage)} kg${s.rpeMoyen ? ' · RPE ' + s.rpeMoyen : ''} · <strong>${s.kcal} kcal</strong></div>
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
  const avecRpe = serie.filter(d => d.rpe != null);
  Viz.chart($('#chartRpe'), {
    type: 'line', color: Viz.COL.rpe, titre: `RPE moyen — ${progSel}`, domaine: [5, 10],
    vide: "Aucun RPE renseigné sur cet exercice : saisis-le en validant tes séries.",
    data: avecRpe.map(d => ({ t: d.t, v: d.rpe, info: [['RPE moyen', round(d.rpe, 1)], ['RIR moyen', round(RIR(d.rpe), 1)], ['Séries', d.sets]] })),
    fmt: v => round(v, 1),
  });

  // Vue tableau : aucune valeur n'est accessible seulement au survol
  const tb = document.createElement('table');
  tb.className = 'tbl';
  tb.innerHTML = '<thead><tr><th>Date</th><th>1RM est.</th><th>Volume</th><th>RPE</th><th>Top série</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const d of [...serie].reverse()) {
    const tr = document.createElement('tr');
    for (const txt of [
      Viz.fmtJour(d.t) + (d.encours ? ' (en cours)' : ''),
      kg(d.e1rm), kg(d.volume),
      d.rpe ? round(d.rpe, 1) : '—',
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
  $('.tab[data-tab="progres"]').click();
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

  const perf = r => r ? `${r.reps} reps × ${round(r.masse, 1)} kg${r.rpe ? ' @ RPE ' + r.rpe : ''}` : '—';
  $('#recordsList').innerHTML = list.map(r => `
    <div class="hist rec" data-progres="${esc(r.nom)}">
      <div class="hist-head">
        <b>${esc(r.nom)}</b>
        <span class="rec-big">${r.e1rm ? round(r.e1rm.v) + ' kg' : '—'}</span>
      </div>
      <div class="hist-sub">${esc(r.groupe)} · ${r.seances} séance(s) · ${r.sets} séries · ${r.reps} reps · ${round(r.tonnage / 1000, 1)} t${r.pdc ? ' · poids du corps inclus' : ''}
        ${r.rpeNb ? '· RPE moyen ' + round(r.rpeSomme / r.rpeNb, 1) : ''}</div>
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
    <p><strong>RPE.</strong> C'est la difficulté ressentie de la série : RPE 8 = il te restait
    2 reps en réserve (RIR 2), RPE 10 = échec. Il sert à deux choses : le 1RM estimé
    (Epley corrigé du RIR : 8 reps à RPE 8 = un max de 10 reps) qui alimente les records,
    et un ajustement du coût métabolique (±15 % au maximum) — s'entraîner près de l'échec
    coûte plus cher que le travail mécanique pur.</p>
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

function renderAll() { renderSeance(); renderRecords(); renderProgres(); renderHistorique(); renderProfil(); renderTimer(); }

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
   9. Câblage de l'interface
   --------------------------------------------------------- */
function initUI() {
  // Onglets
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.remove('active'));
    $$('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'progres') renderProgres();
    window.scrollTo({ top: 0 });
  }));

  // Listes déroulantes
  $('#exoList').innerHTML = LIB.map(e => `<option value="${e.nom}">`).join('');
  $('#exoGroup').innerHTML = GROUPES.map(g => `<option>${g}</option>`).join('');

  // Séance
  $('#btnStart').addEventListener('click', demarrerSeance);
  $('#btnEnd').addEventListener('click', terminerSeance);

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
      const rpe = $(`[data-rpe="${id}"]`).value;
      if (!reps) { toast('Indique le nombre de reps'); return; }
      ajouterSerie(id, reps, charge, rpe);
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
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fabfit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
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
