# Secret Run

Secret Run est un monorepo pour une application mobile Expo / React Native connectee a un backend Nhost, Hasura, PostgreSQL/PostGIS et une API Node Fastify.

## Stack

- Mobile: React Native, Expo, Expo Router, TypeScript
- Backend local: Docker Compose, PostgreSQL, PostGIS, Hasura
- Backend API: Node.js, Fastify, TypeScript
- Auth / GraphQL / Storage / Functions: Nhost
- Tooling: pnpm workspaces, ESLint, Prettier, TypeScript

## Structure

```txt
SecretRun/
  apps/mobile        Application Expo / React Native
  backend/nhost      Stack local Docker, migrations, metadata, seeds, functions
  backend-api        API Node/Fastify utilisee par l'app
  packages/config    Configuration partagee
  packages/types     Types partages
  scripts            Scripts utilitaires
```

## Prerequis

- Node.js 20+
- pnpm 10+
- Docker Desktop
- Expo CLI via les scripts du projet
- Nhost CLI seulement si tu veux appliquer des migrations avec `pnpm db:migrate`

Installation:

```powershell
pnpm install
```

## Variables d'environnement

### Backend Docker local

Copie le fichier d'exemple:

```powershell
Copy-Item backend\nhost\.env.example backend\nhost\.env
```

Valeurs locales minimales:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=secretrun
HASURA_GRAPHQL_ADMIN_SECRET=hasura-admin-secret
```

### Backend API

Copie le fichier d'exemple:

```powershell
Copy-Item backend-api\.env.example backend-api\.env
```

Configuration locale typique:

```env
NODE_ENV=development
PORT=10000
HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:8081
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=hasura-admin-secret
NHOST_SUBDOMAIN=
NHOST_REGION=
TEAM_EVENT_BONUS_POINTS=5
```

Pour Expo Go sur un telephone, ajoute aussi l'origine LAN dans `CORS_ALLOWED_ORIGINS`, par exemple `http://192.168.1.42:8081`.

### Application mobile

Copie le fichier d'exemple:

```powershell
Copy-Item apps\mobile\.env.example apps\mobile\.env
```

Sur web ou simulateur local:

```env
EXPO_PUBLIC_NHOST_SUBDOMAIN=local
EXPO_PUBLIC_NHOST_REGION=local
EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
EXPO_PUBLIC_BACKEND_API_URL=http://localhost:10000
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://localhost:1337/v1/functions/trackpoints
```

Sur un telephone avec Expo Go, `localhost` pointe vers le telephone. Remplace donc par l'IP LAN de ta machine:

```env
EXPO_PUBLIC_HASURA_GRAPHQL_URL=http://192.168.1.42:8080/v1/graphql
EXPO_PUBLIC_BACKEND_API_URL=http://192.168.1.42:10000
EXPO_PUBLIC_TRACKPOINTS_ENDPOINT=http://192.168.1.42:1337/v1/functions/trackpoints
```

Ne mets jamais le secret admin Hasura dans l'app mobile.

## Demarrage rapide

Demarrage complet en trois services:

```powershell
pnpm dev:full
```

Cette commande lance:

- le backend Docker local
- l'API Node `backend-api`
- Expo pour l'application mobile

Demarrage service par service:

```powershell
pnpm dev:backend
pnpm dev:api
pnpm dev:mobile
```

Commande historique:

```powershell
pnpm dev
```

`pnpm dev` lance le backend Docker et Expo, mais pas `backend-api`. Pour tester les pages feed, profil, inscriptions, details d'events et autres flows backend, utilise plutot `pnpm dev:full`.

## Application mobile

Lancer Expo:

```powershell
pnpm dev:mobile
```

Dans Expo:

- appuie sur `w` pour ouvrir la version web
- scanne le QR code avec Expo Go pour tester sur telephone
- utilise un emulateur Android/iOS si configure

Commandes natives:

```powershell
pnpm --filter @secret-run/mobile android
pnpm --filter @secret-run/mobile ios
```

Verifier l'export web Expo:

```powershell
pnpm --filter @secret-run/mobile exec expo export --platform web
```

## Backend local

Lancer les conteneurs:

```powershell
pnpm dev:backend
```

Voir les logs:

```powershell
pnpm backend:logs
```

Arreter le backend:

```powershell
pnpm backend:stop
```

Endpoint GraphQL local:

```txt
http://localhost:8080/v1/graphql
```

Endpoint API local:

```txt
http://localhost:10000
```

Reset complet de la base locale avec suppression du volume Docker:

```powershell
cd backend\nhost
docker compose down -v
docker compose up -d
cd ..\..
```

Attention: les scripts d'initialisation Docker ne se rejouent automatiquement que quand le volume Postgres est recree. Pour rejouer les donnees de test sur une base existante, utilise les commandes de seed ci-dessous.

## Migrations

Appliquer les migrations Nhost:

```powershell
pnpm db:migrate
```

Cette commande utilise le Nhost CLI. Si tu travailles uniquement avec le Docker Compose local et les migrations deja montees, le stack local peut deja demarrer sans cette commande.

## Donnees de test et seeding

Le projet contient un seed complet pour tester l'application de bout en bout:

- plusieurs profils runners
- un profil principal de test
- plusieurs teams
- plusieurs events ouverts, complets, live, prives et termines
- des participations
- des activites pour le feed
- des leaderboards users et teams
- des wallets et transactions

### Compte de test

```txt
Email: runner.demo@secretrun.local
Mot de passe: a definir dans Nhost Auth
User id: 10000000-0000-4000-8000-000000000001
Profile: you_runner / You Runner
Team: Night Owls
```

Ce compte est celui a utiliser pour tester le profil, le feed, les events deja courus, les inscriptions et l'appartenance a une team.

Ajouter ou remettre toutes les donnees de test:

```powershell
pnpm db:seed:full
```

Commande equivalente via le point d'entree par defaut:

```powershell
pnpm db:seed
```

Retirer les donnees de test:

```powershell
pnpm db:seed:clear
```

Le seed complet commence par nettoyer les anciennes donnees seed, donc il peut etre relance plusieurs fois.

Fichiers utiles:

- `backend/nhost/seeds/seeds.sql`: point d'entree par defaut
- `backend/nhost/seeds/secret_run_full_seed.sql`: seed complet
- `backend/nhost/seeds/secret_run_clear_seed.sql`: nettoyage du seed
- `backend/nhost/seeds/README.md`: details du jeu de donnees

Important pour l'auth: le seed ajoute les lignes necessaires en base, mais un vrai login Nhost avec mot de passe demande aussi que l'utilisateur existe cote Nhost Auth avec ses credentials. Pour te connecter avec `runner.demo@secretrun.local`, cree le meme compte dans le projet Nhost configure par l'app avec le mot de passe de ton choix, ou configure un auth/JWT local qui emet le meme user id. Si une allowlist beta est active, ajoute aussi cette adresse.

## Tests et qualite

Typecheck mobile:

```powershell
npx tsc -p apps/mobile/tsconfig.json --noEmit
```

Typecheck backend API:

```powershell
pnpm --filter @secret-run/backend-api typecheck
```

Tests backend API:

```powershell
pnpm --filter @secret-run/backend-api test
```

Lint global:

```powershell
pnpm lint
```

Formatage:

```powershell
pnpm format
```

Build backend API:

```powershell
pnpm --filter @secret-run/backend-api build
```

## Commandes principales

```powershell
pnpm install
pnpm dev:full
pnpm dev:backend
pnpm dev:api
pnpm dev:mobile
pnpm backend:logs
pnpm backend:stop
pnpm db:migrate
pnpm db:seed
pnpm db:seed:full
pnpm db:seed:clear
pnpm lint
pnpm format
```

## Fonctionnalites backend principales

- Events: liste, details, inscription, etats live / complet / termine
- Feed: activites de l'utilisateur, amis et membres d'equipe
- Teams: equipes, membres, classements
- Leaderboards: classement runners et teams par points saisonniers
- Routes: generation, chiffrement, revelation et validation de parcours
- Wallet: recompenses de participation, login quotidien et rating
- Social: friendships, blocks, likes, comments
- Notifications: enregistrement device, jobs et rappels d'events

## Depannage

### L'app mobile ne joint pas le backend

Verifie que:

- `pnpm dev:backend` est lance
- `pnpm dev:api` est lance
- `EXPO_PUBLIC_BACKEND_API_URL` pointe vers `http://localhost:10000` sur web/simulateur
- `EXPO_PUBLIC_BACKEND_API_URL` pointe vers l'IP LAN de ton PC sur telephone
- `HOST=0.0.0.0` est configure dans `backend-api/.env`

### Les events publics s'affichent mais pas le feed/profil

Les events peuvent fonctionner via le fallback GraphQL public. Le feed, le profil, les inscriptions et les flows prives demandent `backend-api`. Lance:

```powershell
pnpm dev:api
```

### Le seed ne semble pas applique

Verifie que Docker tourne, puis relance:

```powershell
pnpm dev:backend
pnpm db:seed:full
```

Pour repartir proprement:

```powershell
pnpm db:seed:clear
pnpm db:seed:full
```

### Expo Go utilise encore une ancienne config

Redemarre Expo avec le cache vide:

```powershell
pnpm dev:mobile
```

Le script mobile utilise deja `expo start --clear`.
