# FabFit — chrono de récup & suivi de séance

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
  ou nom libre), et pour chaque série les reps + la charge.
- Historique des séances terminées, export JSON, statistiques cumulées.

**Calories brûlées**

Trois composantes, détaillées dans l'app :

| Composante | Calcul |
|---|---|
| Coût de présence | MET 3 × 3,5 × poids / 200 × minutes |
| Coût du travail | masse déplacée × 9,81 × amplitude × reps × 1,2 (excentrique) ÷ rendement 22 % |
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

## Fichiers

- `index.html` — structure et écrans
- `styles.css` — thème sombre, pensé mobile
- `app.js` — état, chrono, calculs (calories, macros), rendu
- `sw.js`, `manifest.webmanifest`, `icon.svg` — installation et mode hors-ligne

## Limites (prototype)

Les calories et les macros sont des **estimations** : à ajuster selon l'évolution réelle du
poids sur 2-3 semaines. Pas encore de RPE, de tempo, de records par exercice, de graphiques
de progression ni de synchronisation multi-appareils.
