import { PartRequest, ServiceCategory, ServiceItem, WorkOrder, WorkOrderStatus, WorkOrderType } from '../types';

const WORK_ORDER_STATUSES: WorkOrderStatus[] = ['aguardando', 'em_execucao', 'aguardando_pecas', 'finalizada', 'cancelada'];
const WORK_ORDER_TYPES: WorkOrderType[] = ['preventiva', 'corretiva', 'urgente', 'revisao', 'garantia', 'tav', 'terceiros'];
const WORK_ORDER_PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;
const SERVICE_CATEGORIES: ServiceCategory[] = ['motor', 'suspensao', 'freios', 'eletrica', 'lubrificacao', 'pneus', 'carroceria', 'outros'];
const PART_STATUSES: PartRequest['status'][] = ['pendente', 'separacao', 'entregue', 'nao_utilizada'];

const toStringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toNumberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toObject = <T extends object>(value: unknown, fallback: T): T => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
  } catch {
    // ignore
  }
  return fallback;
};

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const normalizeServiceItem = (raw: any, index: number): ServiceItem => {
  const id = toStringValue(raw?.id).trim() || `srv-${index}`;
  const category = SERVICE_CATEGORIES.includes(raw?.category) ? raw.category : 'outros';
  return {
    id,
    description: toStringValue(raw?.description).trim() || 'Servico',
    category,
    estimatedHours: Math.max(0, toNumberValue(raw?.estimatedHours ?? raw?.estimated_hours, 0)),
    actualHours: toNumberValue(raw?.actualHours ?? raw?.actual_hours, undefined),
    completed: Boolean(raw?.completed),
    mechanicId: toStringValue(raw?.mechanicId ?? raw?.mechanic_id, '') || undefined,
    mechanicName: toStringValue(raw?.mechanicName ?? raw?.mechanic_name, '') || undefined,
    startedAt: toStringValue(raw?.startedAt ?? raw?.started_at, '') || undefined,
    actualSeconds: toNumberValue(raw?.actualSeconds ?? raw?.actual_seconds, undefined),
    isTimerActive: raw?.is_timer_active ?? raw?.isTimerActive ?? undefined,
    completedAt: toStringValue(raw?.completedAt ?? raw?.completed_at, '') || undefined,
  };
};

const normalizePartRequest = (raw: any, index: number): PartRequest => {
  const id = toStringValue(raw?.id).trim() || `part-${index}`;
  const status = PART_STATUSES.includes(raw?.status) ? raw.status : 'pendente';
  return {
    id,
    sku: toStringValue(raw?.sku).trim() || `SKU-${index}`,
    name: toStringValue(raw?.name).trim() || 'Peca',
    qtyRequested: Math.max(0, toNumberValue(raw?.qtyRequested ?? raw?.qty_requested, 0)),
    qtyUsed: toNumberValue(raw?.qtyUsed ?? raw?.qty_used, undefined),
    status,
    unitCost: toNumberValue(raw?.unitCost ?? raw?.unit_cost, undefined),
  };
};

export const normalizeWorkOrders = (
  rows: unknown,
  defaults: { warehouseId: string; createdBy: string }
): WorkOrder[] => {
  if (!Array.isArray(rows)) {
    if (rows !== null && rows !== undefined) {
      console.warn('Payload de ordens de servico invalido', rows);
    }
    return [];
  }

  return rows.map((row: any, index) => {
    const status = WORK_ORDER_STATUSES.includes(row?.status) ? row.status : 'aguardando';
    const type = WORK_ORDER_TYPES.includes(row?.type) ? row.type : 'corretiva';
    const priority = WORK_ORDER_PRIORITIES.includes(row?.priority) ? row.priority : 'normal';
    const services = toArray<any>(row?.services).map(normalizeServiceItem);
    const parts = toArray<any>(row?.parts).map(normalizePartRequest);
    const vehiclePlate = toStringValue(row?.vehicle_plate ?? row?.vehiclePlate).trim() || 'N/A';
    const openedAt = toStringValue(row?.opened_at ?? row?.openedAt).trim() || new Date().toISOString();
    const costLabor = toNumberValue(row?.cost_labor ?? row?.cost?.labor, 0);
    const costParts = toNumberValue(row?.cost_parts ?? row?.cost?.parts, 0);
    const costThirdParty = toNumberValue(row?.cost_third_party ?? row?.cost?.thirdParty, 0);
    const costTotal = toNumberValue(row?.cost_total ?? row?.cost?.total, costLabor + costParts + costThirdParty);

    const workOrder: WorkOrder = {
      id: toStringValue(row?.id).trim() || `OS-${index + 1}`,
      vehiclePlate,
      vehicleModel: toStringValue(row?.vehicle_model ?? row?.vehicleModel, '') || undefined,
      status,
      type,
      priority,
      mechanicId: toStringValue(row?.mechanic_id ?? row?.mechanicId, '') || undefined,
      mechanicName: toStringValue(row?.mechanic_name ?? row?.mechanicName, '') || undefined,
      supervisorId: toStringValue(row?.supervisor_id ?? row?.supervisorId, '') || undefined,
      supervisorName: toStringValue(row?.supervisor_name ?? row?.supervisorName, '') || undefined,
      workshopUnit: toStringValue(row?.workshop_unit ?? row?.workshopUnit, '') || undefined,
      description: toStringValue(row?.description, '').trim() || 'Sem descricao',
      services,
      parts,
      openedAt,
      closedAt: toStringValue(row?.closed_at ?? row?.closedAt, '') || undefined,
      estimatedHours: Math.max(0, toNumberValue(row?.estimated_hours ?? row?.estimatedHours, 0)),
      actualHours: toNumberValue(row?.actual_hours ?? row?.actualHours, undefined),
      costCenter: toStringValue(row?.cost_center ?? row?.costCenter, '') || undefined,
      cost: {
        labor: costLabor,
        parts: costParts,
        thirdParty: costThirdParty,
        total: costTotal,
      },
      createdBy: toStringValue(row?.created_by ?? row?.createdBy, defaults.createdBy) || defaults.createdBy,
      warehouseId: toStringValue(row?.warehouse_id ?? row?.warehouseId, defaults.warehouseId) || defaults.warehouseId,
      totalSeconds: toNumberValue(row?.total_seconds ?? row?.totalSeconds, undefined),
      lastStatusChange: toStringValue(row?.last_status_change ?? row?.lastStatusChange, '') || undefined,
      isTimerActive: row?.is_timer_active ?? row?.isTimerActive ?? undefined,
      statusTimers: toObject(row?.status_timers ?? row?.statusTimers, {}),
      lockedBy: toStringValue(row?.locked_by ?? row?.lockedBy, '') || undefined,
      lockedAt: toStringValue(row?.locked_at ?? row?.lockedAt, '') || undefined,
    };

    if (workOrder.vehiclePlate === 'N/A' || workOrder.id.startsWith('OS-')) {
      console.warn('Work order com dados incompletos', { index, row });
    }

    return workOrder;
  });
};
