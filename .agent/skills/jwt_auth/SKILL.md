---
name: jwt_auth
description: Implementa e audita autenticação JWT (Express + React). Invoque ao criar login, proteger rotas e revisar tokens.
---

# JWT Authentication Skill

Esta skill orienta a implementação e revisão de autenticação baseada em JSON Web Tokens (JWT) no backend Express e integração no frontend React.

## Objetivos
- Emissão de tokens seguros com expiração.
- Middleware de verificação e autorização por escopo/papel.
- Estratégia de refresh robusta e revogação.
- Proteção de rotas no frontend e gestão de sessão.

## Backend (Express)
1. Emissão do token
   - Assine o token com `HS256` usando `process.env.JWT_SECRET`.
   - Inclua `sub` (id do usuário), `roles` ou `scope`, `iat` e `exp` curto (ex: 15 min).
2. Middleware de validação
   - Valide `Authorization: Bearer <token>`.
   - Rejeite tokens expirados ou assinatura inválida.
   - Anexe `req.user = { id, roles, scope }`.
3. Refresh Token
   - Use refresh com expiração maior (ex: 7 dias).
   - Armazene refresh no servidor (lista branca) e associe a `userId + deviceId`.
   - Endpoint `/auth/refresh` revalida refresh e emite novo access.
4. Revogação
   - Mantenha uma lista de refresh inválidos ao fazer logout ou em caso de comprometimento.
5. Respostas e erros
   - Padronize códigos: 401 (não autenticado), 403 (sem permissão), 422 (payload inválido).
   - Nunca exponha stack em produção.

## Frontend (React)
1. Armazenamento de tokens
   - Preferir `httpOnly` cookies para access/refresh quando possível via backend.
   - Se usar `localStorage`, limite a superfície: apenas access de curta duração.
2. Proteção de rotas
   - Bloqueie páginas privadas se não houver sessão válida.
   - Oculte módulos com base em `roles`/`scope`.
3. Renovação automática
   - Interceptor de requisições: ao receber 401 por expiração, tente `refresh` uma vez e repita a chamada.
4. Logout seguro
   - Limpe tokens e acione revogação de refresh no backend.

## Segurança
- Segredo
  - Nunca commit de `JWT_SECRET`; use `.env` e variáveis seguras em produção.
- Algoritmo e claims
  - Use `HS256`; defina `aud`, `iss` quando necessário; valide `exp`.
- Duração
  - Access curto (10–20 min); refresh controlado (dias) com rotação.
- CSRF
  - Se cookies `httpOnly`, usar `SameSite=strict` e CSRF token em POST sensíveis.

## Auditoria
- Verifique headers corretos e ausência de tokens em logs.
- Garanta teste de fluxo: login → acesso protegido → expiração → refresh → revogação.

## Quando invocar esta skill
- Ao criar/ajustar endpoints de autenticação.
- Ao proteger qualquer rota nova.
- Ao revisar incidentes de sessão ou segurança.
