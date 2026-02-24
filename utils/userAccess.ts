import type { Module, User } from '../types';

const WAREHOUSE_MODULES: Module[] = [
  'dashboard',
  'recebimento',
  'movimentacoes',
  'auditoria_geral',
  'estoque',
  'expedicao',
  'inventario_ciclico',
  'compras',
  'cadastro',
  'relatorios',
  'configuracoes',
];

const MODULE_ALIASES: Record<string, Module> = {
  dashboard: 'dashboard',
  painel: 'dashboard',
  recebimento: 'recebimento',
  movimentacoes: 'movimentacoes',
  movimentacao: 'movimentacoes',
  auditoria: 'auditoria_geral',
  auditoria_geral: 'auditoria_geral',
  estoque: 'estoque',
  expedicao: 'expedicao',
  solicitacoes_sa: 'expedicao',
  solicitacao_sa: 'expedicao',
  inventario: 'inventario_ciclico',
  inventario_ciclico: 'inventario_ciclico',
  compras: 'compras',
  pedido_de_compras: 'compras',
  cadastro: 'cadastro',
  cadastro_geral: 'cadastro',
  relatorios: 'relatorios',
  configuracoes: 'configuracoes',
  settings: 'configuracoes',
  gestao_compras: 'gestao_compras',
};

const ROLE_ALIASES: Record<string, User['role']> = {
  admin: 'admin',
  administrador: 'admin',
  buyer: 'buyer',
  comprador: 'buyer',
  manager: 'manager',
  gerente: 'manager',
  driver: 'driver',
  motorista: 'driver',
  operator: 'operator',
  operador: 'operator',
  checker: 'checker',
  conferente: 'checker',
  mechanic_supervisor: 'mechanic_supervisor',
  supervisor_mecanico: 'mechanic_supervisor',
  supervisor_mecanico_oficina: 'mechanic_supervisor',
  supervisor_mecanico_frota: 'mechanic_supervisor',
  fleet_supervisor: 'fleet_supervisor',
  supervisor_frota: 'fleet_supervisor',
};

const normalizeToken = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
  } catch {
    // legacy formats are handled below
  }

  // PostgreSQL array literal: {"dashboard","estoque"} / {dashboard,estoque}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inside = raw.slice(1, -1);
    return inside
      .split(',')
      .map((entry) => entry.trim().replace(/^"+|"+$/g, ''))
      .filter(Boolean);
  }

  return raw
    .split(/[;,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const unique = (values: string[]) => [...new Set(values)];

export const normalizeUserRole = (role: unknown): User['role'] => {
  const normalized = normalizeToken(role);
  return ROLE_ALIASES[normalized] || 'operator';
};

export const normalizeAllowedWarehouses = (
  rawWarehouses: unknown,
  fallback: string[] = ['ARMZ28']
) => {
  const parsed = unique(toStringArray(rawWarehouses).map((entry) => entry.trim()).filter(Boolean));
  return parsed.length > 0 ? parsed : fallback;
};

export const normalizeUserModules = (rawModules: unknown, role: unknown): Module[] => {
  const tokens = unique(toStringArray(rawModules).map((entry) => normalizeToken(entry)).filter(Boolean));
  const modulesSet = new Set<Module>();
  const isAdmin = normalizeUserRole(role) === 'admin';
  const hasLegacyWarehouseAccess = tokens.includes('warehouse') || tokens.includes('wms') || tokens.includes('armazem');

  for (const token of tokens) {
    const mapped = MODULE_ALIASES[token];
    if (mapped) modulesSet.add(mapped);
  }

  if (isAdmin || hasLegacyWarehouseAccess) {
    WAREHOUSE_MODULES.forEach((moduleId) => modulesSet.add(moduleId));
  }

  if (modulesSet.size === 0) {
    modulesSet.add('dashboard');
  }

  return [...modulesSet];
};

export const normalizeWorkshopAccess = (
  rawModules: unknown,
  rawHasWorkshopAccess: unknown,
  role: unknown
) => {
  if (normalizeUserRole(role) === 'admin') return true;
  if (typeof rawHasWorkshopAccess === 'boolean') return rawHasWorkshopAccess;

  const tokens = unique(toStringArray(rawModules).map((entry) => normalizeToken(entry)).filter(Boolean));
  return tokens.includes('workshop') || tokens.includes('oficina');
};

export const normalizeFleetAccess = (
  rawModules: unknown,
  rawHasFleetAccess: unknown,
  role: unknown
) => {
  if (normalizeUserRole(role) === 'admin') return true;
  if (typeof rawHasFleetAccess === 'boolean') return rawHasFleetAccess;

  const tokens = unique(toStringArray(rawModules).map((entry) => normalizeToken(entry)).filter(Boolean));
  return (
    tokens.includes('fleet') ||
    tokens.includes('frota') ||
    tokens.includes('gestao_frota') ||
    tokens.includes('gestao_de_frota')
  );
};
