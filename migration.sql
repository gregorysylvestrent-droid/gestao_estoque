-- Migration oficial LogiWMS-Pro para PostgreSQL (AWS/RDS)
-- Objetivo: tipagem forte (TIMESTAMPTZ/JSONB), indices e compatibilidade com dados legados.
-- Execucao:
--   psql -U <usuario> -d armazem -f migration.sql

\c armazem

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Conversao segura de texto para timestamptz.
CREATE OR REPLACE FUNCTION safe_to_timestamptz(value TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  parsed TIMESTAMPTZ;
  normalized TEXT;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  normalized := btrim(value);
  IF normalized = '' OR lower(normalized) IN ('n/a', 'null', 'undefined') THEN
    RETURN NULL;
  END IF;

  BEGIN
    parsed := normalized::timestamptz;
    RETURN parsed;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    parsed := to_timestamp(normalized, 'DD/MM/YYYY HH24:MI:SS');
    RETURN parsed;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    parsed := to_timestamp(normalized, 'DD/MM/YYYY, HH24:MI:SS');
    RETURN parsed;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    parsed := to_timestamp(normalized, 'YYYY-MM-DD HH24:MI:SS');
    RETURN parsed;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    parsed := to_timestamp(normalized, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    RETURN parsed;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- Conversao segura de texto para JSONB.
CREATE OR REPLACE FUNCTION safe_to_jsonb(value TEXT, fallback JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN fallback;
  END IF;

  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN fallback;
END;
$$;

-- Estrutura principal
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  manager_name VARCHAR(255),
  manager_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'Ativo',
  last_access TIMESTAMPTZ,
  avatar TEXT,
  password TEXT NOT NULL,
  modules JSONB NOT NULL DEFAULT '[]'::JSONB,
  allowed_warehouses JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  manager TEXT,
  budget DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  id_fornecedor BIGINT,
  razao_social VARCHAR(150),
  nome_fantasia VARCHAR(100),
  cnpj VARCHAR(14),
  telefone VARCHAR(20),
  name TEXT,
  category TEXT,
  contact TEXT,
  email TEXT,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  plate VARCHAR(20) PRIMARY KEY,
  model TEXT,
  type TEXT,
  status TEXT DEFAULT 'Disponivel',
  last_maintenance TIMESTAMPTZ,
  cost_center TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelas do modulo Gestao de Frota (DER reestruturado)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  placa VARCHAR(20) PRIMARY KEY,
  renavam TEXT,
  chassi TEXT,
  classe TEXT,
  cor TEXT,
  ano_modelo INTEGER,
  ano_fabricacao INTEGER,
  cidade TEXT,
  estado TEXT,
  proprietario TEXT,
  cod_centro_custo TEXT,
  desc_centro_custo TEXT,
  desc_modelo TEXT,
  desc_marca TEXT,
  desc_combustivel TEXT,
  km_atual INTEGER DEFAULT 0,
  km_anterior INTEGER DEFAULT 0,
  dta_ult_manutencao TIMESTAMPTZ,
  dta_prox_manutencao TIMESTAMPTZ,
  km_prox_manutencao INTEGER DEFAULT 0,
  gestao_multa TEXT DEFAULT 'NAO',
  setor_veiculo TEXT,
  responsavel_veiculo TEXT,
  source_module TEXT NOT NULL DEFAULT 'gestao_frota' CHECK (source_module IN ('gestao_frota', 'oficina')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_people (
  cpf VARCHAR(14) PRIMARY KEY,
  matricula TEXT,
  nome_completo TEXT NOT NULL,
  id_perfil TEXT,
  id_funcao TEXT,
  cod_centro_custo TEXT,
  cnh TEXT,
  categoria TEXT,
  validade_cnh TIMESTAMPTZ,
  toxico_venc TIMESTAMPTZ,
  telefone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) REFERENCES fleet_vehicles(placa) ON UPDATE CASCADE ON DELETE SET NULL,
  ain TEXT,
  data TIMESTAMPTZ,
  hora TEXT,
  local TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  gravidade TEXT,
  enquadramento TEXT,
  condutor TEXT,
  status TEXT DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_tachograph_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) REFERENCES fleet_vehicles(placa) ON UPDATE CASCADE ON DELETE SET NULL,
  num_certificado TEXT,
  dta_afericao TIMESTAMPTZ,
  dta_vencimento TIMESTAMPTZ,
  valor_taxa DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'REGULAR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_rntrc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  documento TEXT,
  rntrc TEXT,
  categoria TEXT,
  vencimento TIMESTAMPTZ,
  status TEXT DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_fiscal_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) REFERENCES fleet_vehicles(placa) ON UPDATE CASCADE ON DELETE SET NULL,
  tipo TEXT,
  exercicio INTEGER,
  vencimento TIMESTAMPTZ,
  valor DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  sku VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location TEXT,
  batch TEXT,
  expiry TEXT,
  quantity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'disponivel',
  image_url TEXT,
  category TEXT,
  min_qty INTEGER DEFAULT 0,
  max_qty INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'UN',
  lead_time INTEGER DEFAULT 7,
  safety_stock INTEGER DEFAULT 5,
  abc_category TEXT,
  last_counted_at TIMESTAMPTZ,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) REFERENCES inventory(sku),
  product_name TEXT,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "user" TEXT,
  location TEXT,
  reason TEXT,
  order_id TEXT,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  vendor TEXT,
  request_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'requisicao',
  priority TEXT DEFAULT 'normal',
  total DECIMAL(15, 2) DEFAULT 0,
  requester TEXT,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  quotes JSONB NOT NULL DEFAULT '[]'::JSONB,
  selected_quote_id TEXT,
  sent_to_vendor_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  quotes_added_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  vendor_order_number TEXT,
  approval_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  plate TEXT,
  cost_center TEXT,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_requests (
  id TEXT PRIMARY KEY,
  sku VARCHAR(50) REFERENCES inventory(sku),
  name TEXT,
  qty INTEGER NOT NULL,
  plate TEXT,
  dept TEXT,
  priority TEXT,
  status TEXT DEFAULT 'aprovacao',
  cost_center TEXT,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cyclic_batches (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'aberto',
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  accuracy_rate DECIMAL(5, 2),
  total_items INTEGER DEFAULT 0,
  divergent_items INTEGER DEFAULT 0,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cyclic_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT REFERENCES cyclic_batches(id),
  sku VARCHAR(50) REFERENCES inventory(sku),
  expected_qty INTEGER NOT NULL,
  counted_qty INTEGER,
  status TEXT DEFAULT 'pendente',
  notes TEXT,
  counted_at TIMESTAMPTZ,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  entity_id TEXT,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  actor_id TEXT,
  warehouse_id VARCHAR(50),
  before_data JSONB,
  after_data JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversao de ambientes legados (colunas antigas em TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_access' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE users ALTER COLUMN last_access TYPE TIMESTAMPTZ USING safe_to_timestamptz(last_access);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'modules' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE users ALTER COLUMN modules TYPE JSONB USING safe_to_jsonb(modules, '[]'::JSONB);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'allowed_warehouses' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE users ALTER COLUMN allowed_warehouses TYPE JSONB USING safe_to_jsonb(allowed_warehouses, '[]'::JSONB);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'last_counted_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE inventory ALTER COLUMN last_counted_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(last_counted_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'last_maintenance' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN last_maintenance TYPE TIMESTAMPTZ USING safe_to_timestamptz(last_maintenance);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'request_date' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN request_date TYPE TIMESTAMPTZ USING safe_to_timestamptz(request_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'sent_to_vendor_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN sent_to_vendor_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(sent_to_vendor_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'received_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN received_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(received_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'quotes_added_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN quotes_added_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(quotes_added_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'approved_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN approved_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(approved_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'rejected_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN rejected_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(rejected_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'items' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN items TYPE JSONB USING safe_to_jsonb(items, '[]'::JSONB);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'quotes' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN quotes TYPE JSONB USING safe_to_jsonb(quotes, '[]'::JSONB);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'approval_history' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN approval_history TYPE JSONB USING safe_to_jsonb(approval_history, '[]'::JSONB);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cyclic_batches' AND column_name = 'scheduled_date' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE cyclic_batches ALTER COLUMN scheduled_date TYPE TIMESTAMPTZ USING safe_to_timestamptz(scheduled_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cyclic_batches' AND column_name = 'completed_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE cyclic_batches ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(completed_at);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cyclic_counts' AND column_name = 'counted_at' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE cyclic_counts ALTER COLUMN counted_at TYPE TIMESTAMPTZ USING safe_to_timestamptz(counted_at);
  END IF;
END
$$;

-- Defaults e NOT NULL para JSONB critico
ALTER TABLE users ALTER COLUMN modules SET DEFAULT '[]'::JSONB;
ALTER TABLE users ALTER COLUMN allowed_warehouses SET DEFAULT '[]'::JSONB;
UPDATE users SET modules = '[]'::JSONB WHERE modules IS NULL;
UPDATE users SET allowed_warehouses = '[]'::JSONB WHERE allowed_warehouses IS NULL;
ALTER TABLE users ALTER COLUMN modules SET NOT NULL;
ALTER TABLE users ALTER COLUMN allowed_warehouses SET NOT NULL;

ALTER TABLE purchase_orders ALTER COLUMN items SET DEFAULT '[]'::JSONB;
ALTER TABLE purchase_orders ALTER COLUMN quotes SET DEFAULT '[]'::JSONB;
ALTER TABLE purchase_orders ALTER COLUMN approval_history SET DEFAULT '[]'::JSONB;
UPDATE purchase_orders SET items = '[]'::JSONB WHERE items IS NULL;
UPDATE purchase_orders SET quotes = '[]'::JSONB WHERE quotes IS NULL;
UPDATE purchase_orders SET approval_history = '[]'::JSONB WHERE approval_history IS NULL;
ALTER TABLE purchase_orders ALTER COLUMN items SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN quotes SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN approval_history SET NOT NULL;

-- Compatibilidade do cadastro de fornecedores (modelo novo + legado)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS id_fornecedor BIGINT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS razao_social VARCHAR(150);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

UPDATE vendors
SET
  razao_social = COALESCE(NULLIF(BTRIM(razao_social), ''), NULLIF(BTRIM(name), ''), 'FORNECEDOR SEM NOME'),
  name = COALESCE(NULLIF(BTRIM(name), ''), NULLIF(BTRIM(razao_social), ''), 'FORNECEDOR SEM NOME'),
  nome_fantasia = NULLIF(BTRIM(nome_fantasia), ''),
  telefone = COALESCE(NULLIF(BTRIM(telefone), ''), NULLIF(BTRIM(contact), '')),
  cnpj = NULLIF(regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g'), '');

ALTER TABLE vendors ALTER COLUMN razao_social TYPE VARCHAR(150) USING LEFT(COALESCE(razao_social, ''), 150);
ALTER TABLE vendors ALTER COLUMN nome_fantasia TYPE VARCHAR(100) USING NULLIF(LEFT(COALESCE(nome_fantasia, ''), 100), '');
ALTER TABLE vendors ALTER COLUMN cnpj TYPE VARCHAR(14) USING NULLIF(LEFT(regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g'), 14), '');
ALTER TABLE vendors ALTER COLUMN telefone TYPE VARCHAR(20) USING NULLIF(LEFT(COALESCE(telefone, ''), 20), '');

ALTER TABLE vendors ALTER COLUMN razao_social SET NOT NULL;

ALTER TABLE inventory ALTER COLUMN name TYPE VARCHAR(255) USING LEFT(COALESCE(name, ''), 255);

-- Compatibilidade e integridade do cadastro central de frota
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS source_module TEXT;

WITH ranked AS (
  SELECT
    ctid,
    UPPER(BTRIM(COALESCE(placa, ''))) AS normalized_placa,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(BTRIM(COALESCE(placa, '')))
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM fleet_vehicles
)
DELETE FROM fleet_vehicles target
USING ranked
WHERE target.ctid = ranked.ctid
  AND (ranked.normalized_placa = '' OR ranked.rn > 1);

ALTER TABLE fleet_vehicles
  ALTER COLUMN placa TYPE VARCHAR(20)
  USING LEFT(UPPER(BTRIM(COALESCE(placa, ''))), 20);

ALTER TABLE fleet_vehicles
  ALTER COLUMN source_module TYPE TEXT
  USING CASE
    WHEN lower(BTRIM(COALESCE(source_module, ''))) IN ('oficina', 'workshop') THEN 'oficina'
    ELSE 'gestao_frota'
  END;

UPDATE fleet_vehicles
SET source_module = 'gestao_frota'
WHERE source_module IS NULL OR BTRIM(source_module) = '';

ALTER TABLE fleet_vehicles ALTER COLUMN source_module SET DEFAULT 'gestao_frota';
ALTER TABLE fleet_vehicles ALTER COLUMN source_module SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'fleet_vehicles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source_module%'
      AND pg_get_constraintdef(oid) ILIKE '%gestao_frota%'
      AND pg_get_constraintdef(oid) ILIKE '%oficina%'
  ) THEN
    ALTER TABLE fleet_vehicles
      ADD CONSTRAINT chk_fleet_vehicles_source_module
      CHECK (source_module IN ('gestao_frota', 'oficina'));
  END IF;
END $$;

UPDATE fleet_fines
SET placa = NULLIF(LEFT(UPPER(BTRIM(COALESCE(placa, ''))), 20), '');

UPDATE fleet_tachograph_checks
SET placa = NULLIF(LEFT(UPPER(BTRIM(COALESCE(placa, ''))), 20), '');

UPDATE fleet_fiscal_obligations
SET placa = NULLIF(LEFT(UPPER(BTRIM(COALESCE(placa, ''))), 20), '');

UPDATE fleet_fines child
SET placa = NULL
WHERE placa IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fleet_vehicles parent WHERE parent.placa = child.placa);

UPDATE fleet_tachograph_checks child
SET placa = NULL
WHERE placa IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fleet_vehicles parent WHERE parent.placa = child.placa);

UPDATE fleet_fiscal_obligations child
SET placa = NULL
WHERE placa IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fleet_vehicles parent WHERE parent.placa = child.placa);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'fleet_fines'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE 'FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)%'
  ) THEN
    ALTER TABLE fleet_fines
      ADD CONSTRAINT fk_fleet_fines_placa
      FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'fleet_tachograph_checks'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE 'FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)%'
  ) THEN
    ALTER TABLE fleet_tachograph_checks
      ADD CONSTRAINT fk_fleet_tachograph_checks_placa
      FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'fleet_fiscal_obligations'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE 'FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)%'
  ) THEN
    ALTER TABLE fleet_fiscal_obligations
      ADD CONSTRAINT fk_fleet_fiscal_obligations_placa
      FOREIGN KEY (placa) REFERENCES fleet_vehicles(placa)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS vendors_id_fornecedor_seq;
ALTER TABLE vendors ALTER COLUMN id_fornecedor SET DEFAULT nextval('vendors_id_fornecedor_seq');

SELECT setval(
  'vendors_id_fornecedor_seq',
  COALESCE((SELECT MAX(id_fornecedor) FROM vendors), 0),
  true
);

UPDATE vendors
SET id_fornecedor = nextval('vendors_id_fornecedor_seq')
WHERE id_fornecedor IS NULL;

SELECT setval(
  'vendors_id_fornecedor_seq',
  COALESCE((SELECT MAX(id_fornecedor) FROM vendors), 0),
  true
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_last_access ON users(last_access DESC);
CREATE INDEX IF NOT EXISTS idx_users_modules_gin ON users USING GIN (modules);
CREATE INDEX IF NOT EXISTS idx_users_allowed_warehouses_gin ON users USING GIN (allowed_warehouses);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_name_lower ON inventory ((lower(name)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_id_fornecedor ON vendors(id_fornecedor);
CREATE INDEX IF NOT EXISTS idx_vendors_cnpj_digits ON vendors ((regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g')));
CREATE INDEX IF NOT EXISTS idx_vendors_razao_social_lower ON vendors ((lower(COALESCE(razao_social, name, ''))));
CREATE INDEX IF NOT EXISTS idx_vendors_razao_social_norm ON vendors ((lower(regexp_replace(btrim(COALESCE(razao_social, name, '')), '\s+', ' ', 'g'))));
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_centro_custo ON fleet_vehicles(cod_centro_custo);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_source_module_placa ON fleet_vehicles(source_module, placa);
CREATE INDEX IF NOT EXISTS idx_fleet_people_centro_custo ON fleet_people(cod_centro_custo);
CREATE INDEX IF NOT EXISTS idx_fleet_fines_placa_data ON fleet_fines(placa, data DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_tacho_placa_venc ON fleet_tachograph_checks(placa, dta_vencimento DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_rntrc_status_venc ON fleet_rntrc_records(status, vencimento DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_fiscal_placa_venc ON fleet_fiscal_obligations(placa, vencimento DESC);

CREATE INDEX IF NOT EXISTS idx_movements_warehouse_timestamp ON movements(warehouse_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movements_sku_timestamp ON movements(sku, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_po_warehouse_request_date ON purchase_orders(warehouse_id, request_date DESC);
CREATE INDEX IF NOT EXISTS idx_po_status_priority ON purchase_orders(status, priority);
CREATE INDEX IF NOT EXISTS idx_po_items_gin ON purchase_orders USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_po_quotes_gin ON purchase_orders USING GIN (quotes);
CREATE INDEX IF NOT EXISTS idx_po_approval_history_gin ON purchase_orders USING GIN (approval_history);

CREATE INDEX IF NOT EXISTS idx_requests_warehouse_created ON material_requests(warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_priority ON material_requests(status, priority);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cyclic_batches_warehouse_created ON cyclic_batches(warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cyclic_counts_batch ON cyclic_counts(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created ON audit_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);

-- Auditoria em trigger para tabelas centrais de cadastro
CREATE OR REPLACE FUNCTION audit_capture_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  action_value TEXT;
  entity_id_value TEXT;
  actor_value TEXT;
  actor_id_value TEXT;
  module_value TEXT;
  warehouse_value TEXT;
  before_payload JSONB;
  after_payload JSONB;
  meta_payload JSONB;
  id_column TEXT;
BEGIN
  IF TG_TABLE_NAME = 'audit_logs' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  id_column := COALESCE(NULLIF(TG_ARGV[1], ''), 'id');
  module_value := COALESCE(NULLIF(current_setting('app.audit_module', true), ''), NULLIF(TG_ARGV[0], ''), TG_TABLE_NAME);
  actor_value := COALESCE(NULLIF(current_setting('app.audit_actor', true), ''), current_user);
  actor_id_value := NULLIF(current_setting('app.audit_actor_id', true), '');

  action_value := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
    ELSE lower(TG_OP)
  END;

  IF TG_OP = 'INSERT' THEN
    before_payload := NULL;
    after_payload := to_jsonb(NEW);
    entity_id_value := COALESCE(after_payload ->> id_column, '');
    warehouse_value := NULLIF(after_payload ->> 'warehouse_id', '');
  ELSIF TG_OP = 'UPDATE' THEN
    before_payload := to_jsonb(OLD);
    after_payload := to_jsonb(NEW);
    entity_id_value := COALESCE(after_payload ->> id_column, before_payload ->> id_column, '');
    warehouse_value := COALESCE(NULLIF(after_payload ->> 'warehouse_id', ''), NULLIF(before_payload ->> 'warehouse_id', ''));
  ELSE
    before_payload := to_jsonb(OLD);
    after_payload := NULL;
    entity_id_value := COALESCE(before_payload ->> id_column, '');
    warehouse_value := NULLIF(before_payload ->> 'warehouse_id', '');
  END IF;

  meta_payload := jsonb_build_object(
    'source', 'db_trigger',
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'txid', txid_current()
  );

  INSERT INTO audit_logs (
    entity,
    entity_id,
    module,
    action,
    actor,
    actor_id,
    warehouse_id,
    before_data,
    after_data,
    meta
  )
  VALUES (
    TG_TABLE_NAME,
    NULLIF(entity_id_value, ''),
    module_value,
    action_value,
    actor_value,
    actor_id_value,
    warehouse_value,
    before_payload,
    after_payload,
    meta_payload
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN others THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_vendors ON vendors;
CREATE TRIGGER trg_audit_vendors
AFTER INSERT OR UPDATE OR DELETE ON vendors
FOR EACH ROW
EXECUTE FUNCTION audit_capture_row_change('cadastro_geral', 'id');

DROP TRIGGER IF EXISTS trg_audit_inventory ON inventory;
CREATE TRIGGER trg_audit_inventory
AFTER INSERT OR UPDATE OR DELETE ON inventory
FOR EACH ROW
EXECUTE FUNCTION audit_capture_row_change('cadastro_geral', 'sku');

DROP TRIGGER IF EXISTS trg_audit_fleet_vehicles ON fleet_vehicles;
CREATE TRIGGER trg_audit_fleet_vehicles
AFTER INSERT OR UPDATE OR DELETE ON fleet_vehicles
FOR EACH ROW
EXECUTE FUNCTION audit_capture_row_change('gestao_frota', 'placa');

-- Seed principal
INSERT INTO warehouses (id, name, description, location, manager_name, is_active)
VALUES
  ('ARMZ28', 'Armazem Principal', 'Operacoes gerais de armazenamento e distribuicao', 'Manaus - AM', 'Administrador', true),
  ('ARMZ33', 'Conferencia de Carga em Tempo Real', 'Recebimento, conferencia e validacao de carga', 'Manaus - AM', 'Administrador', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, role, status, password, modules, allowed_warehouses)
VALUES
  (
    '1',
    'Administrador',
    'admin@nortetech.com',
    'admin',
    'Ativo',
    'pbkdf2$310000$c69ffaeaeaf017b7f94270ab3a61d55b$8d5b4fd072c9044b957eb432bdf26f03ff1b50a7859ca7b370b0f896356f356a',
    '["dashboard","recebimento","movimentacoes","estoque","expedicao","inventario_ciclico","compras","cadastro","relatorios","configuracoes"]'::jsonb,
    '["ARMZ28","ARMZ33"]'::jsonb
  ),
  (
    'ocv3aoy40',
    'MATIAS',
    'MATIAS@G.COM',
    'manager',
    'Ativo',
    'pbkdf2$310000$899714a53cee2b0abc6ff8370582e339$77f07c5a4c32bc93fbc7187efe33ffe0df35591f518ff54da92e7e1be1b997f6',
    '["dashboard","recebimento","movimentacoes","estoque","expedicao","compras","inventario_ciclico","cadastro","relatorios","configuracoes"]'::jsonb,
    '["ARMZ33"]'::jsonb
  )
ON CONFLICT (email) DO NOTHING;

INSERT INTO cost_centers (code, name, manager, budget, status)
VALUES
  ('CC-LOG', 'Logistica', 'Administrador', 500000.00, 'Ativo'),
  ('CC-OPS', 'Operacoes', 'MATIAS', 300000.00, 'Ativo'),
  ('CC-MAN', 'Manutencao', 'Administrador', 150000.00, 'Ativo')
ON CONFLICT (code) DO NOTHING;

-- ============================
-- Oficinas: ordens de servico
-- ============================
CREATE TABLE IF NOT EXISTS mechanics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  shift TEXT DEFAULT 'manha',
  status TEXT DEFAULT 'disponivel',
  current_work_orders JSONB NOT NULL DEFAULT '[]'::JSONB,
  orders_completed INTEGER DEFAULT 0,
  avg_hours_per_order DECIMAL(5, 2) DEFAULT 0,
  on_time_rate DECIMAL(5, 2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  vehicle_plate VARCHAR(20) REFERENCES vehicles(plate),
  vehicle_model TEXT,
  status TEXT DEFAULT 'aguardando',
  type TEXT DEFAULT 'corretiva',
  priority TEXT DEFAULT 'normal',
  mechanic_id TEXT REFERENCES mechanics(id),
  mechanic_name TEXT,
  supervisor_id TEXT,
  supervisor_name TEXT,
  workshop_unit TEXT,
  description TEXT NOT NULL,
  services JSONB NOT NULL DEFAULT '[]'::JSONB,
  parts JSONB NOT NULL DEFAULT '[]'::JSONB,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  estimated_hours INTEGER DEFAULT 0,
  actual_hours DECIMAL(5, 2),
  status_timers JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_seconds INTEGER DEFAULT 0,
  last_status_change TIMESTAMPTZ,
  is_timer_active BOOLEAN DEFAULT false,
  cost_center TEXT,
  cost_labor DECIMAL(10, 2) DEFAULT 0,
  cost_parts DECIMAL(10, 2) DEFAULT 0,
  cost_third_party DECIMAL(10, 2) DEFAULT 0,
  cost_total DECIMAL(10, 2) DEFAULT 0,
  created_by TEXT,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS supervisor_id TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_name TEXT,
  ADD COLUMN IF NOT EXISTS workshop_unit TEXT,
  ADD COLUMN IF NOT EXISTS status_timers JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS total_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_timer_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS work_order_logs (
  id TEXT PRIMARY KEY,
  work_order_id TEXT REFERENCES work_orders(id),
  previous_status TEXT,
  new_status TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_assignments (
  id TEXT PRIMARY KEY,
  work_order_id TEXT REFERENCES work_orders(id),
  service_id TEXT,
  previous_mechanic_id TEXT,
  previous_mechanic_name TEXT,
  new_mechanic_id TEXT,
  new_mechanic_name TEXT,
  service_category TEXT,
  service_description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  accumulated_seconds INTEGER DEFAULT 0,
  created_by TEXT,
  warehouse_id VARCHAR(50) REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status_timers_gin ON work_orders USING GIN (status_timers);
CREATE INDEX IF NOT EXISTS idx_work_order_logs_order ON work_order_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_logs_timestamp ON work_order_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_order ON work_order_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_mechanic ON work_order_assignments(new_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_timestamp ON work_order_assignments(timestamp DESC);

CREATE OR REPLACE FUNCTION work_order_apply_status_timer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  elapsed_seconds INTEGER;
  previous_status TEXT;
  previous_timers JSONB;
  previous_value INTEGER;
  services_payload JSONB;
  has_mechanic BOOLEAN;
BEGIN
  services_payload := CASE
    WHEN NEW.services IS NULL THEN '[]'::jsonb
    WHEN jsonb_typeof(NEW.services) = 'array' THEN NEW.services
    ELSE '[]'::jsonb
  END;

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(services_payload) AS item
    WHERE COALESCE(NULLIF(item->>'mechanicId', ''), NULLIF(item->>'mechanic_id', '')) IS NOT NULL
  ) INTO has_mechanic;

  IF TG_OP = 'INSERT' THEN
    NEW.status := COALESCE(NULLIF(NEW.status, ''), 'aguardando');
    IF NEW.status = 'aguardando' AND has_mechanic THEN
      NEW.status := 'em_execucao';
    END IF;
    NEW.status_timers := COALESCE(NEW.status_timers, '{}'::JSONB);
    NEW.last_status_change := COALESCE(NEW.last_status_change, NEW.opened_at, NOW());
    NEW.is_timer_active := (NEW.status = 'em_execucao');
    RETURN NEW;
  END IF;

  NEW.status := COALESCE(NULLIF(NEW.status, ''), OLD.status, 'aguardando');
  IF NEW.status = 'aguardando' AND has_mechanic THEN
    NEW.status := 'em_execucao';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    previous_status := OLD.status;
    elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - COALESCE(OLD.last_status_change, OLD.opened_at, NOW())))::INT;
    IF elapsed_seconds < 0 THEN
      elapsed_seconds := 0;
    END IF;

    previous_timers := COALESCE(OLD.status_timers, '{}'::JSONB);
    previous_value := COALESCE((previous_timers ->> previous_status)::INT, 0);
    NEW.status_timers := jsonb_set(previous_timers, ARRAY[previous_status], to_jsonb(previous_value + elapsed_seconds), true);
    NEW.total_seconds := COALESCE(OLD.total_seconds, 0) + elapsed_seconds;
    NEW.last_status_change := NOW();
    NEW.is_timer_active := (NEW.status = 'em_execucao');

    IF NEW.status = 'finalizada' THEN
      NEW.closed_at := COALESCE(NEW.closed_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_status_timer ON work_orders;
CREATE TRIGGER trg_work_orders_status_timer
BEFORE INSERT OR UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION work_order_apply_status_timer();

DROP TRIGGER IF EXISTS trg_work_orders_status_log ON work_orders;
DROP FUNCTION IF EXISTS work_order_log_status_change();

\echo 'Migration concluida com sucesso.'
\echo 'Teste rapido: SELECT count(*) FROM users;'
