---
name: swagger_docs
description: Gera/atualiza documentação OpenAPI/Swagger. Invoque ao criar/modificar endpoints da API.
---

# Swagger/OpenAPI Docs Skill

Padroniza documentação da API para facilitar integração e testes.

## Objetivos
- Manter especificação OpenAPI atualizada (endpoints, schemas, códigos).
- Expor UI Swagger em `/docs` para consulta.

## Estratégias de Implementação
1. Arquivo OpenAPI
   - Crie `openapi.yaml` ou `openapi.json` com `openapi: 3.0.3`.
   - Documente rotas: métodos, parâmetros, corpo, respostas, exemplos.
2. UI Swagger
   - Utilize `swagger-ui-express` (se decidir integrar). Monte em `/docs`.
3. Sincronização
   - Ao modificar um endpoint, atualize o schema correspondente.
   - Adote revisão obrigatória de docs em PRs de API.

## Boas Práticas
- Use `components/schemas` para reutilizar modelos.
- Indique códigos padronizados (200, 201, 400, 401, 403, 404, 422, 500).
- Inclua exemplos representativos e descrição de erros (`error`, `message`, `code`).

## Quando invocar esta skill
- Ao criar endpoints novos.
- Ao ajustar contratos de entrada/saída de rotas existentes.
