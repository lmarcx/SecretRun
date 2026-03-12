# Secret Run — Beta V0.1 Checklist

## Objectif

Passer d’un **MVP interne fonctionnel** à une **closed beta sécurisée et testable avec de vrais runners**.

Cette checklist est basée sur l’audit technique du codebase (`MVP_AUDIT.md`).

La priorité est donnée à :

1. sécurité
2. intégrité des runs
3. cohérence backend
4. expérience utilisateur beta

---

# 1. CRITICAL — Security

Ces éléments doivent être corrigés **avant toute beta externe**.

## Dev mode

* [ ] Gater `DEV_RUNNER_MODE` derrière une variable d’environnement (`process.env`)
* [ ] Désactiver DEV_RUNNER_MODE dans les builds production
* [ ] Masquer le badge DEV MODE en production
* [ ] Vérifier qu’aucun bypass dev n’existe dans les services

---

## Route protection

* [ ] Empêcher l’accès direct à `/run/[eventId]`
* [ ] Vérifier participation avant démarrage d’une run
* [ ] Ajouter un guard navigation global pour routes protégées

---

## Backend trust model

Décision critique :

```text
le client ne doit plus écrire directement les runs
```

* [ ] Supprimer `insert_activities_one` depuis le client
* [ ] Supprimer `insert_activity_trackpoints` depuis le client
* [ ] Faire passer toutes les runs par un workflow backend

Workflow cible :

```text
start-activity
↓
trackpoints ingestion
↓
finish-activity
↓
validate-activity
↓
update-leaderboards
```

---

## Nhost functions security

* [ ] Vérifier auth obligatoire pour toutes les functions
* [ ] Supprimer tout usage de `user_id` venant du client
* [ ] Dériver l’identité depuis le token auth
* [ ] Vérifier permissions sur :

functions à auditer :

* `start-activity`
* `finish-activity`
* `participation-reward`
* `register-device`
* `send-notification`
* `trackpoints`

---

## GraphQL permissions

* [ ] Limiter lecture `profiles` pour `anonymous`
* [ ] Vérifier visibilité `team_members`
* [ ] Vérifier visibilité `event_routes`
* [ ] Vérifier visibilité `activities`

Décision produit à prendre :

```text
routes révélées publiques
ou
routes visibles uniquement par participants
```

---

# 2. CRITICAL — Run Integrity

Ces points garantissent que les runs sont valides.

---

## Validation GPS minimale

Ajouter côté client :

* [ ] filtrer `accuracy`
* [ ] ignorer positions trop anciennes
* [ ] seuil distance minimum
* [ ] seuil durée minimum

---

## Validation côté serveur

Ajouter côté backend :

* [ ] distance recalculée serveur
* [ ] vérification vitesse maximale
* [ ] vérification cohérence trackpoints
* [ ] validation fin de run

---

## Protection anti spoof

Minimum beta :

* [ ] reject vitesse impossible
* [ ] reject trackpoints incohérents
* [ ] vérifier timestamps

---

# 3. IMPORTANT — Backend coherence

L’audit révèle **deux architectures concurrentes**.

Décision :

```text
utiliser uniquement les workflow backend
```

---

## Activity lifecycle

Implémenter flux unique :

```text
start activity
↓
trackpoints ingestion
↓
finish activity
↓
validation
↓
leaderboard update
```

---

## Feed backend

* [ ] utiliser `get-activity-feed` au lieu de GraphQL direct
* [ ] supprimer feed query locale actuelle

---

## Participation

* [ ] utiliser `participation-reward`
* [ ] supprimer join mutation directe

---

## Notifications

Aligner types :

mobile :

```
event_start
route_reveal
results_available
```

backend :

```
event_start_reminder
```

---

# 4. IMPORTANT — Auth

La beta doit fonctionner avec de vrais comptes.

---

## Auth providers

Ajouter :

* [ ] Google login
* [ ] Apple login

---

## Profile creation

* [ ] auto-create profile à l’inscription
* [ ] gérer erreur profile creation

---

## Feed access

* [ ] feed visible uniquement connecté
* [ ] feed basé sur backend function

---

# 5. IMPORTANT — Run stability

---

## Background tracking

Actuellement :

```text
foreground only
```

Ajouter :

* [ ] background location permission
* [ ] background task
* [ ] run persistence

---

## Run session persistence

Remplacer :

```text
runSessionStore (memory)
```

par :

* [ ] storage persistant
* [ ] user scoped sessions

---

# 6. IMPORTANT — Performance

---

## Data fetching

Ajouter cache :

* [ ] TanStack Query
* [ ] request deduplication
* [ ] retry automatique

---

## Lists

* [ ] remplacer ScrollView events par FlatList
* [ ] pagination events
* [ ] pagination leaderboard
* [ ] pagination feed

---

# 7. IMPORTANT — UX beta

---

## Navigation

* [ ] masquer navigation pendant run
* [ ] masquer navigation pendant auth

---

## Run UX

* [ ] confirmation abandon run
* [ ] message perte run si app fermée

---

## Errors

* [ ] supprimer messages backend bruts
* [ ] normaliser messages erreur

---

# 8. NICE TO HAVE — Developer experience

---

## GraphQL

* [ ] générer types GraphQL
* [ ] utiliser fragments

---

## Codebase cleanup

Supprimer :

* `useEventRoute`
* `useTrackpointSync`
* `sendTrackpoint`
* `HomeScreen`
* `PlaceholderScreen`

---

## Tests

Ajouter tests pour :

* auth
* join event
* run completion
* upload retry

---

# Definition of done — Beta V0.1

La beta est prête si :

* dev mode désactivé
* runs validées serveur
* workflow backend unique
* routes protégées
* auth réelle
* notifications fonctionnelles
* runs persistantes

---

# Statut actuel

Actuellement :

```text
Advanced internal MVP
```

Objectif :

```text
Closed beta V0.1
```


