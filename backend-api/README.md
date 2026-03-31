# Secret Run Backend API

API Node minimale pour sortir la logique metier sensible des Nhost Functions tout en gardant Nhost Cloud pour l'auth, Hasura et Postgres.

## Ce qui est inclus

- verification du Bearer token Nhost
- acces serveur a Hasura via `graphql-request`
- routes MVP:
  - `GET /health`
  - `GET /me`
  - `POST /events/:id/join`
  - `POST /runs/start`
  - `POST /runs/finish`

## Variables d'environnement

Copier `.env.example` et renseigner:

- `PORT`
- `HOST`
- `HASURA_GRAPHQL_URL`
- `HASURA_ADMIN_SECRET`
- `NHOST_SUBDOMAIN`
- `NHOST_REGION`
- `NHOST_JWKS_URL` ou `NHOST_JWT_PUBLIC_KEY`
- `NHOST_JWT_ISSUER` optionnel
- `NHOST_JWT_AUDIENCE` optionnel
- `TEAM_EVENT_BONUS_POINTS` optionnel

## Local

```bash
pnpm install
pnpm --filter @secret-run/backend-api build
pnpm --filter @secret-run/backend-api start
```

## Render

Configuration manuelle conseillee pour ce monorepo:

1. Creer un `Web Service` Node sur Render.
2. Connecter le repo et la branche cible.
3. Laisser le `Root Directory` vide pour executer les commandes au niveau du repo.
4. Utiliser:
   - Build Command: `pnpm install --frozen-lockfile && pnpm --filter @secret-run/backend-api build`
   - Start Command: `pnpm --filter @secret-run/backend-api start`
5. Renseigner les variables d'environnement de `.env.example`.
6. Verifier le endpoint `/health` apres le premier deploy.

## Notes d'architecture

- L'API verifie le JWT Nhost avant toute action protegee.
- Les mutations metier passent par Hasura GraphQL avec secret serveur.
- Le mobile envoie le token Nhost dans `Authorization: Bearer <token>`.
- Les routes critiques ont un rate limiting memoire simple par IP et par user, pense pour un service Render free unique.
- `POST /runs/finish` dedupe les requetes concurrentes sur une meme activite dans le process Node.

## Surface d'ecriture Hasura

L'API n'utilise l'`HASURA_ADMIN_SECRET` que pour ces ecritures metier:

- `insert_event_participants_one` pour `POST /events/:id/join`
- `insert_activities_one` pour `POST /runs/start`
- `insert_activity_trackpoints` pour ajouter uniquement les points normalises par le serveur
- `update_activities_by_pk` pour marquer une activite en `rejected`
- `finalize_validated_activity` pour finaliser une activite validee et appliquer les effets de score

Les statuts, points et vitesses persistés ne sont pas acceptes tels quels depuis le client:

- le JWT verifie fixe l'identite utilisateur
- `status` et `points` sont decides uniquement cote serveur
- `speed_kmh` est recalculee cote serveur a partir des positions retenues

## Hypotheses MVP de controle

- Fenetre de join: `reveal_at <= now < starts_at`
- Fenetre de start: `starts_at <= now <= ends_at` si `ends_at` existe
- Fenetre de finish: meme fenetre que start, sauf qu'un retry sur une activite deja finalisee renvoie le resultat existant
- Controle geographique MVP: la zone de depart est verifiee au `start` quand le client envoie `lat/lng`, puis re-verifiee au `finish` sur le premier trackpoint retenu. Si `start_area_center` ou `start_area_radius_km` manque, le controle est saute.

## Payload MVP de `POST /runs/start`

Champs optionnels acceptes en plus de `eventId` / `startedAt`:

- `lat` et `lng` pour la position de depart
- `accuracy_meters` pour la precision GPS fournie par le device
- `timestamp` pour l'horodatage natif du fix GPS

Regles minimales retenues:

- compatibilite ascendante: si ces champs sont absents, le start reste accepte
- `lat` et `lng` doivent toujours etre fournis ensemble
- `accuracy_meters` et `timestamp` ne sont utilises que s'ils sont presents
- si `accuracy_meters > 80`, le start est refuse avec `start_gps_too_imprecise`
- si `timestamp` est fourni mais trop eloigne de `startedAt` (> 15 s), le start est refuse avec `invalid_start_location_timestamp`
- cote mobile closed beta, une precision moyenne peut seulement declencher un warning; le blocage dur est reserve aux cas nettement mauvais
