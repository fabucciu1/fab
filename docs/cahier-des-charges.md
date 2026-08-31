# GYMREC — CAHIER DES CHARGES PRODUIT
## Version 0.4 — Produit, IA, Smart Rec, adaptation et données physiologiques

---

# 1. OBJET DU DOCUMENT

Ce document définit la vision, les principes produit, les fonctionnalités, l’architecture fonctionnelle et les priorités de développement de **GymRec**.

GymRec est une application mobile de musculation conçue pour :

- enregistrer automatiquement les séances ;
- réduire au maximum la saisie manuelle ;
- analyser les séries ;
- apprendre le profil individuel du pratiquant ;
- adapter progressivement les recommandations ;
- exploiter la caméra du smartphone comme capteur principal ;
- enrichir l’analyse avec des données physiologiques uniquement lorsqu’elles améliorent réellement une décision du moteur.

Le document distingue trois niveaux de maturité :

### MVP
Valider l’expérience d’entraînement.

### V1 commerciale
Introduire pleinement Smart Rec et l’analyse automatisée.

### Vision long terme
Faire de GymRec un coach adaptatif individuel.

---

# 2. NOM

## GymRec

Le terme **REC** peut évoquer plusieurs dimensions du produit :

- **Record** — enregistrer la séance ;
- **Recovery** — gérer la récupération ;
- **Recap** — résumer la séance.

Identité visuelle possible :

# ● REC

---

# 3. PROMESSE PRODUIT

# Fais ta série. GymRec s’occupe du reste.

Version internationale :

# Just train.

GymRec doit progressivement permettre au pratiquant de :

1. ouvrir l’application ;
2. lancer sa séance ;
3. poser son smartphone ;
4. s’entraîner normalement ;
5. laisser GymRec enregistrer automatiquement ce qui se passe.

---

# 4. VISION

La majorité des trackers de musculation fonctionnent selon cette logique :

> L’utilisateur réalise une série puis renseigne ce qu’il a fait.

GymRec doit progressivement inverser cette relation :

> L’utilisateur réalise une série et GymRec comprend ce qu’il vient de faire.

La caméra devient ainsi un véritable **capteur d’entraînement**.

---

# 5. POSITIONNEMENT

GymRec n’est pas uniquement :

- un workout tracker ;
- un compteur de reps ;
- un timer ;
- une caméra fitness ;
- un outil d’analyse biomécanique ;
- un coach IA ;
- un outil nutritionnel.

GymRec doit devenir :

# THE AI WORKOUT RECORDER

En français :

# La séance qui se note toute seule.

---

# 6. DIFFÉRENCIATION STRATÉGIQUE

GymRec ne doit pas être conçu comme un outil réservé aux powerlifters, coachs ou pratiquants experts.

Certaines solutions concurrentes donnent immédiatement accès à des données telles que :

- vitesse de barre ;
- force ;
- puissance ;
- accélération ;
- courbes force-temps ;
- relation charge-vitesse ;
- velocity loss ;
- RIR ;
- RPE ;
- trajectoire ;
- métriques biomécaniques avancées.

Ces informations peuvent être utiles.

Cependant, elles ne doivent pas devenir une condition nécessaire pour utiliser GymRec.

GymRec adopte la philosophie inverse.

# La sophistication doit être dans GymRec, pas dans les actions demandées au pratiquant.

---

# 7. PRINCIPE PRODUIT N°1

# SIMPLE PAR DÉFAUT. PUISSANT À LA DEMANDE.

GymRec peut calculer des métriques complexes.

Il ne doit pas nécessairement les afficher.

Exemple interne :

- velocity loss : 32 % ;
- RIR estimé : 1–2 ;
- ROM : 95 % ;
- baisse de vitesse significative sur les dernières reps.

Affichage principal :

### Bonne série.

Tes dernières répétitions ont ralenti.

## Garde la même charge.

Option :

**Pourquoi ?**

Puis éventuellement :

**Voir les données avancées**

---

# 8. TROIS NIVEAUX D’INFORMATION

## NIVEAU 1 — ESSENTIEL

Affiché par défaut.

Exemple :

**30 kg**

**10 reps**

**Série 2/4**

**Repos 01:30**

**Prochaine série : 30 kg × 10**

---

## NIVEAU 2 — COACHING

Accessible en un geste.

Exemple :

> Tes dernières répétitions ont nettement ralenti mais ton amplitude est restée stable. La charge semble adaptée à ton objectif.

---

## NIVEAU 3 — PERFORMANCE

Optionnel.

Peut contenir :

- velocity loss ;
- RIR ;
- ROM ;
- tempo ;
- vitesse ;
- trajectoire ;
- symétrie ;
- courbes.

---

# 9. PRINCIPE PRODUIT N°2

# UNE RECOMMANDATION AVANT UNE STATISTIQUE

Priorité :

> **Récupère encore 20 secondes.**

Avant :

> FC 129 bpm.

Priorité :

> **Passe à 32 kg.**

Avant :

> Velocity loss 18 %.

---

# 10. PRINCIPE PRODUIT N°3

# UNE DÉCISION À LA FOIS.

Pendant une séance, GymRec doit surtout répondre à :

> **Que dois-je faire maintenant ?**

---

# 11. PRINCIPE PRODUIT N°4

# INTELLIGENCE SILENCIEUSE

GymRec doit :

- mesurer beaucoup ;
- interpréter beaucoup ;
- afficher peu ;
- interrompre peu.

---

# 12. PRINCIPE PRODUIT N°5

# ZÉRO SAISIE LORSQUE POSSIBLE.

Toute donnée détectable automatiquement avec une fiabilité suffisante doit être automatiquement renseignée.

---

# 13. PRINCIPE PRODUIT N°6

# NO DATA FOR DATA’S SAKE.

Une donnée ne doit pas intégrer GymRec uniquement parce qu’elle est disponible.

Une nouvelle donnée doit améliorer :

- une analyse ;
- une prédiction ;
- une recommandation ;
- une adaptation.

Sinon :

**elle n’est pas prioritaire.**

Ce principe s’applique tout particulièrement aux wearables et capteurs physiologiques.

---

# 14. UTILISATEURS CIBLES

GymRec vise trois niveaux d’utilisateurs.

## Débutant

Attente principale :

> Dis-moi simplement quoi faire.

## Intermédiaire

Attente :

> Dis-moi quoi faire et pourquoi.

## Confirmé

Attente possible :

> Donne-moi aussi accès aux métriques avancées.

Le produit doit satisfaire ces trois niveaux sans imposer l’interface du troisième aux deux premiers.

---

# 15. OBJECTIFS UTILISATEUR

Premiers objectifs :

### Hypertrophie

### Maintien

### Perte de masse grasse

Évolutions futures :

- force ;
- puissance ;
- endurance musculaire ;
- reprise ;
- recomposition corporelle.

---

# 16. ARCHITECTURE DE L’APPLICATION

Navigation principale :

## TODAY

Séance du jour.

## ● REC

Smart Rec.

## HISTORY

Historique.

## INSIGHTS

Recommandations et progression.

## PROFILE

Objectifs, paramètres, capteurs et confidentialité.

---

# 17. TODAY

Affiche :

- séance du jour ;
- durée estimée ;
- nombre d’exercices ;
- séries ;
- éventuelle progression récente.

Bouton principal :

# START WORKOUT

---

# 18. CRÉATION D’UNE SÉANCE

L’utilisateur peut :

- créer une séance ;
- réutiliser une séance ;
- utiliser un modèle ;
- utiliser un programme GymRec.

Pour chaque exercice :

- exercice ;
- séries ;
- reps ;
- charge ;
- récupération.

---

# 19. BIBLIOTHÈQUE D’EXERCICES

Chaque exercice peut contenir :

- nom ;
- groupe principal ;
- groupes secondaires ;
- matériel ;
- type de mouvement ;
- type de charge ;
- compatibilité Smart Rec ;
- recommandations d’angle caméra.

---

# 20. MVP

Le MVP doit valider la boucle comportementale avant de dépendre d’une computer vision avancée.

Fonctions essentielles :

- création de séance ;
- séries ;
- reps ;
- charges ;
- timer ;
- historique ;
- volume ;
- feedback ;
- estimation RIR simplifiée ;
- recommendations simples ;
- recap ;
- estimation calorique ;
- nutrition post-training.

---

# 21. SÉANCE ACTIVE

Affichage principal :

## Développé incliné

### 30 kg

Série :

**2 / 4**

Objectif :

**10 reps**

Récupération prévue :

**01:30**

---

# 22. VALIDATION D’UNE SÉRIE

MVP :

bouton

# VALIDER LA SÉRIE

Smart Rec :

validation automatique.

Après validation :

1. série enregistrée ;
2. compteur mis à jour ;
3. récupération démarrée ;
4. feedback éventuel.

---

# 23. MICRO-FEEDBACK

Question principale :

### Comment était cette série ?

😌 Facile

👌 Bien

🔥 Dure

Un tap.

---

# 24. ESTIMATION DU RIR

GymRec ne doit pas obliger l’utilisateur à comprendre le RIR.

Question :

### Aurais-tu pu faire encore 2 reps ?

OUI / NON

Si NON :

### Encore 1 ?

OUI / NON

GymRec convertit ensuite cela en donnée interne.

---

# 25. EXEMPLE

10 reps réalisées.

Encore 2 ?

NON.

Encore 1 ?

OUI.

GymRec enregistre :

**RIR utilisateur ≈ 1**

Cette donnée peut rester invisible pour l’utilisateur grand public.

---

# 26. MOTIF D’ARRÊT

Lorsque pertinent :

### Pourquoi t’es-tu arrêté ?

- Objectif atteint
- Plus de force
- Technique
- Gêne / douleur

Ne pas poser cette question systématiquement.

---

# 27. ACTIVE LEARNING

GymRec ne doit pas poser des questions après chaque série indéfiniment.

Au début :

plus de feedback.

Avec l’apprentissage :

moins de questions.

À terme :

question uniquement si :

- confiance faible ;
- série atypique ;
- donnée particulièrement utile.

---

# 28. DATASET PERSONNEL

Chaque série enrichit le modèle individuel.

Données possibles :

## Entraînement

- exercice ;
- charge ;
- reps ;
- séries ;
- volume ;
- durée.

## Récupération

- repos avant ;
- repos après.

## Vidéo

- pose ;
- amplitude ;
- vitesse ;
- tempo ;
- trajectoire ;
- asymétrie ;
- velocity loss.

## Feedback

- difficulté ;
- RIR ;
- motif d’arrêt.

## Physiologie

si utile et disponible.

## Résultats IA

- RIR estimé ;
- score de confiance ;
- recommandation.

---

# 29. TIMER DE RÉCUPÉRATION

Après une série :

# REST 01:30

Actions :

- +30 s ;
- -15 s ;
- pause ;
- passer.

GymRec enregistre toujours le repos réel.

---

# 30. RECOMMANDATION INTER-SÉRIES

Exemple :

30 kg × 10

Feedback :

facile

RIR élevé.

GymRec peut proposer :

# PROCHAINE SÉRIE

**32 kg × 10**

Boutons :

ACCEPTER

GARDER 30 KG

Option :

**Pourquoi ?**

---

# 31. RÈGLES MVP D’ADAPTATION

### Trop facile

Reps atteintes + marge importante.

→ augmentation possible.

### Zone optimale

Reps atteintes + marge cohérente avec objectif.

→ maintien.

### Trop difficile

Échec précoce ou reps non atteintes.

→ réduction possible.

---

# 32. SMART REC

Key feature :

# ● AUTO-REC WORKOUT

GymRec transforme automatiquement ce qu’il observe en données structurées d’entraînement.

---

# 33. BOUCLE SMART REC

## RECORD

Filmer.

↓

## RECOGNIZE

Identifier.

↓

## COUNT

Compter.

↓

## ANALYZE

Analyser.

↓

## LOG

Enregistrer.

↓

## REST

Lancer la récupération.

↓

## ASK

Demander éventuellement un feedback.

↓

## LEARN

Apprendre.

↓

## ADAPT

Recommander.

↓

## RECAP

Résumer.

↓

## SHARE

Créer du contenu si souhaité.

---

# 34. ÉTATS SMART REC

### SEARCHING

Recherche du pratiquant.

### READY

Position correcte.

### ● REC

Série en cours.

### ANALYZING

Analyse.

### SET COMPLETE

Série détectée.

### LOW CONFIDENCE

Confirmation demandée.

---

# 35. REP COUNTING

Pendant la série :

# ● REC

1

2

3

…

10

Pas de dashboard complexe pendant l’effort.

---

# 36. FIN DE SÉRIE

GymRec détecte :

- arrêt ;
- dépose du matériel ;
- sortie du mouvement.

Puis :

# 10 REPS

## SET COMPLETE

Puis immédiatement :

# REST 01:30

---

# 37. CORRECTION

Si nécessaire :

### 10 reps détectées

−1

10

+1

Correction en moins de deux secondes.

La correction devient une annotation.

---

# 38. ANALYSE VIDÉO

GymRec pourra progressivement mesurer :

- tempo ;
- amplitude ;
- régularité ;
- trajectoire ;
- vitesse ;
- ralentissement ;
- asymétrie.

---

# 39. ANALYSE AVANCÉE OPTIONNELLE

Pour utilisateurs avancés :

- ROM ;
- vitesse ;
- velocity loss ;
- RIR ;
- courbes ;
- trajectoire ;
- métriques détaillées.

Jamais imposées.

---

# 40. PREMIERS EXERCICES SMART REC

Proposition :

1. squat ;
2. développé couché barre ;
3. développé incliné haltères ;
4. curl haltères ;
5. shoulder press.

---

# 41. CRITÈRES DE VALIDATION SMART REC

Objectifs initiaux :

### Rep counting

≥ 95 %

### Set detection

≥ 95 %

Tester sur :

- morphologies variées ;
- angles variés ;
- salles différentes ;
- éclairages différents ;
- vêtements différents.

---

# 42. RECONNAISSANCE DE CHARGE

Progression :

## Niveau 1

Saisie manuelle.

## Niveau 2

Mémoire :

> 30 kg comme la dernière fois ?

## Niveau 3

Reconnaissance partielle.

## Niveau 4

Reconnaissance généralisée si suffisamment fiable.

---

# 43. VIDÉO

La vidéo est :

- capteur ;
- journal ;
- outil de comparaison ;
- contenu partageable.

---

# 44. AUTO-CROP

GymRec supprime automatiquement :

- attente avant série ;
- préparation inutile ;
- temps après dernière rep.

---

# 45. JOURNAL VIDÉO

Comparer :

Aujourd’hui

vs

3 mois plus tôt.

Données comparables :

- charge ;
- technique ;
- physique ;
- vitesse ;
- amplitude ;
- reps.

---

# 46. SOCIAL CONTENT

GymRec pourra produire automatiquement :

### ● GYMREC

DÉVELOPPÉ COUCHÉ

80 KG × 10

NEW PR

Formats :

- vertical ;
- carré ;
- horizontal.

---

# 47. AUTO-HIGHLIGHTS

Détection automatique :

- record ;
- meilleure série ;
- meilleure progression ;
- plus grosse charge ;
- meilleur clip.

---

# 48. WORKOUT RECAP

Exemple :

# PECS / BICEPS

1 h 17

24 séries

218 reps

16,8 tonnes

Repos moyen :

1 min 42

Calories :

≈ 430 kcal

---

# 49. PROGRESSION

GymRec doit mesurer la progression via :

- charge ;
- reps ;
- volume ;
- RIR ;
- vitesse ;
- amplitude ;
- régularité ;
- meilleure performance à effort égal.

---

# 50. INSIGHTS

GymRec doit afficher des conclusions.

Exemple :

### RÉCUPÉRATION

> Tu performes mieux avec environ 2 minutes de récupération sur cet exercice.

### VOLUME

> Tes performances diminuent fortement après environ 15 séries pecs.

### PROGRESSION

> Tu sembles prêt à augmenter la charge.

---

# 51. ADAPTATION INTER-SÉANCES

Variables adaptables :

- charge ;
- reps ;
- séries ;
- temps de repos ;
- ordre ;
- exercices ;
- volume hebdomadaire.

---

# 52. COACH ADAPTATIF

Vision long terme :

# GYMREC COACH

Exemple :

Objectif :

Hypertrophie

Disponibilité :

3 jours / semaine

Durée :

1 h 15

GymRec construit puis adapte le programme.

---

# 53. MODÈLE INDIVIDUEL

GymRec apprend :

## Effort

relation charge / reps / difficulté.

## Fatigue

dégradation intra-série et inter-séries.

## Récupération

temps nécessaire.

## Volume

quantité de travail tolérée.

## Progression

réponse individuelle au programme.

---

# 54. CAPTEURS PHYSIOLOGIQUES

GymRec peut utiliser des données provenant de :

- Apple Watch ;
- montres Wear OS ;
- ceintures cardio ;
- futurs capteurs compatibles.

Cependant :

# AUCUNE INTÉGRATION POUR AFFICHAGE SEUL.

Une donnée physiologique doit améliorer le moteur.

---

# 55. CRITÈRE D’ADMISSION D’UNE DONNÉE PHYSIOLOGIQUE

Une donnée peut être intégrée uniquement si elle respecte les critères suivants :

## FIABILITÉ

Mesure suffisamment fiable.

## SYNCHRONISATION

Association précise avec la série concernée.

## VALEUR PRÉDICTIVE

Amélioration mesurable des prédictions.

## ACTIONNABILITÉ

Capacité à modifier une recommandation.

Si la donnée n’améliore pas suffisamment GymRec :

elle est écartée.

---

# 56. FRÉQUENCE CARDIAQUE

Priorité :

# ÉLEVÉE À TESTER.

GymRec peut synchroniser :

SET START

↓

SET END

↓

HR PEAK

↓

RECOVERY +30 s

↓

RECOVERY +60 s

↓

RECOVERY +90 s

↓

NEXT SET

↓

NEXT SET PERFORMANCE

---

# 57. RÉCUPÉRATION CARDIAQUE

Donnée potentiellement plus intéressante que la FC brute.

Le moteur peut apprendre une relation entre :

- réponse cardiaque ;
- vitesse de récupération ;
- temps de repos ;
- performance suivante.

Exemple utilisateur :

# Encore 20 secondes.

> Tu récupères aujourd’hui plus lentement que d’habitude.

Pas :

> HR = 128 bpm.

---

# 58. PERSONAL RECOVERY MODEL

GymRec ne doit pas appliquer un seuil cardiaque universel.

Il doit chercher à apprendre :

> comment cet utilisateur récupère.

Exemple :

GymRec observe historiquement que lorsque ce pratiquant recommence une série trop tôt, ses performances diminuent.

Il peut apprendre à adapter son timer.

---

# 59. SENSOR FUSION

Une série pourra être analysée avec plusieurs sources.

## WORKOUT DATA

- charge ;
- reps ;
- exercice ;
- série ;
- repos.

## COMPUTER VISION

- amplitude ;
- tempo ;
- vitesse ;
- trajectoire ;
- ralentissement.

## USER FEEDBACK

- facile / bien / dur ;
- reps supplémentaires ;
- motif d’arrêt.

## PHYSIOLOGICAL DATA

si démontrées utiles :

- fréquence cardiaque ;
- récupération cardiaque ;
- autres métriques.

---

# 60. OBJECTIF DE LA SENSOR FUSION

Croiser :

# Ce que l’utilisateur fait

avec

# Comment son mouvement se comporte

avec

# Comment il ressent l’effort

avec

# Comment son organisme réagit

afin de répondre :

# Que doit-il faire ensuite ?

---

# 61. ABLATION TEST

Toute nouvelle donnée physiologique devra idéalement être évaluée par comparaison.

## MODÈLE A

Workout + vidéo + feedback.

## MODÈLE B

Workout + vidéo + feedback + donnée physiologique.

Si le modèle B n’améliore pas significativement :

- estimation de l’effort ;
- prédiction de performance ;
- récupération ;
- recommandation ;
- adaptation,

la donnée n’est pas prioritaire.

---

# 62. HRV

Priorité :

### EXPLORATOIRE.

Usage potentiel :

- readiness ;
- fatigue générale ;
- adaptation inter-séances.

Ne pas intégrer si aucune valeur prédictive démontrée.

---

# 63. FRÉQUENCE CARDIAQUE DE REPOS

Priorité :

### EXPLORATOIRE.

Peut contribuer à :

- readiness ;
- détection d’état inhabituel ;
- fatigue.

Uniquement si utile pour les recommandations.

---

# 64. SOMMEIL

Priorité :

### EXPLORATOIRE.

GymRec ne doit pas créer un dashboard sommeil.

Le sommeil ne sera utilisé que s’il améliore :

- prédiction de performance ;
- charge proposée ;
- volume proposé ;
- readiness.

---

# 65. CALORIES WEARABLE

Priorité :

### FAIBLE.

Ne pas récupérer la donnée uniquement pour afficher :

> 512 kcal.

L’utiliser uniquement si elle améliore réellement le modèle énergétique ou nutritionnel GymRec.

---

# 66. SpO₂ / TEMPÉRATURE / AUTRES SIGNAUX

Priorité :

### NON DÉMONTRÉE.

Aucune intégration initiale.

Réévaluation uniquement sur preuve de valeur décisionnelle.

---

# 67. READINESS

À terme, GymRec peut construire un readiness score.

Variables potentielles :

- performance récente ;
- sommeil ;
- HRV ;
- FC repos ;
- feedback ;
- courbatures ;
- historique.

Mais le résultat utilisateur doit rester simple :

> **Aujourd’hui, reste sur ta charge habituelle.**

ou :

> **Ta récupération semble moins bonne que d’habitude. Réduisons légèrement le volume.**

---

# 68. WEARABLES — RÈGLE UX

Les métriques physiologiques avancées ne doivent jamais encombrer l’écran principal.

Le pratiquant voit :

# Tu es prêt.

ou :

# Récupère encore 20 secondes.

Les données brutes restent éventuellement accessibles dans le niveau Performance.

---

# 69. NUTRITION POST-TRAINING

Après séance :

# POST-WORKOUT

Protéines :

30 g

Glucides :

60 g

Lipides :

10–15 g

Ces valeurs restent indicatives.

---

# 70. NUTRITION JOURNALIÈRE FUTURE

À terme GymRec pourra connaître :

- objectif calorique ;
- protéines ;
- glucides ;
- lipides ;
- consommation déjà réalisée.

GymRec pourra dire :

> Il te reste 45 g de protéines et environ 700 kcal aujourd’hui.

---

# 71. CALORIES BRÛLÉES

GymRec peut estimer la dépense avec :

- poids ;
- durée ;
- volume ;
- séries ;
- temps actif ;
- récupération ;
- intensité ;
- éventuellement FC.

Le résultat doit toujours être présenté comme :

### ≈ XXX kcal

---

# 72. UX — CONTRAINTES

Pendant une série :

# 0 tap.

Après une série :

# 0 à 2 taps.

Pendant la récupération :

# une décision principale.

Les données avancées :

# optionnelles.

---

# 73. COMPLEXITÉ

Règle non négociable :

# COMPLEXITÉ INTERNE ≠ COMPLEXITÉ UTILISATEUR.

GymRec doit devenir plus puissant sans devenir plus compliqué.

---

# 74. ONBOARDING

Ne jamais commencer par :

- RIR ;
- RPE ;
- VBT ;
- velocity loss ;
- graphes.

Commencer par :

### Ton objectif ?

### Ta séance ?

### START.

---

# 75. DESIGN

Direction :

- moderne ;
- premium ;
- sobre ;
- technologique ;
- sportif ;
- très lisible.

Éviter :

- bodybuilding old-school ;
- dashboard scientifique au premier niveau ;
- surcharge d’informations.

---

# 76. CONFIDENTIALITÉ

Les vidéos sont privées par défaut.

L’utilisateur contrôle :

- stockage ;
- suppression ;
- cloud ;
- export ;
- partage ;
- utilisation pour entraînement de modèles.

---

# 77. DONNÉES D’ENTRAÎNEMENT

Une série peut contenir :

- workout_id ;
- exercise_id ;
- début ;
- fin ;
- charge ;
- reps prévues ;
- reps réalisées ;
- repos ;
- difficulté ;
- RIR utilisateur ;
- RIR IA ;
- confiance ;
- métriques vidéo ;
- métriques physiologiques pertinentes ;
- recommandation.

---

# 78. NORTH STAR METRIC

# AUTO-LOGGED SETS

Nombre de séries correctement enregistrées sans correction utilisateur.

Cette métrique mesure directement la proposition de valeur.

---

# 79. KPI SMART REC

- précision rep counting ;
- précision set detection ;
- % de séries auto-loggées ;
- taux de correction ;
- taux d’utilisation caméra.

---

# 80. KPI IA

- précision RIR ;
- amélioration des prédictions ;
- taux d’acceptation des recommandations ;
- amélioration après recommandation ;
- taux de questions évitées grâce à l’apprentissage.

---

# 81. KPI PHYSIOLOGIE

Une donnée physiologique n’est utile que si elle améliore une métrique opérationnelle.

Exemples :

- meilleure prédiction de performance série suivante ;
- meilleure recommandation de repos ;
- meilleure estimation de fatigue ;
- meilleure adaptation de volume.

---

# 82. ROADMAP

## PHASE 0 — PROTOTYPE UX

- séries ;
- reps ;
- charges ;
- timer ;
- feedback ;
- recap.

---

## PHASE 1 — MVP

- tracking complet ;
- RIR simplifié ;
- recommandations ;
- progression ;
- nutrition simple.

---

## PHASE 2 — SMART REC ALPHA

5 exercices.

- set detection ;
- rep counting ;
- auto-log ;
- auto-rest ;
- vidéo.

---

## PHASE 3 — SMART REC BETA

- davantage d’exercices ;
- ROM ;
- tempo ;
- velocity ;
- RIR IA ;
- active learning.

---

## PHASE 4 — SENSOR FUSION

Tester :

- fréquence cardiaque ;
- récupération cardiaque.

Comparer :

modèle avec / sans physiologie.

N’intégrer en production que ce qui apporte une vraie valeur.

---

## PHASE 5 — V1 COMMERCIALE

- Smart Rec ;
- tracker ;
- historique ;
- Insights ;
- vidéos ;
- recommandations ;
- sensor fusion validée ;
- nutrition simplifiée.

---

## PHASE 6 — ADAPTIVE COACH

- programme adaptatif ;
- récupération individualisée ;
- volume individualisé ;
- readiness ;
- progression automatisée.

---

# 83. DATA FLYWHEEL

Utilisateur s’entraîne.

↓

GymRec observe.

↓

GymRec prédit.

↓

Utilisateur confirme ou corrige.

↓

Le dataset s’enrichit.

↓

GymRec devient plus précis.

↓

GymRec pose moins de questions.

↓

L’expérience devient plus simple.

↓

L’usage augmente.

---

# 84. PERSONAL DATA FLYWHEEL

La valeur augmente avec le temps.

### Semaine 1

GymRec connaît peu l’utilisateur.

### Mois 1

GymRec reconnaît des patterns.

### Mois 6

GymRec peut mieux anticiper :

- effort ;
- récupération ;
- charge ;
- progression ;
- fatigue.

---

# 85. AVANTAGE À CONSTRUIRE

Le moat de GymRec ne doit pas dépendre uniquement de la computer vision.

Il doit venir de :

1. UX ;
2. automatisation ;
3. dataset longitudinal ;
4. personnalisation ;
5. sensor fusion ;
6. feedback ;
7. moteur d’adaptation.

---

# 86. FACE AUX TRACKERS

Tracker :

> Renseigne ce que tu fais.

GymRec :

# Fais ta séance.

---

# 87. FACE AUX OUTILS EXPERTS

Outil expert :

> Voici tes métriques.

GymRec :

# Voilà ce que tu dois faire ensuite.

---

# 88. FACE AUX CAMÉRAS FITNESS

Caméra fitness :

> Je filme et j’analyse ton mouvement.

GymRec :

> Je transforme ta série en données d’entraînement puis j’apprends comment mieux t’entraîner.

---

# 89. FACE AUX COACHS IA GÉNÉRIQUES

Coach IA :

> Je te propose un programme.

GymRec :

> Je construis mes recommandations à partir de ce que tu fais réellement.

---

# 90. TEST DE VALIDATION D’UNE FONCTIONNALITÉ

Avant toute nouvelle fonctionnalité :

### Peut-elle être automatisée ?

Si oui :

ne pas la demander.

### L’utilisateur doit-il réellement voir cette donnée ?

Si non :

la garder en arrière-plan.

### Peut-elle être interprétée ?

Si oui :

afficher l’interprétation.

### Améliore-t-elle une décision ?

Si non :

la retirer.

### Perturbe-t-elle l’entraînement ?

Si oui :

repenser l’interaction.

---

# 91. EXPÉRIENCE CIBLE

Utilisateur :

ouvre GymRec.

### CHEST / BICEPS

START.

Il pose le smartphone.

GymRec :

### READY

Puis :

# ● REC

1

2

3

…

10

Fin de série :

# 10 REPS

## SET COMPLETE

Timer :

# 01:30

GymRec demande éventuellement :

### Comment c’était ?

😌 Facile

👌 Bien

🔥 Dur

Puis éventuellement :

### Encore 2 reps ?

Oui / Non.

Pendant ce temps, GymRec analyse :

- vidéo ;
- historique ;
- feedback ;
- récupération ;
- éventuellement données physiologiques.

Puis affiche :

# Prochaine série

### 30 kg × 10

ou :

### Passe à 32 kg × 10

ou :

### Récupère encore 20 secondes.

L’utilisateur ne voit pas la complexité du moteur.

Il voit simplement ce qu’il doit faire.

---

# 92. PROMESSE LONG TERME

D’abord :

> GymRec enregistre ton entraînement.

Puis :

> GymRec comprend ton entraînement.

Puis :

> GymRec comprend comment ton corps réagit à ton entraînement.

Puis :

> GymRec apprend comment tu progresses.

Enfin :

# GymRec adapte ton entraînement à toi.

---

# 93. PHRASE PRODUIT DE RÉFÉRENCE

# GymRec est simple par défaut, puissant à la demande.

---

# 94. RÈGLE FINALE

Le meilleur GymRec n’est pas celui qui collecte ou affiche le plus de données.

Le meilleur GymRec est celui qui utilise suffisamment de données pertinentes pour répondre de manière fiable à une question extrêmement simple :

# « Voilà ce que tu dois faire ensuite. »