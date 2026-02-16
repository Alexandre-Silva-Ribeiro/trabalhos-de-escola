# NERD HUB (React + Backend)

Este projeto foi migrado para arquitetura **frontend + backend** para resolver o problema de vault local-only.

## Estrutura

- `frontend/`: React + Vite
- `backend/`: API Node + Express

## O que mudou

- Login/cadastro agora passam pelo backend.
- Vault e modulos (timeline, reciprocidade, notas, agenda, stats) sao persistidos no servidor.
- Senha nao depende mais de `localStorage` para liberar o app.
- Dados do vault sao criptografados no backend antes de gravar em disco.

## Setup

### 1) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend padrao: `http://localhost:4000`

### 2) Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend padrao: `http://localhost:5173`

## Endpoints principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET /api/vault`
- `PUT /api/vault`

## Observacoes

- O backend usa `backend/data/store.json` para persistencia.
- Em producao, troque `JWT_SECRET` e `ENCRYPTION_SECRET` no `.env`.
- Arquivos antigos no raiz (`index.html`, `app.js`, etc.) sao da versao estatica anterior e podem ser ignorados.
