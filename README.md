# GymRec — chrono de récup & suivi de séance

Prototype d'application de musculation, 100 % web, sans dépendance ni serveur.
Ouvre `index.html` dans un navigateur (ou publie le dossier) et c'est prêt.
Toutes les données restent sur ton appareil (`localStorage`).

## Ce que ça fait

**Chronomètre de récupération**
- Anneau de compte à rebours, presets 45 s → 3 min, boutons ±15 s, pause / reprise.
- Bips à 3-2-1 puis sonnerie de fin, vibration, écran maintenu allumé pendant la récup.
- La récup se lance automatiquement dès que tu valides une série (désactivable dans Profil).
- Chaque exercice a sa propre durée de récup (pré-remplie depuis la bibliothèque).

**Séance**
- Heure de début, heure de fin, durée en direct.
- Compteur de séries, de reps, de tonnage (kg soulevés) et de calories, mis à jour à chaque série.
- Composition de la séance : exercices (bibliothèque de 27 mouvements avec auto-complétion,
  ou nom libre), et pour chaque série les reps, la charge et le **RPE**.
- Historique des séances terminées, export JSON, statistiques cumulées.

**RPE et records**

- RPE saisi série par série (6 → 10, par pas de 0,5), repris automatiquement d'une série à l'autre.
  RPE 8 = 2 reps en réserve (RIR 2), RPE 10 = échec.
- **1RM estimé** par série : Epley corrigé du RIR — `charge × (1 + (reps + RIR) / 30)`.
  Une série de 8 reps à RPE 8 vaut donc un maximum de 10 reps.
- Onglet **Records**, exercice par exercice (historique + séance en cours) : 1RM estimé,
  charge max, meilleure série en volume, meilleur volume sur une séance, RPE moyen, dernière fois.
  Tri par 1RM, par charge ou par date.
- Un record est signalé (toast, sonnerie, badge 🏆 sur la série) au moment où tu le poses.
- Deux notions de charge, volontairement distinctes : les records affichent la **barre seule**
  (110 kg au squat reste 110 kg), sauf aux tractions / dips / pompes / abdos où le poids du corps
  *est* la charge ; le calcul des calories, lui, utilise la masse réellement déplacée.
- Le RPE moyen ajuste aussi la dépense énergétique (±15 % max) : s'entraîner près de l'échec
  coûte plus cher que le travail mécanique pur.

**Graphiques de progression**

Onglet **Progrès** : un exercice + une période (tout / 12 dernières séances / 3 mois) en filtre,
puis trois graphiques SVG dessinés à la main, sans aucune librairie :

- **1RM estimé** (courbe) — la meilleure série de chaque séance ;
- **volume par séance** (barres) — kilos déplacés sur l'exercice ;
- **RPE moyen** (courbe, échelle 5 → 10) — comment la difficulté ressentie évolue à charge égale.

Chaque graphique a son infobulle (viseur qui accroche la date sur les courbes, barre surlignée
sur l'histogramme), fonctionne au clavier (flèches gauche/droite), annonce son résumé aux
lecteurs d'écran, et se double d'une **vue tableau** dépliable — aucune valeur n'est
accessible uniquement au survol. Depuis l'onglet Records, « Voir la progression » ouvre
directement les courbes de l'exercice.

Les trois couleurs (bleu, jaune, aqua) sont validées pour la surface sombre de l'app :
bande de clarté, plancher de chroma, séparation sous daltonisme (ΔE ≥ 8) et contraste ≥ 3:1.
Elles restent volontairement à distance du rouge de la marque, pour qu'on ne confonde jamais
une donnée avec un bouton.

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

## Utilisation

1. Onglet **Profil** : poids, taille, âge, sexe, activité, objectif, récup par défaut.
2. Onglet **Séance** : « Démarrer la séance » → ajoute un exercice → saisis reps + kg → « Valider ».
   Le chrono de récup part tout seul.
3. « Terminer » enregistre la séance dans l'historique avec ses calories et ses macros.

Installable en PWA (« Ajouter à l'écran d'accueil ») et utilisable hors-ligne grâce au
service worker — pratique dans une salle sans réseau.

## Charte

Thème sombre, une seule couleur d'action : le **rouge du logo** (`--accent: #ff5d5d`), posé
sur les boutons principaux, l'anneau du chrono, les onglets actifs et les records. Le texte
sur aplat rouge est un rouge très sombre (`#2a0505`, contraste 5,5:1). Les actions
destructives partagent la même teinte mais en **contour** plutôt qu'en aplat : « Tout
effacer » ne peut pas être confondu avec « Valider ». La fin de récup passe à l'ambre
(`--warn`), la seule autre couleur de statut.

## Fichiers

- `index.html` — structure et écrans
- `styles.css` — thème sombre, pensé mobile
- `app.js` — état, chrono, calculs (calories, macros, records), rendu
- `charts.js` — boîte à outils de graphiques SVG (courbes, barres, infobulles, clavier)
- `sw.js`, `manifest.webmanifest` — installation et mode hors-ligne
- `icon.svg`, `icon-512.png`, `apple-touch-icon.png` — le logo : un **G** géométrique ouvert
  en haut à droite, avec le **point rouge REC** posé dans l'ouverture. Repris en marque dans
  l'en-tête, où le logotype suit la même règle : « Gym » en blanc cassé, « Rec » en rouge.
- `logo-variantes.html` — les pistes explorées, chacune montrée à 180 px, en taille favicon
  (44 / 30 / 20 px) et sous simulation de deutéranopie. À ouvrir pour en changer.

## Limites (prototype)

Les calories et les macros sont des **estimations** : à ajuster selon l'évolution réelle du
poids sur 2-3 semaines. Pas encore de tempo, de séances-types réutilisables ni de
synchronisation multi-appareils.
