# NERD HUB - Stack 2026 (Dark Base + Cloud)

Este projeto entra em uma nova base para reduzir código manual e acelerar entrega:

- App client: `Flutter (Dart)` para Android, iOS, Windows e macOS com a mesma base.
- Auth e dados: `Firebase Auth + Firestore`.
- Lógica sensível de backend: `Firebase Cloud Functions (Node.js + TypeScript)`.
- Arquivos/mídia: `Firebase Storage`.
- Push: `Firebase Messaging (FCM)`.

## Por que essa mudança

- Menos código de infraestrutura.
- Menos manutenção de autenticação manual.
- Realtime nativo.
- Stack forte no mercado para app social privado.

## Estrutura adicionada

- `mobile/` -> app Flutter base.
- `functions/` -> funções server-side em Node/TS.

## Fases de migração

1. Fase 1 (agora)
- Criar base Flutter e Functions.
- Manter web atual funcionando para não travar.

2. Fase 2
- Migrar Login/Cadastro para Firebase Auth.
- Migrar dados principais para Firestore.

3. Fase 3
- Mover regras críticas para Cloud Functions.
- Ativar notificações FCM.

4. Fase 4
- Encerrar endpoints legados que ficarem sem uso.

## Setup rápido

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

### Functions (Node)

```bash
cd functions
npm install
npm run build
```

> Antes de deploy: executar `flutterfire configure` no app e configurar projeto Firebase para Functions/Auth/Firestore/Storage.

