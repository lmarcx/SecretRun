# Secret Run — MVP Overview

## 1. Vision du produit

Secret Run est une application mobile de **courses urbaines temporisées** où le parcours reste secret jusqu’au moment du départ.

Concept principal :

1. Les utilisateurs découvrent des **events de course** dans l’application.
2. Ils peuvent **rejoindre un event** avant son début.
3. Le **parcours est révélé peu avant le départ**.
4. Le runner doit se rendre dans la **zone de départ**.
5. Il lance sa **run via GPS**.
6. À la fin, la course génère un **résultat et des points**.
7. Les points alimentent un **leaderboard saisonnier** individuel et par équipe.

Objectif MVP :

> Valider l’expérience complète **Event → Run → Result → Leaderboard**

---

# 2. Stack technique

## Frontend

Mobile app :

* **Expo**
* **React Native**
* **Expo Router**
* **TypeScript**

Fonctionnalités principales :

* GPS tracking
* map rendering
* navigation mobile
* notifications client

Librairies principales :

* expo-location
* expo-notifications
* react-native-maps

---

## Backend

Backend stack :

* **PostgreSQL**
* **PostGIS**
* **Hasura GraphQL**
* **Nhost**

Fonctions backend :

* gestion des events
* gestion des participations
* gestion des runs
* leaderboard saisonnier
* équipes

---

## Architecture

Architecture simplifiée :

```
Mobile App (Expo)
       │
       │ GraphQL
       ▼
Hasura
       │
       ▼
PostgreSQL + PostGIS
       │
       ▼
Nhost services
```

---

# 3. Fonctionnalités MVP implémentées

## Events

Les utilisateurs peuvent :

* voir la liste des events
* consulter le détail d’un event
* rejoindre un event
* voir la zone de départ
* voir le moment de révélation du parcours

La page Events est segmentée :

```
Ready to run
Upcoming
Past
```

Chaque event possède un statut visible :

* Not joined
* Joined
* Revealed
* Ready to run
* Finished

---

## Run

Pendant une run :

l’application affiche :

* timer
* distance
* average speed
* état GPS
* état tracking

La run peut être :

* start
* abandon
* finish

---

## Result

À la fin d’une run :

un module résultat affiche :

* status
* duration
* distance
* average speed
* activity points

Ces points alimentent ensuite le leaderboard.

---

## Leaderboard

Le leaderboard affiche :

* classement saisonnier
* leaderboard solo
* leaderboard équipes

Informations affichées :

* rank
* avatar
* username
* points

Saison actuelle :

```
Spring 2026
```

---

## Teams

Fonctionnalités MVP :

* liste des équipes
* informations basiques
* visibilité du classement d’équipe

Limitation actuelle :

```
Team join non disponible dans le MVP
```

Les pages teams sont **read-only**.

---

## Feed

Un feed d’activité existe mais :

```
il nécessite un profil authentifié
```

Dans le MVP actuel :

* feed visible
* feed verrouillé si utilisateur non connecté

---

## Profile

Le profil affiche :

* statut utilisateur
* état des notifications
* accès feed
* login / register

---

## Notifications

Infrastructure client implémentée.

Types de notifications prévus :

* route reveal
* event start
* results available

Dans le MVP :

* route reveal prêt
* autres notifications non activées backend.

---

# 4. Dev Runner Mode

Le MVP inclut un **mode développeur local**.

Objectif :

permettre de tester le produit **sans authentification backend**.

Fonctionnalités disponibles en dev mode :

* join event
* start run
* finish run
* générer résultat

Limites :

* pas de feed
* pas de teams membership
* pas de push notifications réelles

Dev mode est visible via le badge :

```
CLOSED BETA DEV MODE
```

---

# 5. Sécurité actuelle

Sécurité backend :

* permissions Hasura
* GraphQL contrôlé
* tables sensibles protégées

Certaines opérations sont volontairement limitées :

* team join
* feed complet
* notifications backend

Ces limitations sont visibles dans l’UI.

---

# 6. Limites connues du MVP

Le MVP ne contient pas encore :

* authentification réelle
* création d’équipe
* rejoindre une équipe
* social feed complet
* notifications backend complètes
* modération
* antifraud GPS
* protection anti-cheat

Ces fonctionnalités seront implémentées après validation du MVP.

---

# 7. Objectif du MVP

Valider :

1. UX de l’event
2. expérience de course GPS
3. génération des résultats
4. engagement via leaderboard

Le MVP permet de tester :

```
Event → Run → Result → Leaderboard
```

en conditions réelles.

---

# 8. Roadmap courte

Après MVP :

## Phase 1 — Auth réelle

* Google login
* Apple login
* création profile automatique

---

## Phase 2 — Social

* rejoindre une team
* activity feed réel
* follow runners

---

## Phase 3 — Notifications

* route reveal push
* start reminder
* result notification

---

## Phase 4 — Anti-cheat

* validation GPS
* détection spoofing
* distance validation

---

# 9. Statut actuel

Secret Run est actuellement :

```
Closed Beta MVP
```

Le produit est :

* fonctionnel
* testable sur mobile
* stable en local

