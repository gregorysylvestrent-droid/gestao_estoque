# Integridade de Dados: `gestao_frota` e `source_module`

## Escopo
Analise e correcao de consistencia entre backend, frontend e banco para o cadastro central de frota (`fleet_vehicles`) e referencias por placa.

## Inconsistencias encontradas e decisao tecnica

### 1) Filtro misto de leitura em `fleet_vehicles`
- Problema: partes do frontend filtravam por `source_module='oficina'` e `source_module='armazem'`, enquanto o cadastro principal estava em `gestao_frota`.
- Opcoes avaliadas:
  1. Ajustar filtros para ler corretamente `gestao_frota`.
  2. Migrar dados para replicar placas entre modulos.
  3. Alterar regra de escrita para gerar duplicacao por modulo.
- Decisao: opcao 1.
- Implementacao:
  - `App.tsx`: leitura/importacao/oficina/armazem padronizadas para `source_module='gestao_frota'`.
  - `api-backend/index.js`: leitura com `source_module=armazem` passa a usar filtro interno `gestao_frota` (`resolveFleetReadSourceFilter`).

### 2) Escrita sem saneamento completo em modo JSON
- Problema: `fleet_vehicles.json` podia manter duplicidades por placa e registros sem `source_module` apos update/delete.
- Opcoes avaliadas:
  1. Corrigir filtros de leitura.
  2. Migrar/limpar dados persistidos.
  3. Corrigir regras de escrita no backend.
- Decisao: combinacao de 2 + 3.
- Implementacao:
  - `api-backend/index.js`:
    - `normalizeRowsByTable('fleet_vehicles', ...)` normaliza `placa`, aplica default de `source_module` e deduplica por placa (mais recente por `created_at`).
    - `POST/PATCH/DELETE` em fallback JSON persistem dados ja normalizados.
    - `PATCH/DELETE` em `fleet_vehicles` sempre escopam por `source_module` de requisicao.

### 3) `/:table/count` sem mesmo escopo de `GET /:table`
- Problema: `count` podia divergir da listagem para `fleet_vehicles`.
- Opcoes avaliadas:
  1. Corrigir filtro de leitura no endpoint.
  2. Popular dados redundantes para bater com contagem.
  3. Alterar escrita (nao resolve count).
- Decisao: opcao 1.
- Implementacao:
  - `api-backend/index.js`: `/:table/count` agora valida `source_module` e aplica escopo identico ao `GET` para `fleet_vehicles`.

### 4) Schema sem `source_module` em `fleet_vehicles`
- Problema: backend permitia/esperava coluna `source_module`, mas SQL base nao trazia o campo.
- Opcoes avaliadas:
  1. Tirar filtro no codigo.
  2. Migrar schema/dados.
  3. Restringir escrita no backend sem coluna (incompleto).
- Decisao: opcao 2.
- Implementacao:
  - `schema.sql` e `migration.sql`:
    - coluna `source_module` em `fleet_vehicles` com default `gestao_frota`;
    - `CHECK` para valores validos (`gestao_frota`, `oficina`);
    - indice `idx_fleet_vehicles_source_module_placa`.

### 5) Integridade referencial por placa ausente
- Problema: `fleet_fines`, `fleet_tachograph_checks` e `fleet_fiscal_obligations` nao tinham FK para `fleet_vehicles`.
- Opcoes avaliadas:
  1. Ajustar apenas filtros.
  2. Migrar/limpar dados e criar FKs.
  3. Apenas endurecer escrita no backend.
- Decisao: opcao 2 (com suporte da 3 ja existente no backend).
- Implementacao:
  - `schema.sql`: FKs declaradas nas tabelas filhas.
  - `migration.sql`:
    - normalizacao de placas (trim + uppercase),
    - nulificacao de referencias orfas,
    - criacao idempotente das FKs com `ON UPDATE CASCADE ON DELETE SET NULL`.

## Arquivos alterados
- `api-backend/index.js`
- `App.tsx`
- `schema.sql`
- `migration.sql`
- `api-backend/tests/cadastro-centralizacao.integration.test.js`
- `api-backend/tests/audit.integration.test.js`

## Testes automatizados
Comandos executados:
- `node --test api-backend/tests/cadastro-centralizacao.integration.test.js`
- `npm --prefix api-backend test`
- `npm run build`

Resultado:
- Backend tests: **passando**.
- Build frontend: **passando**.

## Observacoes
- A constraint de `source_module` no banco aceita apenas `gestao_frota` e `oficina` (modulos autorizados para escrita).
- `armazem` permanece como contexto de leitura e auditoria, mapeando para a base central de frota.
