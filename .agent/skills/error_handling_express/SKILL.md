---
name: error_handling_express
description: Padroniza tratamento de erros no Express. Invoque ao criar rotas/middlewares e revisar respostas de falha.
---

# Error Handling Skill (Express)

Padroniza como a API trata, loga e responde erros de forma segura e consistente.

## Objetivos
- Evitar vazamento de stack/dados sensíveis.
- Responder com um formato uniforme.
- Registrar falhas para auditoria e depuração.

## Padrão de Resposta
```json
{ "error": "BadRequest", "message": "Descrição clara do problema", "code": "BR001" }
```
- Inclua um `code` estável para facilitar rastreamento no frontend e logs.

## Middlewares
1. `notFoundHandler`
   - Responder 404 quando rota não existir.
2. `errorHandler(err, req, res, next)`
   - Mapear erros conhecidos para HTTP: 400, 401, 403, 404, 409, 422, 429, 500.
   - Em produção, não retornar `err.stack`.
   - Logar `err.code`, `req.path`, `userId` (se houver).

## Boas Práticas
- Valide entrada e gere erros 422 com detalhes específicos.
- Para autenticação/autorização use 401/403 com mensagens curtas.
- Em 500, informe que o suporte foi notificado; não exponha detalhes técnicos.
- Habilite `helmet` e `compression` e mantenha CORS limitado.

## Frontend
- Exiba mensagens amigáveis; mapeie `code`→texto localizável.
- Para 401/403, redirecione para login ou página sem acesso.

## Quando invocar esta skill
- Ao criar novas rotas ou integrar serviços.
- Ao revisar consistência de respostas e logs de falhas.
