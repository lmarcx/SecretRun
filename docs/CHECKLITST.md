Parfait. Voici la **checklist MVP technique détaillée** de Secret Run, orientée livraison.

# 1. Setup de base

Doit être vrai avant tout le reste.

* Backend Docker démarre proprement en une seule commande
* Hasura metadata cohérentes
* seed chargé automatiquement
* app Expo démarre sur web + Expo Go
* backend mobile pointe sur l’IP locale correcte
* auth provider choisi et branché
* variables d’environnement documentées

## C'est validé !

* `docker compose down -v && docker compose up -d` fonctionne du premier coup
* `events`, `seasons`, `leaderboard_*` contiennent bien des lignes seed
* l’app affiche les events et le leaderboard sans erreurs GraphQL

---

# 2. Auth MVP

Le minimum utile pour une beta fermée.

## À faire

* login Google
* login Apple
* création auto du `profile` à l’inscription
* écran signed out propre
* persistance session
* logout

## Règles

* `username` unique
* `display_name = username` au départ
* avatar, localisation, âge modifiables plus tard

## Done quand

* un user peut se connecter
* un `profile` existe automatiquement
* la page profile affiche soit le profil, soit l’état signed out

---

# 3. Home / Events list

C’est la vraie home produit.

## À afficher

* liste des events disponibles
* titre
* description courte
* heure de départ
* heure de reveal
* rayon de zone de départ
* type d’event : public / team
* état : à venir / reveal bientôt / terminé

## Filtres MVP

* public / team
* date / bientôt
* distance si dispo plus tard

## États UI

* loading
* empty state
* error state

## Done quand

* la home n’est plus un hub placeholder
* elle devient la page Events réelle

---

# 4. Event detail

Le détail doit donner juste assez d’infos sans casser le secret.

## Avant reveal

Afficher :

* titre
* description
* starts_at
* reveal_at
* zone center + radius
* nombre max de participants
* état participation utilisateur
* bouton rejoindre

## Après reveal

Afficher en plus :

* start point
* end point
* polyline
* vraie map
* bouton “Go to run”

## Règles

* la route n’est visible qu’aux participants
* le départ réel n’est visible qu’après `reveal_at`

## Done quand

* un user peut comprendre l’event
* rejoindre
* revenir plus tard après notif
* voir la route

---

# 5. Join event

Petit flow, mais central.

## À faire

* bouton rejoindre
* prévention double inscription
* message succès
* message “déjà rejoint”
* état complet si event plein
* support events team privés

## Règles MVP

* max 5 participants
* team events réservés aux membres concernés
* pas besoin d’être dans la zone pour rejoindre

## Done quand

* inscription persistée dans `event_participants`
* l’UI reflète l’état “joined”

---

# 6. Reveal + notifications

Très important pour la promesse produit.

## Notifications MVP

* route reveal
* event start
* résultats disponibles

## À faire

* planification / déclenchement notif
* deep link vers event
* état UI “route revealed”

## Done quand

* un user rejoint un event
* reçoit une notif
* ouvre l’event et voit la route révélée

---

# 7. Run mode

Le cœur de la valeur.

## À afficher

* map
* zone de départ
* start point
* end point
* polyline
* position utilisateur
* bouton start
* bouton abandonner
* chrono
* distance

## Règles

* démarrage autorisé seulement dans la zone
* pas de pause/reprise
* abandon possible
* tracking local puis upload fin de course

## À faire

* demander permission location
* vérifier présence dans zone
* démarrer tracking
* stocker trackpoints localement
* finir la course
* upload activité + trackpoints

## Done quand

* un user peut réellement lancer une course
* finir
* obtenir une activité sauvegardée

---

# 8. Validation de course

Pas juste “finir” côté UI.

## MVP recommandé

* calcul local : temps, distance
* validation backend :

  * cohérence globale
  * vitesse max
  * flag véhicule si suspect

## États activité

* running
* completed
* abandoned
* flagged

## Done quand

* une course finie produit une activité enregistrée
* les runs suspects ne scorent pas normalement

---

# 9. Anti-cheat MVP

Simple mais réel.

## Règles recommandées

* vitesse max plausible : 25 km/h
* points GPS incohérents = flag
* distance/temps aberrants = flag

## Résultat

* activité marquée suspecte
* pas de points leaderboard si flag critique
* résultat expliqué à l’utilisateur plus tard si besoin

## Done quand

* un run manifestement impossible ne passe pas “normalement”

---

# 10. Résultat de course

Le joueur doit sentir la récompense.

## À afficher

* statut validé / suspect / abandonné
* distance
* durée
* points gagnés
* efforts gagnés
* tracé
* lien vers leaderboard
* lien vers activité

## Done quand

* fin de course = écran résultat clair et satisfaisant

---

# 11. Leaderboards

Déjà branchés, à solidifier.

## MVP minimum

* Solo Season
* Team Season

## Si facile en plus

* Solo Global
* Team Global

## Weekly

Peut être phase juste après MVP si trop lourd

## À afficher

* rang
* username / team name
* points
* user/team highlight si connecté

## Done quand

* les points de seed puis de vraies courses apparaissent correctement

---

# 12. Profile

Le minimum utile pour une beta.

## Signed out

* login
* register

## Signed in

* avatar
* username
* localisation
* âge
* historique minimal
* logout

## Plus tard si rapide

* edit profile
* choix avatar

## Done quand

* un utilisateur connecté se reconnaît clairement dans l’app

---

# 13. Teams

Tu veux les garder dans le MVP si possible, donc version légère.

## MVP minimum

* liste des teams
* détail d’une team
* rejoindre une team
* voir les membres
* voir leaderboard team

## Ensuite

* créer une team
* créer un event de team

## À couper si besoin

La création d’event team peut passer juste après la beta 1 si elle bloque le reste

## Done quand

* un user peut découvrir et intégrer une team

---

# 14. Feed

À garder simple.

## MVP minimum

* activités de l’utilisateur
* activités des amis

## Plus tard

* likes
* commentaires
* activités d’events team

## Done quand

* l’écran feed n’est plus vide
* au moins les courses validées y remontent

---

# 15. Système de récompenses

Version MVP.

## À attribuer à la validation

* points leaderboard
* efforts

## Formule MVP

* points fixes par course
* bonus sur différence temps estimé / temps réel

## Done quand

* une course modifie vraiment le score joueur

---

# 16. Données et permissions Hasura

À verrouiller avant beta réelle.

## À vérifier

* anonymous : lecture publique autorisée seulement où voulu
* user : accès à ses participations, son profil, ses activités
* team events : visibles seulement aux membres concernés
* event routes : visibles seulement après reveal et pour participants
* trackpoints : privés à l’utilisateur concerné

## Done quand

* aucune donnée sensible ne fuit
* l’app anonyme fonctionne là où elle doit fonctionner

---

# 17. Observabilité / debug MVP

Indispensable pour une beta fermée.

## À avoir

* logs clairs côté mobile
* logs backend simples
* seed reproductible
* script reset local
* données de demo utilisables

## Très utile

* écran debug caché ou banner dev
* reset seed simple

---

# 18. Ce qu’on peut couper si ça ralentit trop

## À couper en premier si besoin

* weekly leaderboard
* commentaires/likes feed
* création d’event team par les users
* personnalisation avancée du profil
* wallet/efforts utilisables
* sanctions/reports complets
* anti-cheat très sophistiqué

## À garder absolument

* auth
* events list
* event detail
* join
* reveal
* run mode
* validation
* résultat
* leaderboard season
* profile
* team join simple

---

# 19. Définition de “MVP prêt pour beta fermée”

Secret Run MVP est prêt quand un vrai runner peut :

* se connecter
* voir des events
* rejoindre un event
* recevoir la révélation
* aller sur place
* lancer sa course
* finir sa course
* voir son résultat
* apparaître dans le leaderboard
* rejoindre une team
* voir un feed minimum

---

# 20. Ordre de build

## Sprint 1

* auth
* profile minimal
* events list
* event detail
* join event

## Sprint 2

* reveal route
* map
* run mode
* upload activité
* résultat

## Sprint 3

* leaderboard solo/team season
* teams list/join
* feed minimal
* notifications

---
