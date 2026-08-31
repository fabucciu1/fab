# GymRec — chrono de récup & suivi de séance

> **Référence produit :** [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md) (v0.4).
> Ce dépôt est le **prototype UX (phase 0)** de la feuille de route qui s'y trouve : il valide la
> boucle d'entraînement avant toute vision par ordinateur. Smart Rec, la caméra-capteur et le
> moteur d'adaptation n'y sont pas encore.

Prototype d'application de musculation, 100 % web, sans dépendance ni serveur.
Ouvre `index.html` dans un navigateur (ou publie le dossier) et c'est prêt.
Toutes les données restent sur ton appareil (`localStorage`).

## Navigation (§16)

**Aujourd’hui** · **● Rec** · **Historique** · **Analyses** · **Profil**
(soit TODAY / ● REC / HISTORY / INSIGHTS / PROFILE du cahier des charges, en français —
« Rec » reste tel quel, c'est le mot de la marque)

`Aujourd’hui` prépare et lance la séance, montre la dernière séance et la conclusion la plus
utile. `● Rec` porte la séance en cours — série courante, chronomètre, feedback, recommandation, détail —
et c'est là que Smart Rec viendra se brancher (§32) ; hors séance le chronomètre y reste
utilisable seul. Un point rouge pulse sur l'onglet tant que la séance enregistre.

## Ce que ça fait

**Chronomètre de récupération**
- Anneau de compte à rebours, presets 45 s → 3 min, boutons ±15 s, pause / reprise.
- Bips à 3-2-1 puis sonnerie de fin, vibration, écran maintenu allumé pendant la récup.
- La récup se lance automatiquement dès que tu valides une série (désactivable dans Profil).
- Chaque exercice a sa propre durée de récup (pré-remplie depuis la bibliothèque).

**Séances réutilisables** (§18)
- Modèles de séance : nom, exercices, séries prévues, reps et charge visées, récupération.
- L'écran du jour propose ces séances avec leur durée estimée ; une séance libre reste possible,
  et se garde comme modèle en fin de séance.

**Séance active** (§21-22)
- Un écran, une décision : l'exercice en cours, la charge en grand, « Série 2/4 · objectif
  10 reps · récup 01:30 ».
- **Validation en un tap.** Les valeurs viennent du plan ; deux boutons ± corrigent reps et
  charge sans jamais ouvrir le clavier.
- L'app enchaîne toute seule sur l'exercice suivant quand les séries prévues sont faites.
- Heure de début, témoin REC, durée en direct ; compteurs séries / reps / tonnage / repos
  moyen / calories.

**Marge à l'échec, sans jargon** (§23-25, §74)
- Après la série : « Comment était cette série ? » 😌 / 👌 / 🔥 — un tap.
- Quand GymRec te connaît mal : « Aurais-tu pu faire 2 reps de plus ? », puis « Et une seule
  de plus ? ». Il en déduit la marge (RIR) en interne ; le mot RIR n'apparaît jamais à l'écran.
- **Les questions s'espacent** (§27) : passé trois retours sur un exercice, GymRec ne demande
  plus que sur les séries atypiques (objectif manqué, charge changée).

**Recommandation inter-séries** (§30-31)
- Objectif atteint avec 3 reps en réserve → propose de monter ; objectif manqué → propose de
  descendre ; zone visée → **ne dit rien** (§11, intelligence silencieuse).
- Le pas suit la charge : +1 kg sur un curl, +5 kg sur un squat.

**Repos réel** (§29)
- Le temps effectivement pris entre deux séries est mesuré, jamais déclaré. C'est la donnée
  qui alimentera le modèle de récupération individuel (§57-58) — et elle n'est pas
  reconstituable après coup.

**Récapitulatif de fin de séance** (§48)
- Durée, séries, reps, tonnage, repos moyen, ≈ kcal, et la collation qui suit.

**Historique et données**
- Historique des séances terminées, export JSON, statistiques cumulées.

**Records**

- **1RM estimé** par série : Epley corrigé de la marge — `charge × (1 + (reps + marge) / 30)`.
  Une série de 8 reps avec 2 en réserve vaut donc un maximum de 10 reps.
- Le record est d'abord jugé sur la marge nulle (le plancher), puis réévalué quand la réponse
  arrive : ignorer les questions ne fait jamais rater un record.
- Onglet **Records**, exercice par exercice (historique + séance en cours) : 1RM estimé,
  charge max, meilleure série en volume, meilleur volume sur une séance, RPE moyen, dernière fois.
  Tri par 1RM, par charge ou par date.
- Un record est signalé (toast, sonnerie, badge 🏆 sur la série) au moment où tu le poses.
- Deux notions de charge, volontairement distinctes : les records affichent la **barre seule**
  (110 kg au squat reste 110 kg), sauf aux tractions / dips / pompes / abdos où le poids du corps
  *est* la charge ; le calcul des calories, lui, utilise la masse réellement déplacée.
- La marge moyenne ajuste aussi la dépense énergétique (±15 % max) : s'entraîner près de
  l'échec coûte plus cher que le travail mécanique pur.

**Conclusions** (§50)

Onglet **Analyses**, avant les chiffres : des phrases, et le détail seulement si on le demande.
Trois analyses, chacune avec un seuil de données explicite — en dessous, GymRec se tait et dit
ce qui lui manque plutôt que d'inventer :

| Conclusion | Ce qu'elle regarde | Seuil |
|---|---|---|
| **Progression** — « Tu sembles prêt à passer à 85 kg sur X. » | objectif tenu et marge ≥ 2 sur la dernière séance, charge inchangée depuis la précédente | 2 séances, 2 séries notées |
| **Récupération** — « Tu enchaînes mieux avec environ 2 minutes de récup sur X. » | ce que rend la série suivante selon le repos réellement pris | 6 enchaînements, 3 par palier, écart ≥ 5 % |
| **Volume** — « Tes performances baissent après environ N séries pour les pectoraux. » | la baisse de rendement au fil des séries d'un même groupe | 3 séances, 3 observations au rang concerné |

**Graphiques de progression**

Dans **Analyses**, section « Par exercice » : un exercice + une période (tout / 12 dernières séances / 3 mois) en filtre,
puis trois graphiques SVG dessinés à la main, sans aucune librairie :

- **1RM estimé** (courbe) — la meilleure série de chaque séance ;
- **volume par séance** (barres) — kilos déplacés sur l'exercice ;
- **RPE moyen** (courbe, échelle 5 → 10) — comment la difficulté ressentie évolue à charge égale.

Chaque graphique a son infobulle (viseur qui accroche la date sur les courbes, barre surlignée
sur l'histogramme), fonctionne au clavier (flèches gauche/droite), annonce son résumé aux
lecteurs d'écran, et se double d'une **vue tableau** dépliable — aucune valeur n'est
accessible uniquement au survol. Depuis l'onglet Records, « Voir la progression » ouvre
directement les courbes de l'exercice.

Les trois couleurs (bleu, orange, aqua) sont validées pour la surface sombre de l'app :
bande de clarté, plancher de chroma, séparation sous daltonisme (ΔE ≥ 8) et contraste ≥ 3:1.
Ce sont des couleurs de donnée, indépendantes de la marque : l'interface, elle, reste neutre.

**Calories brûlées**

Trois composantes, détaillées dans l'app :

| Composante | Calcul |
|---|---|
| Coût de présence | MET 3 × 3,5 × poids / 200 × minutes |
| Coût du travail | masse déplacée × 9,81 × amplitude × reps × 1,2 (excentrique) ÷ rendement 22 %, ajusté du RPE moyen |
| EPOC | 6 à 12 % du total, selon la densité de la séance |

La masse déplacée inclut la part du poids de corps réellement soulevée (95 % aux tractions,
85 % au squat, 0 % au curl…), donc les exercices au poids du corps comptent aussi.
Ordre de grandeur : 75 min, 20 × 10 reps à 60 kg pour 80 kg de poids de corps ≈ **400 kcal**.

**Macro-nutriments post-training**

Selon l'objectif choisi (hypertrophie / stabilité / sèche) et le coût réel de la séance :

| Objectif | Protéines | Glucides (base, modulés par l'intensité) | Lipides |
|---|---|---|---|
| Hypertrophie | 0,40 g/kg | 1,00 g/kg | 0,15 g/kg |
| Stabilité | 0,35 g/kg | 0,70 g/kg | 0,15 g/kg |
| Sèche | 0,45 g/kg | 0,35 g/kg | 0,10 g/kg |

Les glucides sont multipliés par un facteur d'intensité (0,7 → 1,25) calculé à partir des
calories de la séance : grosse séance = recharge plus importante.
Un dépliant traduit les macros en aliments courants (whey, riz, banane, amandes).

L'app estime aussi la **journée complète** : Mifflin-St Jeor × facteur d'activité + calories
de la séance, puis +12 % (hypertrophie), 0 % (stabilité) ou −18 % (sèche), avec la répartition
protéines / glucides / lipides du jour.

## Essayer l'app

Trois façons, par ordre de simplicité :

1. **`gymrec.html`** — l'app entière en un seul fichier (78 Ko, aucune dépendance). Télécharge-le
   et ouvre-le : navigateur, Fichiers d'un téléphone, clé USB, pièce jointe. Tout marche, hors ligne
   compris.
2. **Le dossier tel quel** — ouvre `index.html`, ou sers-le (`npx http-server`) pour profiter en plus
   du service worker et de l'installation en PWA.
3. **Publier le dossier** sur n'importe quel hébergement statique (GitHub Pages, Netlify…).

`gymrec.html` est **généré** : après une modification, relance `node build.mjs` (Node seul, aucune
dépendance à installer). `node build.mjs --artifact` produit la variante sans `<html>`/`<body>`
pour un hôte qui fournit déjà la coquille.

## Utilisation

1. Onglet **Profil** : poids, taille, âge, sexe, activité, objectif, récup par défaut.
2. Onglet **Séance** : « Démarrer la séance » → ajoute un exercice → saisis reps + kg → « Valider ».
   Le chrono de récup part tout seul.
3. « Terminer » enregistre la séance dans l'historique avec ses calories et ses macros.

Installable en PWA (« Ajouter à l'écran d'accueil ») et utilisable hors-ligne grâce au
service worker — pratique dans une salle sans réseau.

## Charte

Quatre jetons, et une règle : le rouge n'appartient qu'à l'enregistrement.

| Jeton | Hex | Emploi |
|---|---|---|
| Charcoal | `#0D0D0F` | fond de l'app, cartes (un cran plus clair), filets |
| Steel | `#E6E6E6` | couleur d'action : bouton principal, onglet actif, anneau du chrono |
| Rec red | `#FF2D2D` | le point du logo, le « REC », le filet sous les titres, le témoin d'enregistrement, records et totaux |
| White | `#FFFFFF` | chiffres et titres — ce qu'on lit en premier |

Le texte posé sur un aplat steel est en charcoal (17:1). Les actions destructives portent le
rouge **en contour**, jamais en aplat : « Tout effacer » ne peut pas être confondu avec
« Valider ». Signature reprise de la planche : titres en capitales très espacées, soulignés
d'un filet rouge de 20 px.

Pendant une séance, le bandeau affiche un **témoin REC** — point rouge pulsé + « REC » — repris
du point du logo.

`charte.html` est la charte vivante : elle utilise la vraie feuille de style de l'app, donc
elle ne peut pas dériver.

Les couleurs des graphiques (bleu, orange, aqua) sont à part : ce sont des couleurs de
donnée, choisies pour être distinguables entre elles, pas pour porter la marque.

## Fichiers

- `index.html` — structure et écrans
- `styles.css` — thème sombre, pensé mobile
- `app.js` — état, chrono, calculs (calories, macros, records), rendu
- `charts.js` — boîte à outils de graphiques SVG (courbes, barres, infobulles, clavier)
- `sw.js`, `manifest.webmanifest` — installation et mode hors-ligne
- `icon.svg`, `icon-512.png`, `apple-touch-icon.png` — le logo : un **G** épais en dégradé
  acier, le **point REC** rouge dans sa contre-forme. Repris en marque dans l'en-tête, avec
  le logotype `GYM` blanc / `REC` rouge.
- `build.mjs`, `gymrec.html` — la fabrique du fichier unique et son résultat (généré)
- `charte.html` — la charte vivante : lockup, monogramme aux différentes tailles, jetons,
  règles d'emploi et couleurs de donnée.

## Limites (prototype)

Les calories et les macros sont des **estimations** : à ajuster selon l'évolution réelle du
poids sur 2-3 semaines.

Les conclusions des Analyses sont des corrélations lues sur tes propres séances, pas des
vérités : elles se déclenchent sur des seuils volontairement prudents, et un écart peut venir
d'autre chose que de ce qu'elles pointent (sommeil, ordre des exercices, forme du jour).

Par rapport au cahier des charges, il manque encore : **Smart Rec** et la caméra-capteur
(phases 2-3), l'adaptation inter-séances (§51), le coach adaptatif (§52) et la fusion de
capteurs (§54-68). Pas de tempo ni de séries longues (drop sets, rest-pause), pas de
synchronisation multi-appareils.
