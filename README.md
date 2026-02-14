# Biografia - Enedina Alves Marques

Projeto full stack minimalista com:

- Frontend: React + TypeScript + Vite + CSS puro
- Backend: Node.js + Express

## Estrutura do repositório

O deploy e a execução usam as pastas da raiz do repositório:

- `frontend/`
- `backend/`

Se existir uma pasta local `Biografia/` dentro do seu computador, ela não é usada no deploy do GitHub Pages.

## Como rodar

1. Instale dependências na raiz:

```bash
npm install
```

2. Inicie frontend e backend juntos:

```bash
npm run dev
```

## Endpoints

- `GET /api/biography`: retorna o conteúdo biográfico em JSON.
- `GET /api/elevenlabs/voices`: lista vozes do ElevenLabs.
- `POST /api/elevenlabs/speech`: gera áudio da biografia com ElevenLabs.

## ElevenLabs (opcional)

Para usar a API do ElevenLabs no backend:

```bash
ELEVENLABS_API_KEY=sua_chave
```

Você também pode criar o arquivo `backend/.env` usando `backend/.env.example`
e definir a chave nele.
