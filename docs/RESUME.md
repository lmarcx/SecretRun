Parfait. Je vais faire exactement ce que tu demandes :

1️⃣ **Synthèse claire du projet (copiable en Markdown)**
2️⃣ **Structuration produit (MVP vs hors MVP)**
3️⃣ **Architecture fonctionnelle**
4️⃣ **Modèle de données initial**
5️⃣ **Stack technique recommandée pour une app mobile**
6️⃣ **Prochaine étape pour travailler efficacement avec Codex**

---

# 📄 Secret Run — Product Definition (MVP)

## Vision

**Secret Run** est une plateforme mobile permettant de rejoindre des **courses secrètes** pour rencontrer des gens tout en courant.

Les participants rejoignent des événements dont seuls quelques paramètres sont visibles (distance, zone approximative).
Les détails du parcours sont révélés **4 heures avant le départ**.

Le projet combine :

* sport
* rencontre sociale
* gamification
* compétition via leaderboards
* personnalisation de profil

---

# 🎯 Objectif du MVP

Valider l'intérêt du concept avec une première communauté.

### KPI de validation

* **10 événements validés**
* **50 inscriptions**
* **40% de rétention**

---

# 👤 Utilisateurs & rôles

## Participant

Peut :

* créer un compte
* rejoindre des événements
* participer à une course
* rejoindre ou créer une team
* gagner des points
* apparaître dans les leaderboards
* personnaliser son profil
* publier son activité
* noter d'autres participants

Profil utilisateur :

* pseudo
* avatar
* ville
* niveau
* bio
* disponibilités
* âge (minimum 18 ans)

Le vrai nom n'est jamais affiché.

---

## Admin

Responsable de :

* modération
* validation des événements
* support
* gestion des signalements

---

# 🏃 Événements (Events)

## Informations visibles avant inscription

* distance
* dénivelé (optionnel)
* nombre de participants
* rayon de **5 km autour du point de départ**

## Informations cachées

* point de départ exact
* point d'arrivée
* parcours complet

## Révélation

Les informations sont révélées **4 heures avant le départ**.

---

## Format d'événement

* heure de départ fixe
* durée estimée

Durées possibles :

* 20 min
* 30 min
* 40 min
* 50 min
* 1h

Distances possibles :

* 3 km
* 5 km
* 7.5 km
* 10 km

---

## Limites

* **10 participants maximum**

---

## Annulation

Si un organisateur annule :

* aucun point attribué
* aucun point retiré
* après **2 annulations dans la journée → timeout 30 minutes**

---

# 📍 Parcours

## Génération

Deux possibilités :

* génération automatique via API
* parcours défini par organisateur

Contraintes :

* en ville
* pas de checkpoints

---

## Validation de course

### Mode principal

**GPS Tracking live**

Si impossible au MVP :

fallback :

* photo du point de départ
* photo du point d'arrivée

---

# 🛡 Anti-triche

Détection automatique :

* vitesse max plausible
* détection de véhicule

Sanctions :

* automatique
* modération manuelle possible

---

# 🧑‍🤝‍🧑 Teams

* taille max : **10**
* minimum pour participer à certains events : **3**
* teams publiques
* créateur = leader

Hors MVP :

* compétitions de saison entre teams

---

# 🏆 Leaderboards

Trois types :

* leaderboard **global individuel**
* leaderboard **par team**
* leaderboard **par saison**

---

# 🎮 Gamification

## Points gagnés via

* participation
* différence entre temps estimé et temps réel
* streaks

---

# 💰 Monnaie virtuelle

Gagnée via :

* connexion quotidienne
* participation aux courses
* notation des coureurs (max 4 par jour)

---

# 🛍 Boutique

Uniquement **cosmétiques**

Permet de personnaliser :

* profil
* avatar
* badges
* cadres

Aucun avantage gameplay.

---

# 🧑 Profil social

Les utilisateurs peuvent :

* voir les profils
* devenir amis
* consulter le **fil d'activité**

Le fil d'activité inclut :

* courses réalisées
* parcours GPS
* performances

---

# 🔔 Notifications

Deux types :

* in-app
* push mobile

---

# 🔞 Contraintes légales

* âge minimum : **18 ans**
* données GPS utilisées
* stockage des traces GPS pour activité (type Strava)

---

# 📱 Plateforme

Application mobile :

* iOS
* Android

---

# 🔐 Authentification

Options :

* email / password
* Google
* Apple

---

# 🚫 Hors MVP

* compétitions teams saisonnières
* duo runs
* chat temps réel
* spectateurs
* objets en boutique

---

# 🧠 Architecture fonctionnelle

Les systèmes principaux du produit sont :

### Auth System

gestion des comptes

### Profile System

profil public + personnalisation

### Event System

création / participation aux courses

### Route System

gestion des parcours

### Tracking System

GPS + validation de course

### Team System

gestion des équipes

### Leaderboard System

classements

### Gamification System

points + monnaie

### Social System

amis + activité

### Moderation System

signalements + sanctions

---





