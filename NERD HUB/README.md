# NERD HUB (React + Backend)

Arquitetura atual:
- Auth: Firebase Auth (e-mail/senha + Google)
- Backend: Node/Express para `vault` criptografado e `theme_preference`
- Qualidade: Biome (lint + format)
- SQL opcional: Sequelize + Postgres
- Infra local: Docker Compose

## Estrutura

- `frontend/`: React + Vite
- `backend/`: API Node + Express
- `backend/sql/`: scripts SQL para tabelas de suporte no Supabase

## Setup

### 1) Firebase (Auth)

1. Crie um projeto no Firebase.
2. Ative Authentication:
   - Email/Password
   - Google
3. Pegue as chaves Web App e preencha `frontend/.env`.
4. No backend, defina ao menos:
   - `AUTH_PROVIDER=firebase`
   - `FIREBASE_PROJECT_ID`
   - (opcional, recomendado) `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

### 2) Supabase (opcional, apenas para preferencias se quiser)

1. Crie o projeto no Supabase.
2. Execute `backend/sql/001_user_preferences.sql` no SQL Editor.
3. Pegue:
   - `Project URL`
   - `service_role key`

### 3) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend padrao: `http://localhost:4000`

### 4) Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend padrao: `http://localhost:5173`

## Biome (lint/format)

### Backend

```bash
cd backend
npm run lint
npm run format
```

### Frontend

```bash
cd frontend
npm run lint
npm run format
```

## Sequelize (opcional para preferencias)

No backend, escolha o provider para `theme_preference`:

- `PREFERENCES_PROVIDER=supabase` (padrao atual)
- `PREFERENCES_PROVIDER=sequelize` (usa Postgres local)

Variaveis relevantes em `backend/.env`:

- `DATABASE_URL`
- `DATABASE_SSL`
- `DB_SYNC_ON_START`
- `SEQUELIZE_PREFERENCES_TABLE`

Migration Sequelize:

```bash
cd backend
npm run db:migrate
```

Health SQL:

- `GET /api/health/db`

## Docker Compose

Sube Postgres + Backend + Frontend:

```bash
docker compose up --build
```

Portas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Postgres: `localhost:5432`

## Endpoints do backend

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/vault` (auth required)
- `PUT /api/vault` (auth required)
- `GET /api/user/preferences` (auth required)
- `PUT /api/user/preferences` (auth required)

## Observacoes

- O backend persiste `vault` em `backend/data/store.json`.
- A preferencia de tema (`theme_preference`) pode ficar no:
  - Supabase (`user_preferences`), ou
  - Postgres via Sequelize (`user_preferences_local`), conforme `PREFERENCES_PROVIDER`.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca exponha credenciais privadas do Firebase no frontend (somente as chaves publicas do Web App).
