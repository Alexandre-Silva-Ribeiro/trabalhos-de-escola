# NERD HUB Cloud Functions

Functions server-side para regras sensiveis (Node.js + TypeScript).

## Requisitos

- Firebase CLI instalado e logado.
- Projeto Firebase configurado.

## Rodar local

```bash
npm install
npm run build
```

## Deploy

```bash
npm run deploy
```

## Funcoes iniciais

- `getSyncSummary`:
  - exige usuario autenticado;
  - recebe `duoId`;
  - retorna resumo de sync armazenado no Firestore.

