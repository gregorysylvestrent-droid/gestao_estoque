import { Screen } from './types';

export type DerEntityDefinition = {
  name: string;
  primaryKey: string[];
  foreignKeys?: string[];
  attributes: string[];
};

export type DerRelationshipDefinition = {
  from: string;
  to: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  via?: string;
  description: string;
};

export const DER_ENTITIES: DerEntityDefinition[] = [
  {
    name: 'Permissao',
    primaryKey: ['id_permissao'],
    attributes: ['nome_permissao', 'recurso', 'acao'],
  },
  {
    name: 'Perfil',
    primaryKey: ['id_perfil'],
    attributes: ['nome_perfil'],
  },
  {
    name: 'Funcao',
    primaryKey: ['id_funcao'],
    attributes: ['nome_funcao'],
  },
  {
    name: 'Pessoa',
    primaryKey: ['cpf'],
    foreignKeys: ['id_perfil', 'cod_centro_custo'],
    attributes: ['matricula', 'nome_completo', 'funcao'],
  },
  {
    name: 'Setor',
    primaryKey: ['cod_centro_custo'],
    attributes: ['desc_centro_custo'],
  },
  {
    name: 'Veiculos',
    primaryKey: ['placa'],
    foreignKeys: ['cod_centro_custo'],
    attributes: [
      'renavam',
      'chassi',
      'classe',
      'cor',
      'ano_modelo',
      'ano_fabricacao',
      'cidade',
      'estado',
      'proprietario',
      'desc_centro_custo',
      'desc_modelo',
      'desc_marca',
      'desc_combustivel',
      'km_atual',
      'km_anterior',
      'dta_ult_manutencao',
      'dta_prox_manutencao',
      'km_prox_manutencao',
      'gestao_multa',
      'setor_veiculo',
      'responsavel_veiculo',
    ],
  },
  {
    name: 'Perfil_Pessoa',
    primaryKey: ['cpf', 'id_perfil'],
    foreignKeys: ['cpf', 'id_perfil'],
    attributes: [],
  },
  {
    name: 'Funcao_Pessoa',
    primaryKey: ['cpf', 'id_funcao', 'data_inicio'],
    foreignKeys: ['cpf', 'id_funcao'],
    attributes: ['data_fim'],
  },
  {
    name: 'Perfil_Funcao_Permissao',
    primaryKey: ['id_perfil', 'id_funcao', 'id_permissao'],
    foreignKeys: ['id_perfil', 'id_funcao', 'id_permissao'],
    attributes: [],
  },
];

export const DER_RELATIONSHIPS: DerRelationshipDefinition[] = [
  {
    from: 'Setor',
    to: 'Pessoa',
    cardinality: '1:N',
    description: 'Um centro de custo possui varias pessoas vinculadas.',
  },
  {
    from: 'Setor',
    to: 'Veiculos',
    cardinality: '1:N',
    description: 'Um centro de custo possui varios veiculos.',
  },
  {
    from: 'Pessoa',
    to: 'Perfil',
    cardinality: 'N:N',
    via: 'Perfil_Pessoa',
    description: 'Pessoa pode ter um ou mais perfis, com historico por associacao.',
  },
  {
    from: 'Pessoa',
    to: 'Funcao',
    cardinality: 'N:N',
    via: 'Funcao_Pessoa',
    description: 'Pessoa pode ocupar funcoes ao longo do tempo.',
  },
  {
    from: 'Perfil',
    to: 'Permissao',
    cardinality: 'N:N',
    via: 'Perfil_Funcao_Permissao',
    description: 'Permissoes por contexto de perfil e funcao.',
  },
  {
    from: 'Funcao',
    to: 'Permissao',
    cardinality: 'N:N',
    via: 'Perfil_Funcao_Permissao',
    description: 'Permissoes aplicadas por funcao operacional.',
  },
];

export type FleetMenuItem = {
  id: Screen;
  label: string;
  icon: string;
  hint: string;
};

export type FleetMenuSection = {
  id: string;
  title: string;
  subtitle: string;
  items: FleetMenuItem[];
};

export const FLEET_MENU_SECTIONS: FleetMenuSection[] = [
  {
    id: 'analise',
    title: 'Analise e Controle',
    subtitle: 'Visao executiva de operacao',
    items: [
      { id: Screen.PAINEL, label: 'Painel Executivo', icon: 'dashboard', hint: 'KPI de frota e conformidade geral' },
      { id: Screen.RELATORIOS, label: 'Relatorios', icon: 'bar_chart', hint: 'Metricas por custo, multa e disponibilidade' },
    ],
  },
  {
    id: 'cadastro_estrutural',
    title: 'Cadastro Estrutural',
    subtitle: 'DER: Veiculos, Pessoa, Funcao e Setor',
    items: [
      { id: Screen.VEICULOS, label: 'Veiculos', icon: 'directions_car', hint: 'Cadastro tecnico e situacao da frota' },
      { id: Screen.CONDUTORES, label: 'Pessoas e Funcoes', icon: 'badge', hint: 'Pessoa + Funcao_Pessoa + Perfil_Pessoa' },
      { id: Screen.FISCAL, label: 'Setores e Agenda Fiscal', icon: 'account_tree', hint: 'Centro de custo (Setor) e vencimentos' },
    ],
  },
  {
    id: 'conformidade',
    title: 'Conformidade',
    subtitle: 'DER: Permissoes e exigencias legais',
    items: [
      { id: Screen.MULTAS, label: 'Multas e Infracoes', icon: 'warning', hint: 'Controle de autos, status e recursos' },
      { id: Screen.TACOGRAFO, label: 'Tacografo e Afericoes', icon: 'speed', hint: 'Certificados Inmetro e validade' },
      { id: Screen.RNTRC, label: 'RNTRC e ANTT', icon: 'verified_user', hint: 'Registros obrigatorios do transportador' },
    ],
  },
  {
    id: 'governanca',
    title: 'Governanca de Acesso',
    subtitle: 'DER: Perfil, Funcao e Permissao',
    items: [
      { id: Screen.PERFIL, label: 'Perfil e Permissoes', icon: 'admin_panel_settings', hint: 'Politica de acesso por perfil e funcao' },
    ],
  },
];

export const FLEET_SCREEN_HINTS: Record<Screen, string> = {
  [Screen.PAINEL]: 'Consolida indicadores das entidades Veiculos, Pessoa e conformidade legal.',
  [Screen.VEICULOS]: 'Base principal do DER: tabela Veiculos com vinculacao ao centro de custo.',
  [Screen.MULTAS]: 'Conformidade operacional: eventos de infracao, recursos e impactos.',
  [Screen.TACOGRAFO]: 'Rastreia certificados e vencimentos obrigatorios da frota.',
  [Screen.RNTRC]: 'Gestao de registros ANTT/RNTRC por transportador.',
  [Screen.RELATORIOS]: 'Analise cruzada entre custos, multas e disponibilidade.',
  [Screen.PERFIL]: 'Governanca de acesso: Perfil, Funcao, Permissao e tabelas de associacao.',
  [Screen.FISCAL]: 'Centro de custo (Setor) e calendario de obrigacoes fiscais.',
  [Screen.CONDUTORES]: 'Pessoa, Perfil_Pessoa e Funcao_Pessoa com historico de atribuicao.',
};
