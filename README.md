# Biografia - Enedina Alves Marques

Projeto full stack minimalista com:

- Frontend: React + TypeScript + Vite + CSS puro
- Backend: Node.js + Express

## Estrutura do repositorio

O deploy e a execucao usam as pastas da raiz do repositorio:

- `frontend/`
- `backend/`

Se existir uma pasta local `Biografia/` dentro do seu computador, ela nao e usada no deploy do GitHub Pages.

## Como rodar

1. Instale dependencias na raiz:

```bash
npm install
```

2. Inicie frontend e backend juntos:

```bash
npm run dev
```

## Endpoints

- `GET /api/biography`: retorna o conteudo biografico em JSON.
- `GET /api/elevenlabs/voices`: lista vozes do ElevenLabs.
- `POST /api/elevenlabs/speech`: gera audio da biografia com ElevenLabs.

## ElevenLabs (opcional)

Para habilitar o seletor de vozes do ElevenLabs:

```bash
ELEVENLABS_API_KEY=sua_chave
```

Voce tambem pode criar o arquivo `backend/.env` usando `backend/.env.example`
e definir a chave nele.
