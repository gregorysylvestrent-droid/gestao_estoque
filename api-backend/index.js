import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const DB_HEALTHCHECK_INTERVAL_MS = Number(process.env.DB_HEALTHCHECK_INTERVAL_MS || 10000);
const PURCHASE_ORDER_RETENTION_MS = 24 * 60 * 60 * 1000;
const PO_RETENTION_CLEANUP_INTERVAL_MS = Number(
  process.env.PO_RETENTION_CLEANUP_INTERVAL_MS || 60 * 1000
);

const PASSWORD_PREFIX = 'pbkdf2';
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = 'sha256';

const RESERVED_QUERY_KEYS = new Set(['select', 'order', 'limit', 'offset', 'source_module']);

const TABLE_WHITELIST = [
  'users',
  'warehouses',
  'inventory',
  'cyclic_batches',
  'cyclic_counts',
  'vendors',
  'vehicles',
  'fleet_vehicles',
  'fleet_people',
  'fleet_fines',
  'fleet_tachograph_checks',
  'fleet_rntrc_records',
  'fleet_fiscal_obligations',
  'purchase_orders',
  'movements',
  'notifications',
  'material_requests',
  'cost_centers',
  'audit_logs',
  'mechanics',
  'work_orders',
  'work_order_logs',
  'work_order_assignments',
];

const TABLE_COLUMNS = {
  users: ['id', 'name', 'email', 'role', 'status', 'last_access', 'avatar', 'password', 'modules', 'allowed_warehouses', 'created_at'],
  warehouses: ['id', 'name', 'description', 'location', 'manager_name', 'manager_email', 'is_active', 'created_at'],
  inventory: ['sku', 'name', 'location', 'batch', 'expiry', 'quantity', 'status', 'image_url', 'category', 'min_qty', 'max_qty', 'unit', 'lead_time', 'safety_stock', 'abc_category', 'last_counted_at', 'warehouse_id', 'created_at'],
  cyclic_batches: ['id', 'status', 'scheduled_date', 'completed_at', 'accuracy_rate', 'total_items', 'divergent_items', 'warehouse_id', 'created_at'],
  cyclic_counts: ['id', 'batch_id', 'sku', 'expected_qty', 'counted_qty', 'status', 'notes', 'counted_at', 'warehouse_id'],
  vendors: [
    'id',
    'id_fornecedor',
    'razao_social',
    'nome_fantasia',
    'cnpj',
    'telefone',
    'name',
    'category',
    'contact',
    'email',
    'status',
    'created_at',
  ],
  vehicles: ['plate', 'model', 'type', 'status', 'last_maintenance', 'cost_center', 'created_at'],
  fleet_vehicles: [
    'placa',
    'renavam',
    'chassi',
    'classe',
    'cor',
    'ano_modelo',
    'ano_fabricacao',
    'cidade',
    'estado',
    'proprietario',
    'cod_centro_custo',
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
    'source_module',
    'created_at',
  ],
  fleet_people: [
    'cpf',
    'matricula',
    'nome_completo',
    'id_perfil',
    'id_funcao',
    'cod_centro_custo',
    'cnh',
    'categoria',
    'validade_cnh',
    'toxico_venc',
    'telefone',
    'email',
    'status',
    'created_at',
  ],
  fleet_fines: ['id', 'placa', 'ain', 'data', 'hora', 'local', 'valor', 'gravidade', 'enquadramento', 'condutor', 'status', 'created_at'],
  fleet_tachograph_checks: ['id', 'placa', 'num_certificado', 'dta_afericao', 'dta_vencimento', 'valor_taxa', 'status', 'created_at'],
  fleet_rntrc_records: ['id', 'razao_social', 'documento', 'rntrc', 'categoria', 'vencimento', 'status', 'created_at'],
  fleet_fiscal_obligations: ['id', 'placa', 'tipo', 'exercicio', 'vencimento', 'valor', 'status', 'created_at'],
  purchase_orders: ['id', 'vendor', 'request_date', 'status', 'priority', 'total', 'requester', 'items', 'quotes', 'selected_quote_id', 'sent_to_vendor_at', 'received_at', 'quotes_added_at', 'approved_at', 'rejected_at', 'vendor_order_number', 'approval_history', 'plate', 'cost_center', 'warehouse_id', 'created_at'],
  movements: ['id', 'sku', 'product_name', 'type', 'quantity', 'timestamp', 'user', 'location', 'reason', 'order_id', 'warehouse_id'],
  notifications: ['id', 'title', 'message', 'type', 'read', 'user_id', 'created_at'],
  material_requests: ['id', 'sku', 'name', 'qty', 'plate', 'dept', 'priority', 'status', 'cost_center', 'warehouse_id', 'created_at'],
  cost_centers: ['id', 'code', 'name', 'manager', 'budget', 'status', 'created_at'],
  audit_logs: [
    'id',
    'entity',
    'entity_id',
    'module',
    'action',
    'actor',
    'actor_id',
    'warehouse_id',
    'before_data',
    'after_data',
    'meta',
    'created_at',
  ],
  mechanics: [
    'id',
    'name',
    'specialty',
    'shift',
    'status',
    'current_work_orders',
    'orders_completed',
    'avg_hours_per_order',
    'on_time_rate',
    'created_at',
    'updated_at',
  ],
  work_orders: [
    'id',
    'vehicle_plate',
    'vehicle_model',
    'status',
    'type',
    'priority',
    'mechanic_id',
    'mechanic_name',
    'supervisor_id',
    'supervisor_name',
    'workshop_unit',
    'description',
    'services',
    'parts',
    'opened_at',
    'closed_at',
    'estimated_hours',
    'actual_hours',
    'status_timers',
    'total_seconds',
    'last_status_change',
    'is_timer_active',
    'cost_center',
    'cost_labor',
    'cost_parts',
    'cost_third_party',
    'cost_total',
    'created_by',
    'warehouse_id',
    'locked_by',
    'locked_at',
    'created_at',
    'updated_at',
  ],
  work_order_logs: [
    'id',
    'work_order_id',
    'previous_status',
    'new_status',
    'timestamp',
    'user_id',
    'duration_seconds',
    'created_at',
  ],
  work_order_assignments: [
    'id',
    'work_order_id',
    'service_id',
    'previous_mechanic_id',
    'previous_mechanic_name',
    'new_mechanic_id',
    'new_mechanic_name',
    'service_category',
    'service_description',
    'timestamp',
    'accumulated_seconds',
    'created_by',
    'warehouse_id',
    'created_at',
  ],
};

const TABLE_JSON_COLUMNS = {
  users: ['modules', 'allowed_warehouses'],
  purchase_orders: ['items', 'quotes', 'approval_history'],
  audit_logs: ['before_data', 'after_data', 'meta'],
  mechanics: ['current_work_orders'],
  work_orders: ['services', 'parts', 'status_timers'],
};

const TABLE_TIMESTAMP_COLUMNS = {
  users: ['last_access'],
  vehicles: ['last_maintenance'],
  fleet_vehicles: ['dta_ult_manutencao', 'dta_prox_manutencao', 'created_at'],
  fleet_people: ['validade_cnh', 'toxico_venc', 'created_at'],
  fleet_fines: ['data', 'created_at'],
  fleet_tachograph_checks: ['dta_afericao', 'dta_vencimento', 'created_at'],
  fleet_rntrc_records: ['vencimento', 'created_at'],
  fleet_fiscal_obligations: ['vencimento', 'created_at'],
  inventory: ['last_counted_at'],
  movements: ['timestamp'],
  purchase_orders: ['request_date', 'sent_to_vendor_at', 'received_at', 'quotes_added_at', 'approved_at', 'rejected_at'],
  cyclic_batches: ['scheduled_date', 'completed_at'],
  cyclic_counts: ['counted_at'],
  mechanics: ['created_at', 'updated_at'],
  work_orders: ['opened_at', 'closed_at', 'last_status_change', 'created_at', 'updated_at', 'locked_at'],
  work_order_logs: ['timestamp', 'created_at'],
  work_order_assignments: ['timestamp', 'created_at'],
};

const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

ensureDataDirExists();

const wsClients = new Set();
const WORKSHOP_WS_TABLES = new Set(['work_orders', 'work_order_logs', 'work_order_assignments']);

const broadcastWorkshopEvent = (table, action, data) => {
  if (!WORKSHOP_WS_TABLES.has(table)) return;
  const payload = JSON.stringify({
    type: 'workshop_update',
    table,
    action,
    data,
  });

  wsClients.forEach((client) => {
    if (client?.readyState === 1) {
      try {
        client.send(payload);
      } catch {
        // ignore send failures
      }
    }
  });
};

let dbConnected = false;
let dbLastError = null;
let dbLastCheckedAt = null;
const dbSslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbSslRejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 5432),
  ssl: dbSslEnabled ? { rejectUnauthorized: dbSslRejectUnauthorized } : undefined,
  connectionTimeoutMillis: 2000,
});

const DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  '57P01',
  '57P02',
  '57P03',
  '08001',
  '08003',
  '08006',
]);

const getErrorReason = (err) => {
  if (!err) return 'Erro desconhecido';
  if (err instanceof Error) return err.message;
  return String(err);
};

const isDbConnectionError = (err) => {
  const code = String(err?.code || '').toUpperCase();
  if (DB_CONNECTION_ERROR_CODES.has(code)) return true;

  const message = getErrorReason(err).toLowerCase();
  return (
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('server closed the connection unexpectedly')
  );
};

const setDbStatus = (connected, err) => {
  const previous = dbConnected;
  dbConnected = connected;
  dbLastCheckedAt = new Date().toISOString();

  if (connected) {
    dbLastError = null;
    if (!previous) {
      console.log('PostgreSQL available. Switching to production mode.');
    }
    return;
  }

  dbLastError = getErrorReason(err);
  if (previous) {
    console.warn('PostgreSQL unavailable. Switching to JSON contingency mode.');
  }
};

const verifyDbConnection = async (logInitialFailure = false) => {
  try {
    const client = await pool.connect();
    client.release();
    setDbStatus(true);
  } catch (err) {
    setDbStatus(false, err);
    if (logInitialFailure) {
      console.warn('PostgreSQL unavailable on startup. Running in JSON contingency mode.');
    }
  }
};

const markDbDisconnectedIfNeeded = (err) => {
  if (!isDbConnectionError(err)) return;
  setDbStatus(false, err);
};

await verifyDbConnection(true);

setInterval(() => {
  void verifyDbConnection(false);
}, DB_HEALTHCHECK_INTERVAL_MS);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Always allow local development origins
if (!isProd) {
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
  ];
  devOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in development/non-production mode
      if (!isProd) {
        callback(null, true);
        return;
      }

      // In production, strictly check against allowed origins
      if (allowedOrigins.length === 0 || !origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const getJsonPath = (table) => path.join(DATA_DIR, `${table}.json`);
const jsonCache = new Map();

const readJson = (table) => {
  const filePath = getJsonPath(table);
  if (!fs.existsSync(filePath)) return [];

  try {
    const stats = fs.statSync(filePath);
    const cached = jsonCache.get(table);

    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.data;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const payload = Array.isArray(parsed) ? parsed : [];
    jsonCache.set(table, { mtimeMs: stats.mtimeMs, data: payload });
    return payload;
  } catch {
    return [];
  }
};

const writeJson = (table, data) => {
  const filePath = getJsonPath(table);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  const stats = fs.statSync(filePath);
  jsonCache.set(table, { mtimeMs: stats.mtimeMs, data });
};

const validateTable = (table) => TABLE_WHITELIST.includes(table);

const isAllowedColumn = (table, column) => {
  const allowedColumns = TABLE_COLUMNS[table] || [];
  return allowedColumns.includes(column);
};


const parseFilterKey = (rawKey) => {
  const [column, operator = 'eq'] = String(rawKey || '').split('__');
  return {
    column,
    operator: operator || 'eq',
  };
};

const areColumnsAllowed = (table, columns) =>
  columns.every((rawColumn) => {
    const { column } = parseFilterKey(rawColumn);
    return isAllowedColumn(table, column);
  });
const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const toScalar = (value) => (Array.isArray(value) ? value[0] : value);

const coerceValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
};

const getFiltersFromQuery = (query) => {
  const filters = {};

  Object.entries(query).forEach(([rawKey, rawValue]) => {
    if (RESERVED_QUERY_KEYS.has(rawKey)) return;

    const scalar = toScalar(rawValue);
    if (scalar === undefined || scalar === null) return;

    filters[rawKey] = String(scalar);
  });

  return filters;
};

const parseOrder = (table, orderValue) => {
  if (!orderValue) return null;

  const [column, rawDirection] = String(orderValue).split(':');
  if (!column || !isAllowedColumn(table, column)) return null;

  return {
    column,
    direction: rawDirection === 'desc' ? 'DESC' : 'ASC',
  };
};

const parseLimit = (limitValue) => {
  if (!limitValue) return null;

  const parsed = Number.parseInt(String(limitValue), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;

  return Math.min(parsed, 1000);
};

const parseOffset = (offsetValue) => {
  if (!offsetValue) return 0;

  const parsed = Number.parseInt(String(offsetValue), 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;

  return parsed;
};

const buildSqlWhereFromFilters = (filters, startIndex = 1) => {
  const clauses = [];
  const values = [];
  let markerIndex = startIndex;

  for (const [rawColumn, rawValue] of Object.entries(filters)) {
    const { column, operator } = parseFilterKey(rawColumn);
    const marker = `$${markerIndex}`;

    if (operator === 'ilike') {
      clauses.push(`CAST(${quoteIdentifier(column)} AS TEXT) ILIKE ${marker}`);
      values.push(`%${String(rawValue || '').trim()}%`);
    } else {
      clauses.push(`${quoteIdentifier(column)} = ${marker}`);
      values.push(coerceValue(rawValue));
    }

    markerIndex += 1;
  }

  return {
    clause: clauses.join(' AND '),
    values,
    nextIndex: markerIndex,
  };
};

const parseDateFilter = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(String(dateValue));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const WRITE_RESTRICTED_TABLES = new Set(['vehicles']);
const DB_TRIGGER_AUDITED_TABLES = new Set(['vendors', 'inventory', 'fleet_vehicles']);
const FLEET_WRITE_ALLOWED_SOURCE_MODULES = new Set(['gestao_frota', 'oficina']);
const FLEET_READ_ALLOWED_SOURCE_MODULES = new Set(['gestao_frota', 'oficina', 'armazem']);
const VENDOR_RAZAO_SOCIAL_MAX_LENGTH = 150;
const VENDOR_NOME_FANTASIA_MAX_LENGTH = 100;
const INVENTORY_DESCRIPTION_MAX_LENGTH = 255;

const normalizeDigits = (value) => String(value ?? '').replace(/\D+/g, '');
const normalizeStockKeyToken = (value) => String(value ?? '').trim().toLowerCase();

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalizeVendorStatus = (value) =>
  String(value || '').toLowerCase() === 'bloqueado' ? 'Bloqueado' : 'Ativo';

const normalizeFleetSourceModule = (value) => {
  const token = normalizeWhitespace(value).toLowerCase();
  if (!token) return '';
  if (token === 'frota' || token === 'gestao_de_frota') return 'gestao_frota';
  if (token === 'workshop') return 'oficina';
  if (token === 'warehouse') return 'armazem';
  return token;
};

const resolveFleetReadSourceFilter = (sourceModule) => {
  if (!sourceModule) return '';
  // Armazem consome o cadastro central gerenciado pela Gestao de Frota.
  if (sourceModule === 'armazem') return 'gestao_frota';
  return sourceModule;
};

const normalizeCnpj = (value) => normalizeDigits(value).slice(0, 14);

const isValidCnpj = (value) => {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base, factor) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstBase = cnpj.slice(0, 12);
  const firstDigit = calcDigit(firstBase, 5);
  const secondDigit = calcDigit(`${firstBase}${firstDigit}`, 6);

  return cnpj === `${firstBase}${firstDigit}${secondDigit}`;
};

const normalizePhone = (value) => {
  const digits = normalizeDigits(value);
  if (!digits) return '';
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return normalizeWhitespace(value);
};

const assertMaxLength = (value, maxLength, label) => {
  const normalized = String(value || '');
  if (normalized.length > maxLength) {
    throw new Error(`${label} deve ter no maximo ${maxLength} caracteres`);
  }
};

const getVendorComparableName = (row) =>
  normalizeWhitespace(row?.razao_social || row?.name || '').toLowerCase();
const getVendorComparableCnpj = (row) => normalizeCnpj(row?.cnpj || '');

const normalizeVendorRow = (row, fallbackId = null) => {
  const { id_fornecedor: _ignoredVendorId, ...safeRow } = row || {};
  const razaoSocial = normalizeWhitespace(row?.razao_social || row?.name || '');
  const nomeFantasia = normalizeWhitespace(row?.nome_fantasia || '');
  const cnpj = normalizeCnpj(row?.cnpj || '');
  const telefone = normalizePhone(row?.telefone || row?.contact || '');
  const status = normalizeVendorStatus(row?.status);
  const id = normalizeWhitespace(row?.id || fallbackId || '');

  if (!id) {
    throw new Error('ID do fornecedor e obrigatorio');
  }

  if (!razaoSocial) {
    throw new Error('Razao social e obrigatoria');
  }

  assertMaxLength(razaoSocial, VENDOR_RAZAO_SOCIAL_MAX_LENGTH, 'Razao social');
  assertMaxLength(nomeFantasia, VENDOR_NOME_FANTASIA_MAX_LENGTH, 'Nome fantasia');

  if (!cnpj || !isValidCnpj(cnpj)) {
    throw new Error('CNPJ invalido');
  }

  return {
    ...safeRow,
    id,
    razao_social: razaoSocial,
    nome_fantasia: nomeFantasia || null,
    cnpj,
    telefone: telefone || null,
    name: razaoSocial,
    contact: telefone || nomeFantasia || null,
    status,
  };
};

const ensureNoVendorDuplicatesInMemory = (rows, existingRows = [], ignoreIds = new Set()) => {
  const seenName = new Set();
  const seenCnpj = new Set();

  for (const row of rows) {
    const id = String(row?.id || '');
    const comparableName = getVendorComparableName(row);
    const comparableCnpj = getVendorComparableCnpj(row);

    if (comparableName) {
      if (seenName.has(comparableName)) {
        throw new Error(`Razao social duplicada no lote: ${row.razao_social}`);
      }
      seenName.add(comparableName);
    }

    if (comparableCnpj) {
      if (seenCnpj.has(comparableCnpj)) {
        throw new Error(`CNPJ duplicado no lote: ${row.cnpj}`);
      }
      seenCnpj.add(comparableCnpj);
    }

    for (const existing of existingRows) {
      const existingId = String(existing?.id || '');
      if (existingId && (existingId === id || ignoreIds.has(existingId))) continue;

      const existingName = getVendorComparableName(existing);
      const existingCnpj = getVendorComparableCnpj(existing);

      if (comparableName && existingName && comparableName === existingName) {
        throw new Error(`Razao social ja cadastrada: ${row.razao_social}`);
      }

      if (comparableCnpj && existingCnpj && comparableCnpj === existingCnpj) {
        throw new Error(`CNPJ ja cadastrado: ${row.cnpj}`);
      }
    }
  }
};

const findVendorConflictInDb = async (db, row, ignoreId = null) => {
  const comparableName = getVendorComparableName(row);
  const comparableCnpj = getVendorComparableCnpj(row);
  const clauses = [];
  const values = [];

  if (comparableName) {
    values.push(comparableName);
    clauses.push(
      `lower(regexp_replace(btrim(coalesce(razao_social, name, '')), '\\s+', ' ', 'g')) = $${values.length}`
    );
  }

  if (comparableCnpj) {
    values.push(comparableCnpj);
    clauses.push(`regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g') = $${values.length}`);
  }

  if (clauses.length === 0) return null;

  let query = `SELECT id, razao_social, name, cnpj FROM vendors WHERE (${clauses.join(' OR ')})`;
  if (ignoreId) {
    values.push(ignoreId);
    query += ` AND id <> $${values.length}`;
  }
  query += ' LIMIT 1';

  const result = await db.query(query, values);
  return result.rows?.[0] || null;
};

const getSourceModuleFromRequest = (req) =>
  normalizeFleetSourceModule(toScalar(req?.query?.source_module || ''));

const ensureFleetReadSourceModule = (table, req, res) => {
  if (table !== 'fleet_vehicles') return true;

  const sourceModule = getSourceModuleFromRequest(req);
  if (!sourceModule) return true;

  if (!FLEET_READ_ALLOWED_SOURCE_MODULES.has(sourceModule)) {
    res.status(400).json({
      data: null,
      error: `source_module invalido para leitura em fleet_vehicles: ${sourceModule}`,
    });
    return false;
  }

  return true;
};

const ensureFleetWriteSourceModule = (table, req, res) => {
  if (table !== 'fleet_vehicles') return true;

  const sourceModule = getSourceModuleFromRequest(req);
  if (!sourceModule) {
    res.status(400).json({
      data: null,
      error: 'source_module obrigatorio para escrita em fleet_vehicles',
    });
    return false;
  }

  if (!FLEET_WRITE_ALLOWED_SOURCE_MODULES.has(sourceModule)) {
    res.status(403).json({
      data: null,
      error: `Modulo sem permissao para escrita em fleet_vehicles: ${sourceModule}`,
    });
    return false;
  }

  return true;
};

const includesText = (source, term) => String(source || '').toLowerCase().includes(String(term || '').toLowerCase());
const normalizePlateToken = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const filterAuditLogRows = (rows, filters) => {
  const fromIso = filters.from ? parseDateFilter(filters.from) : null;
  const toIso = filters.to ? parseDateFilter(filters.to) : null;
  const searchTerm = String(filters.q || '').trim().toLowerCase();
  const plateTerm = normalizePlateToken(filters.plate || '');
  const warehouseFilter = String(filters.warehouse_id || '').trim();
  const includeGlobal = String(filters.include_global || 'true').toLowerCase() !== 'false';

  return rows.filter((row) => {
    if (filters.module && !includesText(row.module, filters.module)) return false;
    if (filters.entity && !includesText(row.entity, filters.entity)) return false;
    if (filters.action && !includesText(row.action, filters.action)) return false;
    if (filters.actor && !includesText(row.actor, filters.actor)) return false;

    if (warehouseFilter && warehouseFilter !== 'all') {
      const rowWarehouse = String(row?.warehouse_id || '').trim();
      const warehouseMatches = rowWarehouse === warehouseFilter;
      const isGlobal = rowWarehouse.length === 0;
      if (!(warehouseMatches || (includeGlobal && isGlobal))) return false;
    }

    const createdAt = new Date(String(row?.created_at || ''));
    if ((fromIso || toIso) && Number.isNaN(createdAt.getTime())) return false;
    if (fromIso && createdAt < new Date(fromIso)) return false;
    if (toIso && createdAt > new Date(toIso)) return false;

    if (searchTerm) {
      const haystack = [
        row.module,
        row.entity,
        row.entity_id,
        row.action,
        row.actor,
        row.actor_id,
        row.warehouse_id,
        JSON.stringify(row.meta || {}),
        JSON.stringify(row.before_data || {}),
        JSON.stringify(row.after_data || {}),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(searchTerm)) return false;
    }

    if (plateTerm) {
      const plateHaystack = normalizePlateToken([
        row?.meta?.plate,
        row?.before_data?.plate,
        row?.after_data?.plate,
        JSON.stringify(row.meta || {}),
        JSON.stringify(row.before_data || {}),
        JSON.stringify(row.after_data || {}),
      ].join(' '));

      if (!plateHaystack.includes(plateTerm)) return false;
    }

    return true;
  });
};
const normalizeFilterNeedle = (value) => String(value ?? '').trim().toLowerCase();

const isRowMatch = (row, filters) =>
  Object.entries(filters).every(([rawColumn, rawValue]) => {
    const { column, operator } = parseFilterKey(rawColumn);
    const rowValue = String(row?.[column] ?? '');

    if (operator === 'ilike') {
      const needle = normalizeFilterNeedle(rawValue).replace(/%/g, '');
      if (!needle) return true;
      return rowValue.toLowerCase().includes(needle);
    }

    return rowValue === String(coerceValue(rawValue));
  });

const applyFiltersToJsonRows = (rows, filters) => {
  if (Object.keys(filters).length === 0) return rows;
  return rows.filter((row) => isRowMatch(row, filters));
};

const applyOrderToJsonRows = (rows, order) => {
  if (!order) return rows;

  const sorted = [...rows].sort((a, b) => {
    const aValue = a[order.column];
    const bValue = b[order.column];

    if (aValue === bValue) return 0;
    if (aValue > bValue) return 1;
    return -1;
  });

  if (order.direction === 'DESC') sorted.reverse();
  return sorted;
};

const applyPaginationToJsonRows = (rows, limit, offset = 0) => {
  const start = Math.max(0, offset || 0);
  if (!limit) return rows.slice(start);
  return rows.slice(start, start + limit);
};

const sanitizeResponse = (data) => {
  if (Array.isArray(data)) {
    const needsSanitization = data.some(
      (item) => item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'password')
    );

    if (!needsSanitization) return data;

    return data.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const { password, ...safeItem } = item;
      return safeItem;
    });
  }

  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'password')) {
    const { password, ...safeData } = data;
    return safeData;
  }

  return data;
};

const normalizeUserRecord = (record) => {
  const user = { ...record };

  if (typeof user.modules === 'string') {
    try {
      user.modules = JSON.parse(user.modules);
    } catch {
      // keep original value
    }
  }

  if (typeof user.allowed_warehouses === 'string') {
    try {
      user.allowed_warehouses = JSON.parse(user.allowed_warehouses);
    } catch {
      // keep original value
    }
  }

  return user;
};

const parseJsonField = (value, fallback) => {
  if (Array.isArray(value) || typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizePurchaseOrderRecord = (record) => {
  const order = { ...record };
  order.items = parseJsonField(order.items, []);
  order.quotes = parseJsonField(order.quotes, []);
  order.approval_history = parseJsonField(order.approval_history, []);
  return order;
};

const normalizeRowsByTable = (table, rows) => {
  if (table === 'users') {
    const shouldNormalize = rows.some(
      (row) => typeof row?.modules === 'string' || typeof row?.allowed_warehouses === 'string'
    );
    if (!shouldNormalize) return rows;
    return rows.map((row) => normalizeUserRecord(row));
  }

  if (table === 'purchase_orders') {
    const shouldNormalize = rows.some(
      (row) =>
        typeof row?.items === 'string' ||
        typeof row?.quotes === 'string' ||
        typeof row?.approval_history === 'string'
    );
    if (!shouldNormalize) return rows;
    return rows.map((row) => normalizePurchaseOrderRecord(row));
  }

  if (table === 'work_orders') {
    const shouldNormalize = rows.some(
      (row) =>
        typeof row?.services === 'string' ||
        typeof row?.parts === 'string' ||
        typeof row?.status_timers === 'string'
    );
    if (!shouldNormalize) return rows;
    return rows.map((row) => ({
      ...row,
      services: parseJsonField(row.services, []),
      parts: parseJsonField(row.parts, []),
      status_timers: parseJsonField(row.status_timers, {}),
    }));
  }

  if (table === 'mechanics') {
    const shouldNormalize = rows.some((row) => typeof row?.current_work_orders === 'string');
    if (!shouldNormalize) return rows;
    return rows.map((row) => ({
      ...row,
      current_work_orders: parseJsonField(row.current_work_orders, []),
    }));
  }

  if (table === 'fleet_vehicles') {
    const pickNewest = (currentRow, nextRow) => {
      const currentTs = new Date(String(currentRow?.created_at || '')).getTime();
      const nextTs = new Date(String(nextRow?.created_at || '')).getTime();
      if (Number.isNaN(currentTs) && Number.isNaN(nextTs)) return currentRow;
      if (Number.isNaN(currentTs)) return nextRow;
      if (Number.isNaN(nextTs)) return currentRow;
      return nextTs >= currentTs ? nextRow : currentRow;
    };

    const dedupedByPlate = new Map();

    rows.forEach((row) => {
      const placa = String(row?.placa || row?.plate || '')
        .trim()
        .toUpperCase();
      if (!placa) return;

      const normalizedRow = {
        ...row,
        placa,
        source_module: normalizeFleetSourceModule(row?.source_module) || 'gestao_frota',
      };

      const existing = dedupedByPlate.get(placa);
      if (!existing) {
        dedupedByPlate.set(placa, normalizedRow);
        return;
      }

      dedupedByPlate.set(placa, pickNewest(existing, normalizedRow));
    });

    return Array.from(dedupedByPlate.values());
  }

  if (table === 'vendors') {
    return rows.map((row) => {
      const razaoSocial = normalizeWhitespace(row?.razao_social || row?.name || '');
      const nomeFantasia = normalizeWhitespace(row?.nome_fantasia || '');
      const telefone = normalizePhone(row?.telefone || row?.contact || '');
      return {
        ...row,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        telefone: telefone || null,
        name: razaoSocial,
        contact: telefone || nomeFantasia || null,
        cnpj: normalizeCnpj(row?.cnpj || ''),
        status: normalizeVendorStatus(row?.status),
      };
    });
  }

  return rows;
};

const mapFleetVehicleToLegacyVehicle = (row) => ({
  plate: String(row?.placa || row?.plate || '')
    .trim()
    .toUpperCase(),
  model: normalizeWhitespace(row?.desc_modelo || row?.model || ''),
  type: normalizeWhitespace(row?.classe || row?.type || ''),
  status: normalizeWhitespace(row?.status || '') || 'Disponivel',
  last_maintenance: row?.dta_ult_manutencao || row?.last_maintenance || null,
  cost_center: normalizeWhitespace(
    row?.cod_centro_custo || row?.cost_center || row?.desc_centro_custo || ''
  ),
  created_at: row?.created_at || null,
});

const getCentralVehicleRows = async () => {
  if (dbConnected) {
    const result = await pool.query('SELECT * FROM fleet_vehicles');
    return { rows: result.rows, mode: 'db' };
  }

  const fleetRows = readJson('fleet_vehicles');
  if (Array.isArray(fleetRows) && fleetRows.length > 0) {
    return { rows: fleetRows, mode: 'json-fleet' };
  }

  return { rows: readJson('vehicles'), mode: 'json-legacy' };
};

const readCentralVehiclesAsLegacy = async () => {
  const source = await getCentralVehicleRows();
  const rows = source.rows.map((row) => mapFleetVehicleToLegacyVehicle(row)).filter((row) => row.plate);
  return { rows, mode: source.mode };
};

const normalizeJsonColumnValueForDb = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const normalizeTimestampValueForDb = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
};

const generateInventorySku = () => `SKU-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const normalizeRowForDb = (table, row) => {
  const next = { ...row };
  const jsonColumns = TABLE_JSON_COLUMNS[table] || [];
  const timestampColumns = TABLE_TIMESTAMP_COLUMNS[table] || [];

  jsonColumns.forEach((column) => {
    if (Object.prototype.hasOwnProperty.call(next, column)) {
      next[column] = normalizeJsonColumnValueForDb(next[column]);
    }
  });

  timestampColumns.forEach((column) => {
    if (Object.prototype.hasOwnProperty.call(next, column)) {
      next[column] = normalizeTimestampValueForDb(next[column]);
    }
  });

  return next;
};

const isHashedPassword = (password) => typeof password === 'string' && password.startsWith(`${PASSWORD_PREFIX}$`);

const hashPassword = (plainPassword) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(plainPassword, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString('hex');

  return `${PASSWORD_PREFIX}$${PASSWORD_ITERATIONS}$${salt}$${derivedKey}`;
};

const deriveKeyAsync = (plainPassword, salt, iterations) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(
      plainPassword,
      salt,
      iterations,
      PASSWORD_KEYLEN,
      PASSWORD_DIGEST,
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(derivedKey.toString('hex'));
      }
    );
  });

const verifyPassword = async (plainPassword, storedPassword) => {
  if (!storedPassword || typeof storedPassword !== 'string') return false;

  if (!isHashedPassword(storedPassword)) {
    return storedPassword === plainPassword;
  }

  const parts = storedPassword.split('$');
  if (parts.length !== 4) return false;

  const [, iterationString, salt, expectedHash] = parts;
  const iterations = Number.parseInt(iterationString, 10);

  if (Number.isNaN(iterations) || !salt || !expectedHash) return false;

  try {
    const calculatedHash = await deriveKeyAsync(plainPassword, salt, iterations);

    if (calculatedHash.length !== expectedHash.length) return false;

    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
};

const ensurePasswordHash = (passwordValue) => {
  if (typeof passwordValue !== 'string' || passwordValue.length === 0) return passwordValue;
  return isHashedPassword(passwordValue) ? passwordValue : hashPassword(passwordValue);
};

const issueToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: 'Token ausente' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ data: null, error: 'Token invalido ou expirado' });
  }
};

const matchesLoginInput = (user, loginInput) => {
  const normalizedInput = String(loginInput).trim().toLowerCase();
  const email = String(user.email || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  return email === normalizedInput || name === normalizedInput;
};

const sendServerError = (res, err, fallbackMessage = 'Erro interno no servidor') => {
  console.error('[api-error]', getErrorReason(err));
  if (err?.stack) {
    console.error(err.stack);
  }
  const message = !isProd && err instanceof Error ? err.message : fallbackMessage;
  res.status(500).json({ data: null, error: message });
};

const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizeReceiptItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];

  const grouped = new Map();

  rawItems.forEach((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return;

    const sku = String(rawItem.sku || '').trim();
    const receivedQty = toPositiveInteger(rawItem.received ?? rawItem.qty ?? rawItem.quantity);

    if (!sku || !receivedQty) return;

    const current = grouped.get(sku) || { sku, received: 0 };
    current.received += receivedQty;
    grouped.set(sku, current);
  });

  return Array.from(grouped.values());
};

const buildReceiptMovementId = (poId, index) => {
  const normalizedPoId = String(poId || 'PO')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `MOV-REC-${normalizedPoId}-${Date.now()}-${index}-${randomSuffix}`;
};

const ENTITY_ID_FIELD = {
  users: 'id',
  warehouses: 'id',
  inventory: 'sku',
  cyclic_batches: 'id',
  cyclic_counts: 'id',
  vendors: 'id',
  vehicles: 'plate',
  fleet_vehicles: 'placa',
  fleet_people: 'cpf',
  fleet_fines: 'id',
  fleet_tachograph_checks: 'id',
  fleet_rntrc_records: 'id',
  fleet_fiscal_obligations: 'id',
  purchase_orders: 'id',
  movements: 'id',
  notifications: 'id',
  material_requests: 'id',
  cost_centers: 'id',
  audit_logs: 'id',
};

const getEntityId = (table, row) => {
  if (!row || typeof row !== 'object') return null;
  const key = ENTITY_ID_FIELD[table] || 'id';
  const value = row[key] ?? row.id ?? row.sku ?? row.plate ?? null;
  if (value === null || value === undefined) return null;
  return String(value);
};

const buildAuditLog = ({
  module,
  action,
  entity,
  entityId,
  actor,
  actorId,
  warehouseId,
  beforeData,
  afterData,
  meta,
}) => ({
  id: crypto.randomUUID(),
  module: module || entity,
  entity: entity || module,
  entity_id: entityId || null,
  action: String(action || 'update'),
  actor: String(actor || 'Sistema'),
  actor_id: actorId ? String(actorId) : null,
  warehouse_id: warehouseId || beforeData?.warehouse_id || afterData?.warehouse_id || null,
  before_data: beforeData ?? null,
  after_data: afterData ?? null,
  meta: meta ?? null,
  created_at: new Date().toISOString(),
});

const writeAuditLogsToJson = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const currentLogs = readJson('audit_logs');
  writeJson('audit_logs', [...currentLogs, ...entries]);
};

const writeAuditLogsToDb = async (db, entries) => {
  if (!db || !Array.isArray(entries) || entries.length === 0) return;

  for (const entry of entries) {
    const normalizedEntry = normalizeRowForDb('audit_logs', entry);
    const columns = Object.keys(normalizedEntry);
    const values = Object.values(normalizedEntry);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    await db.query(
      `INSERT INTO audit_logs (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }
};

const persistAuditLogs = async (entries, db = null) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  if (!dbConnected || !db) {
    writeAuditLogsToJson(entries);
    return;
  }

  try {
    await writeAuditLogsToDb(db, entries);
  } catch (err) {
    // Auditoria nunca deve quebrar o fluxo principal da API.
    console.warn(`Audit log persistence failed: ${getErrorReason(err)}`);
    writeAuditLogsToJson(entries);
  }
};

const setDbAuditContext = async (db, { actor, actorId, module }) => {
  if (!db) return;
  await db.query(
    `
      SELECT
        set_config('app.audit_actor', $1, true),
        set_config('app.audit_actor_id', $2, true),
        set_config('app.audit_module', $3, true)
    `,
    [String(actor || ''), actorId ? String(actorId) : '', String(module || '')]
  );
};

let poRetentionCleanupInFlight = false;

const isDeliveredPoExpired = (row, cutoffTimeMs) => {
  if (!row || typeof row !== 'object') return false;
  if (String(row.status || '') !== 'recebido') return false;
  if (!row.received_at) return false;

  const receivedAt = new Date(row.received_at);
  if (Number.isNaN(receivedAt.getTime())) return false;
  return receivedAt.getTime() <= cutoffTimeMs;
};

const buildPoRetentionAuditLog = (row, cutoffIso, mode) =>
  buildAuditLog({
    module: 'purchase_orders',
    action: 'delete',
    entity: 'purchase_orders',
    entityId: getEntityId('purchase_orders', row),
    actor: 'Sistema',
    actorId: null,
    warehouseId: row?.warehouse_id || null,
    beforeData: row,
    afterData: null,
    meta: {
      reason: 'retention_cleanup_after_24h_recebido',
      retention_hours: 24,
      received_at: row?.received_at || null,
      cutoff_at: cutoffIso,
      mode,
    },
  });

const runPurchaseOrdersRetentionCleanup = async () => {
  if (poRetentionCleanupInFlight) return;
  poRetentionCleanupInFlight = true;

  const cutoffTimeMs = Date.now() - PURCHASE_ORDER_RETENTION_MS;
  const cutoffIso = new Date(cutoffTimeMs).toISOString();

  try {
    if (!dbConnected) {
      const currentRows = normalizeRowsByTable('purchase_orders', readJson('purchase_orders'));
      if (!Array.isArray(currentRows) || currentRows.length === 0) return;

      const rowsToDelete = [];
      const rowsToKeep = [];

      currentRows.forEach((row) => {
        if (isDeliveredPoExpired(row, cutoffTimeMs)) {
          rowsToDelete.push(row);
          return;
        }
        rowsToKeep.push(row);
      });

      if (rowsToDelete.length === 0) return;

      writeJson('purchase_orders', rowsToKeep);
      await persistAuditLogs(rowsToDelete.map((row) => buildPoRetentionAuditLog(row, cutoffIso, 'json')));
      console.log(`[PO RETENTION] ${rowsToDelete.length} pedido(s) entregue(s) removido(s) em modo JSON.`);
      return;
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await setDbAuditContext(client, {
        actor: 'Sistema',
        actorId: null,
        module: 'purchase_orders',
      });

      const deleteResult = await client.query(
        `
          DELETE FROM purchase_orders
          WHERE status = 'recebido'
            AND received_at IS NOT NULL
            AND received_at <= $1
          RETURNING *
        `,
        [cutoffIso]
      );

      const deletedRows = normalizeRowsByTable('purchase_orders', deleteResult.rows);
      if (deletedRows.length > 0) {
        const auditEntries = deletedRows.map((row) => buildPoRetentionAuditLog(row, cutoffIso, 'db'));
        await persistAuditLogs(auditEntries, client);
      }

      await client.query('COMMIT');
      if (deletedRows.length > 0) {
        console.log(`[PO RETENTION] ${deletedRows.length} pedido(s) entregue(s) removido(s) em modo DB.`);
      }
    } catch (err) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // noop
        }
      }
      markDbDisconnectedIfNeeded(err);
      console.warn(`[PO RETENTION] cleanup failed: ${getErrorReason(err)}`);
    } finally {
      if (client) client.release();
    }
  } finally {
    poRetentionCleanupInFlight = false;
  }
};

const sendUniqueConstraintConflict = (res, err) => {
  if (String(err?.code || '') !== '23505') return false;

  const detail = String(err?.detail || '');
  let message = 'Registro duplicado. Revise os campos unicos.';

  if (detail.includes('(sku)')) {
    message = 'Codigo item (SKU) ja cadastrado.';
  } else if (detail.includes('(id_fornecedor)')) {
    message = 'ID de fornecedor ja cadastrado.';
  } else if (detail.toLowerCase().includes('cnpj')) {
    message = 'CNPJ ja cadastrado.';
  } else if (detail.toLowerCase().includes('razao_social') || detail.toLowerCase().includes('name')) {
    message = 'Razao social ja cadastrada.';
  } else if (detail.toLowerCase().includes('placa') || detail.toLowerCase().includes('plate')) {
    message = 'Placa ja cadastrada.';
  }

  res.status(409).json({ data: null, error: message });
  return true;
};

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    mode: dbConnected ? 'production' : 'contingency-json',
    database_last_error: dbLastError,
    database_last_checked_at: dbLastCheckedAt,
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ data: null, error: 'Email/login e senha sao obrigatorios' });
    return;
  }

  if (!dbConnected) {
    const users = normalizeRowsByTable('users', readJson('users'));
    const user = users.find((item) => matchesLoginInput(item, email));

    if (!user || !(await verifyPassword(String(password), user.password))) {
      res.status(401).json({ data: null, error: 'Credenciais invalidas' });
      return;
    }

    if (user.status !== 'Ativo') {
      res.status(403).json({ data: null, error: 'Usuario inativo' });
      return;
    }

    if (!isHashedPassword(user.password)) {
      const usersRaw = readJson('users');
      const updatedUsers = usersRaw.map((row) =>
        row.id === user.id
          ? {
            ...row,
            password: hashPassword(String(password)),
          }
          : row
      );
      writeJson('users', updatedUsers);
    }

    const token = issueToken(user);
    res.json({ data: sanitizeResponse(user), token, error: null });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1', [
      String(email).trim(),
    ]);
    const user = normalizeRowsByTable('users', result.rows)[0];

    if (!user || !(await verifyPassword(String(password), user.password))) {
      res.status(401).json({ data: null, error: 'Credenciais invalidas' });
      return;
    }

    if (user.status !== 'Ativo') {
      res.status(403).json({ data: null, error: 'Usuario inativo' });
      return;
    }

    if (!isHashedPassword(user.password)) {
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashPassword(String(password)), user.id]);
    }

    const token = issueToken(user);
    res.json({ data: sanitizeResponse(user), token, error: null });
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  }
});

app.post('/fleet-sync', authenticate, async (req, res) => {
  const { token, url } = req.body || {};

  if (!token || !url) {
    res.status(400).json({ data: null, error: 'Token e URL sao obrigatorios' });
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    res.status(400).json({ data: null, error: 'URL invalida' });
    return;
  }

  const allowedHosts = (process.env.FLEET_SYNC_ALLOWED_HOSTS || 'cubogpm-frota.nortesistech.com')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  if (!allowedHosts.includes(targetUrl.hostname)) {
    res.status(403).json({ data: null, error: 'Host nao permitido para sincronizacao' });
    return;
  }

  try {
    const fleetResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
      },
    });

    const payload = await fleetResponse.json().catch(() => null);

    if (!fleetResponse.ok) {
      res.status(fleetResponse.status).json({
        data: null,
        error: payload?.error || `Falha na Fleet API (${fleetResponse.status})`,
      });
      return;
    }

    res.json(payload);
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err, 'Falha ao consultar Fleet API');
  }
});

app.get('/workshop/productivity', authenticate, async (req, res) => {
  const from = parseDateFilter(toScalar(req.query.from));
  const to = parseDateFilter(toScalar(req.query.to));
  const mechanicId = toScalar(req.query.mechanic_id || req.query.mechanicId);
  const serviceCategory = toScalar(req.query.service_category || req.query.serviceCategory);

  const applyFilters = (rows) => {
    return rows.filter((row) => {
      const timestamp = new Date(String(row?.timestamp || row?.created_at || ''));
      if (Number.isNaN(timestamp.getTime())) return false;
      if (from && timestamp < new Date(from)) return false;
      if (to && timestamp > new Date(to)) return false;
      if (mechanicId && String(row?.new_mechanic_id || '') !== mechanicId) return false;
      if (serviceCategory && String(row?.service_category || '') !== serviceCategory) return false;
      return true;
    });
  };

  if (!dbConnected) {
    const rows = normalizeRowsByTable('work_order_assignments', readJson('work_order_assignments'));
    const filtered = applyFilters(rows);
    res.json({ data: sanitizeResponse(filtered), error: null });
    return;
  }

  try {
    const values = [];
    const clauses = [];

    if (from) {
      values.push(from);
      clauses.push(`timestamp >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      clauses.push(`timestamp <= $${values.length}`);
    }
    if (mechanicId) {
      values.push(mechanicId);
      clauses.push(`new_mechanic_id = $${values.length}`);
    }
    if (serviceCategory) {
      values.push(serviceCategory);
      clauses.push(`service_category = $${values.length}`);
    }

    let query = 'SELECT * FROM work_order_assignments';
    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(' AND ')}`;
    }
    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, values);
    const rows = normalizeRowsByTable('work_order_assignments', result.rows);
    res.json({ data: sanitizeResponse(rows), error: null });
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  }
});

app.post('/receipts/finalize', authenticate, async (req, res) => {
  const poId = String(req.body?.po_id || req.body?.poId || '').trim();
  const requestedWarehouseId = String(req.body?.warehouse_id || req.body?.warehouseId || '').trim();
  const receiptItems = normalizeReceiptItems(req.body?.items);

  if (!poId) {
    res.status(400).json({ data: null, error: 'po_id eh obrigatorio' });
    return;
  }

  if (receiptItems.length === 0) {
    res.status(400).json({ data: null, error: 'Nenhum item valido para recebimento' });
    return;
  }

  const receivedAtIso = new Date().toISOString();
  const receiptReason = `Entrada via Recebimento de ${poId}`;
  const receiptUser = String(req.auth?.email || req.auth?.sub || 'Sistema');
  const receiptActorId = req.auth?.sub ? String(req.auth.sub) : null;

  if (!dbConnected) {
    const purchaseOrders = normalizeRowsByTable('purchase_orders', readJson('purchase_orders'));
    const poIndex = purchaseOrders.findIndex((order) => String(order.id) === poId);

    if (poIndex === -1) {
      res.status(404).json({ data: null, error: `Pedido ${poId} nao encontrado` });
      return;
    }

    const targetPo = purchaseOrders[poIndex];
    if (String(targetPo.status) !== 'enviado') {
      res.status(409).json({
        data: null,
        error: `Pedido ${poId} ja foi recebido ou nao esta em status enviado`,
      });
      return;
    }

    const targetWarehouseId = requestedWarehouseId || targetPo.warehouse_id || 'ARMZ28';
    const inventory = normalizeRowsByTable('inventory', readJson('inventory'));
    const movements = normalizeRowsByTable('movements', readJson('movements'));

    const indexedInventory = new Map();
    inventory.forEach((item, index) => {
      const normalizedSku = normalizeStockKeyToken(item.sku);
      const normalizedWarehouse = normalizeStockKeyToken(item.warehouse_id || 'ARMZ28');
      indexedInventory.set(`${normalizedSku}::${normalizedWarehouse}`, index);
      // Fallback para estoque central compartilhado entre armazens.
      if (normalizedWarehouse === 'all') {
        const fallbackKey = `${normalizedSku}::${normalizeStockKeyToken(targetWarehouseId)}`;
        if (!indexedInventory.has(fallbackKey)) {
          indexedInventory.set(fallbackKey, index);
        }
      }
    });

    const missingSkus = receiptItems
      .filter((item) => !indexedInventory.has(`${normalizeStockKeyToken(item.sku)}::${normalizeStockKeyToken(targetWarehouseId)}`))
      .map((item) => item.sku);

    if (missingSkus.length > 0) {
      res.status(400).json({
        data: null,
        error: `Itens nao encontrados no estoque do armazem ${targetWarehouseId}: ${missingSkus.join(', ')}`,
      });
      return;
    }

    const inventoryUpdates = [];
    const newMovements = [];

    receiptItems.forEach((item, index) => {
      const mapKey = `${normalizeStockKeyToken(item.sku)}::${normalizeStockKeyToken(targetWarehouseId)}`;
      const inventoryIndex = indexedInventory.get(mapKey);
      const currentInventory = inventory[inventoryIndex];
      const previousQty = Number(currentInventory.quantity || 0);
      const nextQty = previousQty + item.received;

      inventory[inventoryIndex] = {
        ...currentInventory,
        quantity: nextQty,
      };

      inventoryUpdates.push({
        sku: item.sku,
        previous_qty: previousQty,
        received: item.received,
        new_qty: nextQty,
      });

      newMovements.push({
        id: buildReceiptMovementId(poId, index + 1),
        sku: item.sku,
        product_name: currentInventory.name || item.sku,
        type: 'entrada',
        quantity: item.received,
        timestamp: receivedAtIso,
        user: receiptUser,
        location: currentInventory.location || 'DOCA-01',
        reason: receiptReason,
        order_id: poId,
        warehouse_id: targetWarehouseId,
      });
    });

    const updatedPo = {
      ...targetPo,
      status: 'recebido',
      received_at: receivedAtIso,
    };
    purchaseOrders[poIndex] = updatedPo;

    writeJson('inventory', inventory);
    writeJson('movements', [...movements, ...newMovements]);
    writeJson('purchase_orders', purchaseOrders);

    const receiptAuditLogs = [
      buildAuditLog({
        module: 'recebimento',
        action: 'receipt_finalize',
        entity: 'purchase_orders',
        entityId: poId,
        actor: receiptUser,
        actorId: receiptActorId,
        warehouseId: targetWarehouseId,
        beforeData: targetPo,
        afterData: updatedPo,
        meta: {
          po_id: poId,
          items: receiptItems,
        },
      }),
      ...inventoryUpdates.map((entry) =>
        buildAuditLog({
          module: 'recebimento',
          action: 'inventory_increment',
          entity: 'inventory',
          entityId: entry.sku,
          actor: receiptUser,
          actorId: receiptActorId,
          warehouseId: targetWarehouseId,
          beforeData: { quantity: entry.previous_qty },
          afterData: { quantity: entry.new_qty },
          meta: {
            po_id: poId,
            received: entry.received,
          },
        })
      ),
    ];

    await persistAuditLogs(receiptAuditLogs);

    res.json({
      data: {
        po: normalizePurchaseOrderRecord(updatedPo),
        inventory_updates: inventoryUpdates,
        movements: newMovements,
      },
      error: null,
    });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const poResult = await client.query('SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE', [poId]);
    if (poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ data: null, error: `Pedido ${poId} nao encontrado` });
      return;
    }

    const targetPo = normalizePurchaseOrderRecord(poResult.rows[0]);
    if (String(targetPo.status) !== 'enviado') {
      await client.query('ROLLBACK');
      res.status(409).json({
        data: null,
        error: `Pedido ${poId} ja foi recebido ou nao esta em status enviado`,
      });
      return;
    }

    const targetWarehouseId = requestedWarehouseId || targetPo.warehouse_id || 'ARMZ28';
    const inventoryUpdates = [];
    const movementRows = [];

    for (let index = 0; index < receiptItems.length; index += 1) {
      const item = receiptItems[index];
      let inventoryUpdate = await client.query(
        `
          UPDATE inventory
             SET quantity = quantity + $1
           WHERE sku = $2
           WHERE TRIM(CAST(sku AS TEXT)) = TRIM(CAST($2 AS TEXT))
             AND warehouse_id = $3
         RETURNING *
        `,
        [item.received, item.sku, targetWarehouseId]
      );

      if (inventoryUpdate.rows.length === 0) {
        inventoryUpdate = await client.query(
          `
            UPDATE inventory
               SET quantity = quantity + $1
             WHERE TRIM(CAST(sku AS TEXT)) = TRIM(CAST($2 AS TEXT))
               AND LOWER(TRIM(CAST(warehouse_id AS TEXT))) = 'all'
           RETURNING *
          `,
          [item.received, item.sku]
        );
      }

      if (inventoryUpdate.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          data: null,
          error: `Item ${item.sku} nao encontrado no estoque do armazem ${targetWarehouseId}`,
        });
        return;
      }

      const updatedInventory = inventoryUpdate.rows[0];
      const newQty = Number(updatedInventory.quantity || 0);
      const previousQty = newQty - item.received;

      inventoryUpdates.push({
        sku: item.sku,
        previous_qty: previousQty,
        received: item.received,
        new_qty: newQty,
      });

      const movementInsert = await client.query(
        `
          INSERT INTO movements (id, sku, product_name, type, quantity, timestamp, "user", location, reason, order_id, warehouse_id)
          VALUES ($1, $2, $3, 'entrada', $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          crypto.randomUUID(),
          item.sku,
          updatedInventory.name || item.sku,
          item.received,
          receivedAtIso,
          receiptUser,
          updatedInventory.location || 'DOCA-01',
          receiptReason,
          poId,
          targetWarehouseId,
        ]
      );

      movementRows.push(movementInsert.rows[0]);
    }

    const poUpdate = await client.query(
      `
        UPDATE purchase_orders
           SET status = 'recebido',
               received_at = $1
         WHERE id = $2
       RETURNING *
      `,
      [receivedAtIso, poId]
    );

    const updatedPoRow = poUpdate.rows[0];
    const receiptAuditLogs = [
      buildAuditLog({
        module: 'recebimento',
        action: 'receipt_finalize',
        entity: 'purchase_orders',
        entityId: poId,
        actor: receiptUser,
        actorId: receiptActorId,
        warehouseId: targetWarehouseId,
        beforeData: targetPo,
        afterData: updatedPoRow,
        meta: {
          po_id: poId,
          items: receiptItems,
        },
      }),
      ...inventoryUpdates.map((entry) =>
        buildAuditLog({
          module: 'recebimento',
          action: 'inventory_increment',
          entity: 'inventory',
          entityId: entry.sku,
          actor: receiptUser,
          actorId: receiptActorId,
          warehouseId: targetWarehouseId,
          beforeData: { quantity: entry.previous_qty },
          afterData: { quantity: entry.new_qty },
          meta: {
            po_id: poId,
            received: entry.received,
          },
        })
      ),
    ];

    await persistAuditLogs(receiptAuditLogs, client);

    await client.query('COMMIT');

    res.json({
      data: {
        po: normalizePurchaseOrderRecord(updatedPoRow),
        inventory_updates: inventoryUpdates,
        movements: normalizeRowsByTable('movements', movementRows),
      },
      error: null,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err, 'Falha ao finalizar recebimento');
  } finally {
    if (client) client.release();
  }
});

app.get('/audit_logs/search', authenticate, async (req, res) => {
  const limit = parseLimit(toScalar(req.query.limit)) || 50;
  if (toScalar(req.query.limit) && !parseLimit(toScalar(req.query.limit))) {
    res.status(400).json({ data: null, error: 'Limite invalido' });
    return;
  }

  const offset = parseOffset(toScalar(req.query.offset));
  if (toScalar(req.query.offset) && offset === null) {
    res.status(400).json({ data: null, error: 'Offset invalido' });
    return;
  }

  const from = toScalar(req.query.from);
  const to = toScalar(req.query.to);
  const fromIso = from ? parseDateFilter(from) : null;
  const toIso = to ? parseDateFilter(to) : null;

  if (from && !fromIso) {
    res.status(400).json({ data: null, error: 'Data inicial invalida' });
    return;
  }

  if (to && !toIso) {
    res.status(400).json({ data: null, error: 'Data final invalida' });
    return;
  }

  const filters = {
    module: String(toScalar(req.query.module) || '').trim(),
    entity: String(toScalar(req.query.entity) || '').trim(),
    action: String(toScalar(req.query.action) || '').trim(),
    actor: String(toScalar(req.query.actor) || '').trim(),
    plate: String(toScalar(req.query.plate) || '').trim(),
    warehouse_id: String(toScalar(req.query.warehouse_id) || '').trim(),
    include_global: String(toScalar(req.query.include_global) || 'true').trim(),
    q: String(toScalar(req.query.q) || '').trim(),
    from: fromIso,
    to: toIso,
  };

  const safeOffset = offset || 0;

  const buildAuditResponse = (inputRows) => {
    const rows = [...inputRows].sort((a, b) => {
      const aDate = new Date(String(a?.created_at || '')).getTime();
      const bDate = new Date(String(b?.created_at || '')).getTime();
      if (!Number.isFinite(aDate) && !Number.isFinite(bDate)) return 0;
      if (!Number.isFinite(aDate)) return 1;
      if (!Number.isFinite(bDate)) return -1;
      return bDate - aDate;
    });

    const total = rows.length;
    const pageRows = rows.slice(safeOffset, safeOffset + limit);
    const hasMore = safeOffset + pageRows.length < total;

    return {
      data: sanitizeResponse(pageRows),
      total,
      has_more: hasMore,
      next_offset: hasMore ? safeOffset + pageRows.length : null,
      error: null,
    };
  };

  const getJsonFallbackRows = () => {
    let rows = normalizeRowsByTable('audit_logs', readJson('audit_logs'));
    rows = filterAuditLogRows(rows, filters);
    return rows;
  };

  if (!dbConnected) {
    res.json(buildAuditResponse(getJsonFallbackRows()));
    return;
  }

  try {
    const whereParts = [];
    const values = [];

    const pushValue = (value) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (filters.module) {
      const marker = pushValue(`%${filters.module}%`);
      whereParts.push(`module ILIKE ${marker}`);
    }

    if (filters.entity) {
      const marker = pushValue(`%${filters.entity}%`);
      whereParts.push(`entity ILIKE ${marker}`);
    }

    if (filters.action) {
      const marker = pushValue(`%${filters.action}%`);
      whereParts.push(`action ILIKE ${marker}`);
    }

    if (filters.actor) {
      const marker = pushValue(`%${filters.actor}%`);
      whereParts.push(`actor ILIKE ${marker}`);
    }

    if (filters.warehouse_id && filters.warehouse_id !== 'all') {
      const marker = pushValue(filters.warehouse_id);
      const includeGlobal = String(filters.include_global).toLowerCase() !== 'false';
      if (includeGlobal) {
        whereParts.push(`(warehouse_id = ${marker} OR warehouse_id IS NULL OR warehouse_id = '')`);
      } else {
        whereParts.push(`warehouse_id = ${marker}`);
      }
    }

    if (fromIso) {
      const marker = pushValue(fromIso);
      whereParts.push(`created_at >= ${marker}`);
    }

    if (toIso) {
      const marker = pushValue(toIso);
      whereParts.push(`created_at <= ${marker}`);
    }

    if (filters.q) {
      const marker = pushValue(`%${filters.q}%`);
      whereParts.push(`(
        module ILIKE ${marker}
        OR entity ILIKE ${marker}
        OR entity_id ILIKE ${marker}
        OR action ILIKE ${marker}
        OR actor ILIKE ${marker}
        OR actor_id ILIKE ${marker}
        OR warehouse_id ILIKE ${marker}
        OR CAST(meta AS TEXT) ILIKE ${marker}
        OR CAST(before_data AS TEXT) ILIKE ${marker}
        OR CAST(after_data AS TEXT) ILIKE ${marker}
      )`);
    }

    if (filters.plate) {
      const normalizedPlate = normalizePlateToken(filters.plate);
      const marker = pushValue(`%${normalizedPlate}%`);
      whereParts.push(`regexp_replace(
        lower(
          concat_ws(' ',
            COALESCE(CAST(meta AS TEXT), ''),
            COALESCE(CAST(before_data AS TEXT), ''),
            COALESCE(CAST(after_data AS TEXT), ''),
            COALESCE(entity_id, '')
          )
        ),
        '[^a-z0-9]',
        '',
        'g'
      ) LIKE ${marker}`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const jsonFallbackRows = getJsonFallbackRows();
    if (jsonFallbackRows.length > 0) {
      const allDbRowsResult = await pool.query(
        `
          SELECT *
          FROM audit_logs
          ${whereClause}
          ORDER BY created_at DESC
        `,
        values
      );

      const dbRows = normalizeRowsByTable('audit_logs', allDbRowsResult.rows);
      const merged = [];
      const seen = new Set();

      [...dbRows, ...jsonFallbackRows].forEach((row, index) => {
        const dedupeKey = row?.id
          ? `id:${row.id}`
          : `sig:${row?.module || ''}|${row?.entity || ''}|${row?.entity_id || ''}|${row?.action || ''}|${row?.created_at || ''}|${index}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        merged.push(row);
      });

      res.json(buildAuditResponse(merged));
      return;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`,
      values
    );
    const total = Number(countResult.rows?.[0]?.total || 0);

    const dataValues = [...values];
    dataValues.push(limit, safeOffset);
    const limitMarker = `$${dataValues.length - 1}`;
    const offsetMarker = `$${dataValues.length}`;

    const dataResult = await pool.query(
      `
        SELECT *
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limitMarker}
        OFFSET ${offsetMarker}
      `,
      dataValues
    );

    const rows = normalizeRowsByTable('audit_logs', dataResult.rows);
    const hasMore = safeOffset + rows.length < total;

    res.json({
      data: sanitizeResponse(rows),
      total,
      has_more: hasMore,
      next_offset: hasMore ? safeOffset + rows.length : null,
      error: null,
    });
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    console.warn(`Audit search fallback activated: ${getErrorReason(err)}`);
    res.json({
      ...buildAuditResponse(getJsonFallbackRows()),
      source: 'json-fallback',
    });
  }
});

app.get('/:table/count', authenticate, async (req, res) => {
  const { table } = req.params;
  const sourceModule = getSourceModuleFromRequest(req);

  if (!validateTable(table)) {
    res.status(403).json({ data: null, error: 'Tabela nao permitida' });
    return;
  }

  if (!ensureFleetReadSourceModule(table, req, res)) {
    return;
  }

  const filters = getFiltersFromQuery(req.query);
  if (table === 'fleet_vehicles') {
    const scopedSourceModule = resolveFleetReadSourceFilter(sourceModule);
    if (scopedSourceModule) {
      filters.source_module = scopedSourceModule;
    }
  }
  if (!areColumnsAllowed(table, Object.keys(filters))) {
    res.status(400).json({ data: null, error: 'Filtro com coluna nao permitida' });
    return;
  }

  if (table === 'vehicles') {
    try {
      const { rows } = await readCentralVehiclesAsLegacy();
      const filteredRows = applyFiltersToJsonRows(rows, filters);
      res.json({ data: { total: filteredRows.length }, error: null });
    } catch (err) {
      markDbDisconnectedIfNeeded(err);
      try {
        const fleetRows = readJson('fleet_vehicles');
        const fallbackRows = (Array.isArray(fleetRows) && fleetRows.length > 0 ? fleetRows : readJson('vehicles'))
          .map((row) => mapFleetVehicleToLegacyVehicle(row))
          .filter((row) => row.plate);
        const filteredRows = applyFiltersToJsonRows(fallbackRows, filters);
        res.json({ data: { total: filteredRows.length }, error: null });
      } catch {
        sendServerError(res, err);
      }
    }
    return;
  }

  if (!dbConnected) {
    let rows = normalizeRowsByTable(table, readJson(table));
    rows = applyFiltersToJsonRows(rows, filters);
    res.json({ data: { total: rows.length }, error: null });
    return;
  }

  try {
    let query = `SELECT COUNT(*)::int AS total FROM ${quoteIdentifier(table)}`;
    const values = [];

    const filterEntries = Object.entries(filters);
    if (filterEntries.length > 0) {
      const whereFilter = buildSqlWhereFromFilters(filters);
      query += ` WHERE ${whereFilter.clause}`;
      values.push(...whereFilter.values);
    }

    const result = await pool.query(query, values);
    const total = Number(result.rows?.[0]?.total || 0);
    res.json({ data: { total }, error: null });
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  }
});

app.get('/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const actor = String(req.auth?.email || req.auth?.sub || 'Sistema');
  const actorId = req.auth?.sub ? String(req.auth.sub) : null;
  const sourceModule = getSourceModuleFromRequest(req);

  if (!validateTable(table)) {
    res.status(403).json({ data: null, error: 'Tabela nao permitida' });
    return;
  }

  if (!ensureFleetReadSourceModule(table, req, res)) {
    return;
  }

  const filters = getFiltersFromQuery(req.query);
  if (table === 'fleet_vehicles') {
    const scopedSourceModule = resolveFleetReadSourceFilter(sourceModule);
    if (scopedSourceModule) {
      filters.source_module = scopedSourceModule;
    }
  }
  if (!areColumnsAllowed(table, Object.keys(filters))) {
    res.status(400).json({ data: null, error: 'Filtro com coluna nao permitida' });
    return;
  }

  const order = parseOrder(table, toScalar(req.query.order));
  if (toScalar(req.query.order) && !order) {
    res.status(400).json({ data: null, error: 'Ordenacao invalida' });
    return;
  }

  const limit = parseLimit(toScalar(req.query.limit));
  if (toScalar(req.query.limit) && !limit) {
    res.status(400).json({ data: null, error: 'Limite invalido' });
    return;
  }

  const offset = parseOffset(toScalar(req.query.offset));
  if (toScalar(req.query.offset) && offset === null) {
    res.status(400).json({ data: null, error: 'Offset invalido' });
    return;
  }

  if (table === 'vehicles') {
    try {
      const { rows: sourceRows, mode } = await readCentralVehiclesAsLegacy();
      let rows = applyFiltersToJsonRows(sourceRows, filters);
      rows = applyOrderToJsonRows(rows, order);
      rows = applyPaginationToJsonRows(rows, limit, offset || 0);

      if (sourceModule) {
        const auditEntry = buildAuditLog({
          module: sourceModule,
          action: 'lookup',
          entity: 'fleet_vehicles',
          entityId: filters?.plate || null,
          actor,
          actorId,
          warehouseId: null,
          beforeData: null,
          afterData: null,
          meta: {
            source_module: sourceModule,
            filters,
            total_returned: rows.length,
            mode,
          },
        });
        await persistAuditLogs([auditEntry], mode === 'db' ? pool : null);
      }

      res.json({ data: sanitizeResponse(rows), error: null });
    } catch (err) {
      markDbDisconnectedIfNeeded(err);
      try {
        const fleetRows = readJson('fleet_vehicles');
        let rows = (Array.isArray(fleetRows) && fleetRows.length > 0 ? fleetRows : readJson('vehicles'))
          .map((row) => mapFleetVehicleToLegacyVehicle(row))
          .filter((row) => row.plate);
        rows = applyFiltersToJsonRows(rows, filters);
        rows = applyOrderToJsonRows(rows, order);
        rows = applyPaginationToJsonRows(rows, limit, offset || 0);
        res.json({ data: sanitizeResponse(rows), error: null });
      } catch {
        sendServerError(res, err);
      }
    }
    return;
  }

  if (!dbConnected) {
    let rows = normalizeRowsByTable(table, readJson(table));
    rows = applyFiltersToJsonRows(rows, filters);
    rows = applyOrderToJsonRows(rows, order);
    rows = applyPaginationToJsonRows(rows, limit, offset || 0);

    if (table === 'fleet_vehicles' && sourceModule) {
      await persistAuditLogs([
        buildAuditLog({
          module: sourceModule,
          action: 'lookup',
          entity: 'fleet_vehicles',
          entityId: filters?.placa || null,
          actor,
          actorId,
          warehouseId: null,
          beforeData: null,
          afterData: null,
          meta: {
            source_module: sourceModule,
            filters,
            total_returned: rows.length,
            mode: 'json',
          },
        }),
      ]);
    }

    res.json({ data: sanitizeResponse(rows), error: null });
    return;
  }

  try {
    let query = `SELECT * FROM ${quoteIdentifier(table)}`;
    const values = [];

    const filterEntries = Object.entries(filters);
    if (filterEntries.length > 0) {
      const whereFilter = buildSqlWhereFromFilters(filters);
      query += ` WHERE ${whereFilter.clause}`;
      values.push(...whereFilter.values);
    }

    if (order) {
      query += ` ORDER BY ${quoteIdentifier(order.column)} ${order.direction}`;
    }

    if (limit) {
      values.push(limit);
      query += ` LIMIT $${values.length}`;
    }

    if (offset) {
      values.push(offset);
      query += ` OFFSET $${values.length}`;
    }

    const result = await pool.query(query, values);
    const rows = normalizeRowsByTable(table, result.rows);

    if (table === 'fleet_vehicles' && sourceModule) {
      await persistAuditLogs(
        [
          buildAuditLog({
            module: sourceModule,
            action: 'lookup',
            entity: 'fleet_vehicles',
            entityId: filters?.placa || null,
            actor,
            actorId,
            warehouseId: null,
            beforeData: null,
            afterData: null,
            meta: {
              source_module: sourceModule,
              filters,
              total_returned: rows.length,
              mode: 'db',
            },
          }),
        ],
        pool
      );
    }

    res.json({ data: sanitizeResponse(rows), error: null });
  } catch (err) {
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  }
});

app.post('/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const actor = String(req.auth?.email || req.auth?.sub || 'Sistema');
  const actorId = req.auth?.sub ? String(req.auth.sub) : null;
  const sourceModule = getSourceModuleFromRequest(req);

  if (!validateTable(table)) {
    res.status(403).json({ data: null, error: 'Tabela nao permitida' });
    return;
  }

  if (WRITE_RESTRICTED_TABLES.has(table)) {
    res.status(403).json({
      data: null,
      error: 'Escrita bloqueada nesta tabela. Use a base central em fleet_vehicles.',
    });
    return;
  }

  if (!ensureFleetWriteSourceModule(table, req, res)) {
    return;
  }

  const payload = req.body;
  const rows = Array.isArray(payload) ? payload : [payload];

  if (rows.length === 0 || rows.some((row) => !row || typeof row !== 'object')) {
    res.status(400).json({ data: null, error: 'Payload invalido' });
    return;
  }

  if (!rows.every((row) => areColumnsAllowed(table, Object.keys(row)))) {
    res.status(400).json({ data: null, error: 'Payload contem coluna nao permitida' });
    return;
  }

  let vendorLocalSequence = 0;
  let preparedRows = [];
  try {
    preparedRows = rows.map((row, index) => {
      const nextRow = { ...row };
      if (table === 'users' && 'password' in nextRow) {
        nextRow.password = ensurePasswordHash(nextRow.password);
      }
      if (table === 'inventory') {
        const normalizedSku = typeof nextRow.sku === 'string' ? nextRow.sku.trim() : '';
        if (!normalizedSku) {
          throw new Error('Codigo item (SKU) obrigatorio');
        }
        nextRow.sku = normalizedSku.toUpperCase();
        nextRow.name = normalizeWhitespace(nextRow.name);
        if (!nextRow.name) {
          throw new Error('Descricao do item obrigatoria');
        }
        assertMaxLength(nextRow.name, INVENTORY_DESCRIPTION_MAX_LENGTH, 'Descricao do item');
        if (!nextRow.status) nextRow.status = 'disponivel';
        if (!nextRow.location) nextRow.location = 'DOCA-01';
        if (nextRow.quantity === null || nextRow.quantity === undefined || Number.isNaN(Number(nextRow.quantity))) {
          nextRow.quantity = 0;
        }
        if (!nextRow.warehouse_id) nextRow.warehouse_id = 'ARMZ28';
      }
      if (table === 'vendors') {
        vendorLocalSequence += 1;
        const defaultId = `VEN-${Date.now()}-${String(index + 1 + vendorLocalSequence).padStart(4, '0')}`;
        const normalizedVendor = normalizeVendorRow(nextRow, defaultId);
        Object.keys(nextRow).forEach((key) => {
          if (!(key in normalizedVendor)) delete nextRow[key];
        });
        Object.assign(nextRow, normalizedVendor);
      }
      if (table === 'cyclic_counts') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        if (!nextRow.status) nextRow.status = 'pendente';
      }
      if (table === 'movements' && !nextRow.id) {
        nextRow.id = crypto.randomUUID();
      }
      if (table === 'fleet_vehicles') {
        nextRow.placa = String(nextRow.placa || '')
          .trim()
          .toUpperCase();
        if (!nextRow.placa) {
          throw new Error('Placa obrigatoria para cadastro de veiculo de frota');
        }
        nextRow.source_module = sourceModule;
        if (nextRow.km_atual === null || nextRow.km_atual === undefined || Number.isNaN(Number(nextRow.km_atual))) {
          nextRow.km_atual = 0;
        }
        if (nextRow.km_anterior === null || nextRow.km_anterior === undefined || Number.isNaN(Number(nextRow.km_anterior))) {
          nextRow.km_anterior = 0;
        }
        if (nextRow.km_prox_manutencao === null || nextRow.km_prox_manutencao === undefined || Number.isNaN(Number(nextRow.km_prox_manutencao))) {
          nextRow.km_prox_manutencao = 0;
        }
        if (!nextRow.gestao_multa) nextRow.gestao_multa = 'NAO';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'fleet_people') {
        nextRow.cpf = String(nextRow.cpf || '').replace(/\D/g, '');
        if (!nextRow.cpf) {
          throw new Error('CPF obrigatorio para cadastro de pessoa da frota');
        }
        if (!nextRow.status) nextRow.status = 'ATIVO';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'fleet_fines') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        nextRow.placa = String(nextRow.placa || '').trim().toUpperCase();
        if (!nextRow.status) nextRow.status = 'PENDENTE';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'fleet_tachograph_checks') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        nextRow.placa = String(nextRow.placa || '').trim().toUpperCase();
        if (!nextRow.status) nextRow.status = 'REGULAR';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'fleet_rntrc_records') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        if (!nextRow.status) nextRow.status = 'ATIVO';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'fleet_fiscal_obligations') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        nextRow.placa = String(nextRow.placa || '').trim().toUpperCase();
        if (!nextRow.status) nextRow.status = 'PENDENTE';
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'mechanics') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        if (!nextRow.status) nextRow.status = 'disponivel';
        if (!nextRow.current_work_orders) nextRow.current_work_orders = [];
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'work_orders') {
        if (!nextRow.id) nextRow.id = `OS-${Date.now()}`;
        if (!nextRow.status) nextRow.status = 'aguardando';
        if (!nextRow.opened_at) nextRow.opened_at = new Date().toISOString();
        if (!nextRow.last_status_change) nextRow.last_status_change = nextRow.opened_at;
        if (nextRow.total_seconds === null || nextRow.total_seconds === undefined) {
          nextRow.total_seconds = 0;
        }
        if (!nextRow.status_timers) nextRow.status_timers = {};
        if (typeof nextRow.is_timer_active !== 'boolean') {
          nextRow.is_timer_active = nextRow.status === 'em_execucao';
        }
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'work_order_logs') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        if (!nextRow.timestamp) nextRow.timestamp = new Date().toISOString();
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      if (table === 'work_order_assignments') {
        if (!nextRow.id) nextRow.id = crypto.randomUUID();
        if (!nextRow.timestamp) nextRow.timestamp = new Date().toISOString();
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString();
      }
      return nextRow;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dados invalidos para criacao';
    res.status(400).json({ data: null, error: message });
    return;
  }

  if (table === 'work_orders') {
    try {
      const normalizePlate = (value) => String(value || '').trim().toUpperCase();
      const isOpenStatus = (status) => !['finalizada', 'cancelada'].includes(String(status || '').toLowerCase());

      const plates = preparedRows
        .map((row) => normalizePlate(row?.vehicle_plate ?? row?.vehiclePlate))
        .filter(Boolean);

      const uniquePlates = [...new Set(plates)];
      if (plates.length !== uniquePlates.length) {
        throw new Error('Nao e permitido criar duas OS abertas para a mesma placa no mesmo envio.');
      }

      if (uniquePlates.length > 0) {
        if (!dbConnected) {
          const existingRows = normalizeRowsByTable('work_orders', readJson('work_orders'));
          const conflict = existingRows.find((row) => {
            const plate = normalizePlate(row?.vehicle_plate ?? row?.vehiclePlate);
            if (!plate || !uniquePlates.includes(plate)) return false;
            return isOpenStatus(row?.status);
          });
          if (conflict) {
            throw new Error(`Ja existe uma OS aberta para a placa ${normalizePlate(conflict.vehicle_plate) || 'informada'}`);
          }
        } else {
          const placeholders = uniquePlates.map((_, index) => `$${index + 1}`).join(', ');
          const query = `
            SELECT vehicle_plate
            FROM work_orders
            WHERE vehicle_plate IN (${placeholders})
              AND status NOT IN ('finalizada', 'cancelada')
            LIMIT 1
          `;
          const result = await pool.query(query, uniquePlates);
          if (result.rows?.length > 0) {
            throw new Error(`Ja existe uma OS aberta para a placa ${normalizePlate(result.rows[0].vehicle_plate)}`);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OS aberta existente para a placa informada';
      res.status(409).json({ data: null, error: message });
      return;
    }
  }

  if (table === 'vendors') {
    try {
      if (!dbConnected) {
        const existingRows = normalizeRowsByTable('vendors', readJson('vendors'));
        ensureNoVendorDuplicatesInMemory(preparedRows, existingRows);

        let maxVendorId = existingRows.reduce((maxValue, row) => {
          const current = Number(row?.id_fornecedor);
          return Number.isFinite(current) ? Math.max(maxValue, current) : maxValue;
        }, 0);

        preparedRows.forEach((row) => {
          const parsed = Number(row?.id_fornecedor);
          if (Number.isFinite(parsed) && parsed > 0) return;
          maxVendorId += 1;
          row.id_fornecedor = maxVendorId;
        });
      } else {
        ensureNoVendorDuplicatesInMemory(preparedRows, []);
        for (const row of preparedRows) {
          const conflict = await findVendorConflictInDb(pool, row);
          if (conflict) {
            throw new Error(
              `Fornecedor ja cadastrado (${conflict.razao_social || conflict.name || conflict.cnpj || conflict.id})`
            );
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dados de fornecedor invalidos';
      res.status(409).json({ data: null, error: message });
      return;
    }
  }

  if (table === 'inventory') {
    try {
      const batchSkus = new Set();
      for (const row of preparedRows) {
        const sku = String(row?.sku || '').trim().toUpperCase();
        if (!sku) continue;
        if (batchSkus.has(sku)) {
          throw new Error(`Codigo item (SKU) duplicado no lote: ${sku}`);
        }
        batchSkus.add(sku);
      }

      if (!dbConnected) {
        const existingSkus = new Set(
          normalizeRowsByTable('inventory', readJson('inventory'))
            .map((row) => String(row?.sku || '').trim().toUpperCase())
            .filter(Boolean)
        );
        for (const sku of batchSkus) {
          if (existingSkus.has(sku)) {
            throw new Error(`Codigo item (SKU) ja cadastrado: ${sku}`);
          }
        }
      } else {
        const skuList = Array.from(batchSkus);
        if (skuList.length > 0) {
          const conflictResult = await pool.query(
            'SELECT sku FROM inventory WHERE sku = ANY($1::text[]) LIMIT 1',
            [skuList]
          );
          const conflictSku = conflictResult.rows?.[0]?.sku;
          if (conflictSku) {
            throw new Error(`Codigo item (SKU) ja cadastrado: ${conflictSku}`);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dados de item invalidos';
      res.status(409).json({ data: null, error: message });
      return;
    }
  }

  if (table === 'fleet_vehicles') {
    try {
      const batchPlates = new Set();
      for (const row of preparedRows) {
        const plate = String(row?.placa || '')
          .trim()
          .toUpperCase();
        if (!plate) continue;
        if (batchPlates.has(plate)) {
          throw new Error(`Placa duplicada no lote: ${plate}`);
        }
        batchPlates.add(plate);
      }

      if (!dbConnected) {
        const existingPlates = new Set(
          normalizeRowsByTable('fleet_vehicles', readJson('fleet_vehicles'))
            .map((row) => String(row?.placa || '').trim().toUpperCase())
            .filter(Boolean)
        );
        for (const plate of batchPlates) {
          if (existingPlates.has(plate)) {
            throw new Error(`Placa ja cadastrada: ${plate}`);
          }
        }
      } else {
        const plateList = Array.from(batchPlates);
        if (plateList.length > 0) {
          const conflictResult = await pool.query(
            'SELECT placa FROM fleet_vehicles WHERE placa = ANY($1::text[]) LIMIT 1',
            [plateList]
          );
          const conflictPlate = conflictResult.rows?.[0]?.placa;
          if (conflictPlate) {
            throw new Error(`Placa ja cadastrada: ${String(conflictPlate).toUpperCase()}`);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dados de veiculo de frota invalidos';
      res.status(409).json({ data: null, error: message });
      return;
    }
  }

  if (!dbConnected) {
    const currentData = readJson(table);
    const updatedData = [...currentData, ...preparedRows];
    const dataToPersist =
      table === 'fleet_vehicles' ? normalizeRowsByTable('fleet_vehicles', updatedData) : updatedData;
    writeJson(table, dataToPersist);

    if (table !== 'audit_logs') {
      const auditEntries = preparedRows.map((row) =>
        buildAuditLog({
          module: table,
          action: 'create',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || null,
          beforeData: null,
          afterData: row,
          meta: null,
        })
      );
      await persistAuditLogs(auditEntries);
    }

    const normalizedRows = normalizeRowsByTable(table, preparedRows);
    const responseData = Array.isArray(payload) ? normalizedRows : normalizedRows[0];
    broadcastWorkshopEvent(table, 'create', sanitizeResponse(responseData));
    res.json({ data: sanitizeResponse(responseData), error: null });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await setDbAuditContext(client, { actor, actorId, module: table });

    const insertedRows = [];
    const preparedRowsForDb = preparedRows.map((row) => normalizeRowForDb(table, row));

    for (const row of preparedRowsForDb) {
      const columns = Object.keys(row);
      if (columns.length === 0) {
        throw new Error('Payload vazio nao pode ser inserido');
      }

      const values = Object.values(row);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO ${quoteIdentifier(table)} (${columns.map((column) => quoteIdentifier(column)).join(', ')}) VALUES (${placeholders}) RETURNING *`;

      const result = await client.query(query, values);
      insertedRows.push(result.rows[0]);
    }

    const normalized = normalizeRowsByTable(table, insertedRows);

    if (table !== 'audit_logs' && !DB_TRIGGER_AUDITED_TABLES.has(table)) {
      const auditEntries = normalized.map((row) =>
        buildAuditLog({
          module: table,
          action: 'create',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || null,
          beforeData: null,
          afterData: row,
          meta: null,
        })
      );
      await persistAuditLogs(auditEntries, client);
    }

    await client.query('COMMIT');

    const responseData = Array.isArray(payload) ? normalized : normalized[0];
    broadcastWorkshopEvent(table, 'create', sanitizeResponse(responseData));
    res.json({ data: sanitizeResponse(responseData), error: null });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (sendUniqueConstraintConflict(res, err)) return;
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  } finally {
    if (client) client.release();
  }
});

app.patch('/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const actor = String(req.auth?.email || req.auth?.sub || 'Sistema');
  const actorId = req.auth?.sub ? String(req.auth.sub) : null;
  const sourceModule = getSourceModuleFromRequest(req);

  if (!validateTable(table)) {
    res.status(403).json({ data: null, error: 'Tabela nao permitida' });
    return;
  }

  if (WRITE_RESTRICTED_TABLES.has(table)) {
    res.status(403).json({
      data: null,
      error: 'Escrita bloqueada nesta tabela. Use a base central em fleet_vehicles.',
    });
    return;
  }

  if (!ensureFleetWriteSourceModule(table, req, res)) {
    return;
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ data: null, error: 'Payload invalido para update' });
    return;
  }

  const updates = { ...req.body };
  if (table === 'fleet_vehicles') {
    updates.source_module = sourceModule;
  }
  if (!areColumnsAllowed(table, Object.keys(updates))) {
    res.status(400).json({ data: null, error: 'Update contem coluna nao permitida' });
    return;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ data: null, error: 'Nenhum campo enviado para atualizacao' });
    return;
  }

  if (table === 'users' && 'password' in updates) {
    updates.password = ensurePasswordHash(updates.password);
  }

  if (table === 'inventory') {
    if ('sku' in updates) {
      const normalizedSku = normalizeWhitespace(updates.sku).toUpperCase();
      if (!normalizedSku) {
        res.status(400).json({ data: null, error: 'Codigo item (SKU) obrigatorio' });
        return;
      }
      updates.sku = normalizedSku;
    }

    if ('name' in updates) {
      const normalizedName = normalizeWhitespace(updates.name);
      if (!normalizedName) {
        res.status(400).json({ data: null, error: 'Descricao do item obrigatoria' });
        return;
      }
      if (normalizedName.length > INVENTORY_DESCRIPTION_MAX_LENGTH) {
        res.status(400).json({
          data: null,
          error: `Descricao do item deve ter no maximo ${INVENTORY_DESCRIPTION_MAX_LENGTH} caracteres`,
        });
        return;
      }
      updates.name = normalizedName;
    }
  }

  if (table === 'vendors') {
    if ('id_fornecedor' in updates) {
      delete updates.id_fornecedor;
    }

    if ('razao_social' in updates || 'name' in updates) {
      const normalizedName = normalizeWhitespace(updates.razao_social || updates.name);
      if (!normalizedName) {
        res.status(400).json({ data: null, error: 'Razao social e obrigatoria' });
        return;
      }
      if (normalizedName.length > VENDOR_RAZAO_SOCIAL_MAX_LENGTH) {
        res.status(400).json({
          data: null,
          error: `Razao social deve ter no maximo ${VENDOR_RAZAO_SOCIAL_MAX_LENGTH} caracteres`,
        });
        return;
      }
      updates.razao_social = normalizedName;
      updates.name = normalizedName;
    }

    if ('nome_fantasia' in updates) {
      const normalizedFantasy = normalizeWhitespace(updates.nome_fantasia) || null;
      if (normalizedFantasy && normalizedFantasy.length > VENDOR_NOME_FANTASIA_MAX_LENGTH) {
        res.status(400).json({
          data: null,
          error: `Nome fantasia deve ter no maximo ${VENDOR_NOME_FANTASIA_MAX_LENGTH} caracteres`,
        });
        return;
      }
      updates.nome_fantasia = normalizedFantasy;
    }

    if ('telefone' in updates || 'contact' in updates) {
      const normalizedPhone = normalizePhone(updates.telefone || updates.contact);
      updates.telefone = normalizedPhone || null;
      updates.contact = normalizedPhone || updates.contact || null;
    }

    if ('cnpj' in updates) {
      const normalizedCnpj = normalizeCnpj(updates.cnpj);
      if (!normalizedCnpj || !isValidCnpj(normalizedCnpj)) {
        res.status(400).json({ data: null, error: 'CNPJ invalido' });
        return;
      }
      updates.cnpj = normalizedCnpj;
    }

    if ('status' in updates) {
      updates.status = normalizeVendorStatus(updates.status);
    }
  }

  const filters = getFiltersFromQuery(req.query);
  if (table === 'fleet_vehicles') {
    filters.source_module = sourceModule;
  }
  if (Object.keys(filters).length === 0) {
    res.status(400).json({ data: null, error: 'Filtro obrigatorio para update' });
    return;
  }

  if (!areColumnsAllowed(table, Object.keys(filters))) {
    res.status(400).json({ data: null, error: 'Filtro com coluna nao permitida' });
    return;
  }

  if (!dbConnected) {
    const currentData = readJson(table);
    const updatedRows = [];
    const beforeRows = [];

    const nextData = currentData.map((row) => {
      if (!isRowMatch(row, filters)) return row;

      beforeRows.push(row);
      const updatedRow = { ...row, ...updates };
      updatedRows.push(updatedRow);
      return updatedRow;
    });

    if (updatedRows.length === 0) {
      res.status(404).json({ data: null, error: 'Nenhum registro encontrado' });
      return;
    }

    if (table === 'vendors') {
      try {
        const remainingRows = currentData.filter((row) => !isRowMatch(row, filters));
        const ignoreIds = new Set(updatedRows.map((row) => String(row?.id || '')));
        ensureNoVendorDuplicatesInMemory(updatedRows, remainingRows, ignoreIds);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Conflito de fornecedor';
        res.status(409).json({ data: null, error: message });
        return;
      }
    }

    const dataToPersist =
      table === 'fleet_vehicles' ? normalizeRowsByTable('fleet_vehicles', nextData) : nextData;
    writeJson(table, dataToPersist);

    if (table !== 'audit_logs') {
      const auditEntries = updatedRows.map((row, index) =>
        buildAuditLog({
          module: table,
          action: 'update',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || beforeRows[index]?.warehouse_id || null,
          beforeData: beforeRows[index] || null,
          afterData: row,
          meta: {
            filters,
            changed_fields: Object.keys(updates),
          },
        })
      );
      await persistAuditLogs(auditEntries);
    }

    const responseData = normalizeRowsByTable(table, updatedRows);
    broadcastWorkshopEvent(table, 'update', sanitizeResponse(responseData));
    res.json({ data: sanitizeResponse(responseData), error: null });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await setDbAuditContext(client, { actor, actorId, module: table });

    const dbUpdates = normalizeRowForDb(table, updates);
    const updateEntries = Object.entries(dbUpdates);
    const filterEntries = Object.entries(filters);

    const setClause = updateEntries.map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ');
    const whereClause = filterEntries
      .map(([column], index) => `${quoteIdentifier(column)} = $${updateEntries.length + index + 1}`)
      .join(' AND ');
    const beforeWhereClause = filterEntries
      .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
      .join(' AND ');

    const values = [
      ...updateEntries.map(([, value]) => value),
      ...filterEntries.map(([, value]) => coerceValue(value)),
    ];

    const beforeQuery = `SELECT * FROM ${quoteIdentifier(table)} WHERE ${beforeWhereClause}`;
    const beforeResult = await client.query(beforeQuery, filterEntries.map(([, value]) => coerceValue(value)));

    if (table === 'vendors') {
      const beforeRows = normalizeRowsByTable(table, beforeResult.rows);
      const previewRows = beforeRows.map((row) => normalizeVendorRow({ ...row, ...updates }, row.id));
      for (const row of previewRows) {
        const conflict = await findVendorConflictInDb(client, row, row.id);
        if (conflict) {
          await client.query('ROLLBACK');
          res.status(409).json({
            data: null,
            error: `Fornecedor ja cadastrado (${conflict.razao_social || conflict.name || conflict.cnpj || conflict.id})`,
          });
          return;
        }
      }
    }

    const query = `UPDATE ${quoteIdentifier(table)} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ data: null, error: 'Nenhum registro encontrado' });
      return;
    }

    const normalizedRows = normalizeRowsByTable(table, result.rows);

    if (table !== 'audit_logs' && !DB_TRIGGER_AUDITED_TABLES.has(table)) {
      const beforeRows = normalizeRowsByTable(table, beforeResult.rows);
      const beforeMap = new Map(beforeRows.map((row) => [getEntityId(table, row), row]));
      const auditEntries = normalizedRows.map((row) =>
        buildAuditLog({
          module: table,
          action: 'update',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || beforeMap.get(getEntityId(table, row))?.warehouse_id || null,
          beforeData: beforeMap.get(getEntityId(table, row)) || null,
          afterData: row,
          meta: {
            filters,
            changed_fields: Object.keys(updates),
          },
        })
      );
      await persistAuditLogs(auditEntries, client);
    }

    await client.query('COMMIT');
    broadcastWorkshopEvent(table, 'update', sanitizeResponse(normalizedRows));
    res.json({ data: sanitizeResponse(normalizedRows), error: null });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // noop
      }
    }
    if (sendUniqueConstraintConflict(res, err)) return;
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  } finally {
    if (client) client.release();
  }
});

app.delete('/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const actor = String(req.auth?.email || req.auth?.sub || 'Sistema');
  const actorId = req.auth?.sub ? String(req.auth.sub) : null;
  const sourceModule = getSourceModuleFromRequest(req);

  if (!validateTable(table)) {
    res.status(403).json({ data: null, error: 'Tabela nao permitida' });
    return;
  }

  if (WRITE_RESTRICTED_TABLES.has(table)) {
    res.status(403).json({
      data: null,
      error: 'Escrita bloqueada nesta tabela. Use a base central em fleet_vehicles.',
    });
    return;
  }

  if (!ensureFleetWriteSourceModule(table, req, res)) {
    return;
  }

  const filters = getFiltersFromQuery(req.query);
  if (table === 'fleet_vehicles') {
    filters.source_module = sourceModule;
  }
  if (Object.keys(filters).length === 0) {
    res.status(400).json({ data: null, error: 'Filtro obrigatorio para delete' });
    return;
  }

  if (!areColumnsAllowed(table, Object.keys(filters))) {
    res.status(400).json({ data: null, error: 'Filtro com coluna nao permitida' });
    return;
  }

  if (!dbConnected) {
    const currentData = readJson(table);
    const deletedRows = currentData.filter((row) => isRowMatch(row, filters));

    if (deletedRows.length === 0) {
      res.status(404).json({ data: null, error: 'Nenhum registro encontrado' });
      return;
    }

    const remainingRows = currentData.filter((row) => !isRowMatch(row, filters));
    const dataToPersist =
      table === 'fleet_vehicles' ? normalizeRowsByTable('fleet_vehicles', remainingRows) : remainingRows;
    writeJson(table, dataToPersist);

    if (table !== 'audit_logs') {
      const auditEntries = deletedRows.map((row) =>
        buildAuditLog({
          module: table,
          action: 'delete',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || null,
          beforeData: row,
          afterData: null,
          meta: { filters },
        })
      );
      await persistAuditLogs(auditEntries);
    }

    const responseData = normalizeRowsByTable(table, deletedRows);
    broadcastWorkshopEvent(table, 'delete', sanitizeResponse(responseData));
    res.json({ data: sanitizeResponse(responseData), error: null });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await setDbAuditContext(client, { actor, actorId, module: table });

    const filterEntries = Object.entries(filters);
    const whereClause = filterEntries.map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`).join(' AND ');
    const values = filterEntries.map(([, value]) => coerceValue(value));

    const query = `DELETE FROM ${quoteIdentifier(table)} WHERE ${whereClause} RETURNING *`;
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ data: null, error: 'Nenhum registro encontrado' });
      return;
    }

    const normalizedRows = normalizeRowsByTable(table, result.rows);

    if (table !== 'audit_logs' && !DB_TRIGGER_AUDITED_TABLES.has(table)) {
      const auditEntries = normalizedRows.map((row) =>
        buildAuditLog({
          module: table,
          action: 'delete',
          entity: table,
          entityId: getEntityId(table, row),
          actor,
          actorId,
          warehouseId: row?.warehouse_id || null,
          beforeData: row,
          afterData: null,
          meta: { filters },
        })
      );
      await persistAuditLogs(auditEntries, client);
    }

    await client.query('COMMIT');
    broadcastWorkshopEvent(table, 'delete', sanitizeResponse(normalizedRows));
    res.json({ data: sanitizeResponse(normalizedRows), error: null });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // noop
      }
    }
    if (sendUniqueConstraintConflict(res, err)) return;
    markDbDisconnectedIfNeeded(err);
    sendServerError(res, err);
  } finally {
    if (client) client.release();
  }
});

void runPurchaseOrdersRetentionCleanup();
setInterval(() => {
  void runPurchaseOrdersRetentionCleanup();
}, PO_RETENTION_CLEANUP_INTERVAL_MS);

const server = app.listen(port, () => {
  console.log(`API running on port ${port}`);
  if (!dbConnected) console.log('JSON contingency mode active');
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket, req) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      jwt.verify(token, JWT_SECRET);
    }
  } catch {
    socket.close();
    return;
  }

  wsClients.add(socket);
  socket.on('close', () => {
    wsClients.delete(socket);
  });
});
