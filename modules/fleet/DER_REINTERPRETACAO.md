# Reinterpretacao do DER - Gestao de Frota

## Entidades identificadas
1. `Permissao`
- PK: `id_permissao`
- Atributos: `nome_permissao`, `recurso`, `acao`

2. `Perfil`
- PK: `id_perfil`
- Atributos: `nome_perfil`

3. `Funcao`
- PK: `id_funcao`
- Atributos: `nome_funcao`

4. `Pessoa`
- PK: `cpf`
- FK: `id_perfil`, `cod_centro_custo`
- Atributos: `matricula`, `nome_completo`, `funcao`

5. `Setor`
- PK: `cod_centro_custo`
- Atributos: `desc_centro_custo`

6. `Veiculos`
- PK: `placa`
- FK: `cod_centro_custo`
- Atributos: `renavam`, `chassi`, `classe`, `cor`, `ano_modelo`, `ano_fabricacao`, `cidade`, `estado`, `proprietario`, `desc_centro_custo`, `desc_modelo`, `desc_marca`, `desc_combustivel`, `km_atual`, `km_anterior`, `dta_ult_manutencao`, `dta_prox_manutencao`, `km_prox_manutencao`, `gestao_multa`, `setor_veiculo`, `responsavel_veiculo`

7. `Perfil_Pessoa`
- PK composta: `cpf`, `id_perfil`
- FKs: `cpf -> Pessoa`, `id_perfil -> Perfil`

8. `Funcao_Pessoa`
- PK composta: `cpf`, `id_funcao`, `data_inicio`
- FKs: `cpf -> Pessoa`, `id_funcao -> Funcao`
- Atributos: `data_fim`

9. `Perfil_Funcao_Permissao`
- PK composta: `id_perfil`, `id_funcao`, `id_permissao`
- FKs para: `Perfil`, `Funcao`, `Permissao`

## Relacionamentos e cardinalidades
1. `Setor (1) -> (N) Pessoa`
2. `Setor (1) -> (N) Veiculos`
3. `Pessoa (N) <-> (N) Perfil` via `Perfil_Pessoa`
4. `Pessoa (N) <-> (N) Funcao` via `Funcao_Pessoa`
5. `Perfil (N) <-> (N) Permissao` via `Perfil_Funcao_Permissao`
6. `Funcao (N) <-> (N) Permissao` via `Perfil_Funcao_Permissao`

## Arquitetura modular proposta (hierarquica)
1. `Analise e Controle`
- `Painel Executivo`
- `Relatorios`

2. `Cadastro Estrutural`
- `Veiculos`
- `Pessoas e Funcoes`
- `Setores e Agenda Fiscal`

3. `Conformidade`
- `Multas e Infracoes`
- `Tacografo e Afericoes`
- `RNTRC e ANTT`

4. `Governanca de Acesso`
- `Perfil e Permissoes`

## Padrao de botoes
1. Verbos de acao sempre no infinitivo (`Salvar`, `Consultar`, `Exportar`, `Ver`).
2. Botao principal por tela usa prefixo contextual (`Novo Veiculo`, `Nova Pessoa`, `Nova Afericao`).
3. Modais usam acao final clara (`Salvar Veiculo`, `Salvar Infracao`, `Salvar Registro RNTRC`).
4. Titulo e descricao de botao acompanham a entidade associada no DER.
