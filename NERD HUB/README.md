# NERD HUB (React + Backend)

Arquitetura atual:
- Auth: Supabase (`supabase.auth`)
- Backend: Node/Express para `vault` criptografado e `theme_preference`

## Estrutura

- `frontend/`: React + Vite
- `backend/`: API Node + Express
- `backend/sql/`: scripts SQL para tabelas de suporte no Supabase

## Setup

### 1) Supabase

1. Crie o projeto no Supabase.
2. Execute `backend/sql/001_user_preferences.sql` no SQL Editor.
3. Pegue:
   - `Project URL`
   - `anon key`
   - `service_role key`

### 2) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend padrao: `http://localhost:4000`

### 3) Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend padrao: `http://localhost:5173`

## Endpoints do backend

- `GET /api/health`
- `GET /api/vault` (auth required)
- `PUT /api/vault` (auth required)
- `GET /api/user/preferences` (auth required)
- `PUT /api/user/preferences` (auth required)

## Observacoes

- O backend persiste `vault` em `backend/data/store.json`.
- A preferencia de tema (`theme_preference`) fica no Supabase, tabela `user_preferences`.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
