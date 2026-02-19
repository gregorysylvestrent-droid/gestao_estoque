---
name: pagination
description: Implementa paginação consistente (API + React). Invoque ao listar recursos e otimizar consultas.
---

# Pagination Skill

Padroniza paginação entre API Express/PostgreSQL e frontend React para listas grandes (inventário, veículos, pedidos).

## API (Express + Postgres)
- Parâmetros: `page`, `pageSize` (padrões razoáveis, ex: 1 e 20).
- Retorno:
  ```json
  { "items": [...], "page": 1, "pageSize": 20, "total": 1234 }
  ```
- SQL:
  - Use `LIMIT` e `OFFSET`.
  - Otimize com índices em colunas de ordenação/filtro.
  - Evite `SELECT *`; projete colunas necessárias.
- Ordenação:
  - Permitir `sortBy`/`sortDir` validados para evitar SQL Injection.

## Frontend (React)
- Componente de paginação
  - Integre com barra de paginação e preserve filtros/ordem.
- Estado e efeitos
  - Recarregar ao mudar `page`/`pageSize`/filtros.
- UX
  - Mostrar total e página atual; desabilitar botões quando necessário.

## Boas Práticas
- Limites: imponha máximo de `pageSize` (ex: 100).
- Caching: considerar cache para páginas acessadas com frequência.
- Acessibilidade: botões navegáveis via teclado e labels claros.

## Quando invocar esta skill
- Ao criar endpoints de listagem.
- Ao otimizar performance de telas com grande volume.
