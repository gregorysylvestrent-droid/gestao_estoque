import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WarehouseSelector } from './components/WarehouseSelector';
import type { MaterialRequest } from './pages/Expedition';
type RequestStatus = 'aprovacao' | 'separacao' | 'entregue';
import { Module, InventoryItem, Activity, Movement, Vendor, Vehicle, PurchaseOrder, Quote, ApprovalRecord, User, AppNotification, CyclicBatch, CyclicCount, Warehouse, PurchaseOrderStatus, SystemModule, WorkOrder, Mechanic, WorkshopKPIs, WorkOrderStatus, WorkOrderAssignmentLog, ServiceItem } from './types';
import { LoginPage } from './components/LoginPage';
import { ModuleSelector } from './components/ModuleSelector';
import { api, AUTH_TOKEN_KEY } from './api-client';
import { formatDateTimePtBR, formatTimePtBR, parseDateLike } from './utils/dateTime';
import {
  normalizeAllowedWarehouses,
  normalizeFleetAccess,
  normalizeUserModules,
  normalizeUserRole,
  normalizeWorkshopAccess,
} from './utils/userAccess';
import { normalizeWorkOrders } from './utils/workshopSanitizers';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Receiving = lazy(() => import('./pages/Receiving').then((module) => ({ default: module.Receiving })));
const Movements = lazy(() => import('./pages/Movements').then((module) => ({ default: module.Movements })));
const Inventory = lazy(() => import('./pages/Inventory').then((module) => ({ default: module.Inventory })));
const Expedition = lazy(() => import('./pages/Expedition').then((module) => ({ default: module.Expedition })));
const CyclicInventory = lazy(() =>
  import('./pages/CyclicInventory').then((module) => ({ default: module.CyclicInventory }))
);
const PurchaseOrders = lazy(() =>
  import('./pages/PurchaseOrders').then((module) => ({ default: module.PurchaseOrders }))
);
const MasterData = lazy(() => import('./pages/MasterData').then((module) => ({ default: module.MasterData })));
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })));
const GeneralAudit = lazy(() =>
  import('./pages/GeneralAudit').then((module) => ({ default: module.GeneralAudit }))
);
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));

// Workshop Module Imports
const WorkshopDashboard = lazy(() => import('./pages/workshop').then((module) => ({ default: module.WorkshopDashboard })));
const WorkOrderKanban = lazy(() => import('./pages/workshop').then((module) => ({ default: module.WorkOrderKanban })));
const MechanicsManagement = lazy(() => import('./pages/workshop').then((module) => ({ default: module.MechanicsManagement })));
const WorkshopPanel = lazy(() => import('./pages/workshop').then((module) => ({ default: module.WorkshopPanel })));
const VehicleDetailView = lazy(() => import('./pages/workshop').then((module) => ({ default: module.VehicleDetailView })));
const PreventiveDashboard = lazy(() => import('./pages/workshop').then((module) => ({ default: module.PreventiveDashboard })));
const MaintenancePlanWizard = lazy(() => import('./pages/workshop').then((module) => ({ default: module.MaintenancePlanWizard })));
const ScheduleDetail = lazy(() => import('./pages/workshop').then((module) => ({ default: module.ScheduleDetail })));
const InspectionChecklistEditor = lazy(() => import('./pages/workshop').then((module) => ({ default: module.InspectionChecklistEditor })));
const MechanicProductivity = lazy(() => import('./pages/workshop').then((module) => ({ default: module.MechanicProductivity })));
const FleetModule = lazy(() => import('./modules/fleet/FleetModule'));

import type { VehicleDetail, PreventiveKPIs, ActivePlan, MaintenanceAlert, MaintenancePlan, PreventiveSchedule, InspectionTemplate } from './types';


// localStorage helpers for mock data persistence
const STORAGE_KEYS = {
  INVENTORY: 'logiwms_inventory',
  REQUESTS: 'logiwms_requests',
  VEHICLES: 'logiwms_vehicles',
  WAREHOUSES: 'logiwms_warehouses',
  USERS: 'logiwms_users',
  MOVEMENTS: 'logiwms_movements',
  PURCHASE_ORDERS: 'logiwms_purchase_orders',
  NOTIFICATIONS: 'logiwms_notifications',
  ACTIVITIES: 'logiwms_activities',
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

const loadFromStorage = (key: string, defaultValue: any = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return defaultValue;
  }
};

class WorkshopErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error, info: React.ErrorInfo) => void; resetKey: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">Falha ao carregar a oficina</p>
            <p className="text-xs text-slate-400">Voltando ao dashboard</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {

  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryCatalog, setInventoryCatalog] = useState<InventoryItem[]>([]);
  const [isInventoryCatalogLoaded, setIsInventoryCatalogLoaded] = useState(false);
  const [inventoryWarehouseScope, setInventoryWarehouseScope] = useState<string>('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [cyclicBatches, setCyclicBatches] = useState<CyclicBatch[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // System Module Selection (Warehouse vs Workshop)
  const [currentSystemModule, setCurrentSystemModule] = useState<SystemModule | null>(null);
  const [workshopActiveModule, setWorkshopActiveModule] = useState<'dashboard' | 'panel' | 'orders' | 'mechanics' | 'preventive' | 'vehicles' | 'plans' | 'schedules' | 'checklists' | 'productivity'>('dashboard');

  // Workshop States
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrderAssignments, setWorkOrderAssignments] = useState<WorkOrderAssignmentLog[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail[]>([]);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [preventiveSchedules, setPreventiveSchedules] = useState<PreventiveSchedule[]>([]);
  const [inspectionTemplates, setInspectionTemplates] = useState<InspectionTemplate[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDetail | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<PreventiveSchedule | null>(null);
  const [preventiveKPIs, setPreventiveKPIs] = useState<PreventiveKPIs>({
    complianceRate: 94.2,
    complianceChange: 2.4,
    vehiclesNearService: 12,
    urgentCount: 2,
    mtbs: 45,
    mtbsTrend: 'stable',
    savings: 12500,
    savingsTrend: 8.5
  });
  const [workshopKPIs, setWorkshopKPIs] = useState<WorkshopKPIs>({
    mttr: 14.5,
    mtbf: 45,
    availability: 94.2,
    totalCost: 45200,
    costPerKm: 2.35,
    preventivePercentage: 65,
    correctivePercentage: 30,
    urgentPercentage: 5,
    openOrders: 12,
    lateOrders: 3,
    avgRepairTime: 8.5,
    mechanicsAvailable: 2,
    mechanicsOccupied: 3
  });

  const workshopSupervisors = useMemo(
    () =>
      users
        .filter((u) => u.role === 'mechanic_supervisor' && u.status === 'Ativo')
        .map((u) => ({ id: u.id, name: u.name })),
    [users]
  );

  const defaultWorkshopSupervisor = useMemo(() => {
    if (user?.role === 'mechanic_supervisor' && user.status === 'Ativo') {
      return { id: user.id, name: user.name };
    }
    if (workshopSupervisors.length === 1) {
      return workshopSupervisors[0];
    }
    return null;
  }, [user, workshopSupervisors]);

  const normalizeVehiclePlate = (value: unknown) => {
    const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!raw) return '';
    if (/^[A-Z]{3}\d{4}$/.test(raw) || /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(raw)) {
      return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    }
    return raw;
  };

  const normalizePlateKey = (value: unknown) => normalizeVehiclePlate(value).toUpperCase();

  const normalizeVehicleStatus = (value: unknown): Vehicle['status'] => {
    const token = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (token.includes('inativ') || token.includes('bloque')) return 'Inativo';
    if (token.includes('manut') || token.includes('vencid') || token.includes('oficina')) return 'Manutencao';
    if (token.includes('viagem') || token.includes('transito')) return 'Em Viagem';
    return 'Disponivel';
  };

  const toVehiclePayload = (vehicle: Vehicle) => ({
    placa: normalizeVehiclePlate(vehicle.plate),
    desc_modelo: vehicle.model,
    classe: vehicle.type,
    source_module: 'gestao_frota',
    cod_centro_custo: vehicle.costCenter || null,
    dta_ult_manutencao: toIsoDateTime(vehicle.lastMaintenance),
    gestao_multa: 'NAO',
    km_atual: 0,
    km_anterior: 0,
    km_prox_manutencao: 0,
  });

  const mapVehicleRowToState = (row: any): Vehicle => ({
    plate: normalizeVehiclePlate(row?.placa ?? row?.plate),
    model: String(row?.desc_modelo ?? row?.model ?? ''),
    type: String(row?.classe ?? row?.type ?? 'PROPRIO'),
    status: normalizeVehicleStatus(row?.status ?? row?.status_operacional ?? 'Disponivel'),
    lastMaintenance: toPtBrDateTime(row?.dta_ult_manutencao ?? row?.last_maintenance, ''),
    costCenter: String(
      row?.desc_centro_custo ?? row?.cod_centro_custo ?? row?.cost_center ?? row?.centro_custo ?? ''
    ),
  });

  const normalizeVehicleInput = (vehicle: Partial<Vehicle>): Vehicle | null => {
    const plate = normalizeVehiclePlate(vehicle.plate);
    const model = String(vehicle.model || '').trim();

    if (!plate || !model) return null;

    return {
      plate,
      model,
      type: String(vehicle.type || 'PROPRIO').trim() || 'PROPRIO',
      status: normalizeVehicleStatus(vehicle.status),
      costCenter: String(vehicle.costCenter || '').trim(),
      lastMaintenance: toIsoDateTime(vehicle.lastMaintenance) || nowIso(),
    };
  };

  // Expanded Workshop Handlers
  const handleViewVehicle = (plate: string) => {
    const vehicle = vehicleDetails.find(v => v.plate === plate);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setWorkshopActiveModule('vehicles');
    }
  };

  const handleCreateMaintenancePlan = async (plan: Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `PLAN-${Date.now()}`;
    const { error } = await api.from('maintenance_plans_expanded').insert({
      id,
      name: plan.name,
      vehicle_type: plan.vehicleType,
      vehicle_model: plan.vehicleModel,
      operation_type: plan.operationType,
      triggers: plan.triggers,
      parts: plan.parts,
      checklist_sections: plan.checklistSections,
      estimated_hours: plan.estimatedHours,
      estimated_cost: plan.estimatedCost,
      services: plan.services,
      is_active: true,
      created_by: user?.name || 'Sistema'
    });

    if (!error) {
      showNotification('Plano de manutenção criado com sucesso!', 'success');
      setWorkshopActiveModule('preventive');
    } else {
      showNotification('Erro ao criar plano', 'error');
    }
  };

  const handleSaveInspectionTemplate = async (template: Omit<InspectionTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `TMPL-${Date.now()}`;
    const { error } = await api.from('inspection_templates').insert({
      id,
      name: template.name,
      version: template.version,
      vehicle_model: template.vehicleModel,
      description: template.description,
      sections: template.sections,
      is_active: template.isActive,
      created_by: user?.name || 'Sistema'
    });

    if (!error) {
      showNotification('Template salvo com sucesso!', 'success');
      setWorkshopActiveModule('checklists');
    } else {
      showNotification('Erro ao salvar template', 'error');
    }
  };

  // Vehicle Management Handlers
  const handleAddVehicle = async (vehicleData: Vehicle) => {
    const normalizedVehicle = normalizeVehicleInput(vehicleData);
    if (!normalizedVehicle) {
      showNotification('Preencha placa e modelo para cadastrar o veículo.', 'error');
      return;
    }

    const { data, error } = await api
      .from('fleet_vehicles')
      .eq('source_module', 'gestao_frota')
      .insert(toVehiclePayload(normalizedVehicle));

    if (!error) {
      const insertedRow = Array.isArray(data) ? data[0] : data;
      const persisted = insertedRow ? mapVehicleRowToState(insertedRow) : normalizedVehicle;
      setVehicles((prev) => [persisted, ...prev.filter((item) => item.plate !== persisted.plate)]);
      showNotification('Veículo cadastrado com sucesso!', 'success');
    } else {
      showNotification(error || 'Erro ao cadastrar veículo', 'error');
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    const normalizedVehicle = normalizeVehicleInput(updatedVehicle);
    if (!normalizedVehicle) {
      showNotification('Dados de veículo inválidos para atualização.', 'error');
      return;
    }

    const vehiclePayload = toVehiclePayload(normalizedVehicle);
    const { placa: _ignoredPlaca, ...updatePayload } = vehiclePayload;
    const { data, error } = await api
      .from('fleet_vehicles')
      .eq('source_module', 'gestao_frota')
      .eq('placa', normalizedVehicle.plate)
      .update(updatePayload);

    if (!error) {
      const persisted = Array.isArray(data) && data.length > 0 ? mapVehicleRowToState(data[0]) : normalizedVehicle;
      setVehicles((prev) => prev.map((item) => (item.plate === normalizedVehicle.plate ? persisted : item)));
      showNotification('Veículo atualizado com sucesso!', 'success');
    } else {
      showNotification(error || 'Erro ao atualizar veículo', 'error');
    }
  };

  const handleDeleteVehicle = async (plate: string) => {
    const { error } = await api
      .from('fleet_vehicles')
      .eq('source_module', 'gestao_frota')
      .eq('placa', plate)
      .delete();
    if (!error) {
      setVehicles(prev => prev.filter(v => v.plate !== plate));
      showNotification('Veículo removido com sucesso!', 'success');
    } else {
      showNotification('Erro ao remover veículo', 'error');
    }
  };

  const handleImportVehicles = async (incomingVehicles: Vehicle[]) => {
    if (!Array.isArray(incomingVehicles) || incomingVehicles.length === 0) {
      showNotification('Nenhum veículo válido para importar.', 'warning');
      return;
    }

    const dedupedByPlate = new Map<string, Vehicle>();
    let ignored = 0;

    incomingVehicles.forEach((vehicle) => {
      const normalized = normalizeVehicleInput(vehicle);
      if (!normalized) {
        ignored += 1;
        return;
      }
      dedupedByPlate.set(normalized.plate, normalized);
    });

    const normalizedVehicles = Array.from(dedupedByPlate.values());
    if (normalizedVehicles.length === 0) {
      showNotification('Nenhum registro aproveitavel na planilha.', 'error');
      return;
    }

    const { data: dbVehicles, error: listError } = await api
      .from('fleet_vehicles')
      .select('placa')
      .eq('source_module', 'gestao_frota');
    if (listError) {
      showNotification('Falha ao carregar frota atual para importar.', 'error');
      return;
    }

    const existingPlates = new Set(
      (dbVehicles || [])
        .map((row: any) => normalizeVehiclePlate(row?.placa))
        .filter(Boolean)
    );

    const toInsert: Vehicle[] = [];
    const toUpdate: Vehicle[] = [];

    normalizedVehicles.forEach((vehicle) => {
      if (existingPlates.has(vehicle.plate)) {
        toUpdate.push(vehicle);
      } else {
        toInsert.push(vehicle);
      }
    });

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    if (toInsert.length > 0) {
      const { data, error } = await api
        .from('fleet_vehicles')
        .eq('source_module', 'gestao_frota')
        .insert(toInsert.map((vehicle) => toVehiclePayload(vehicle)));

      if (error) {
        failed += toInsert.length;
      } else {
        inserted = Array.isArray(data) ? data.length : toInsert.length;
      }
    }

    for (const vehicle of toUpdate) {
      const vehiclePayload = toVehiclePayload(vehicle);
      const { placa: _ignoredPlaca, ...updatePayload } = vehiclePayload;
      const { error } = await api
        .from('fleet_vehicles')
        .eq('source_module', 'gestao_frota')
        .eq('placa', vehicle.plate)
        .update(updatePayload);

      if (error) {
        failed += 1;
      } else {
        updated += 1;
      }
    }

    const { data: refreshedVehicles } = await api
      .from('fleet_vehicles')
      .select('*')
      .eq('source_module', 'gestao_frota');
    if (refreshedVehicles) {
      setVehicles(refreshedVehicles.map((row: any) => mapVehicleRowToState(row)));
    }

    const summary = `Importação concluída: ${inserted} novos, ${updated} atualizados${ignored > 0 ? `, ${ignored} ignorados` : ''}${failed > 0 ? `, ${failed} falharam` : ''}.`;
    showNotification(summary, failed > 0 ? (inserted > 0 || updated > 0 ? 'warning' : 'error') : 'success');
  };

  // Integration: Request Parts from Workshop to Warehouse
  const handleRequestPartsFromWorkshop = async (vehiclePlate: string, items: { sku: string; name: string; qty: number }[]) => {
    const dept = 'OFICINA';
    const priority = 'normal';

    for (const item of items) {
      const requestId = `SA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const { error } = await api.from('material_requests').insert({
        id: requestId,
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        plate: vehiclePlate,
        dept: dept,
        priority: priority,
        status: 'aprovacao',
        cost_center: `OFICINA-${vehiclePlate}`,
        warehouse_id: activeWarehouse,
        created_by: user?.name || 'Sistema'
      });

      if (!error) {
        const newRequest: MaterialRequest = {
          id: requestId,
          sku: item.sku,
          name: item.name,
          qty: item.qty,
          plate: vehiclePlate,
          dept: dept,
          priority: priority,
          status: 'aprovacao',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          costCenter: `OFICINA-${vehiclePlate}`,
          warehouseId: activeWarehouse
        };
        setMaterialRequests(prev => [newRequest, ...prev]);
      }
    }

    showNotification(`Solicitação SA criada para ${items.length} item(s) do veículo ${vehiclePlate}!`, 'success');
    addActivity('expedicao', 'Solicitação SA da Oficina', `Veículo ${vehiclePlate} solicitou ${items.length} peça(s)`);
  };

  // Multi-Warehouse States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeWarehouse, setActiveWarehouse] = useState<string>('ARMZ28');
  const [userWarehouses, setUserWarehouses] = useState<string[]>(['ARMZ28', 'ARMZ33']); // Default for admin
  const [isLoading, setIsLoading] = useState(true);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [isPurchaseOrdersFullyLoaded, setIsPurchaseOrdersFullyLoaded] = useState(false);
  const [isMovementsFullyLoaded, setIsMovementsFullyLoaded] = useState(false);
  const [isMaterialRequestsFullyLoaded, setIsMaterialRequestsFullyLoaded] = useState(false);
  const [isInventoryFullyLoaded, setIsInventoryFullyLoaded] = useState(false);
  const [isDeferredModuleLoading, setIsDeferredModuleLoading] = useState(false);
  const [movementsPage, setMovementsPage] = useState(1);
  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(1);
  const [materialRequestsPage, setMaterialRequestsPage] = useState(1);
  const [masterDataItemsPage, setMasterDataItemsPage] = useState(1);
  const [vendorsPage, setVendorsPage] = useState(1);
  const [pagedMovements, setPagedMovements] = useState<Movement[]>([]);
  const [pagedPurchaseOrders, setPagedPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [pagedMaterialRequests, setPagedMaterialRequests] = useState<MaterialRequest[]>([]);
  const [pagedMasterDataItems, setPagedMasterDataItems] = useState<InventoryItem[]>([]);
  const [pagedVendors, setPagedVendors] = useState<Vendor[]>([]);
  const [hasMoreMovements, setHasMoreMovements] = useState(false);
  const [hasMorePurchaseOrders, setHasMorePurchaseOrders] = useState(false);
  const [hasMoreMaterialRequests, setHasMoreMaterialRequests] = useState(false);
  const [hasMoreMasterDataItems, setHasMoreMasterDataItems] = useState(false);
  const [hasMoreVendors, setHasMoreVendors] = useState(false);
  const [isMovementsPageLoading, setIsMovementsPageLoading] = useState(false);
  const [isPurchaseOrdersPageLoading, setIsPurchaseOrdersPageLoading] = useState(false);
  const [isMaterialRequestsPageLoading, setIsMaterialRequestsPageLoading] = useState(false);
  const [isMasterDataItemsPageLoading, setIsMasterDataItemsPageLoading] = useState(false);
  const [masterDataItemsTotal, setMasterDataItemsTotal] = useState(0);
  const [isVendorsPageLoading, setIsVendorsPageLoading] = useState(false);
  const [vendorsTotal, setVendorsTotal] = useState(0);

  const fullLoadInFlight = useRef<Set<string>>(new Set());
  const loadBootstrapDataRef = useRef<((warehouseId?: string) => Promise<void>) | null>(null);
  const pageFetchSequence = useRef({
    movements: 0,
    purchaseOrders: 0,
    materialRequests: 0,
    masterDataItems: 0,
    vendors: 0
  });

  const INITIAL_INVENTORY_LIMIT = 100; // Reduzido de 500 para melhorar desempenho
  const INITIAL_PURCHASE_ORDERS_LIMIT = 100; // Reduzido de 300
  const INITIAL_MOVEMENTS_LIMIT = 100; // Reduzido de 300
  const INITIAL_MATERIAL_REQUESTS_LIMIT = 100; // Reduzido de 300
  const MOVEMENTS_PAGE_SIZE = 50; // Reduzido de 120
  const PURCHASE_ORDERS_PAGE_SIZE = 30; // Reduzido de 60
  const MATERIAL_REQUESTS_PAGE_SIZE = 30; // Reduzido de 60
  const MASTER_DATA_ITEMS_PAGE_SIZE = 50;
  const VENDORS_PAGE_SIZE = 50;
  const PURCHASE_ORDER_RECEIVED_RETENTION_MS = 24 * 60 * 60 * 1000;
  const PURCHASE_ORDER_EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

  const isPurchaseOrderExpiredAfterReceipt = (order: PurchaseOrder, nowMs = Date.now()) => {
    if (!order || order.status !== 'recebido') return false;
    const receivedAt = parseDateLike(order.receivedAt);
    if (!receivedAt) return false;
    return nowMs - receivedAt.getTime() >= PURCHASE_ORDER_RECEIVED_RETENTION_MS;
  };

  const pruneExpiredDeliveredPurchaseOrders = (orders: PurchaseOrder[], nowMs = Date.now()) =>
    orders.filter((order) => !isPurchaseOrderExpiredAfterReceipt(order, nowMs));

  const toPtBrDateTime = (value: unknown, fallback = ''): string => {
    const parsed = formatDateTimePtBR(value, fallback);
    if (parsed) return parsed;
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return fallback;
  };

  const toIsoDateTime = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

    const text = String(value).trim();
    if (!text) return null;

    const parsed = parseDateLike(text);
    if (!parsed) return null;
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const resolveApiErrorMessage = (error: unknown, fallback = 'falha desconhecida'): string => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'object' && error !== null) {
      const candidate = (error as { message?: unknown }).message;
      if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
    }
    return fallback;
  };

  const nowIso = () => new Date().toISOString();

  const WORKSHOP_STATUS_KEYS: WorkOrderStatus[] = [
    'aguardando',
    'em_execucao',
    'aguardando_pecas',
    'finalizada',
    'cancelada',
  ];

  const buildStatusTimers = (timers?: WorkOrder['statusTimers']) => {
    const base: Record<WorkOrderStatus, number> = {
      aguardando: 0,
      em_execucao: 0,
      aguardando_pecas: 0,
      finalizada: 0,
      cancelada: 0,
    };
    if (!timers) return base;
    Object.entries(timers).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(base, key) && Number.isFinite(Number(value))) {
        base[key as WorkOrderStatus] = Number(value);
      }
    });
    return base;
  };

  const computeElapsedSeconds = (startIso?: string, endIsoValue?: string) => {
    if (!startIso) return 0;
    const start = new Date(startIso).getTime();
    const end = new Date(endIsoValue || nowIso()).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    return Math.floor((end - start) / 1000);
  };

  const computeServiceActualSeconds = (service: ServiceItem, endIsoValue?: string) => {
    const baseSeconds = service.actualSeconds || 0;
    if (!service.isTimerActive || !service.startedAt) return baseSeconds;
    return baseSeconds + computeElapsedSeconds(service.startedAt, endIsoValue);
  };

  const computeOrderActualHours = (services: ServiceItem[] = [], endIsoValue?: string) => {
    const totalSeconds = services.reduce((acc, service) => acc + computeServiceActualSeconds(service, endIsoValue), 0);
    return totalSeconds / 3600;
  };

  const applyServiceTimersOnStatusChange = (
    services: ServiceItem[] = [],
    status: WorkOrderStatus,
    timestamp: string
  ) => {
    return services.map((service) => {
      const shouldRun = status === 'em_execucao' && Boolean(service.mechanicId);
      const accumulatedSeconds = computeServiceActualSeconds(service, timestamp);
      return {
        ...service,
        actualSeconds: accumulatedSeconds,
        startedAt: shouldRun ? timestamp : service.startedAt,
        isTimerActive: shouldRun,
      };
    });
  };

  const resolveWorkshopWsUrl = () => {
    if (typeof window === 'undefined') return null;
    const baseUrl = api.getBaseUrl();
    const absoluteHttp = baseUrl.startsWith('http')
      ? baseUrl
      : new URL(baseUrl, window.location.origin).toString();
    const wsBase = absoluteHttp.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/ws`;
  };

  const normalizeUserSession = (rawUser: any): User => {
    const normalizedRole = normalizeUserRole(rawUser?.role);
    const normalizedModules = normalizeUserModules(rawUser?.modules, normalizedRole);
    const normalizedWarehouses = normalizeAllowedWarehouses(
      rawUser?.allowedWarehouses ?? rawUser?.allowed_warehouses,
      ['ARMZ28']
    );

    return {
      id: String(rawUser?.id || `usr-${Date.now()}`),
      name: String(rawUser?.name || 'Usuário'),
      email: String(rawUser?.email || ''),
      role: normalizedRole,
      status: String(rawUser?.status || '').toLowerCase() === 'inativo' ? 'Inativo' : 'Ativo',
      lastAccess: toPtBrDateTime(rawUser?.lastAccess ?? rawUser?.last_access, formatDateTimePtBR(new Date(), '')),
      avatar:
        String(rawUser?.avatar || '').trim() ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(String(rawUser?.name || 'Usuario'))}&background=0D8ABC&color=fff`,
      modules: normalizedModules,
      allowedWarehouses: normalizedWarehouses,
      hasWorkshopAccess: normalizeWorkshopAccess(
        rawUser?.modules,
        rawUser?.hasWorkshopAccess ?? rawUser?.has_workshop_access,
        normalizedRole
      ),
      hasFleetAccess: normalizeFleetAccess(
        rawUser?.modules,
        rawUser?.hasFleetAccess ?? rawUser?.has_fleet_access,
        normalizedRole
      ),
    };
  };

  const buildUserModulesPayload = (
    modules: Module[] | undefined,
    hasWorkshopAccess: boolean | undefined,
    hasFleetAccess: boolean | undefined,
    role: User['role']
  ): string[] => {
    const cleaned = (Array.isArray(modules) ? modules.map((moduleId) => String(moduleId)) : [])
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => {
        const normalized = token
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        return (
          normalized !== 'workshop' &&
          normalized !== 'oficina' &&
          normalized !== 'fleet' &&
          normalized !== 'frota' &&
          normalized !== 'gestao_frota' &&
          normalized !== 'gestao_de_frota'
        );
      });

    if (role === 'admin' || hasWorkshopAccess) {
      cleaned.push('workshop');
    }

    if (role === 'admin' || hasFleetAccess) {
      cleaned.push('fleet');
    }

    return [...new Set(cleaned)];
  };

  const generateUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Fallback RFC4122-ish UUID for environments without crypto.randomUUID.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16);
      const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  };

  const WORKSHOP_OFFLINE_QUEUE_KEY = 'workshop_offline_queue';

  type WorkshopOfflineOp = {
    id: string;
    table: string;
    method: 'POST' | 'PATCH' | 'DELETE';
    query?: Record<string, string>;
    payload?: any;
    createdAt: string;
  };

  const readWorkshopQueue = (): WorkshopOfflineOp[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(WORKSHOP_OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeWorkshopQueue = (entries: WorkshopOfflineOp[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORKSHOP_OFFLINE_QUEUE_KEY, JSON.stringify(entries));
  };

  const enqueueWorkshopOp = (entry: WorkshopOfflineOp) => {
    const current = readWorkshopQueue();
    writeWorkshopQueue([...current, entry]);
  };

  const flushWorkshopQueue = async () => {
    if (typeof window === 'undefined') return;
    const pending = readWorkshopQueue();
    if (pending.length === 0) return;

    const remaining: WorkshopOfflineOp[] = [];

    for (const entry of pending) {
      try {
        const baseUrl = api.getBaseUrl();
        const url = new URL(`${baseUrl}/${entry.table}`, window.location.origin);
        if (entry.query) {
          Object.entries(entry.query).forEach(([key, value]) => url.searchParams.append(key, value));
        }

        const headers: Record<string, string> = { Accept: 'application/json' };
        const token = api.getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        if (entry.payload) headers['Content-Type'] = 'application/json';

        const response = await fetch(url.toString(), {
          method: entry.method,
          headers,
          body: entry.payload ? JSON.stringify(entry.payload) : undefined,
        });

        if (!response.ok) {
          remaining.push(entry);
        }
      } catch {
        remaining.push(entry);
      }
    }

    writeWorkshopQueue(remaining);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      flushWorkshopQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (currentSystemModule !== 'workshop') return;
    const wsUrl = resolveWorkshopWsUrl();
    if (!wsUrl) return;

    const token = api.getAuthToken();
    const finalUrl = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
    const socket = new WebSocket(finalUrl);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload?.type !== 'workshop_update') return;

        const items = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];

        if (payload.table === 'work_orders') {
          if (payload.action === 'delete') {
            const ids = new Set(items.map((item: any) => String(item?.id || '')));
            setWorkOrders(prev => prev.filter(order => !ids.has(order.id)));
            return;
          }

          const normalized = normalizeWorkOrders(items, {
            warehouseId: activeWarehouse,
            createdBy: user?.name || 'Sistema',
          });

          setWorkOrders(prev => {
            const map = new Map(prev.map(order => [order.id, order]));
            normalized.forEach((order) => {
              const current = map.get(order.id);
              map.set(order.id, current ? { ...current, ...order } : order);
            });
            return Array.from(map.values());
          });
        }

        if (payload.table === 'work_order_assignments') {
          const mapped = items.map((row: any) => mapWorkOrderAssignmentRow(row));
          setWorkOrderAssignments(prev => [...mapped, ...prev]);
        }
      } catch (error) {
        console.warn('Falha ao processar evento WebSocket da oficina', error);
      }
    };

    socket.onerror = (err) => {
      console.warn('WebSocket oficina desconectado', err);
    };

    return () => {
      socket.close();
    };
  }, [currentSystemModule, activeWarehouse, user]);

  const createPOStatusHistoryEntry = (
    status: PurchaseOrderStatus,
    description: string,
    actor = user?.name || 'Sistema'
  ): ApprovalRecord => ({
    id: generateUuid(),
    action: 'status_changed',
    by: actor,
    at: nowIso(),
    status,
    description
  });

  const appendPOHistory = (
    history: ApprovalRecord[] | undefined,
    entry: ApprovalRecord
  ): ApprovalRecord[] => [...(history || []), entry];

  const mapPurchaseOrders = (rows: any[]): PurchaseOrder[] => rows.map((po: any) => ({
    id: po.id,
    vendor: po.vendor,
    requestDate: toPtBrDateTime(po.request_date),
    status: po.status,
    priority: po.priority,
    total: po.total,
    requester: po.requester,
    items: po.items,
    quotes: po.quotes,
    selectedQuoteId: po.selected_quote_id,
    sentToVendorAt: toPtBrDateTime(po.sent_to_vendor_at),
    receivedAt: toPtBrDateTime(po.received_at),
    quotesAddedAt: toPtBrDateTime(po.quotes_added_at),
    approvedAt: toPtBrDateTime(po.approved_at),
    rejectedAt: toPtBrDateTime(po.rejected_at),
    vendorOrderNumber: po.vendor_order_number,
    plate: String(po.plate ?? po.placa ?? '').trim(),
    costCenter: String(po.cost_center ?? po.costCenter ?? po.centro_custo ?? '').trim(),
    approvalHistory: Array.isArray(po.approval_history)
      ? po.approval_history.map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        by: entry.by || 'Sistema',
        at: toPtBrDateTime(entry.at),
        reason: entry.reason,
        description: entry.description,
        status: entry.status
      }))
      : [],
    warehouseId: po.warehouse_id || 'ARMZ28'
  }));

  const mapWorkOrderAssignmentRow = (row: any): WorkOrderAssignmentLog => ({
    id: String(row?.id || generateUuid()),
    workOrderId: String(row?.work_order_id ?? row?.workOrderId ?? ''),
    serviceId: String(row?.service_id ?? row?.serviceId ?? ''),
    previousMechanicId: row?.previous_mechanic_id ?? row?.previousMechanicId ?? undefined,
    previousMechanicName: row?.previous_mechanic_name ?? row?.previousMechanicName ?? undefined,
    newMechanicId: row?.new_mechanic_id ?? row?.newMechanicId ?? undefined,
    newMechanicName: row?.new_mechanic_name ?? row?.newMechanicName ?? undefined,
    serviceCategory: row?.service_category ?? row?.serviceCategory ?? undefined,
    serviceDescription: row?.service_description ?? row?.serviceDescription ?? undefined,
    timestamp: String(row?.timestamp ?? row?.created_at ?? nowIso()),
    accumulatedSeconds: Number(row?.accumulated_seconds ?? row?.accumulatedSeconds ?? 0),
    createdBy: row?.created_by ?? row?.createdBy ?? undefined,
    warehouseId: row?.warehouse_id ?? row?.warehouseId ?? undefined,
  });

  const toFiniteNumber = (...values: unknown[]): number => {
    for (const rawValue of values) {
      const parsed = Number(rawValue);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };

  const normalizeMovementType = (value: unknown): Movement['type'] => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'entrada' || normalized === 'saida' || normalized === 'ajuste') {
      return normalized;
    }
    if (normalized.includes('entrad')) return 'entrada';
    if (normalized.includes('saida') || normalized.includes('saída')) return 'saida';
    return 'ajuste';
  };

  const mapMovements = (rows: any[]): Movement[] => rows.map((m: any) => ({
    id: m.id,
    sku: m.sku,
    productName: m.product_name || m.name || 'Produto Indefinido',
    type: normalizeMovementType(m.type),
    quantity: toFiniteNumber(
      m.quantity,
      m.qty,
      m.quantidade,
      m.quantidade_movimentada,
      m.movement_qty,
      m.movement_quantity
    ),
    timestamp: toPtBrDateTime(m.timestamp, formatDateTimePtBR(new Date(), '')),
    user: m.user || 'Sistema',
    location: m.location || 'N/A',
    reason: m.reason || 'Sem motivo registrado',
    orderId: m.order_id,
    warehouseId: m.warehouse_id || 'ARMZ28'
  }));

  const mapMaterialRequests = (rows: any[]): MaterialRequest[] => rows.map((r: any) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    qty: r.qty,
    plate: r.plate,
    dept: r.dept,
    priority: r.priority,
    status: r.status,
    timestamp: formatTimePtBR(r.created_at, '--:--'),
    costCenter: r.cost_center,
    warehouseId: r.warehouse_id
  }));

  const mapInventoryRows = (rows: any[]): InventoryItem[] => rows.map((item: any) => ({
    sku: item.sku,
    name: item.name,
    location: item.location,
    batch: item.batch,
    expiry: item.expiry,
    quantity: item.quantity,
    status: item.status,
    imageUrl: item.image_url,
    category: item.category,
    abcCategory: item.abc_category,
    lastCountedAt: item.last_counted_at,
    unit: item.unit || 'UN',
    minQty: item.min_qty,
    maxQty: item.max_qty,
    leadTime: item.lead_time || 7,
    safetyStock: item.safety_stock || 5,
    warehouseId: item.warehouse_id || 'ARMZ28'
  }));

  const isSeedTestInventoryItem = (item: Partial<InventoryItem>) => {
    const sku = String(item.sku || '').trim().toUpperCase();
    const name = String(item.name || '').trim().toLowerCase();
    return /^SKU-\d{6}$/.test(sku) && name.startsWith('item teste');
  };

  const inferMovementSignedQuantity = (movement: any) => {
    const qty = toFiniteNumber(movement?.quantity, movement?.qty, movement?.quantidade);
    const type = normalizeMovementType(movement?.type);

    if (type === 'entrada') return Math.abs(qty);
    if (type === 'saida') return -Math.abs(qty);

    const reason = String(movement?.reason || '').toLowerCase();
    if (reason.includes('-')) return -Math.abs(qty);
    return Math.abs(qty);
  };

  const mergeInventoryWithMovementBalances = (items: InventoryItem[], movementRows: any[], warehouseId: string): InventoryItem[] => {
    const safeItems = Array.isArray(items) ? items : [];
    const filteredItems = safeItems.filter((item) => !isSeedTestInventoryItem(item));

    if (!Array.isArray(movementRows) || movementRows.length === 0) return filteredItems;
    const balancesBySku = new Map<string, number>();
    const movementMetaBySku = new Map<string, { name: string; location: string }>();

    movementRows.forEach((movement) => {
      const sku = String(movement?.sku || '').trim().toUpperCase();
      if (!sku) return;
      const current = balancesBySku.get(sku) || 0;
      balancesBySku.set(sku, current + inferMovementSignedQuantity(movement));

      if (!movementMetaBySku.has(sku)) {
        movementMetaBySku.set(sku, {
          name: String(movement?.product_name || movement?.name || `Item ${sku}`).trim() || `Item ${sku}`,
          location: String(movement?.location || 'DOCA-01').trim() || 'DOCA-01',
        });
      }
    });

    const existingBySku = new Map(filteredItems.map((item) => [String(item.sku || '').trim().toUpperCase(), item]));

    const mergedItems = filteredItems.map((item) => {
      const sku = String(item.sku || '').trim().toUpperCase();
      if (!sku || !balancesBySku.has(sku)) return item;
      return { ...item, quantity: balancesBySku.get(sku) || 0 };
    });

    balancesBySku.forEach((balance, sku) => {
      if (existingBySku.has(sku)) return;
      const meta = movementMetaBySku.get(sku);
      mergedItems.push({
        sku,
        name: meta?.name || `Item ${sku}`,
        location: meta?.location || 'DOCA-01',
        batch: '',
        expiry: '',
        quantity: balance,
        status: 'disponivel',
        imageUrl: 'https://picsum.photos/seed/placeholder/120/120',
        category: 'MOVIMENTO',
        unit: 'UN',
        minQty: 0,
        maxQty: 1000,
        leadTime: 7,
        safetyStock: 5,
        warehouseId,
      });
    });

    return mergedItems;
  };

  const normalizeDigits = (value: unknown) => String(value ?? '').replace(/\D+/g, '');
  const normalizeCnpj = (value: unknown) => normalizeDigits(value).slice(0, 14);
  const normalizePhone = (value: unknown) => {
    const digits = normalizeDigits(value);
    if (!digits) return '';
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return String(value ?? '').trim();
  };

  const isValidCnpj = (value: unknown) => {
    const cnpj = normalizeCnpj(value);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDigit = (base: string, factor: number) => {
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

  const normalizeVendorStatus = (value: unknown): Vendor['status'] =>
    String(value || '').toLowerCase() === 'bloqueado' ? 'Bloqueado' : 'Ativo';

  const mapVendorRows = (rows: any[]): Vendor[] =>
    rows.map((vendor: any, index: number) => {
      const razaoSocial = String(vendor?.razao_social || vendor?.name || '').trim();
      const nomeFantasia = String(vendor?.nome_fantasia || '').trim();
      const telefone = String(vendor?.telefone || vendor?.contact || '').trim();
      const cnpjDigits = normalizeCnpj(vendor?.cnpj);
      return {
        id: String(vendor?.id || `VEN-${Date.now()}-${index}`),
        idFornecedor:
          vendor?.id_fornecedor === null || vendor?.id_fornecedor === undefined
            ? undefined
            : Number.isFinite(Number(vendor.id_fornecedor))
              ? Number(vendor.id_fornecedor)
              : undefined,
        razaoSocial,
        nomeFantasia,
        cnpj: cnpjDigits,
        telefone,
        name: razaoSocial,
        category: String(vendor?.category || ''),
        contact: telefone || nomeFantasia,
        email: String(vendor?.email || ''),
        status: normalizeVendorStatus(vendor?.status),
      };
    });

  const loadInventoryForWarehouse = async (warehouseId: string, limit = INITIAL_INVENTORY_LIMIT) => {
    const safeLimit = Math.max(1, limit);
    const { data } = await api
      .from('inventory')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })
      .limit(safeLimit + 1);

    if (!data) {
      setInventory([]);
      setInventoryWarehouseScope(warehouseId);
      setIsInventoryFullyLoaded(true);
      return;
    }

    const baseItems = mapInventoryRows(data.slice(0, safeLimit)).filter((item) => !isSeedTestInventoryItem(item));

    const { data: movementRows } = await api
      .from('movements')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('timestamp', { ascending: false });

    setInventory(mergeInventoryWithMovementBalances(baseItems, Array.isArray(movementRows) ? movementRows : [], warehouseId));
    setInventoryWarehouseScope(warehouseId);
    setIsInventoryFullyLoaded(data.length <= safeLimit);
  };

  const loadInventoryCatalog = async () => {
    const BATCH_SIZE = 2000;
    const MAX_ROWS = 30000;

    const collected: any[] = [];
    let offset = 0;

    while (collected.length < MAX_ROWS) {
      const { data, error } = await api
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE)
        .offset(offset);

      if (error) {
        console.error('Erro ao carregar catalogo global de itens:', error);
        break;
      }

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      collected.push(...rows);
      if (rows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    if (collected.length > 0) {
      setInventoryCatalog(mapInventoryRows(collected).filter((item) => !isSeedTestInventoryItem(item)));
    }
    setIsInventoryCatalogLoaded(true);
  };

  const loadDeferredDataset = async (
    key: 'purchase_orders' | 'movements' | 'material_requests',
    loader: () => Promise<void>
  ) => {
    if (fullLoadInFlight.current.has(key)) return;

    fullLoadInFlight.current.add(key);
    setIsDeferredModuleLoading(true);
    try {
      await loader();
    } finally {
      fullLoadInFlight.current.delete(key);
      if (fullLoadInFlight.current.size === 0) {
        setIsDeferredModuleLoading(false);
      }
    }
  };

  const loadPurchaseOrdersFull = async () => {
    if (isPurchaseOrdersFullyLoaded) return;

    await loadDeferredDataset('purchase_orders', async () => {
      const { data: poData } = await api.from('purchase_orders').select('*').order('request_date', { ascending: false });
      if (!poData) return;

      setPurchaseOrders(pruneExpiredDeliveredPurchaseOrders(mapPurchaseOrders(poData)));
      setIsPurchaseOrdersFullyLoaded(true);
    });
  };

  const loadMovementsFull = async () => {
    if (isMovementsFullyLoaded) return;

    await loadDeferredDataset('movements', async () => {
      const { data: movData } = await api.from('movements').select('*').order('timestamp', { ascending: false });
      if (!movData) return;

      setMovements(mapMovements(movData));
      setIsMovementsFullyLoaded(true);
    });
  };

  const loadMaterialRequestsFull = async () => {
    if (isMaterialRequestsFullyLoaded) return;

    await loadDeferredDataset('material_requests', async () => {
      const { data: reqData } = await api.from('material_requests').select('*').order('created_at', { ascending: false });
      if (!reqData) return;

      setMaterialRequests(mapMaterialRequests(reqData));
      setIsMaterialRequestsFullyLoaded(true);
    });
  };

  const fetchMovementsPage = async (page: number) => {
    if (!user) return;

    const safePage = Math.max(1, page);
    const requestId = ++pageFetchSequence.current.movements;
    setIsMovementsPageLoading(true);
    try {
      const { data } = await api
        .from('movements')
        .select('*')
        .eq('warehouse_id', activeWarehouse)
        .order('timestamp', { ascending: false })
        .limit(MOVEMENTS_PAGE_SIZE + 1)
        .offset((safePage - 1) * MOVEMENTS_PAGE_SIZE);

      if (requestId !== pageFetchSequence.current.movements) return;

      if (!data) {
        setHasMoreMovements(false);
        setPagedMovements([]);
        return;
      }

      const mapped = mapMovements(data);
      setHasMoreMovements(mapped.length > MOVEMENTS_PAGE_SIZE);
      setPagedMovements(mapped.slice(0, MOVEMENTS_PAGE_SIZE));
    } catch (error) {
      if (requestId !== pageFetchSequence.current.movements) return;
      console.error('Erro ao carregar pagina de movimentacoes:', error);
      setHasMoreMovements(false);
      setPagedMovements([]);
    } finally {
      if (requestId === pageFetchSequence.current.movements) {
        setIsMovementsPageLoading(false);
      }
    }
  };

  const fetchPurchaseOrdersPage = async (page: number) => {
    if (!user) return;

    const safePage = Math.max(1, page);
    const requestId = ++pageFetchSequence.current.purchaseOrders;
    setIsPurchaseOrdersPageLoading(true);
    try {
      const { data } = await api
        .from('purchase_orders')
        .select('*')
        .eq('warehouse_id', activeWarehouse)
        .order('request_date', { ascending: false })
        .limit(PURCHASE_ORDERS_PAGE_SIZE + 1)
        .offset((safePage - 1) * PURCHASE_ORDERS_PAGE_SIZE);

      if (requestId !== pageFetchSequence.current.purchaseOrders) return;

      if (!data) {
        setHasMorePurchaseOrders(false);
        setPagedPurchaseOrders([]);
        return;
      }

      const mapped = pruneExpiredDeliveredPurchaseOrders(mapPurchaseOrders(data));
      setHasMorePurchaseOrders(mapped.length > PURCHASE_ORDERS_PAGE_SIZE);
      setPagedPurchaseOrders(mapped.slice(0, PURCHASE_ORDERS_PAGE_SIZE));
    } catch (error) {
      if (requestId !== pageFetchSequence.current.purchaseOrders) return;
      console.error('Erro ao carregar pagina de pedidos:', error);
      setHasMorePurchaseOrders(false);
      setPagedPurchaseOrders([]);
    } finally {
      if (requestId === pageFetchSequence.current.purchaseOrders) {
        setIsPurchaseOrdersPageLoading(false);
      }
    }
  };

  const fetchMaterialRequestsPage = async (page: number) => {
    if (!user) return;

    const safePage = Math.max(1, page);
    const requestId = ++pageFetchSequence.current.materialRequests;
    setIsMaterialRequestsPageLoading(true);
    try {
      const { data } = await api
        .from('material_requests')
        .select('*')
        .eq('warehouse_id', activeWarehouse)
        .order('created_at', { ascending: false })
        .limit(MATERIAL_REQUESTS_PAGE_SIZE + 1)
        .offset((safePage - 1) * MATERIAL_REQUESTS_PAGE_SIZE);

      if (requestId !== pageFetchSequence.current.materialRequests) return;

      if (!data) {
        setHasMoreMaterialRequests(false);
        setPagedMaterialRequests([]);
        return;
      }

      const mapped = mapMaterialRequests(data);
      setHasMoreMaterialRequests(mapped.length > MATERIAL_REQUESTS_PAGE_SIZE);
      setPagedMaterialRequests(mapped.slice(0, MATERIAL_REQUESTS_PAGE_SIZE));
    } catch (error) {
      if (requestId !== pageFetchSequence.current.materialRequests) return;
      console.error('Erro ao carregar pagina de requisicoes:', error);
      setHasMoreMaterialRequests(false);
      setPagedMaterialRequests([]);
    } finally {
      if (requestId === pageFetchSequence.current.materialRequests) {
        setIsMaterialRequestsPageLoading(false);
      }
    }
  };

  const fetchMasterDataItemsPage = async (page: number) => {
    if (!user) return;

    const safePage = Math.max(1, page);
    const requestId = ++pageFetchSequence.current.masterDataItems;
    setIsMasterDataItemsPageLoading(true);

    const offset = (safePage - 1) * MASTER_DATA_ITEMS_PAGE_SIZE;
    const pageLimit = MASTER_DATA_ITEMS_PAGE_SIZE + 1;

    const runInventoryPageQuery = async (
      strategy: 'unscoped' | 'warehouse' | 'all'
    ): Promise<{ rows: any[]; error: any; strategy: 'unscoped' | 'warehouse' | 'all' }> => {
      let query = api
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageLimit)
        .offset(offset);

      if (strategy === 'warehouse') {
        query = query.eq('warehouse_id', activeWarehouse);
      }

      if (strategy === 'all') {
        query = query.eq('warehouse_id', 'all');
      }

      const response = await query;
      const rows = Array.isArray((response as any)?.data) ? (response as any).data : [];
      return {
        rows,
        error: (response as any)?.error,
        strategy,
      };
    };

    try {
      const strategies: Array<'unscoped' | 'warehouse' | 'all'> = ['unscoped', 'warehouse', 'all'];
      let selectedRows: any[] = [];
      let selectedStrategy: 'unscoped' | 'warehouse' | 'all' = 'unscoped';

      for (const strategy of strategies) {
        const { rows, error } = await runInventoryPageQuery(strategy);
        if (error) {
          console.warn(`Consulta inventory falhou na estrategia ${strategy}:`, error);
          continue;
        }

        // Escolhe sempre a estratégia com mais resultados para evitar escopo indevido.
        if (rows.length >= selectedRows.length) {
          selectedRows = rows;
          selectedStrategy = strategy;
        }
      }

      if (requestId !== pageFetchSequence.current.masterDataItems) return;

      const mapped = mapInventoryRows(selectedRows);
      setHasMoreMasterDataItems(mapped.length > MASTER_DATA_ITEMS_PAGE_SIZE);
      setPagedMasterDataItems(mapped.slice(0, MASTER_DATA_ITEMS_PAGE_SIZE));

      // Count é best-effort: se falhar, usa ao menos o tamanho da página carregada.
      let total = mapped.length;
      try {
        let countQuery = api.from('inventory/count');
        if (selectedStrategy === 'warehouse') {
          countQuery = countQuery.eq('warehouse_id', activeWarehouse);
        } else if (selectedStrategy === 'all') {
          countQuery = countQuery.eq('warehouse_id', 'all');
        }

        const countResponse = await countQuery.execute();
        const parsedTotal = Number((countResponse as any)?.data?.total || 0);
        if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
          total = parsedTotal;
        }
      } catch (countError) {
        console.warn('Falha ao obter contagem de inventory; usando total parcial da página.', countError);
      }

      setMasterDataItemsTotal(total);
    } catch (error) {
      if (requestId !== pageFetchSequence.current.masterDataItems) return;
      console.error('Erro ao carregar pagina do cadastro de itens:', error);
      setMasterDataItemsTotal(0);
      setHasMoreMasterDataItems(false);
      setPagedMasterDataItems([]);
    } finally {
      if (requestId === pageFetchSequence.current.masterDataItems) {
        setIsMasterDataItemsPageLoading(false);
      }
    }
  };

  const fetchVendorsPage = async (page: number) => {
    if (!user) return;

    const safePage = Math.max(1, page);
    const requestId = ++pageFetchSequence.current.vendors;
    setIsVendorsPageLoading(true);

    try {
      const [countResponse, rowsResponse] = await Promise.all([
        api.from('vendors/count').execute(),
        api
          .from('vendors')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(VENDORS_PAGE_SIZE + 1)
          .offset((safePage - 1) * VENDORS_PAGE_SIZE),
      ]);

      if (requestId !== pageFetchSequence.current.vendors) return;

      const total = Number((countResponse as any)?.data?.total || 0);
      setVendorsTotal(Number.isFinite(total) ? total : 0);

      const rows = Array.isArray((rowsResponse as any)?.data) ? (rowsResponse as any).data : [];
      const mapped = mapVendorRows(rows);
      setHasMoreVendors(mapped.length > VENDORS_PAGE_SIZE);
      setPagedVendors(mapped.slice(0, VENDORS_PAGE_SIZE));
    } catch (error) {
      if (requestId !== pageFetchSequence.current.vendors) return;
      console.error('Erro ao carregar pagina do cadastro de fornecedores:', error);
      setVendorsTotal(0);
      setHasMoreVendors(false);
      setPagedVendors([]);
    } finally {
      if (requestId === pageFetchSequence.current.vendors) {
        setIsVendorsPageLoading(false);
      }
    }
  };

  // API Data Fetching
  useEffect(() => {
    const fetchData = async (warehouseId = activeWarehouse) => {
      try {
        const { data: whData } = await api.from('warehouses').select('*').eq('is_active', true);
        if (whData) setWarehouses(whData.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          location: w.location,
          isActive: w.is_active,
          managerName: w.manager_name,
          managerEmail: w.manager_email
        })));

        await loadInventoryForWarehouse(warehouseId, INITIAL_INVENTORY_LIMIT);

        const { data: batchesData } = await api.from('cyclic_batches').select('*').order('created_at', { ascending: false });
        if (batchesData) setCyclicBatches(batchesData.map((b: any) => ({
          id: b.id,
          status: b.status,
          scheduledDate: toPtBrDateTime(b.scheduled_date),
          completedAt: toPtBrDateTime(b.completed_at),
          accuracyRate: b.accuracy_rate,
          totalItems: b.total_items,
          divergentItems: b.divergent_items,
          warehouseId: b.warehouse_id || 'ARMZ28'
        })));

        const { data: venData } = await api.from('vendors').select('*');
        if (venData) setVendors(mapVendorRows(venData));

        const { data: vehData } = await api
          .from('fleet_vehicles')
          .select('*')
          .eq('source_module', 'gestao_frota');
        if (vehData) setVehicles(vehData.map((row: any) => mapVehicleRowToState(row)));

        const { data: userData } = await api.from('users').select('*');
        if (userData) {
          const mappedUsers = userData.map((u: any) => normalizeUserSession(u));
          setUsers(mappedUsers);
        }

        const { data: poData } = await api
          .from('purchase_orders')
          .select('*')
          .order('request_date', { ascending: false })
          .limit(INITIAL_PURCHASE_ORDERS_LIMIT);
        if (poData) {
          setPurchaseOrders(pruneExpiredDeliveredPurchaseOrders(mapPurchaseOrders(poData)));
          setIsPurchaseOrdersFullyLoaded(poData.length < INITIAL_PURCHASE_ORDERS_LIMIT);
        }

        const { data: movData } = await api
          .from('movements')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(INITIAL_MOVEMENTS_LIMIT);
        if (movData) {
          setMovements(mapMovements(movData));
          setIsMovementsFullyLoaded(movData.length < INITIAL_MOVEMENTS_LIMIT);
        }

        const { data: notifData } = await api.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
        if (notifData) setAppNotifications(notifData.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type as AppNotification['type'],
          read: n.read,
          createdAt: n.created_at,
          userId: n.user_id
        })));




        const { data: reqData } = await api
          .from('material_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(INITIAL_MATERIAL_REQUESTS_LIMIT);
        if (reqData) {
          setMaterialRequests(mapMaterialRequests(reqData));
          setIsMaterialRequestsFullyLoaded(reqData.length < INITIAL_MATERIAL_REQUESTS_LIMIT);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    loadBootstrapDataRef.current = fetchData;

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          api.setAuthToken(savedToken);
          // Carrega dados apenas quando há sessão autenticada.
          await fetchData(activeWarehouse);
        } else {
          localStorage.removeItem('logged_user');
        }

        const savedUser = localStorage.getItem('logged_user');
        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          handleLogin(parsedUser, undefined, false);
        }
      } catch (e) {
        console.error('Session recovery failed', e);
        localStorage.removeItem('logged_user');
        api.clearAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    // Chamamos o initAuth que agora gerencia o carregamento total
    initAuth();

    // Subscribe removed - using refresh on action
    return () => {
      loadBootstrapDataRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Relatorios e Compras usam dataset completo para consolidacao e busca global.
    if ((activeModule === 'relatorios' || activeModule === 'compras') && !isPurchaseOrdersFullyLoaded) {
      void loadPurchaseOrdersFull();
    }
  }, [activeModule, user, isPurchaseOrdersFullyLoaded]);

  useEffect(() => {
    if (!user) return;
    if (!['dashboard', 'compras', 'expedicao', 'estoque'].includes(activeModule)) return;
    if (isInventoryCatalogLoaded) return;
    void loadInventoryCatalog();
  }, [activeModule, user, isInventoryCatalogLoaded]);

  useEffect(() => {
    if (activeModule !== 'movimentacoes') return;
    if (!user) return;
    void fetchMovementsPage(movementsPage);
  }, [activeModule, user, activeWarehouse, movementsPage]);

  useEffect(() => {
    if (activeModule !== 'compras') return;
    if (!user) return;
    // Compras usa lista completa em memoria para permitir busca global sem trocar de pagina.
    // Mantemos currentPage apenas para paginacao client-side na tela.
  }, [activeModule, user, activeWarehouse, purchaseOrdersPage]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      const nowMs = Date.now();

      setPurchaseOrders((prev) => {
        const next = pruneExpiredDeliveredPurchaseOrders(prev, nowMs);
        return next.length === prev.length ? prev : next;
      });

      setPagedPurchaseOrders((prev) => {
        const next = pruneExpiredDeliveredPurchaseOrders(prev, nowMs);
        return next.length === prev.length ? prev : next;
      });
    }, PURCHASE_ORDER_EXPIRY_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (activeModule !== 'expedicao') return;
    if (!user) return;
    void fetchMaterialRequestsPage(materialRequestsPage);
  }, [activeModule, user, activeWarehouse, materialRequestsPage]);

  useEffect(() => {
    if (activeModule !== 'cadastro') return;
    if (!user) return;
    void fetchMasterDataItemsPage(masterDataItemsPage);
  }, [activeModule, user, activeWarehouse, masterDataItemsPage]);

  useEffect(() => {
    if (activeModule !== 'cadastro') return;
    if (!user) return;
    void fetchVendorsPage(vendorsPage);
  }, [activeModule, user, vendorsPage]);

  useEffect(() => {
    if (!user) return;
    if (inventoryWarehouseScope === activeWarehouse) return;
    void loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
  }, [user, activeWarehouse, inventoryWarehouseScope]);

  useEffect(() => {
    if (!user) return;

    pageFetchSequence.current.movements += 1;
    pageFetchSequence.current.purchaseOrders += 1;
    pageFetchSequence.current.materialRequests += 1;
    pageFetchSequence.current.masterDataItems += 1;
    pageFetchSequence.current.vendors += 1;

    setMovementsPage(1);
    setPurchaseOrdersPage(1);
    setMaterialRequestsPage(1);
    setMasterDataItemsPage(1);
    setVendorsPage(1);

    setPagedMovements([]);
    setPagedPurchaseOrders([]);
    setPagedMaterialRequests([]);
    setPagedMasterDataItems([]);
    setPagedVendors([]);
    setHasMoreMovements(false);
    setHasMorePurchaseOrders(false);
    setHasMoreMaterialRequests(false);
    setHasMoreMasterDataItems(false);
    setHasMoreVendors(false);
    setMasterDataItemsTotal(0);
    setVendorsTotal(0);
  }, [activeWarehouse, user]);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          logout();
          showNotification('Sessão encerrada por inatividade (10 min)', 'warning');
        }, 10 * 60 * 1000); // 10 minutes
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    if (user) {
      resetTimer();
      events.forEach(event => document.addEventListener(event, resetTimer));
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const handleAddUser = async (newUser: User) => {
    const modulesPayload = buildUserModulesPayload(
      newUser.modules,
      newUser.hasWorkshopAccess,
      newUser.hasFleetAccess,
      newUser.role
    );
    const { error } = await api.from('users').insert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      last_access: toIsoDateTime(newUser.lastAccess),
      avatar: newUser.avatar,
      password: newUser.password,
      modules: modulesPayload,
      allowed_warehouses: newUser.allowedWarehouses
    });

    if (!error) {
      const persistedUser = normalizeUserSession({ ...newUser, modules: modulesPayload });
      setUsers(prev => [...prev, persistedUser]);
      addActivity('alerta', 'Novo Usuário', `Usuário ${newUser.name} cadastrado`);
      showNotification(`Usuário ${newUser.name} cadastrado com sucesso!`, 'success');
    } else {
      showNotification('Erro ao cadastrar usuário', 'error');
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const modulesPayload = buildUserModulesPayload(
      updatedUser.modules,
      updatedUser.hasWorkshopAccess,
      updatedUser.hasFleetAccess,
      updatedUser.role
    );
    const { error } = await api.from('users').eq('id', updatedUser.id).update({
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      avatar: updatedUser.avatar,
      password: updatedUser.password,
      modules: modulesPayload,
      allowed_warehouses: updatedUser.allowedWarehouses
    });

    if (!error) {
      const persistedUser = normalizeUserSession({ ...updatedUser, modules: modulesPayload });
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? persistedUser : u));
      if (user?.id === persistedUser.id) {
        setUser(persistedUser);
        localStorage.setItem('logged_user', JSON.stringify(persistedUser));
        if (currentSystemModule === 'workshop' && persistedUser.role !== 'admin' && !persistedUser.hasWorkshopAccess) {
          setCurrentSystemModule(null);
          showNotification('Acesso à Oficina removido para este usuário.', 'warning');
          return;
        }
        if (currentSystemModule === 'fleet' && persistedUser.role !== 'admin' && !persistedUser.hasFleetAccess) {
          setCurrentSystemModule(null);
          showNotification('Acesso à Gestão de Frota removido para este usuário.', 'warning');
          return;
        }
      }
      showNotification('Usuário atualizado com sucesso!', 'success');
    } else {
      showNotification('Erro ao atualizar usuário', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await api.from('users').eq('id', userId).delete();
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showNotification('Usuário removido.', 'success');
    } else {
      showNotification('Erro ao remover usuário', 'error');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const canAccessWorkshop = () => {
    if (!user) {
      console.warn('Tentativa de acesso a oficina sem usuario autenticado');
      showNotification('Usuário não autenticado.', 'error');
      setCurrentSystemModule(null);
      return false;
    }
    if (user.role !== 'admin' && !user.hasWorkshopAccess) {
      console.warn('Acesso a oficina bloqueado', { userId: user.id, role: user.role });
      showNotification('Acesso à Oficina bloqueado para este usuário.', 'error');
      setCurrentSystemModule(null);
      return false;
    }
    return true;
  };

  const canAccessFleet = () => {
    if (!user) {
      console.warn('Tentativa de acesso a gestao de frota sem usuario autenticado');
      showNotification('Usuário não autenticado.', 'error');
      setCurrentSystemModule(null);
      return false;
    }
    if (user.role !== 'admin' && !user.hasFleetAccess) {
      console.warn('Acesso a gestao de frota bloqueado', { userId: user.id, role: user.role });
      showNotification('Acesso à Gestão de Frota bloqueado para este usuário.', 'error');
      setCurrentSystemModule(null);
      return false;
    }
    return true;
  };

  const navigateWorkshopModule = (module: typeof workshopActiveModule) => {
    if (!canAccessWorkshop()) return;
    setWorkshopActiveModule(module);
  };

  const addActivity = (type: Activity['type'], title: string, subtitle: string) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      subtitle,
      time: formatTimePtBR(new Date(), '--:--')
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 19)]);
  };

  const addNotification = async (title: string, message: string, type: AppNotification['type']) => {
    const { data: newNotifs, error } = await api.from('notifications').insert({
      title,
      message,
      type,
      read: false
    });
    const insertedNotif = Array.isArray(newNotifs) ? newNotifs[0] : newNotifs;

    if (!error && insertedNotif) {
      setAppNotifications(prev => [{
        id: insertedNotif.id,
        title: insertedNotif.title,
        message: insertedNotif.message,
        type: insertedNotif.type as AppNotification['type'],
        read: insertedNotif.read,
        createdAt: insertedNotif.created_at || new Date().toISOString(),
        userId: insertedNotif.user_id
      }, ...prev.slice(0, 19)]);
      showNotification(title, type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    const { error } = await api.from('notifications').eq('id', id).update({ read: true });
    if (!error) {
      setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const markAllNotificationsAsRead = async () => {
    const { error } = await api.from('notifications').eq('read', false).update({ read: true });
    if (!error) {
      setAppNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const recordMovement = async (
    type: Movement['type'],
    item: InventoryItem,
    quantity: number,
    reason: string,
    orderId?: string,
    warehouseId?: string
  ): Promise<boolean> => {
    const movementTimestampIso = nowIso();
    const movementId = generateUuid();
    const movementWarehouseId = warehouseId || item.warehouseId || activeWarehouse;
    const newMovement: Movement = {
      id: movementId,
      timestamp: toPtBrDateTime(movementTimestampIso, formatDateTimePtBR(new Date(), '')),
      type,
      sku: item.sku,
      productName: item.name,
      quantity: quantity,
      user: user?.name || 'Sistema',
      location: item.location,
      reason: reason,
      orderId: orderId,
      warehouseId: movementWarehouseId // NOVO
    };

    const { error } = await api.from('movements').insert({
      id: movementId,
      timestamp: movementTimestampIso,
      type: newMovement.type,
      sku: newMovement.sku,
      product_name: newMovement.productName,
      quantity: newMovement.quantity,
      user: newMovement.user,
      location: newMovement.location,
      reason: newMovement.reason,
      order_id: newMovement.orderId,
      warehouse_id: movementWarehouseId
    });

    if (!error) {
      setMovements(prev => [newMovement, ...prev]);
      if (movementWarehouseId === activeWarehouse && movementsPage === 1) {
        setPagedMovements(prev => [newMovement, ...prev].slice(0, MOVEMENTS_PAGE_SIZE));
      }
      return true;
    } else {
      console.error('Error recording movement:', error);
      showNotification(`Falha ao registrar movimentação para ${item.sku}.`, 'error');
      return false;
    }
  };

  const evaluateStockLevels = async (updatedInventory: InventoryItem[]) => {
    for (const item of updatedInventory) {
      if (item.quantity < item.minQty) {
        const alreadyRequested = purchaseOrders.some(po =>
          (po.status === 'pendente' || po.status === 'rascunho' || po.status === 'requisicao') &&
          po.items.some(i => i.sku === item.sku)
        );

        const neededQty = Math.max(0, item.maxQty - item.quantity);
        if (neededQty <= 0) continue;
        const createdAtIso = nowIso();
        const initialHistory = [
          createPOStatusHistoryEntry('requisicao', 'Pedido automático gerado por regra de estoque crítico')
        ];

        const autoPO: PurchaseOrder = {
          id: `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          vendor: 'A definir via cotações',
          requestDate: toPtBrDateTime(createdAtIso, formatDateTimePtBR(new Date(), '')),
          status: 'requisicao',
          priority: 'urgente',
          total: 0,
          requester: 'Norte Tech AI (Estoque Crítico)',
          items: [{
            sku: item.sku,
            name: item.name,
            qty: neededQty,
            price: 0
          }],
          approvalHistory: initialHistory,
          warehouseId: activeWarehouse // NOVO
        };

        const { error } = await api.from('purchase_orders').insert({
          id: autoPO.id,
          vendor: autoPO.vendor,
          request_date: createdAtIso,
          status: autoPO.status,
          priority: autoPO.priority,
          total: autoPO.total,
          requester: autoPO.requester,
          items: autoPO.items,
          approval_history: initialHistory,
          warehouse_id: activeWarehouse
        });

        if (!error) {
          setPurchaseOrders(prev => [autoPO, ...prev]);
          setPagedPurchaseOrders(prev => [autoPO, ...prev].slice(0, PURCHASE_ORDERS_PAGE_SIZE));
          addActivity('alerta', 'Reposição Automática', `Pedido gerado para ${item.sku} (Saldo: ${item.quantity})`);
          addNotification(
            `Estoque Crítico: ${item.sku}`,
            `Saldo de ${item.quantity} está abaixo do mínimo (${item.minQty}). Requisição de compra ${autoPO.id} gerada.`,
            'warning'
          );
        }
      }
    }
  };

  const handleApprovePO = async (id: string) => {
    const po = purchaseOrders.find(o => o.id === id);
    if (!po) return;

    const approvedAtIso = nowIso();
    const approvedAtDisplay = toPtBrDateTime(approvedAtIso, formatDateTimePtBR(new Date(), ''));
    const approvalRecord: ApprovalRecord = {
      id: generateUuid(),
      action: 'approved',
      by: user?.name || 'Gestor de Compras',
      at: approvedAtIso,
      status: 'aprovado',
      description: 'Aprovado por gestor'
    };
    const statusRecord = createPOStatusHistoryEntry('aprovado', 'Aprovação financeira e operacional concluída');

    const newApprovalHistory = appendPOHistory(
      appendPOHistory(po.approvalHistory, approvalRecord),
      statusRecord
    );

    const { error } = await api.from('purchase_orders').eq('id', id).update({
      status: 'aprovado',
      approval_history: newApprovalHistory,
      approved_at: approvedAtIso
    });

    if (!error) {
      setPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'aprovado', approvalHistory: newApprovalHistory, approvedAt: approvedAtDisplay } : o));
      setPagedPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'aprovado', approvalHistory: newApprovalHistory, approvedAt: approvedAtDisplay } : o));
      addActivity('compra', 'Aprovação de Pedido', `Requisição ${id} aprovada - pronta para envio`);
      addNotification(
        `Aprovação: ${id}`,
        `Pedido aprovado e pronto para envio ao fornecedor.`,
        'success'
      );
      showNotification(`Pedido ${id} aprovado! Marque como enviado quando despachar.`, 'success');
    }
  };

  const handleRejectPO = async (id: string, reason?: string) => {
    const po = purchaseOrders.find(o => o.id === id);
    if (!po) return;

    const rejectedAtIso = nowIso();
    const rejectedAtDisplay = toPtBrDateTime(rejectedAtIso, formatDateTimePtBR(new Date(), ''));
    const rejectionRecord: ApprovalRecord = {
      id: generateUuid(),
      action: 'rejected',
      by: user?.name || 'Gestor de Compras',
      at: rejectedAtIso,
      reason: reason || 'Sem justificativa',
      status: 'requisicao',
      description: 'Rejeitado e retornado para nova cotação'
    };
    const statusRecord = createPOStatusHistoryEntry('requisicao', `Pedido retornado para cotação. Motivo: ${reason || 'Sem justificativa'}`);

    const newApprovalHistory = appendPOHistory(
      appendPOHistory(po.approvalHistory, rejectionRecord),
      statusRecord
    );

    const { error } = await api.from('purchase_orders').eq('id', id).update({
      status: 'requisicao', // Volta para o início do fluxo
      approval_history: newApprovalHistory,
      rejected_at: rejectedAtIso
    });

    if (!error) {
      setPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'requisicao', approvalHistory: newApprovalHistory, rejectedAt: rejectedAtDisplay } : o));
      setPagedPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'requisicao', approvalHistory: newApprovalHistory, rejectedAt: rejectedAtDisplay } : o));

      // Criar log de movimentação para métricas (auditoria de fluxo)
      await recordMovement('ajuste', { sku: 'N/A', name: `PEDIDO ${id}`, location: 'ADMIN' } as any, 0, `Rejeição: ${reason || 'Sem justificativa'}`, id);

      addActivity('alerta', 'Pedido Rejeitado', `Requisição ${id} retornou para cotação`);
      addNotification(
        `Rejeição: ${id}`,
        `Pedido rejeitado. Justificativa: ${reason || 'Sem justificativa'}.`,
        'error'
      );
      showNotification(`Pedido ${id} rejeitado. Refaça as cotações.`, 'warning');
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!user || user.role !== 'admin') {
      showNotification('Somente administrador pode remover pedidos de compra.', 'error');
      return;
    }

    const order = purchaseOrders.find((po) => po.id === id);
    if (!order) {
      showNotification('Pedido não encontrado.', 'error');
      return;
    }

    const { error } = await api.from('purchase_orders').eq('id', id).delete();
    if (error) {
      showNotification('Erro ao remover pedido de compra.', 'error');
      return;
    }

    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
    setPagedPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
    addActivity('compra', 'Pedido Removido', `Pedido ${id} removido por ${user.name}`);
    showNotification(`Pedido ${id} removido com sucesso.`, 'success');
  };

  const handleRecalculateROP = async () => {
    showNotification('Iniciando recálculo dinâmico de ROP...', 'warning');

    // 1. Filtrar saídas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const relevantMovements = movements.filter(m => {
      const movementDate = parseDateLike(m.timestamp);
      if (!movementDate) return false;
      return m.type === 'saida' && movementDate >= thirtyDaysAgo;
    });

    // 2. Calcular Uso Diário Médio (ADU) por SKU
    const usageBySku: Record<string, number> = {};
    relevantMovements.forEach(m => {
      usageBySku[m.sku] = (usageBySku[m.sku] || 0) + m.quantity;
    });

    const updatedItems: InventoryItem[] = [];
    let updateCount = 0;

    for (const item of inventory) {
      const totalUsage = usageBySku[item.sku] || 0;
      const adu = totalUsage / 30; // Média diária nos últimos 30 dias

      // ROP = (ADU * LeadTime) + SafetyStock
      // Fallback para leadTime=7 e safetyStock=5 se estiverem indefinidos
      const leadTime = item.leadTime || 7;
      const safetyStock = item.safetyStock || 5;
      const newMinQty = Math.ceil((adu * leadTime) + safetyStock);

      if (newMinQty !== item.minQty) {
        const { error } = await api.from('inventory').eq('sku', item.sku).update({ min_qty: newMinQty });
        if (!error) {
          updatedItems.push({ ...item, minQty: newMinQty });
          updateCount++;
        } else {
          updatedItems.push(item);
        }
      } else {
        updatedItems.push(item);
      }
    }

    if (updateCount > 0) {
      setInventory(updatedItems);
      showNotification(`ROP atualizado para ${updateCount} itens com base no histórico.`, 'success');
      addActivity('alerta', 'ROP Recalculado', `${updateCount} itens tiveram seus níveis mínimos ajustados dinamicamente.`);
      // Re-avaliar níveis de estoque com os novos mínimos
      evaluateStockLevels(updatedItems);
    } else {
      showNotification('Nenhuma alteração de ROP necessária no momento.', 'success');
    }
  };

  const handleSyncAutoPOs = async (manualItems: { sku: string; qty: number }[]) => {
    // Filtra pedidos automáticos ativos (não recebidos ou rejeitados)
    const autoPOs = purchaseOrders.filter(po =>
      po.id.startsWith('AUTO-') &&
      ['requisicao', 'cotacao', 'pendente', 'aprovado'].includes(po.status)
    );

    for (const manual of manualItems) {
      for (const auto of autoPOs) {
        const itemIdx = auto.items.findIndex(i => i.sku === manual.sku);
        if (itemIdx > -1) {
          const currentQty = auto.items[itemIdx].qty;
          const newQty = Math.max(0, currentQty - manual.qty);

          let updatedItems;
          if (newQty === 0) {
            updatedItems = auto.items.filter(i => i.sku !== manual.sku);
          } else {
            updatedItems = auto.items.map(i => i.sku === manual.sku ? { ...i, qty: newQty } : i);
          }

          if (updatedItems.length === 0) {
            // Rejeita/Cancela o pedido se ficar vazio
            await api.from('purchase_orders').eq('id', auto.id).update({ status: 'cancelado' });
            setPurchaseOrders(prev => prev.map(p => p.id === auto.id ? { ...p, status: 'cancelado' as const } : p));
            setPagedPurchaseOrders(prev => prev.map(p => p.id === auto.id ? { ...p, status: 'cancelado' as const } : p));
            showNotification(`Pedido AUTO ${auto.id} cancelado: suprido por manual.`, 'success');
          } else {
            // Atualiza quantidades
            await api.from('purchase_orders').eq('id', auto.id).update({ items: updatedItems });
            setPurchaseOrders(prev => prev.map(p => p.id === auto.id ? { ...p, items: updatedItems } : p));
            setPagedPurchaseOrders(prev => prev.map(p => p.id === auto.id ? { ...p, items: updatedItems } : p));
          }
        }
      }
    }
  };

  const handleCreatePO = async (newOrder: PurchaseOrder) => {
    const createdAtIso = nowIso();
    const initialHistory = appendPOHistory(
      newOrder.approvalHistory,
      createPOStatusHistoryEntry('requisicao', 'Pedido criado via painel LogiWMS')
    );
    const orderWithStatus: PurchaseOrder = {
      ...newOrder,
      status: 'requisicao',
      warehouseId: activeWarehouse,
      requestDate: toPtBrDateTime(createdAtIso, formatDateTimePtBR(new Date(), '')),
      approvalHistory: initialHistory
    };
    const { error } = await api.from('purchase_orders').insert({
      id: orderWithStatus.id,
      vendor: orderWithStatus.vendor,
      status: orderWithStatus.status,
      priority: orderWithStatus.priority,
      total: orderWithStatus.total,
      requester: orderWithStatus.requester,
      items: orderWithStatus.items,
      plate: orderWithStatus.plate,
      cost_center: orderWithStatus.costCenter,
      request_date: createdAtIso,
      approval_history: initialHistory,
      warehouse_id: activeWarehouse
    });

    if (!error) {
      // Sincronizar com pedidos automáticos para evitar duplicidade
      await handleSyncAutoPOs(orderWithStatus.items.map(i => ({ sku: i.sku, qty: i.qty })));

      setPurchaseOrders(prev => [orderWithStatus, ...prev]);
      setPagedPurchaseOrders(prev => [orderWithStatus, ...prev].slice(0, PURCHASE_ORDERS_PAGE_SIZE));
      addActivity('compra', 'Nova Requisição', `Pedido manual ${orderWithStatus.id} criado - aguardando cotações`);
      showNotification(`Pedido ${orderWithStatus.id} criado! Adicione 3 cotações para prosseguir.`, 'success');
    }
  };

  const handleAddQuotes = async (poId: string, quotes: Quote[]) => {
    const po = purchaseOrders.find((entry) => entry.id === poId);
    if (!po) return;

    const quotesAddedAtIso = nowIso();
    const quotesAddedAt = toPtBrDateTime(quotesAddedAtIso, formatDateTimePtBR(new Date(), ''));
    const newApprovalHistory = appendPOHistory(
      po.approvalHistory,
      createPOStatusHistoryEntry('cotacao', 'Cotação de fornecedores vinculada')
    );
    const { error } = await api.from('purchase_orders').eq('id', poId).update({
      quotes,
      status: 'cotacao',
      quotes_added_at: quotesAddedAtIso,
      approval_history: newApprovalHistory
    });

    if (!error) {
      setPurchaseOrders(prev => prev.map(o =>
        o.id === poId ? { ...o, quotes, status: 'cotacao' as const, quotesAddedAt, approvalHistory: newApprovalHistory } : o
      ));
      setPagedPurchaseOrders(prev => prev.map(o =>
        o.id === poId ? { ...o, quotes, status: 'cotacao' as const, quotesAddedAt, approvalHistory: newApprovalHistory } : o
      ));
      showNotification(`Cotações adicionadas ao pedido ${poId}`, 'success');
    }
  };

  const handleSendToApproval = async (poId: string, selectedQuoteId: string) => {
    const po = purchaseOrders.find(o => o.id === poId);
    if (!po) return;

    const selectedQuote = po.quotes?.find(q => q.id === selectedQuoteId);
    if (!selectedQuote) return;

    const updatedQuotes = po.quotes?.map(q => ({ ...q, isSelected: q.id === selectedQuoteId }));
    const newApprovalHistory = appendPOHistory(
      po.approvalHistory,
      createPOStatusHistoryEntry('pendente', 'Pedido enviado para aprovação do gestor')
    );

    const { error } = await api.from('purchase_orders').eq('id', poId).update({
      selected_quote_id: selectedQuoteId,
      vendor: selectedQuote.vendorName,
      total: selectedQuote.totalValue,
      status: 'pendente',
      quotes: updatedQuotes,
      approval_history: newApprovalHistory
    });

    if (!error) {
      setPurchaseOrders(prev => prev.map(o => o.id === poId ? {
        ...o,
        selectedQuoteId,
        vendor: selectedQuote.vendorName,
        total: selectedQuote.totalValue,
        status: 'pendente' as const,
        quotes: updatedQuotes,
        approvalHistory: newApprovalHistory
      } : o));
      setPagedPurchaseOrders(prev => prev.map(o => o.id === poId ? {
        ...o,
        selectedQuoteId,
        vendor: selectedQuote.vendorName,
        total: selectedQuote.totalValue,
        status: 'pendente' as const,
        quotes: updatedQuotes,
        approvalHistory: newApprovalHistory
      } : o));
      addActivity('compra', 'Cotações Enviadas', `Pedido ${poId} enviado para aprovação do gestor`);
      addNotification(
        `Pendente: ${poId}`,
        `Pedido enviado para sua aprovação. Vendor: ${selectedQuote.vendorName}.`,
        'info'
      );
      showNotification(`Pedido ${poId} enviado para aprovação!`, 'success');
    }
  };

  const handleMarkAsSent = async (poId: string, vendorOrderNumber: string) => {
    const po = purchaseOrders.find((entry) => entry.id === poId);
    if (!po) return;

    const sentAtIso = nowIso();
    const sentAt = toPtBrDateTime(sentAtIso, formatDateTimePtBR(new Date(), ''));
    const newApprovalHistory = appendPOHistory(
      po.approvalHistory,
      createPOStatusHistoryEntry('enviado', `Pedido enviado ao fornecedor (Nº ${vendorOrderNumber})`)
    );
    const { error } = await api.from('purchase_orders').eq('id', poId).update({
      status: 'enviado',
      vendor_order_number: vendorOrderNumber,
      sent_to_vendor_at: sentAtIso,
      approval_history: newApprovalHistory
    });

    if (!error) {
      setPurchaseOrders(prev => prev.map(o =>
        o.id === poId ? {
          ...o,
          status: 'enviado' as const,
          vendorOrderNumber,
          sentToVendorAt: sentAt,
          approvalHistory: newApprovalHistory
        } : o
      ));
      setPagedPurchaseOrders(prev => prev.map(o =>
        o.id === poId ? {
          ...o,
          status: 'enviado' as const,
          vendorOrderNumber,
          sentToVendorAt: sentAt,
          approvalHistory: newApprovalHistory
        } : o
      ));
      addActivity('compra', 'Pedido Enviado', `PO ${poId} despachado ao fornecedor - Nº ${vendorOrderNumber}`);
      showNotification(`Pedido ${poId} marcado como enviado!`, 'success');
    }
  };

  const handleProcessPicking = async (sku: string, qty: number) => {
    const item = inventory.find(i => i.sku === sku);
    if (!item || item.quantity < qty) {
      showNotification(`Estoque insuficiente para ${sku}`, 'error');
      return false;
    }

    const { error } = await api.from('inventory').eq('sku', sku).update({ quantity: item.quantity - qty });

    if (!error) {
      const newInventory = inventory.map(i => i.sku === sku ? { ...i, quantity: i.quantity - qty } : i);
      setInventory(newInventory);
      await recordMovement('saida', item, qty, 'Saída para Expedição / Ordem de Saída');
      evaluateStockLevels(newInventory);
      return true;
    } else {
      showNotification('Erro ao processar picking no servidor', 'error');
      return false;
    }
  };

  const handleUpdateInventoryItem = async (updatedItem: InventoryItem) => {
    const targetWarehouseId = updatedItem.warehouseId || activeWarehouse;
    const originalItem = inventory.find(i => i.sku === updatedItem.sku && i.warehouseId === targetWarehouseId);
    if (originalItem) {
      const diff = updatedItem.quantity - originalItem.quantity;
      if (diff !== 0) {
        await recordMovement('ajuste', updatedItem, Math.abs(diff), `Ajuste manual de inventário (${diff > 0 ? '+' : '-'}${Math.abs(diff)})`);
      }
    }

    const inventoryPayload = {
      name: updatedItem.name,
      location: updatedItem.location,
      batch: updatedItem.batch,
      expiry: updatedItem.expiry,
      quantity: updatedItem.quantity,
      status: updatedItem.status,
      image_url: updatedItem.imageUrl,
      category: updatedItem.category,
      unit: updatedItem.unit,
      min_qty: updatedItem.minQty,
      max_qty: updatedItem.maxQty,
      lead_time: updatedItem.leadTime,
      safety_stock: updatedItem.safetyStock
    };

    let { error } = await api
      .from('inventory')
      .eq('sku', updatedItem.sku)
      .eq('warehouse_id', targetWarehouseId)
      .update(inventoryPayload);

    if (error) {
      const errorMessage = String(error?.message || error || '').toLowerCase();
      const notFound = errorMessage.includes('nenhum registro encontrado');
      if (notFound) {
        const fallbackUpdate = await api
          .from('inventory')
          .eq('sku', updatedItem.sku)
          .update({ ...inventoryPayload, warehouse_id: targetWarehouseId });

        error = fallbackUpdate?.error || null;

        if (error) {
          const insertResult = await api.from('inventory').insert({
            sku: updatedItem.sku,
            warehouse_id: targetWarehouseId,
            ...inventoryPayload,
          });
          error = insertResult?.error || null;
        }
      }
    }

    if (!error) {
      const existsInInventory = inventory.some(i => i.sku === updatedItem.sku && i.warehouseId === targetWarehouseId);
      const newInventory = existsInInventory
        ? inventory.map(i => (i.sku === updatedItem.sku && i.warehouseId === targetWarehouseId) ? updatedItem : i)
        : [...inventory, updatedItem];
      setInventory(newInventory);

      setInventoryCatalog((prev) => {
        const exists = prev.some((i) => i.sku === updatedItem.sku && i.warehouseId === targetWarehouseId);
        if (exists) return prev.map((i) => (i.sku === updatedItem.sku && i.warehouseId === targetWarehouseId) ? updatedItem : i);
        return [...prev, updatedItem];
      });

      // Limpeza Proativa de Pedidos AUTO-* 
      // Se o novo saldo já suprir a necessidade (inclusive se min/max mudaram ou apenas a quantidade)
      const autoPOs = purchaseOrders.filter(po =>
        po.id.startsWith('AUTO-') &&
        ['requisicao', 'cotacao', 'pendente'].includes(po.status) &&
        po.items.some(item => item.sku === updatedItem.sku)
      );

      for (const autoPO of autoPOs) {
        const itemIndex = autoPO.items.findIndex(item => item.sku === updatedItem.sku);
        if (itemIndex > -1) {
          // Recalcular quantidade: maxQty - quantidade atual
          const newQty = Math.max(0, updatedItem.maxQty - updatedItem.quantity);

          if (newQty <= 0) {
            // Se a nova quantidade for 0 ou negativa, remover o item do pedido
            const updatedItems = autoPO.items.filter(item => item.sku !== updatedItem.sku);

            if (updatedItems.length === 0) {
              // Se o pedido ficar vazio, cancelar/rejeitar
              await api.from('purchase_orders').update({ status: 'cancelado' }).eq('id', autoPO.id);
              setPurchaseOrders(prev => prev.map(po => po.id === autoPO.id ? { ...po, status: 'cancelado' as const } : po));
              addActivity('compra', 'Pedido Cancelado', `${autoPO.id} removido: estoque de ${updatedItem.sku} está em ${updatedItem.quantity}`);
            } else {
              // Atualizar pedido sem o item
              await api.from('purchase_orders').update({ items: updatedItems }).eq('id', autoPO.id);
              setPurchaseOrders(prev => prev.map(po => po.id === autoPO.id ? { ...po, items: updatedItems } : po));
            }
          } else {
            // Atualizar quantidade do item no pedido se houve mudança
            if (autoPO.items[itemIndex].qty !== newQty) {
              const updatedItems = autoPO.items.map(item =>
                item.sku === updatedItem.sku ? { ...item, qty: newQty } : item
              );

              await api.from('purchase_orders').update({ items: updatedItems }).eq('id', autoPO.id);
              setPurchaseOrders(prev => prev.map(po => po.id === autoPO.id ? { ...po, items: updatedItems } : po));

              addActivity('compra', 'Pedido Atualizado', `${autoPO.id} recalculado: ${updatedItem.sku} agora requisita ${newQty} un.`);
            }
          }
        }
      }

      if (autoPOs.length > 0) {
        showNotification(`${autoPOs.length} pedido(s) automático(s) sincronizado(s)`, 'success');
      }

      showNotification(`Item ${updatedItem.sku} atualizado com sucesso`, 'success');
      evaluateStockLevels(newInventory);
    } else {
      showNotification('Erro ao atualizar estoque', 'error');
    }
  };

  const handleCreateCyclicBatch = async (items: { sku: string, expected: number }[]) => {
    const normalizedItems = items
      .map((item) => ({
        sku: String(item.sku || '').trim(),
        expected: Number.parseInt(String(item.expected ?? 0), 10),
      }))
      .filter((item) => item.sku.length > 0 && Number.isFinite(item.expected) && item.expected >= 0);

    if (normalizedItems.length === 0) {
      showNotification('Nenhum item válido para criar lote de inventário.', 'warning');
      return null;
    }

    const batchId = `INV-${Date.now()}`;
    const scheduledAt = nowIso();
    const { error: batchError } = await api.from('cyclic_batches').insert({
      id: batchId,
      status: 'aberto',
      scheduled_date: scheduledAt,
      total_items: normalizedItems.length,
      divergent_items: 0,
      warehouse_id: activeWarehouse
    });

    if (batchError) {
      showNotification(`Erro ao criar lote de inventário: ${String(batchError)}`, 'error');
      return null;
    }

    const countsPayload = normalizedItems.map((item) => {
      const id = generateUuid();
      return {
        id,
        batch_id: batchId,
        sku: item.sku,
        expected_qty: item.expected,
        counted_qty: null,
        status: 'pendente',
        warehouse_id: activeWarehouse
      };
    });

    const { error: countsError } = await api.from('cyclic_counts').insert(countsPayload);
    if (countsError) {
      showNotification(`Lote criado, mas houve erro ao gerar contagens: ${String(countsError)}`, 'warning');
    }

    const { data: batchRows } = await api.from('cyclic_batches').select('*').eq('id', batchId).limit(1);
    const createdBatch = Array.isArray(batchRows) ? batchRows[0] : batchRows;

    if (createdBatch) {
      setCyclicBatches((prev) => [{
        id: createdBatch.id,
        status: createdBatch.status,
        scheduledDate: toPtBrDateTime(createdBatch.scheduled_date, scheduledAt),
        completedAt: toPtBrDateTime(createdBatch.completed_at),
        accuracyRate: createdBatch.accuracy_rate,
        totalItems: createdBatch.total_items,
        divergentItems: createdBatch.divergent_items,
        warehouseId: createdBatch.warehouse_id || activeWarehouse
      }, ...prev]);
    }

    showNotification(`Lote ${batchId} criado com ${normalizedItems.length} itens!`, 'success');
    return batchId;
  };

  const handleFinalizeCyclicBatch = async (batchId: string, counts: any[]) => {
    if (!Array.isArray(counts) || counts.length === 0) {
      showNotification('Não há itens para finalizar no lote.', 'warning');
      return;
    }

    const finalizedAt = nowIso();
    const normalizedCounts = counts.map((count) => {
      const expectedQty = Number.parseInt(String(count?.expectedQty ?? 0), 10);
      const parsedCountedQty = Number.parseInt(String(count?.countedQty ?? expectedQty), 10);
      const countedQty = Number.isFinite(parsedCountedQty) && parsedCountedQty >= 0 ? parsedCountedQty : expectedQty;
      return {
        ...count,
        sourceId: count?.sourceId ? String(count.sourceId) : '',
        sku: String(count?.sku || ''),
        expectedQty: Number.isFinite(expectedQty) ? expectedQty : 0,
        countedQty,
        status: countedQty === expectedQty ? 'contado' : 'ajustado'
      };
    }).filter((count) => count.sku.length > 0);

    if (normalizedCounts.length === 0) {
      showNotification('Contagens invalidas para finalizacao.', 'error');
      return;
    }

    const divergentItems = normalizedCounts.filter((count) => count.countedQty !== count.expectedQty).length;
    const accuracyRate = ((normalizedCounts.length - divergentItems) / normalizedCounts.length) * 100;

    const { error: batchError } = await api
      .from('cyclic_batches')
      .eq('id', batchId)
      .eq('warehouse_id', activeWarehouse)
      .update({
        status: 'concluido',
        completed_at: finalizedAt,
        accuracy_rate: accuracyRate,
        divergent_items: divergentItems
      });

    if (batchError) {
      showNotification(`Erro ao finalizar lote ${batchId}: ${String(batchError)}`, 'error');
      return;
    }

    let countUpdateFailures = 0;

    for (const count of normalizedCounts) {
      const countPayload = {
        counted_qty: count.countedQty,
        status: count.status,
        counted_at: finalizedAt,
        warehouse_id: activeWarehouse
      };

      let countUpdateResult: any = null;
      if (count.sourceId) {
        countUpdateResult = await api.from('cyclic_counts').eq('id', count.sourceId).update(countPayload);
      }

      if (!count.sourceId || countUpdateResult?.error) {
        countUpdateResult = await api
          .from('cyclic_counts')
          .eq('batch_id', batchId)
          .eq('sku', count.sku)
          .update(countPayload);
      }

      if (countUpdateResult?.error) {
        countUpdateFailures += 1;
      }

      const item = inventory.find((entry) => entry.sku === count.sku && entry.warehouseId === activeWarehouse);
      if (!item) {
        continue;
      }

      const diff = count.countedQty - count.expectedQty;
      if (diff !== 0) {
        await recordMovement(
          'ajuste',
          item,
          Math.abs(diff),
          `Ajuste automático via Inventário Cíclico (${batchId})`
        );
      }

      await api
        .from('inventory')
        .eq('sku', item.sku)
        .eq('warehouse_id', activeWarehouse)
        .update({
          quantity: count.countedQty,
          last_counted_at: finalizedAt
        });
    }

    setCyclicBatches((prev) => prev.map((batch) => (
      batch.id === batchId
        ? {
          ...batch,
          status: 'concluido',
          completedAt: toPtBrDateTime(finalizedAt, finalizedAt),
          accuracyRate,
          divergentItems
        }
        : batch
    )));

    setInventory((prev) => prev.map((item) => {
      if (item.warehouseId !== activeWarehouse) return item;
      const count = normalizedCounts.find((entry) => entry.sku === item.sku);
      if (!count) return item;
      return {
        ...item,
        quantity: count.countedQty,
        lastCountedAt: finalizedAt
      };
    }));

    addActivity('alerta', 'Inventário Finalizado', `Lote ${batchId} concluído com ${accuracyRate.toFixed(1)}% de acuracidade.`);
    showNotification(`Inventário ${batchId} finalizado!`, 'success');

    if (countUpdateFailures > 0) {
      showNotification(`${countUpdateFailures} registro(s) de contagem não puderam ser persistidos.`, 'warning');
    }
  };

  const handleClassifyABC = async () => {
    const PAGE_SIZE = 500;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const loadAllInventoryRows = async () => {
      const rows: any[] = [];
      let offset = 0;
      while (true) {
        const response = await api
          .from('inventory')
          .select('*')
          .eq('warehouse_id', activeWarehouse)
          .order('sku', { ascending: true })
          .limit(PAGE_SIZE)
          .offset(offset);

        if (response?.error) {
          throw new Error(String(response.error));
        }

        const chunk = Array.isArray(response?.data) ? response.data : [];
        rows.push(...chunk);
        if (chunk.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return rows;
    };

    const loadAllMovementsRows = async () => {
      const rows: any[] = [];
      let offset = 0;
      while (true) {
        const response = await api
          .from('movements')
          .select('*')
          .eq('warehouse_id', activeWarehouse)
          .order('timestamp', { ascending: false })
          .limit(PAGE_SIZE)
          .offset(offset);

        if (response?.error) {
          throw new Error(String(response.error));
        }

        const chunk = Array.isArray(response?.data) ? response.data : [];
        rows.push(...chunk);
        if (chunk.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return rows;
    };

    try {
      const [inventoryRows, movementRows] = await Promise.all([loadAllInventoryRows(), loadAllMovementsRows()]);

      if (inventoryRows.length === 0) {
        showNotification('Não há itens no estoque para classificar.', 'warning');
        return;
      }

      const cutoff = Date.now() - THIRTY_DAYS_MS;
      const skuFrequency: Record<string, number> = {};
      movementRows.forEach((movement) => {
        if (movement?.type !== 'saida') return;
        const timestamp = new Date(String(movement?.timestamp || '')).getTime();
        if (!Number.isFinite(timestamp) || timestamp < cutoff) return;
        const sku = String(movement?.sku || '');
        if (!sku) return;
        const qty = Number(movement?.quantity || 0);
        skuFrequency[sku] = (skuFrequency[sku] || 0) + (Number.isFinite(qty) ? qty : 0);
      });

      const ranking = inventoryRows
        .map((row) => ({
          sku: String(row?.sku || ''),
          freq: skuFrequency[String(row?.sku || '')] || 0
        }))
        .filter((entry) => entry.sku.length > 0)
        .sort((a, b) => b.freq - a.freq);

      if (ranking.length === 0) {
        showNotification('Não foi possível montar o ranking ABC.', 'warning');
        return;
      }

      const total = ranking.length;
      const aLimit = Math.ceil(total * 0.2);
      const bLimit = Math.ceil(total * 0.5);

      const updates = ranking.map((entry, index) => {
        let category: 'A' | 'B' | 'C' = 'C';
        if (index < aLimit) category = 'A';
        else if (index < bLimit) category = 'B';
        return { sku: entry.sku, category };
      });

      const CHUNK_SIZE = 25;
      let updateErrors = 0;
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(
          chunk.map(async (entry) => api
            .from('inventory')
            .eq('sku', entry.sku)
            .eq('warehouse_id', activeWarehouse)
            .update({ abc_category: entry.category }))
        );
        chunkResults.forEach((result) => {
          if (result?.error) updateErrors += 1;
        });
      }

      await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
      showNotification(
        updateErrors > 0
          ? `Classificacao ABC atualizada com ${updateErrors} falha(s).`
          : 'Classificacao ABC atualizada com base no giro dos ultimos 30 dias.',
        updateErrors > 0 ? 'warning' : 'success'
      );
    } catch (error: any) {
      showNotification(`Erro na classificação ABC: ${String(error?.message || error)}`, 'error');
    }
  };

  const handleFinalizeReceipt = async (receivedItems: any[], poId?: string): Promise<boolean> => {
    if (!poId) {
      showNotification('Selecione um pedido para finalizar o recebimento.', 'warning');
      return false;
    }

    const normalizedItems = receivedItems
      .map((item) => ({
        sku: String(item?.sku || '').trim(),
        received: Number.parseInt(String(item?.received ?? item?.qty ?? item?.quantity ?? 0), 10),
      }))
      .filter((item) => item.sku.length > 0 && Number.isFinite(item.received) && item.received > 0);

    if (normalizedItems.length === 0) {
      showNotification('Nenhum item valido para recebimento.', 'warning');
      return false;
    }

    const isConflictError = (errorMessage: string, httpStatus: number) => {
      const normalized = errorMessage.toLowerCase();
      return (
        httpStatus === 409 ||
        normalized.includes('ja foi recebido') ||
        normalized.includes('nao esta em status enviado')
      );
    };

    const syncOrderFromServer = async () => {
      const { data: latestOrderRows } = await api.from('purchase_orders').select('*').eq('id', poId).limit(1);
      const latestOrderRow = Array.isArray(latestOrderRows) ? latestOrderRows[0] : null;
      if (!latestOrderRow) return;

      const latestOrder = mapPurchaseOrders([latestOrderRow])[0];
      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === poId
            ? { ...po, status: latestOrder.status, receivedAt: latestOrder.receivedAt }
            : po
        )
      );
      setPagedPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === poId
            ? { ...po, status: latestOrder.status, receivedAt: latestOrder.receivedAt }
            : po
        )
      );
    };

    const finalizeReceiptLegacy = async () => {
      const { data: poRows, error: poReadError } = await api.from('purchase_orders').select('*').eq('id', poId).limit(1);
      if (poReadError) {
        return { ok: false, error: String(poReadError.message || 'Falha ao consultar pedido.') };
      }

      const poRow = Array.isArray(poRows) ? poRows[0] : null;
      if (!poRow) {
        return { ok: false, error: `Pedido ${poId} nao encontrado.` };
      }

      if (String(poRow.status) !== 'enviado') {
        return {
          ok: false,
          conflict: true,
          error: `Pedido ${poId} ja foi recebido ou nao esta em status enviado`,
        };
      }

      const receivedAtIso = nowIso();
      const receiptReason = `Entrada via Recebimento de ${poId}`;
      const movementRows: any[] = [];
      const inventoryUpdates: any[] = [];

      for (const item of normalizedItems) {
        const { data: inventoryRows, error: inventoryReadError } = await api
          .from('inventory')
          .select('*')
          .eq('sku', item.sku)
          .eq('warehouse_id', activeWarehouse)
          .limit(1);

        if (inventoryReadError) {
          return { ok: false, error: String(inventoryReadError.message || `Falha ao consultar ${item.sku}.`) };
        }

        const inventoryRow = Array.isArray(inventoryRows) ? inventoryRows[0] : null;
        if (!inventoryRow) {
          return { ok: false, error: `Item ${item.sku} nao encontrado no armazem ${activeWarehouse}.` };
        }

        const previousQty = Number(inventoryRow.quantity || 0);
        const newQty = previousQty + item.received;

        const { error: inventoryUpdateError } = await api
          .from('inventory')
          .eq('sku', item.sku)
          .eq('warehouse_id', activeWarehouse)
          .update({ quantity: newQty });

        if (inventoryUpdateError) {
          return { ok: false, error: String(inventoryUpdateError.message || `Falha ao atualizar ${item.sku}.`) };
        }

        const movementId = generateUuid();
        const movementTimestampIso = nowIso();
        const { data: insertedMovements, error: movementInsertError } = await api.from('movements').insert({
          id: movementId,
          timestamp: movementTimestampIso,
          type: 'entrada',
          sku: item.sku,
          product_name: inventoryRow.name || item.sku,
          quantity: item.received,
          user: user?.name || 'Sistema',
          location: inventoryRow.location || 'DOCA-01',
          reason: receiptReason,
          order_id: poId,
          warehouse_id: activeWarehouse,
        });

        if (movementInsertError) {
          return { ok: false, error: String(movementInsertError.message || `Falha ao registrar movimento ${item.sku}.`) };
        }

        const insertedMovement = Array.isArray(insertedMovements) ? insertedMovements[0] : insertedMovements;
        if (insertedMovement) movementRows.push(insertedMovement);

        inventoryUpdates.push({
          sku: item.sku,
          previous_qty: previousQty,
          received: item.received,
          new_qty: newQty,
        });
      }

      const { data: updatedPoRows, error: poUpdateError } = await api
        .from('purchase_orders')
        .eq('id', poId)
        .update({ status: 'recebido', received_at: receivedAtIso });

      if (poUpdateError) {
        return { ok: false, error: String(poUpdateError.message || 'Falha ao atualizar status do pedido.') };
      }

      const updatedPo = Array.isArray(updatedPoRows) ? updatedPoRows[0] : updatedPoRows;
      return {
        ok: true,
        data: {
          po: updatedPo || { ...poRow, status: 'recebido', received_at: receivedAtIso },
          inventory_updates: inventoryUpdates,
          movements: movementRows,
        },
      };
    };

    try {
      const receiptResponse = await api.from('receipts/finalize').insert({
        po_id: poId,
        warehouse_id: activeWarehouse,
        items: normalizedItems,
      });

      let receiptData: any = null;
      if (receiptResponse?.error) {
        const responseError = String(receiptResponse.error || 'Falha ao finalizar recebimento.');
        const httpStatus = Number(receiptResponse.httpStatus || 0);
        const endpointUnavailable =
          httpStatus === 404 ||
          responseError.toLowerCase().includes('not found') ||
          responseError.toLowerCase().includes('cannot post');

        if (endpointUnavailable) {
          const legacyResult = await finalizeReceiptLegacy();
          if (!legacyResult.ok) {
            const legacyError = String(legacyResult.error || 'Falha ao finalizar recebimento.');
            const conflict = Boolean(legacyResult.conflict);
            showNotification(
              conflict ? `${legacyError} (bloqueado para evitar duplicidade)` : legacyError,
              conflict ? 'warning' : 'error'
            );
            if (conflict) {
              await syncOrderFromServer();
            }
            return false;
          }
          receiptData = legacyResult.data || {};
        } else {
          const conflict = isConflictError(responseError, httpStatus);
          showNotification(
            conflict ? `${responseError} (bloqueado para evitar duplicidade)` : responseError,
            conflict ? 'warning' : 'error'
          );

          if (conflict) {
            await syncOrderFromServer();
          }
          return false;
        }
      } else {
        receiptData = receiptResponse?.data || {};
      }

      const poData = receiptData.po;
      const inventoryUpdates = Array.isArray(receiptData.inventory_updates) ? receiptData.inventory_updates : [];
      const movementRows = Array.isArray(receiptData.movements) ? receiptData.movements : [];
      const receivedAt = toPtBrDateTime(poData?.received_at, formatDateTimePtBR(new Date(), ''));
      const existingOrder = purchaseOrders.find((po) => po.id === poId);
      const receiveHistoryEntry = createPOStatusHistoryEntry('recebido', 'Entrega realizada normalmente');
      const mergedApprovalHistory = appendPOHistory(
        existingOrder?.approvalHistory || (Array.isArray(poData?.approval_history) ? poData.approval_history : []),
        receiveHistoryEntry
      );

      if (inventoryUpdates.length > 0) {
        const qtyBySku = new Map<string, number>();
        inventoryUpdates.forEach((entry: any) => {
          const sku = String(entry?.sku || '').trim();
          const qty = Number(entry?.new_qty);
          if (sku && Number.isFinite(qty)) {
            qtyBySku.set(sku, qty);
          }
        });

        setInventory((prev) =>
          prev.map((item) => {
            if (item.warehouseId !== activeWarehouse) return item;
            const nextQty = qtyBySku.get(item.sku);
            if (nextQty === undefined) return item;
            return { ...item, quantity: nextQty };
          })
        );
      } else {
        await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
      }

      if (movementRows.length > 0) {
        const mappedMovements = mapMovements(movementRows).filter((movement) => movement.warehouseId === activeWarehouse);
        if (mappedMovements.length > 0) {
          setMovements((prev) => [...mappedMovements, ...prev]);
        }
      }

      const historyUpdate = await api
        .from('purchase_orders')
        .eq('id', poId)
        .update({ approval_history: mergedApprovalHistory });

      const effectiveHistory = mergedApprovalHistory;
      if (historyUpdate?.error) {
        showNotification('Recebimento concluído, mas houve falha ao persistir histórico detalhado do pedido.', 'warning');
      }

      setPurchaseOrders((prev) =>
        prev.map((po) => (po.id === poId ? { ...po, status: 'recebido' as const, receivedAt, approvalHistory: effectiveHistory } : po))
      );
      setPagedPurchaseOrders((prev) =>
        prev.map((po) => (po.id === poId ? { ...po, status: 'recebido' as const, receivedAt, approvalHistory: effectiveHistory } : po))
      );

      await handleSyncAutoPOs(normalizedItems.map((item) => ({ sku: item.sku, qty: item.received })));

      addActivity('recebimento', 'Recebimento Finalizado', `Carga ${poId} conferida e armazenada`);
      addNotification(
        `Recebimento: ${poId}`,
        `Carga recebida com sucesso. Estoque atualizado.`,
        'success'
      );
      showNotification(`Recebimento finalizado - ${poId}`, 'success');
      return true;
    } catch (error: any) {
      showNotification(`Erro ao finalizar recebimento: ${error?.message || 'erro desconhecido'}`, 'error');
      return false;
    }
  };

  /* Function to Add Master Record (Item, Vendor, Vehicle, CostCenter) */
  const handleAddMasterRecord = async (type: 'item' | 'vendor' | 'vehicle' | 'cost_center', data: any, isEdit: boolean) => {
    if (type === 'item') {
      if (isEdit) {
        const normalizedName = String(data?.name || '').trim();
        if (!normalizedName) {
          showNotification('Descricao do item e obrigatoria.', 'error');
          return;
        }
        if (normalizedName.length > 255) {
          showNotification('Descricao do item deve ter no maximo 255 caracteres.', 'error');
          return;
        }
        const { error } = await api.from('inventory').eq('sku', data.sku).update({
          name: normalizedName,
          category: data.category,
          unit: data.unit,
          image_url: data.imageUrl,
          min_qty: data.minQty || 10,
          lead_time: data.leadTime || 7,
          safety_stock: data.safetyStock || 5
        });
        if (!error) {
          await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
          if (activeModule === 'cadastro') {
            await fetchMasterDataItemsPage(masterDataItemsPage);
          }
          showNotification('Item atualizado com sucesso', 'success');
        } else {
          showNotification(`Erro ao atualizar item: ${resolveApiErrorMessage(error)}`, 'error');
        }
      } else {
        const sku = String(data?.sku || '').trim().toUpperCase();
        const description = String(data?.name || '').trim();
        if (!sku) {
          showNotification('Código item (SKU) é obrigatório.', 'error');
          return;
        }
        if (!description) {
          showNotification('Descrição do item é obrigatória.', 'error');
          return;
        }
        if (description.length > 255) {
          showNotification('Descricao do item deve ter no maximo 255 caracteres.', 'error');
          return;
        }
        const { data: insertedData, error } = await api.from('inventory').insert({
          sku,
          name: description,
          category: data.category || 'GERAL',
          unit: data.unit || 'UN',
          image_url:
            data.imageUrl ||
            'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=80',
          quantity: 0,
          status: 'disponivel',
          location: 'DOCA-01',
          warehouse_id: activeWarehouse,
          min_qty: data.minQty || 0,
          max_qty: 1000,
          lead_time: 7,
          safety_stock: 5
        });

        const insertedRow = Array.isArray(insertedData) ? insertedData[0] : insertedData;
        if (!error && insertedRow) {
          const mappedInserted = mapInventoryRows([insertedRow])[0];
          if (mappedInserted) {
            await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
            if (activeModule === 'cadastro') {
              setMasterDataItemsPage(1);
              await fetchMasterDataItemsPage(1);
            }
            await recordMovement('entrada', mappedInserted, 0, 'Criação de novo Código de Produto');
            showNotification('Item criado com sucesso', 'success');
          } else {
            showNotification('Item criado, mas houve falha ao atualizar a tela.', 'warning');
          }
        } else {
          showNotification(`Erro ao criar item: ${resolveApiErrorMessage(error)}`, 'error');
        }
      }
    } else if (type === 'vendor') {
      const normalizedStatus: Vendor['status'] =
        String(data?.status || 'Ativo').toLowerCase() === 'bloqueado' ? 'Bloqueado' : 'Ativo';
      const razaoSocial = String(data?.razaoSocial || data?.name || '').trim();
      const nomeFantasia = String(data?.nomeFantasia || '').trim();
      const telefone = normalizePhone(data?.telefone || data?.contact || '');
      const cnpj = normalizeCnpj(data?.cnpj);

      if (!razaoSocial) {
        showNotification('Razão social é obrigatória.', 'error');
        return;
      }
      if (razaoSocial.length > 150) {
        showNotification('Razao social deve ter no maximo 150 caracteres.', 'error');
        return;
      }
      if (nomeFantasia.length > 100) {
        showNotification('Nome fantasia deve ter no maximo 100 caracteres.', 'error');
        return;
      }
      if (!isValidCnpj(cnpj)) {
        showNotification('CNPJ invalido. Informe um CNPJ valido.', 'error');
        return;
      }

      if (isEdit) {
        const vendorPayload = {
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          cnpj,
          telefone,
          name: razaoSocial,
          contact: telefone || nomeFantasia,
          category: String(data?.category || ''),
          email: String(data?.email || ''),
          status: normalizedStatus,
        };
        const { error } = await api.from('vendors').eq('id', data.id).update(vendorPayload);
        if (!error) {
          setVendors(prev =>
            prev.map(v =>
              v.id === data.id
                ? {
                  ...v,
                  ...vendorPayload,
                  razaoSocial,
                  nomeFantasia,
                  telefone,
                  cnpj,
                  name: razaoSocial,
                  contact: telefone || nomeFantasia,
                  status: normalizedStatus,
                }
                : v
            )
          );
          if (activeModule === 'cadastro') {
            await fetchVendorsPage(vendorsPage);
          }
          showNotification('Fornecedor atualizado com sucesso', 'success');
        } else {
          showNotification(`Erro ao atualizar fornecedor: ${resolveApiErrorMessage(error)}`, 'error');
        }
      } else {
        const newVendor: Vendor = {
          id: String(data?.id || Date.now().toString()),
          razaoSocial,
          nomeFantasia,
          cnpj,
          telefone,
          name: razaoSocial,
          category: String(data?.category || ''),
          contact: telefone || nomeFantasia,
          email: String(data?.email || ''),
          status: normalizedStatus,
        };
        const { data: insertedData, error } = await api.from('vendors').insert(newVendor);
        if (!error) {
          const insertedRow = Array.isArray(insertedData) ? insertedData[0] : insertedData;
          const mappedInserted = insertedRow ? mapVendorRows([insertedRow])[0] : newVendor;
          setVendors(prev => [mappedInserted, ...prev.filter((vendor) => vendor.id !== mappedInserted.id)]);
          if (activeModule === 'cadastro') {
            setVendorsPage(1);
            await fetchVendorsPage(1);
          }
          showNotification('Fornecedor cadastrado com sucesso', 'success');
        } else {
          showNotification(`Erro ao cadastrar fornecedor: ${resolveApiErrorMessage(error)}`, 'error');
        }
      }
    } else if (type === 'vehicle') {
      if (isEdit) {
        const payload = toVehiclePayload(data);
        const { placa: _ignoredPlaca, ...updatePayload } = payload;
        const { error } = await api
          .from('fleet_vehicles')
          .eq('source_module', 'gestao_frota')
          .eq('placa', data.plate)
          .update(updatePayload);
        if (!error) {
          setVehicles(prev => prev.map(v => v.plate === data.plate ? { ...v, ...data } : v));
          showNotification('Veículo atualizado com sucesso', 'success');
        } else {
          showNotification(`Erro ao atualizar veículo: ${resolveApiErrorMessage(error)}`, 'error');
        }
      } else {
        const maintenanceIso = nowIso();
        const newVehicle: Vehicle = { ...data, status: 'Disponível', lastMaintenance: toPtBrDateTime(maintenanceIso) };
        const { error } = await api
          .from('fleet_vehicles')
          .eq('source_module', 'gestao_frota')
          .insert(toVehiclePayload({ ...newVehicle, lastMaintenance: maintenanceIso }));

        if (!error) {
          setVehicles(prev => [...prev, newVehicle]);
          showNotification('Veículo cadastrado com sucesso', 'success');
        } else {
          showNotification(`Erro ao cadastrar veículo: ${resolveApiErrorMessage(error)}`, 'error');
        }
      }
    }
  };

  const handleImportMasterRecords = async (type: 'item' | 'vendor' | 'vehicle', data: any[]) => {
    let table = '';
    let processedData = [];

    if (type === 'item') {
      table = 'inventory';
      processedData = data
        .map((d) => ({
          sku: String(d?.sku || '').trim().toUpperCase(),
          name: String(d?.name || '').trim(),
          category: d.category || 'GERAL',
          unit: d.unit || 'UN',
          image_url:
            d.imageUrl ||
            'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=80',
          quantity: Math.round(Number(d.quantity) || 0),
          status: d.status || 'disponivel',
          warehouse_id: activeWarehouse,
          min_qty: d.minQty || 0,
          max_qty: 1000,
          lead_time: 7,
          safety_stock: 5,
        }))
        .filter((item) => item.sku && item.name);
    } else if (type === 'vendor') {
      table = 'vendors';
      processedData = data.map((d, index) => ({
        id: String(d.id || `${Date.now()}-${index}`),
        razao_social: String(d.razaoSocial || d.name || ''),
        nome_fantasia: String(d.nomeFantasia || ''),
        cnpj: normalizeCnpj(d.cnpj),
        telefone: normalizePhone(d.telefone || d.contact || ''),
        name: String(d.razaoSocial || d.name || ''),
        category: String(d.category || ''),
        contact: normalizePhone(d.telefone || d.contact || '') || String(d.nomeFantasia || ''),
        email: String(d.email || ''),
        status: String(d.status || 'Ativo').toLowerCase() === 'bloqueado' ? 'Bloqueado' : 'Ativo'
      }));
    } else if (type === 'vehicle') {
      table = 'fleet_vehicles';
      processedData = data.map((d) =>
        toVehiclePayload({
          plate: d.plate,
          model: d.model,
          type: d.type,
          status: d.status,
          lastMaintenance: d.lastMaintenance,
          costCenter: d.costCenter,
        })
      );
    }

    if (processedData.length === 0) {
      showNotification('Nenhum registro válido para importar.', 'warning');
      return;
    }

    const importRequest =
      table === 'fleet_vehicles'
        ? api.from(table).eq('source_module', 'gestao_frota').insert(processedData)
        : api.from(table).insert(processedData);
    const { data: insertedData, error } = await importRequest;

    if (!error) {
      if (type === 'item' && insertedData) {
        await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
        if (activeModule === 'cadastro') {
          setMasterDataItemsPage(1);
          await fetchMasterDataItemsPage(1);
        }
      } else if (type === 'vendor') {
        const normalizedInserted = Array.isArray(insertedData) ? mapVendorRows(insertedData) : [];
        if (normalizedInserted.length > 0) {
          setVendors(prev => [...normalizedInserted, ...prev.filter((vendor) => !normalizedInserted.some((added) => added.id === vendor.id))]);
        }
        if (activeModule === 'cadastro') {
          setVendorsPage(1);
          await fetchVendorsPage(1);
        }
      } else if (type === 'vehicle') {
        const normalizedInserted = Array.isArray(insertedData)
          ? insertedData.map((row: any) => mapVehicleRowToState(row))
          : [];
        if (normalizedInserted.length > 0) {
          setVehicles((prev) => [
            ...normalizedInserted,
            ...prev.filter((vehicle) => !normalizedInserted.some((added) => added.plate === vehicle.plate)),
          ]);
        }
      }
      showNotification(`${data.length} registros importados`, 'success');
      addActivity('alerta', 'Importação XLSX', `${data.length} registros de ${type} adicionados`);
    } else {
      showNotification('Erro na importação', 'error');
    }
  };

  const handleSyncFleetAPI = async (token: string) => {
    try {
      showNotification('Iniciando sincronização via Bridge (AWS API)...', 'info');
      let allVeiculos: any[] = [];
      let nextUrl = 'https://cubogpm-frota.nortesistech.com/api/veiculos/?format=json';

      const edgeFunctionUrl = `${api.getBaseUrl()}/fleet-sync`;
      const authToken = api.getAuthToken();

      while (nextUrl) {
        console.log(`Chamando Bridge para: ${nextUrl}`);

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({ token, url: nextUrl })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Erro desconhecido no Bridge' }));
          throw new Error(err.error || `Erro no Proxy (${response.status})`);
        }

        const data = await response.json();
        allVeiculos = [...allVeiculos, ...data.results];
        nextUrl = data.next;

        if (allVeiculos.length % 500 === 0) {
          console.log(`Carregados ${allVeiculos.length} veículos...`);
        }
      }

      console.log(`Total de veículos recuperados: ${allVeiculos.length}`);

      const processedData = allVeiculos.map((v) =>
        toVehiclePayload({
          plate: v.cod_placa,
          model: v.modelo_veiculo,
          type: v.des_tip_veic,
          status: v.id_ativo === 1 ? 'Disponível' : 'Manutenção',
          lastMaintenance: v.dta_ult_manut,
          costCenter: v.centro_custo,
        })
      );

      const { error } = await api
        .from('fleet_vehicles')
        .eq('source_module', 'gestao_frota')
        .insert(processedData);

      if (error) throw error;

      setVehicles(processedData.map((row) => mapVehicleRowToState(row)));

      showNotification(`${processedData.length} veículos sincronizados com sucesso via Bridge!`, 'success');
      addActivity('alerta', 'Sincronização API', `${processedData.length} veículos atualizados via Fleet API`);
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      showNotification(`Falha na sincronização: ${error.message}`, 'error');
    }
  };

  const handleRemoveMasterRecord = async (type: 'item' | 'vendor' | 'vehicle', id: string) => {
    let table = '';
    let matchKey = '';
    if (type === 'item') { table = 'inventory'; matchKey = 'sku'; }
    else if (type === 'vendor') { table = 'vendors'; matchKey = 'id'; }
    else if (type === 'vehicle') { table = 'fleet_vehicles'; matchKey = 'placa'; }

    const deleteRequest =
      table === 'fleet_vehicles'
        ? api.from(table).eq('source_module', 'gestao_frota').eq(matchKey, id).delete()
        : api.from(table).eq(matchKey, id).delete();
    const { error } = await deleteRequest;
    if (!error) {
      if (type === 'item') {
        const targetPage = pagedMasterDataItems.length === 1 && masterDataItemsPage > 1
          ? masterDataItemsPage - 1
          : masterDataItemsPage;
        await loadInventoryForWarehouse(activeWarehouse, INITIAL_INVENTORY_LIMIT);
        if (activeModule === 'cadastro') {
          setMasterDataItemsPage(targetPage);
          await fetchMasterDataItemsPage(targetPage);
        }
      }
      if (type === 'vendor') {
        setVendors(prev => prev.filter(x => x.id !== id));
        const targetPage = pagedVendors.length === 1 && vendorsPage > 1
          ? vendorsPage - 1
          : vendorsPage;
        if (activeModule === 'cadastro') {
          setVendorsPage(targetPage);
          await fetchVendorsPage(targetPage);
        }
      }
      if (type === 'vehicle') setVehicles(prev => prev.filter(x => x.plate !== id));
      showNotification('Registro removido', 'success');
    }
  };

  /* Create Auto PO */
  const handleCreateAutoPO = async (item: InventoryItem) => {
    const alreadyRequested = purchaseOrders.some(po =>
      (po.status === 'requisicao' || po.status === 'cotacao' || po.status === 'pendente') &&
      po.items.some(i => i.sku === item.sku)
    );

    if (alreadyRequested) {
      showNotification(`Já existe uma requisição em andamento para ${item.name}`, 'warning');
      return;
    }

    const neededQty = Math.max(0, item.maxQty - item.quantity);
    if (neededQty <= 0) {
      showNotification(`Estoque de ${item.name} já está suprido.`, 'info');
      return;
    }

    const createdAtIso = nowIso();
    const initialHistory = [
      createPOStatusHistoryEntry('requisicao', 'Pedido automático gerado por regra de estoque crítico')
    ];

    const autoPO: PurchaseOrder = {
      id: `AUTO-${Date.now()}`,
      vendor: 'A definir via cotações',
      requestDate: toPtBrDateTime(createdAtIso, formatDateTimePtBR(new Date(), '')),
      status: 'requisicao',
      priority: 'urgente',
      total: 0,
      requester: 'Norte Tech AI (Estoque Crítico)',
      items: [{
        sku: item.sku,
        name: item.name,
        qty: neededQty,
        price: 0
      }],
      approvalHistory: initialHistory,
      warehouseId: activeWarehouse // NOVO
    };

    const { error } = await api.from('purchase_orders').insert({
      id: autoPO.id,
      vendor: autoPO.vendor,
      status: autoPO.status,
      priority: autoPO.priority,
      total: autoPO.total,
      requester: autoPO.requester,
      items: autoPO.items,
      request_date: createdAtIso,
      approval_history: initialHistory,
      warehouse_id: activeWarehouse
    });

    if (!error) {
      setPurchaseOrders(prev => [autoPO, ...prev]);
      setPagedPurchaseOrders(prev => [autoPO, ...prev].slice(0, PURCHASE_ORDERS_PAGE_SIZE));
      addActivity('compra', 'Requisição Manual de Estoque', `Gerado PO ${autoPO.id} para item crítico`);
      showNotification(`Requisição criada com sucesso! Adicione as cotações.`, 'success');
    } else {
      showNotification('Erro ao criar requisição', 'error');
    }
  };



  const getPageTitle = (module: Module) => {
    switch (module) {
      case 'dashboard': return 'Dashboard Operacional';
      case 'recebimento': return 'Recebimento de Cargas';
      case 'movimentacoes': return 'Auditoria de Movimentações';
      case 'auditoria_geral': return 'Auditoria Geral';
      case 'estoque': return 'Gestão de Inventário';
      case 'expedicao': return 'Solicitações SA';
      case 'cadastro': return 'Cadastro de Mestres';
      case 'compras': return 'Pedidos de Compra';
      default: return 'Norte Tech WMS';
    }
  };

  const handleLogin = (loggedInUser: User, token?: string, registerActivity = true) => {
    const normalizedUser = normalizeUserSession(loggedInUser);
    localStorage.setItem('logged_user', JSON.stringify(normalizedUser));
    if (token) {
      api.setAuthToken(token);
    }

    setUser(normalizedUser);

    // Configurar armazéns permitidos baseados na role e permissões
    let allowed: string[] = [];
    if (normalizedUser.role === 'admin') {
      allowed = warehouses.length > 0 ? warehouses.map(w => w.id) : ['ARMZ28', 'ARMZ33'];
    } else {
      allowed = normalizedUser.allowedWarehouses || [];
    }

    setUserWarehouses(allowed);

    if (registerActivity) {
      addActivity('alerta', 'Login Realizado', `Usuário ${normalizedUser.name} acessou o sistema`);
    }

    // Mostrar ModuleSelector após login (em vez de carregar dados direto)
    setCurrentSystemModule(null);
  };

  // Update logout to also reset system module
  const logout = () => {
    api.clearAuthToken();
    localStorage.removeItem('logged_user');
    pageFetchSequence.current.movements += 1;
    pageFetchSequence.current.purchaseOrders += 1;
    pageFetchSequence.current.materialRequests += 1;
    pageFetchSequence.current.masterDataItems += 1;
    setPurchaseOrders([]);
    setMovements([]);
    setMaterialRequests([]);
    setIsPurchaseOrdersFullyLoaded(false);
    setIsMovementsFullyLoaded(false);
    setIsMaterialRequestsFullyLoaded(false);
    setIsDeferredModuleLoading(false);
    setPagedPurchaseOrders([]);
    setPagedMovements([]);
    setPagedMaterialRequests([]);
    setPagedMasterDataItems([]);
    setPagedVendors([]);
    setHasMorePurchaseOrders(false);
    setHasMoreMovements(false);
    setHasMoreMaterialRequests(false);
    setHasMoreMasterDataItems(false);
    setHasMoreVendors(false);
    setIsPurchaseOrdersPageLoading(false);
    setIsMovementsPageLoading(false);
    setIsMaterialRequestsPageLoading(false);
    setIsMasterDataItemsPageLoading(false);
    setIsVendorsPageLoading(false);
    setPurchaseOrdersPage(1);
    setMovementsPage(1);
    setMaterialRequestsPage(1);
    setMasterDataItemsPage(1);
    setVendorsPage(1);
    setMasterDataItemsTotal(0);
    setVendorsTotal(0);
    setInventoryCatalog([]);
    setIsInventoryCatalogLoaded(false);
    fullLoadInFlight.current.clear();
    setUser(null);
    setCurrentSystemModule(null);
    setWorkOrders([]);
    setMechanics([]);
  };

  const handleUpdateInventoryQuantity = async (
    sku: string,
    qty: number,
    reason = 'Saída para Expedição',
    orderId?: string,
    warehouseId?: string
  ) => {
    const targetWarehouseId = warehouseId || activeWarehouse;
    const item = inventory.find(i => i.sku === sku && i.warehouseId === targetWarehouseId);
    if (!item) {
      showNotification(`Item ${sku} não encontrado no inventário do armazém ${targetWarehouseId}.`, 'error');
      return false;
    }

    const newQuantity = item.quantity - qty;
    if (newQuantity < 0) {
      showNotification(`Estoque insuficiente para ${sku}. Disponível: ${item.quantity}, Solicitado: ${qty}`, 'error');
      return false;
    }

    let { error } = await api
      .from('inventory')
      .eq('sku', sku)
      .eq('warehouse_id', targetWarehouseId)
      .update({ quantity: newQuantity });

    if (error) {
      const errorMessage = String(error?.message || error || '').toLowerCase();
      const notFound = errorMessage.includes('nenhum registro encontrado');
      if (notFound) {
        const fallbackUpdate = await api
          .from('inventory')
          .eq('sku', sku)
          .update({ quantity: newQuantity, warehouse_id: targetWarehouseId });
        error = fallbackUpdate?.error || null;
      }
    }

    if (!error) {
      setInventory(prev => prev.map(i => (i.sku === sku && i.warehouseId === targetWarehouseId) ? { ...i, quantity: newQuantity } : i));
      setInventoryCatalog((prev) => prev.map((i) => (i.sku === sku ? { ...i, quantity: newQuantity } : i)));
      const movementSaved = await recordMovement('saida', item, qty, reason, orderId, targetWarehouseId);

      if (!movementSaved) {
        const rollbackResult = await api
          .from('inventory')
          .eq('sku', sku)
          .eq('warehouse_id', targetWarehouseId)
          .update({ quantity: item.quantity });

        if (!rollbackResult.error) {
          setInventory(prev => prev.map(i => (i.sku === sku && i.warehouseId === targetWarehouseId) ? { ...i, quantity: item.quantity } : i));
          setInventoryCatalog((prev) => prev.map((i) => (i.sku === sku ? { ...i, quantity: item.quantity } : i)));
        }

        showNotification(
          `Saída de ${sku} cancelada: não foi possível registrar a movimentação${rollbackResult.error ? ' e o rollback automático falhou' : ''}.`,
          'error'
        );
        return false;
      }

      showNotification(`Estoque de ${sku} atualizado para ${newQuantity}.`, 'success');
      return true;
    } else {
      showNotification(`Erro ao atualizar estoque de ${sku}: ${String(error?.message || error || 'falha desconhecida')}`, 'error');
      return false;
    }
  };

  const handleRequestCreate = async (data: MaterialRequest) => {
    const requestPayload = {
      ...data,
      warehouseId: data.warehouseId || activeWarehouse
    };

    const { error } = await api.from('material_requests').insert({
      id: requestPayload.id,
      sku: requestPayload.sku,
      name: requestPayload.name,
      qty: requestPayload.qty,
      plate: requestPayload.plate,
      dept: requestPayload.dept,
      priority: requestPayload.priority,
      status: requestPayload.status,
      cost_center: requestPayload.costCenter,
      warehouse_id: requestPayload.warehouseId
    });
    if (error) {
      showNotification('Erro ao criar solicitação', 'error');
    } else {
      setMaterialRequests(prev => [requestPayload, ...prev]);
      if (materialRequestsPage === 1 && requestPayload.warehouseId === activeWarehouse) {
        setPagedMaterialRequests(prev => [requestPayload, ...prev].slice(0, MATERIAL_REQUESTS_PAGE_SIZE));
      }

      await recordMovement(
        'ajuste',
        {
          sku: requestPayload.sku,
          name: requestPayload.name,
          location: `SA-${requestPayload.dept || 'OPERACOES'}`,
          batch: '-',
          expiry: '',
          quantity: 0,
          status: 'disponivel',
          imageUrl: '',
          category: 'Solicitações SA',
          unit: 'UN',
          minQty: 0,
          maxQty: 0,
          leadTime: 0,
          safetyStock: 0,
          warehouseId: requestPayload.warehouseId || activeWarehouse
        },
        0,
        `Solicitação SA ${requestPayload.id} criada para placa ${requestPayload.plate}`,
        requestPayload.id
      );

      showNotification('Solicitação criada com sucesso!', 'success');
      addActivity('expedicao', 'Nova Solicitação SA', `Item ${requestPayload.sku} solicitado para veículo ${requestPayload.plate}`);
    }
  };

  const handleRequestUpdate = async (id: string, status: RequestStatus) => {
    const currentRequest = materialRequests.find(request => request.id === id);

    const isApprovalStep =
      currentRequest?.status === 'aprovacao' && status === 'separacao';
    if (isApprovalStep && user?.role !== 'admin') {
      showNotification('Apenas administrador pode aprovar solicitações SA.', 'error');
      return;
    }

    const { error } = await api.from('material_requests').update({ status }).eq('id', id);
    if (error) {
      showNotification('Erro ao atualizar status', 'error');
    } else {
      setMaterialRequests(prev => prev.map(request => request.id === id ? { ...request, status } : request));
      setPagedMaterialRequests(prev => prev.map(request => request.id === id ? { ...request, status } : request));

      if (currentRequest && currentRequest.status !== status) {
        await recordMovement(
          'ajuste',
          {
            sku: currentRequest.sku,
            name: currentRequest.name,
            location: `SA-${currentRequest.dept || 'OPERACOES'}`,
            batch: '-',
            expiry: '',
            quantity: 0,
            status: 'disponivel',
            imageUrl: '',
            category: 'Solicitações SA',
            unit: 'UN',
            minQty: 0,
            maxQty: 0,
            leadTime: 0,
            safetyStock: 0,
            warehouseId: currentRequest.warehouseId || activeWarehouse
          },
          0,
          `Solicitação SA ${id}: ${currentRequest.status} -> ${status}`,
          id
        );
      }
      showNotification('Status da solicitação atualizado!', 'success');
    }
  };

  const handleRequestEdit = async (id: string, data: Partial<MaterialRequest>) => {
    const currentRequest = materialRequests.find((request) => request.id === id);
    const isApprovalTransitionByEdit =
      currentRequest?.status === 'aprovacao' &&
      data.status === 'separacao' &&
      user?.role !== 'admin';

    if (isApprovalTransitionByEdit) {
      showNotification('Apenas administrador pode aprovar solicitações SA.', 'error');
      throw new Error('Aprovação bloqueada para usuário não administrador.');
    }

    const { error } = await api.from('material_requests').update({
      sku: data.sku,
      name: data.name,
      qty: data.qty,
      plate: data.plate,
      dept: data.dept,
      priority: data.priority,
      status: data.status,
      cost_center: data.costCenter
      // NOT sending items as it may not exist in DB schema
    }).eq('id', id);

    if (error) {
      showNotification('Erro ao editar solicitação', 'error');
      throw error;
    } else {
      setMaterialRequests(prev => prev.map(request => request.id === id ? { ...request, ...data } : request));
      setPagedMaterialRequests(prev => prev.map(request => request.id === id ? { ...request, ...data } : request));
      showNotification('Solicitação editada com sucesso!', 'success');
    }
  };

  const handleRequestDelete = async (id: string) => {
    const { error } = await api.from('material_requests').delete().eq('id', id);
    if (error) {
      showNotification('Erro ao remover solicitação', 'error');
      throw error;
    } else {
      setMaterialRequests(prev => prev.filter(request => request.id !== id));
      setPagedMaterialRequests(prev => prev.filter(request => request.id !== id));
      showNotification('Solicitação removida com sucesso!', 'success');
    }
  };

  // Workshop Handlers
  const handleSelectSystemModule = async (module: SystemModule) => {
    if (module === 'workshop' && !canAccessWorkshop()) return;
    if (module === 'fleet' && !canAccessFleet()) return;

    setCurrentSystemModule(module);
    setIsLoading(true);

    if (module === 'warehouse') {
      // Carregar dados do warehouse
      const bootstrapData = loadBootstrapDataRef.current;
      if (bootstrapData) {
        await bootstrapData(activeWarehouse);
      }
    } else if (module === 'workshop') {
      await loadWorkshopData();
      await flushWorkshopQueue();
    } else if (module === 'fleet') {
      // Módulo isolado de gestão de frota: não depende dos carregamentos do armazém/oficina.
    }

    setIsLoading(false);
  };

  const loadWorkshopData = async () => {
    try {
      // Seed data de veículos para teste
      const seedVehicles: Vehicle[] = [
        { plate: 'BGM-1001', model: 'Volvo FH 540', type: 'Caminhão', status: 'Disponível', lastMaintenance: '15/01/2026', costCenter: 'OPS-CD' },
        { plate: 'CHN-1002', model: 'Mercedes Actros', type: 'Carreta', status: 'Disponível', lastMaintenance: '20/01/2026', costCenter: 'MAN-OFI' },
        { plate: 'DIO-1003', model: 'Volvo FH 460', type: 'Utilitário', status: 'Em Viagem', lastMaintenance: '10/01/2026', costCenter: 'OPS-CD' },
        { plate: 'ELQ-1004', model: 'Scania R450', type: 'Caminhão', status: 'Manutenção', lastMaintenance: '25/01/2026', costCenter: 'OPS-CD' },
        { plate: 'FKQ-1005', model: 'Mercedes Atego', type: 'Utilitário', status: 'Disponível', lastMaintenance: '18/01/2026', costCenter: 'MAN-OFI' },
        { plate: 'GLB-1006', model: 'Volvo FM 370', type: 'Caminhão', status: 'Disponível', lastMaintenance: '22/01/2026', costCenter: 'OPS-CD' },
        { plate: 'HMT-1007', model: 'Iveco Stralis', type: 'Carreta', status: 'Em Viagem', lastMaintenance: '12/01/2026', costCenter: 'MAN-OFI' },
        { plate: 'INY-1008', model: 'Scania G410', type: 'Caminhão', status: 'Disponível', lastMaintenance: '28/01/2026', costCenter: 'OPS-CD' }
      ];

      // Seed data de mecânicos para teste
      const seedMechanics: Mechanic[] = [
        {
          id: 'MEC-001',
          name: 'João Silva',
          specialty: 'Motor e Transmissão',
          shift: 'manha',
          status: 'disponivel',
          currentWorkOrders: [],
          productivity: { ordersCompleted: 45, avgHoursPerOrder: 4.2, onTimeRate: 92 }
        },
        {
          id: 'MEC-002',
          name: 'Pedro Santos',
          specialty: 'Elétrica e Eletrônica',
          shift: 'tarde',
          status: 'ocupado',
          currentWorkOrders: ['OS-001'],
          productivity: { ordersCompleted: 38, avgHoursPerOrder: 5.1, onTimeRate: 88 }
        },
        {
          id: 'MEC-003',
          name: 'Carlos Oliveira',
          specialty: 'Suspensão e Freios',
          shift: 'noite',
          status: 'disponivel',
          currentWorkOrders: [],
          productivity: { ordersCompleted: 52, avgHoursPerOrder: 3.8, onTimeRate: 95 }
        },
        {
          id: 'MEC-004',
          name: 'Antônio Ferreira',
          specialty: 'Pneus e Rodas',
          shift: 'manha',
          status: 'ocupado',
          currentWorkOrders: ['OS-002'],
          productivity: { ordersCompleted: 41, avgHoursPerOrder: 2.5, onTimeRate: 96 }
        }
      ];

      // Seed data de ordens de serviço para teste
      const seedWorkOrders: WorkOrder[] = [
        {
          id: 'OS-001',
          vehiclePlate: 'ELQ-1004',
          vehicleModel: 'Scania R450',
          status: 'em_execucao',
          type: 'corretiva',
          priority: 'alta',
          mechanicId: 'MEC-002',
          mechanicName: 'Pedro Santos',
          description: 'Troca de óleo do motor e revisão de freios',
          services: [
            { id: 'S1', description: 'Troca de óleo motor', category: 'motor', estimatedHours: 1, completed: true },
            { id: 'S2', description: 'Revisão sistema de freios', category: 'freios', estimatedHours: 2, completed: false }
          ],
          parts: [
            { id: 'P1', sku: 'OLEO-15W40', name: 'Óleo Motor 15W40', qtyRequested: 20, qtyUsed: 18, status: 'entregue', unitCost: 25.50 },
            { id: 'P2', sku: 'FILT-001', name: 'Filtro de Óleo', qtyRequested: 2, qtyUsed: 2, status: 'entregue', unitCost: 45.00 }
          ],
          openedAt: '2026-02-08T08:00:00Z',
          estimatedHours: 3,
          actualHours: 2.5,
          costCenter: 'MAN-OFI',
          cost: { labor: 150, parts: 600, thirdParty: 0, total: 750 },
          createdBy: 'Sistema',
          warehouseId: 'ARMZ28'
        },
        {
          id: 'OS-002',
          vehiclePlate: 'HMT-1007',
          vehicleModel: 'Iveco Stralis',
          status: 'aguardando_pecas',
          type: 'preventiva',
          priority: 'normal',
          mechanicId: 'MEC-004',
          mechanicName: 'Antônio Ferreira',
          description: 'Revisão preventiva de 50.000 km',
          services: [
            { id: 'S3', description: 'Troca de pneus dianteiros', category: 'pneus', estimatedHours: 1.5, completed: false },
            { id: 'S4', description: 'Alinhamento e balanceamento', category: 'suspensao', estimatedHours: 2, completed: false }
          ],
          parts: [
            { id: 'P3', sku: 'PNEU-295', name: 'Pneu 295/80 R22.5', qtyRequested: 4, status: 'pendente', unitCost: 850.00 }
          ],
          openedAt: '2026-02-07T10:30:00Z',
          estimatedHours: 3.5,
          costCenter: 'MAN-OFI',
          cost: { labor: 200, parts: 3400, thirdParty: 150, total: 3750 },
          createdBy: 'Sistema',
          warehouseId: 'ARMZ28'
        },
        {
          id: 'OS-003',
          vehiclePlate: 'DIO-1003',
          vehicleModel: 'Volvo FH 460',
          status: 'aguardando',
          type: 'corretiva',
          priority: 'urgente',
          description: 'Problema no sistema de ar condicionado',
          services: [
            { id: 'S5', description: 'Diagnóstico e reparo do ar condicionado', category: 'eletrica', estimatedHours: 3, completed: false }
          ],
          parts: [],
          openedAt: '2026-02-08T14:00:00Z',
          estimatedHours: 3,
          costCenter: 'OPS-CD',
          cost: { labor: 180, parts: 0, thirdParty: 0, total: 180 },
          createdBy: 'Sistema',
          warehouseId: 'ARMZ28'
        }
      ];

      const normalizedSeedWorkOrders = seedWorkOrders.map((order) => ({
        ...order,
        statusTimers: buildStatusTimers(order.statusTimers),
        lastStatusChange: order.lastStatusChange || order.openedAt,
        isTimerActive: order.status === 'em_execucao',
        totalSeconds: order.totalSeconds || 0,
      }));

      // Seed data de detalhes de veículos
      const seedVehicleDetails: VehicleDetail[] = seedVehicles.map(v => ({
        ...v,
        chassis: `CHASSIS-${v.plate.replace(/-/g, '')}`,
        year: 2020 + Math.floor(Math.random() * 5),
        mileage: 50000 + Math.floor(Math.random() * 200000),
        engineHours: 2000 + Math.floor(Math.random() * 5000),
        costCenter: v.costCenter || 'OPS-CD',
        documents: [
          { type: 'licenciamento', status: 'ativo', expiryDate: '2026-12-31', notes: 'Licenciamento em dia' },
          { type: 'seguro', status: 'ativo', expiryDate: '2026-06-30', notes: 'Seguro vigente' }
        ],
        components: [
          { id: 'C1', name: 'Óleo Motor', category: 'oleo_motor', health: 85, status: 'bom', lastService: '2026-01-15', nextServiceKm: 55000, currentValue: '85%', unit: '%' },
          { id: 'C2', name: 'Pneus Dianteiros', category: 'pneus', health: 60, status: 'atencao', lastService: '2025-11-20', nextServiceKm: 60000, currentValue: '6.5mm', unit: 'mm' },
          { id: 'C3', name: 'Bateria', category: 'bateria', health: 90, status: 'bom', lastService: '2025-08-10', nextServiceDate: '2027-08-10', currentValue: '12.8V', unit: 'V' },
          { id: 'C4', name: 'Freios', category: 'freios', health: 70, status: 'bom', lastService: '2025-12-05', nextServiceKm: 58000, currentValue: '70%', unit: '%' }
        ],
        events: [
          { id: 'E1', type: 'manutencao', title: 'Revisão 50.000km', description: 'Troca de filtros e óleo', date: '2026-01-15', mechanic: 'João Silva', status: 'concluido', cost: 450 },
          { id: 'E2', type: 'checklist', title: 'Checklist Diário', description: 'Verificação de fluidos e pneus', date: '2026-02-08', status: 'aprovado' }
        ],
        statusOperacional: v.status === 'Manutenção' ? 'manutencao' : v.status === 'Em Viagem' ? 'em_viagem' : 'operacional'
      }));

      // Carregar mecânicos do banco ou usar seed
      const { data: mechanicsData } = await api.from('mechanics').select('*');
      if (mechanicsData && mechanicsData.length > 0) {
        setMechanics(mechanicsData.map((m: any) => ({
          id: m.id,
          name: m.name,
          specialty: m.specialty,
          shift: m.shift,
          status: m.status,
          currentWorkOrders: m.current_work_orders || [],
          productivity: {
            ordersCompleted: m.orders_completed || 0,
            avgHoursPerOrder: m.avg_hours_per_order || 0,
            onTimeRate: m.on_time_rate || 100
          }
        })));
      } else {
        setMechanics(seedMechanics);
      }

      // Carregar ordens de serviço do banco ou usar seed
      const { data: workOrdersData, error: workOrdersError } = await api
        .from('work_orders')
        .select('*')
        .order('opened_at', { ascending: false });
      if (workOrdersError) {
        console.error('Erro ao carregar ordens de servico', workOrdersError);
      }
      const normalizedWorkOrders = normalizeWorkOrders(workOrdersData, {
        warehouseId: activeWarehouse,
        createdBy: user?.name || 'Sistema',
      });
      if (normalizedWorkOrders.length > 0) {
        setWorkOrders(normalizedWorkOrders);
      } else {
        if (Array.isArray(workOrdersData) && workOrdersData.length > 0) {
          console.error('Ordens de servico invalidas, usando dados locais', workOrdersData);
          showNotification('Dados de ordens de serviço inválidos. Exibindo dados locais.', 'warning');
        }
        setWorkOrders(normalizedSeedWorkOrders);
      }

      const { data: assignmentData } = await api
        .from('work_order_assignments')
        .select('*')
        .order('timestamp', { ascending: false });
      if (assignmentData) {
        setWorkOrderAssignments(assignmentData.map((row: any) => mapWorkOrderAssignmentRow(row)));
      } else {
        setWorkOrderAssignments([]);
      }

      // Carregar veículos do banco ou usar seed
      const { data: vehData } = await api
        .from('fleet_vehicles')
        .select('*')
        .eq('source_module', 'gestao_frota');
      if (vehData && vehData.length > 0) {
        setVehicles(vehData.map((row: any) => mapVehicleRowToState(row)));
      } else {
        setVehicles(seedVehicles);
      }

      // Definir detalhes dos veículos
      setVehicleDetails(seedVehicleDetails);

    } catch (error) {
      console.error('Erro ao carregar dados da oficina', error);
      showNotification('Erro ao carregar dados da oficina', 'error');
      setWorkshopActiveModule('dashboard');
    }
  };

  const handleLockWorkOrder = async (orderId: string) => {
    if (!user) return;
    const { error } = await api.from('work_orders').eq('id', orderId).update({
      locked_by: user.id,
      locked_at: new Date().toISOString()
    });
    if (!error) {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? { ...o, lockedBy: user.id, lockedAt: new Date().toISOString() } : o));
    }
  };
  const handleUnlockWorkOrder = async (orderId: string) => {
    const { error } = await api.from('work_orders').eq('id', orderId).update({
      locked_by: null,
      locked_at: null
    });
    if (!error) {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? { ...o, lockedBy: undefined, lockedAt: undefined } : o));
    }
  };

  const handleUpdateWorkOrderStatus = async (orderId: string, newStatus: WorkOrderStatus) => {
    const now = nowIso();
    const order = workOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.lockedBy && order.lockedBy !== user?.id) {
      showNotification('Esta OS esta sendo editada por outro usuario.', 'error');
      return;
    }

    const elapsedSeconds = computeElapsedSeconds(order.lastStatusChange || order.openedAt, now);
    const statusTimers = buildStatusTimers(order.statusTimers);
    statusTimers[order.status] = (statusTimers[order.status] || 0) + elapsedSeconds;

    const totalSeconds = (order.totalSeconds || 0) + elapsedSeconds;
    const isTimerActive = newStatus === 'em_execucao';
    const updatedServices = applyServiceTimersOnStatusChange(order.services || [], newStatus, now);
    const actualHours = computeOrderActualHours(updatedServices, now);

    const statusLogEntry =
      order.status !== newStatus
        ? {
          id: generateUuid(),
          work_order_id: orderId,
          previous_status: order.status,
          new_status: newStatus,
          timestamp: now,
          user_id: user?.id,
          duration_seconds: elapsedSeconds,
        }
        : null;

    if (statusLogEntry) {
      try {
        await api.from('work_order_logs').insert(statusLogEntry);
      } catch (logError) {
        console.warn('Falha ao registrar log de status da OS', logError);
        enqueueWorkshopOp({
          id: generateUuid(),
          table: 'work_order_logs',
          method: 'POST',
          payload: statusLogEntry,
          createdAt: now,
        });
      }
    }

    const updatePayload = {
      status: newStatus,
      closed_at: newStatus === 'finalizada' ? now : null,
      total_seconds: totalSeconds,
      last_status_change: now,
      is_timer_active: isTimerActive,
      status_timers: statusTimers,
      services: updatedServices,
      actual_hours: actualHours,
    };

    const { error } = await api.from('work_orders').eq('id', orderId).update(updatePayload);

    const applyLocalStatusUpdate = () => {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: newStatus,
        closedAt: newStatus === 'finalizada' ? now : undefined,
        totalSeconds,
        lastStatusChange: now,
        isTimerActive,
        statusTimers,
        services: updatedServices,
        actualHours,
      } : o));
    };

    if (!error) {
      applyLocalStatusUpdate();
      showNotification(`Status da OS ${orderId} atualizado`, 'success');
    } else {
      applyLocalStatusUpdate();
      enqueueWorkshopOp({
        id: generateUuid(),
        table: 'work_orders',
        method: 'PATCH',
        query: { id: orderId },
        payload: updatePayload,
        createdAt: now,
      });
      showNotification('Status atualizado localmente (falha ao persistir no backend).', 'warning');
    }
  };

  const handleAssignMechanic = async (orderId: string, mechanicId: string) => {
    const mechanic = mechanics.find(m => m.id === mechanicId);
    const { error } = await api.from('work_orders').eq('id', orderId).update({
      mechanic_id: mechanicId,
      mechanic_name: mechanic?.name
    });

    if (!error) {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        mechanicId,
        mechanicName: mechanic?.name
      } : o));
      showNotification(`Mecanico atribuido a OS ${orderId}`, 'success');
    } else {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        mechanicId,
        mechanicName: mechanic?.name
      } : o));
      enqueueWorkshopOp({
        id: generateUuid(),
        table: 'work_orders',
        method: 'PATCH',
        query: { id: orderId },
        payload: { mechanic_id: mechanicId, mechanic_name: mechanic?.name },
        createdAt: nowIso(),
      });
      showNotification('Mecanico atribuido localmente (falha ao persistir no backend).', 'warning');
    }
  };

  const handleCreateWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'openedAt' | 'createdBy'>) => {
    const plateKey = normalizePlateKey(workOrder.vehiclePlate);
    if (!plateKey) {
      showNotification('Selecione uma placa válida antes de criar a OS.', 'error');
      return;
    }
    if (!workOrder.workshopUnit) {
      showNotification('Selecione a oficina responsável antes de criar a OS.', 'error');
      return;
    }
    const hasOpenOrder = workOrders.some(
      (order) =>
        normalizePlateKey(order.vehiclePlate) === plateKey &&
        !['finalizada', 'cancelada'].includes(order.status)
    );
    if (hasOpenOrder) {
      showNotification('Já existe uma OS aberta para esta placa. Finalize ou cancele antes de criar outra.', 'error');
      return;
    }

    const id = `OS-${Date.now()}`;
    const openedAt = nowIso();
    const baseServices = Array.isArray(workOrder.services) ? workOrder.services : [];
    const hasAssignedService = baseServices.some(service => Boolean(service.mechanicId));
    const createdStatus: WorkOrderStatus = hasAssignedService ? 'em_execucao' : 'aguardando';
    const createdIsTimerActive = createdStatus === 'em_execucao';

    let supervisorId = workOrder.supervisorId;
    let supervisorName = workOrder.supervisorName;
    if (supervisorId) {
      const supervisor = workshopSupervisors.find(item => item.id === supervisorId);
      if (!supervisor) {
        showNotification('Selecione um supervisor mecanico valido.', 'error');
        return;
      }
      supervisorName = supervisor.name;
    } else if (defaultWorkshopSupervisor) {
      supervisorId = defaultWorkshopSupervisor.id;
      supervisorName = defaultWorkshopSupervisor.name;
    }

    const normalizedServices: ServiceItem[] = baseServices.map((service) => {
      const hasMechanic = Boolean(service.mechanicId);
      const shouldRun = createdIsTimerActive && hasMechanic;
      return {
        ...service,
        actualSeconds: service.actualSeconds || 0,
        startedAt: shouldRun ? openedAt : service.startedAt,
        isTimerActive: shouldRun,
      };
    });

    const statusTimers = buildStatusTimers(workOrder.statusTimers);
    const actualHours = computeOrderActualHours(normalizedServices, openedAt);
    const cost = workOrder.cost || { labor: 0, parts: 0, thirdParty: 0, total: 0 };

    const assignmentLogs = normalizedServices
      .filter((service) => Boolean(service.mechanicId))
      .map((service) => ({
        id: generateUuid(),
        work_order_id: id,
        service_id: service.id,
        previous_mechanic_id: null,
        previous_mechanic_name: null,
        new_mechanic_id: service.mechanicId,
        new_mechanic_name: service.mechanicName,
        service_category: service.category,
        service_description: service.description,
        timestamp: openedAt,
        accumulated_seconds: service.actualSeconds || 0,
        created_by: user?.name || 'Sistema',
        warehouse_id: activeWarehouse,
      }));

    const insertPayload = {
      id,
      vehicle_plate: workOrder.vehiclePlate,
      vehicle_model: workOrder.vehicleModel,
      status: createdStatus,
      type: workOrder.type,
      priority: workOrder.priority,
      mechanic_id: workOrder.mechanicId,
      mechanic_name: workOrder.mechanicName,
      supervisor_id: supervisorId,
      supervisor_name: supervisorName,
      workshop_unit: workOrder.workshopUnit,
      description: workOrder.description,
      services: normalizedServices,
      parts: workOrder.parts || [],
      opened_at: openedAt,
      estimated_hours: workOrder.estimatedHours,
      actual_hours: actualHours,
      cost_center: workOrder.costCenter,
      cost_labor: cost.labor,
      cost_parts: cost.parts,
      cost_third_party: cost.thirdParty,
      cost_total: cost.total,
      created_by: user?.name || 'Sistema',
      warehouse_id: activeWarehouse,
      total_seconds: 0,
      last_status_change: openedAt,
      is_timer_active: createdIsTimerActive,
      status_timers: statusTimers,
    };

    const { error, status: insertStatus } = await api.from('work_orders').insert(insertPayload);

    if (error && insertStatus === 409) {
      showNotification(error, 'error');
      return;
    }

    if (!error && assignmentLogs.length > 0) {
      try {
        await api.from('work_order_assignments').insert(assignmentLogs);
        setWorkOrderAssignments(prev => [...assignmentLogs.map((row) => mapWorkOrderAssignmentRow(row)), ...prev]);
      } catch (logError) {
        console.warn('Falha ao registrar atribuicoes de servico', logError);
        enqueueWorkshopOp({
          id: generateUuid(),
          table: 'work_order_assignments',
          method: 'POST',
          payload: assignmentLogs,
          createdAt: openedAt,
        });
      }
    }

    const newOrder: WorkOrder = {
      ...workOrder,
      id,
      openedAt,
      createdBy: user?.name || 'Sistema',
      status: createdStatus,
      totalSeconds: 0,
      lastStatusChange: openedAt,
      isTimerActive: createdIsTimerActive,
      statusTimers,
      services: normalizedServices,
      actualHours,
      supervisorId,
      supervisorName,
      workshopUnit: workOrder.workshopUnit,
      cost,
    };

    if (!error) {
      setWorkOrders(prev => [newOrder, ...prev]);
      showNotification(`OS ${id} criada com sucesso!`, 'success');
      return id;
    }

    setWorkOrders(prev => [newOrder, ...prev]);
    enqueueWorkshopOp({
      id: generateUuid(),
      table: 'work_orders',
      method: 'POST',
      payload: insertPayload,
      createdAt: openedAt,
    });
    if (assignmentLogs.length > 0) {
      enqueueWorkshopOp({
        id: generateUuid(),
        table: 'work_order_assignments',
        method: 'POST',
        payload: assignmentLogs,
        createdAt: openedAt,
      });
    }
    showNotification('OS criada localmente (falha ao persistir no backend).', 'warning');
    return id;
  };

  const handleUpdateWorkOrder = async (orderId: string, updates: Partial<WorkOrder>) => {
    const order = workOrders.find(o => o.id === orderId);
    if (!order) return;

    const now = nowIso();
    if (updates.vehiclePlate) {
      const nextPlateKey = normalizePlateKey(updates.vehiclePlate);
      if (!nextPlateKey) {
        showNotification('Placa inválida para atualização da OS.', 'error');
        return;
      }
      const hasOpenOrder = workOrders.some(
        (item) =>
          item.id !== orderId &&
          normalizePlateKey(item.vehiclePlate) === nextPlateKey &&
          !['finalizada', 'cancelada'].includes(item.status)
      );
      if (hasOpenOrder) {
        showNotification('Já existe uma OS aberta para esta placa.', 'error');
        return;
      }
    }
    const incomingServices = Array.isArray(updates.services) ? updates.services : (order.services || []);
    const previousServices = new Map((order.services || []).map(service => [service.id, service]));
    const assignmentTriggeredExecution = incomingServices.some((service) => {
      const previous = previousServices.get(service.id);
      const prevMechanicId = previous?.mechanicId || '';
      const nextMechanicId = service.mechanicId || '';
      return prevMechanicId !== nextMechanicId && Boolean(nextMechanicId);
    });
    let effectiveStatus = (updates.status as WorkOrderStatus) || order.status;
    if (assignmentTriggeredExecution && !['em_execucao', 'finalizada', 'cancelada'].includes(effectiveStatus)) {
      effectiveStatus = 'em_execucao';
    }

    let supervisorId = updates.supervisorId ?? order.supervisorId;
    let supervisorName = updates.supervisorName ?? order.supervisorName;
    if (supervisorId) {
      const supervisor = workshopSupervisors.find(item => item.id === supervisorId);
      if (!supervisor) {
        showNotification('Selecione um supervisor mecanico valido.', 'error');
        return;
      }
      supervisorName = supervisor.name;
    }

    const assignmentLogs: any[] = [];

    const normalizedServices: ServiceItem[] = incomingServices.map((service) => {
      const previous = previousServices.get(service.id);
      const prevMechanicId = previous?.mechanicId || '';
      const nextMechanicId = service.mechanicId || '';
      const prevCategory = previous?.category || '';
      const nextCategory = service.category || '';
      const accumulatedSeconds = previous ? computeServiceActualSeconds(previous, now) : (service.actualSeconds || 0);
      const mechanicChanged = prevMechanicId !== nextMechanicId;
      const serviceTypeChanged = prevCategory !== nextCategory;
      const shouldLogAssignment = mechanicChanged || (serviceTypeChanged && Boolean(nextMechanicId));

      if (shouldLogAssignment) {
        assignmentLogs.push({
          id: generateUuid(),
          work_order_id: orderId,
          service_id: service.id,
          previous_mechanic_id: prevMechanicId || null,
          previous_mechanic_name: previous?.mechanicName || null,
          new_mechanic_id: nextMechanicId || null,
          new_mechanic_name: service.mechanicName || null,
          service_category: service.category,
          service_description: service.description,
          timestamp: now,
          accumulated_seconds: accumulatedSeconds,
          created_by: user?.name || 'Sistema',
          warehouse_id: activeWarehouse,
        });
      }

      const shouldRun = Boolean(nextMechanicId) && effectiveStatus === 'em_execucao';
      return {
        ...service,
        actualSeconds: accumulatedSeconds,
        startedAt: shouldRun ? now : service.startedAt,
        isTimerActive: shouldRun,
      };
    });

    const actualHours = computeOrderActualHours(normalizedServices, now);

    let statusTimers = order.statusTimers;
    let totalSeconds = order.totalSeconds;
    let lastStatusChange = order.lastStatusChange;
    let isTimerActive = order.isTimerActive;
    let closedAt = order.closedAt;

    if (effectiveStatus !== order.status) {
      const elapsedSeconds = computeElapsedSeconds(order.lastStatusChange || order.openedAt, now);
      const timers = buildStatusTimers(order.statusTimers);
      timers[order.status] = (timers[order.status] || 0) + elapsedSeconds;
      statusTimers = timers;
      totalSeconds = (order.totalSeconds || 0) + elapsedSeconds;
      lastStatusChange = now;
      isTimerActive = effectiveStatus === 'em_execucao';
      closedAt = effectiveStatus === 'finalizada' ? now : order.closedAt;

      const statusLogEntry = {
        id: generateUuid(),
        work_order_id: orderId,
        previous_status: order.status,
        new_status: effectiveStatus,
        timestamp: now,
        user_id: user?.id,
        duration_seconds: elapsedSeconds,
      };

      try {
        await api.from('work_order_logs').insert(statusLogEntry);
      } catch (logError) {
        console.warn('Falha ao registrar log de status da OS', logError);
        enqueueWorkshopOp({
          id: generateUuid(),
          table: 'work_order_logs',
          method: 'POST',
          payload: statusLogEntry,
          createdAt: now,
        });
      }
    }

    if (assignmentLogs.length > 0) {
      try {
        await api.from('work_order_assignments').insert(assignmentLogs);
        setWorkOrderAssignments(prev => [...assignmentLogs.map((row) => mapWorkOrderAssignmentRow(row)), ...prev]);
      } catch (logError) {
        console.warn('Falha ao registrar atribuicoes de servico', logError);
        enqueueWorkshopOp({
          id: generateUuid(),
          table: 'work_order_assignments',
          method: 'POST',
          payload: assignmentLogs,
          createdAt: now,
        });
      }
    }

    const cost = updates.cost ? { ...order.cost, ...updates.cost } : order.cost;

    const updatePayload: Record<string, any> = {
      vehicle_plate: updates.vehiclePlate,
      vehicle_model: updates.vehicleModel,
      status: effectiveStatus,
      type: updates.type,
      priority: updates.priority,
      mechanic_id: updates.mechanicId,
      mechanic_name: updates.mechanicName,
      supervisor_id: supervisorId,
      supervisor_name: supervisorName,
      workshop_unit: updates.workshopUnit,
      description: updates.description,
      services: normalizedServices,
      parts: updates.parts,
      estimated_hours: updates.estimatedHours,
      actual_hours: actualHours,
      cost_center: updates.costCenter,
      cost_labor: cost?.labor,
      cost_parts: cost?.parts,
      cost_third_party: cost?.thirdParty,
      cost_total: cost?.total,
    };

    if (effectiveStatus !== order.status) {
      updatePayload.closed_at = effectiveStatus === 'finalizada' ? now : null;
      updatePayload.total_seconds = totalSeconds;
      updatePayload.last_status_change = lastStatusChange;
      updatePayload.is_timer_active = isTimerActive;
      updatePayload.status_timers = statusTimers;
    }

    const { error } = await api.from('work_orders').eq('id', orderId).update(updatePayload);

    if (!error) {
      setWorkOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        ...updates,
        status: effectiveStatus,
        supervisorId,
        supervisorName,
        services: normalizedServices,
        actualHours,
        statusTimers: statusTimers ?? o.statusTimers,
        totalSeconds: totalSeconds ?? o.totalSeconds,
        lastStatusChange: lastStatusChange ?? o.lastStatusChange,
        isTimerActive: isTimerActive ?? o.isTimerActive,
        closedAt: closedAt ?? o.closedAt,
        cost: cost || o.cost,
      } : o));
      showNotification(`OS ${orderId} atualizada com sucesso!`, 'success');
      return;
    }

    enqueueWorkshopOp({
      id: generateUuid(),
      table: 'work_orders',
      method: 'PATCH',
      query: { id: orderId },
      payload: updatePayload,
      createdAt: now,
    });

    setWorkOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      ...updates,
      status: effectiveStatus,
      supervisorId,
      supervisorName,
      services: normalizedServices,
      actualHours,
      statusTimers: statusTimers ?? o.statusTimers,
      totalSeconds: totalSeconds ?? o.totalSeconds,
      lastStatusChange: lastStatusChange ?? o.lastStatusChange,
      isTimerActive: isTimerActive ?? o.isTimerActive,
      closedAt: closedAt ?? o.closedAt,
      cost: cost || o.cost,
    } : o));
    showNotification('Erro ao atualizar OS', 'error');
  };
  const handleUpdateMechanic = async (updatedMechanic: Mechanic) => {
    const { error } = await api.from('mechanics').eq('id', updatedMechanic.id).update({
      name: updatedMechanic.name,
      specialty: updatedMechanic.specialty,
      shift: updatedMechanic.shift,
      status: updatedMechanic.status
    });

    if (!error) {
      setMechanics(prev => prev.map(m => m.id === updatedMechanic.id ? updatedMechanic : m));
      showNotification('Mecânico atualizado com sucesso!', 'success');
    } else {
      showNotification('Erro ao atualizar mecânico', 'error');
    }
  };

  const handleCreateMechanic = async (mechanicData: Omit<Mechanic, 'id' | 'productivity' | 'currentWorkOrders'>) => {
    const id = `MEC-${Date.now()}`;

    // Simulação de chamada API
    // Na prática, substituiria por: const { error } = await api.from('mechanics').insert({...})

    const newMechanic: Mechanic = {
      ...mechanicData,
      id,
      currentWorkOrders: [],
      productivity: {
        ordersCompleted: 0,
        avgHoursPerOrder: 0,
        onTimeRate: 100
      }
    };

    setMechanics(prev => [...prev, newMechanic]);
    showNotification('Mecânico cadastrado com sucesso!', 'success');
  };

  // Early returns after all handlers
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black uppercase tracking-widest text-sm animate-pulse">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show Module Selector after login if no system module selected
  if (currentSystemModule === null) {
    return <ModuleSelector user={user} onSelectModule={handleSelectSystemModule} onLogout={logout} />;
  }


  return (
    <div className={`flex w-screen h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {currentSystemModule === 'warehouse' && (
        <>
          <Sidebar
            activeModule={activeModule}
            onModuleChange={(module) => {
              setActiveModule(module);
              setIsMobileMenuOpen(false);
            }}
            user={user}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <TopBar
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              title={getPageTitle(activeModule)}
              user={user}
              onLogout={logout}
              notifications={appNotifications}
              onMarkAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllNotificationsAsRead}
              onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              showBackButton={true}
              onBackToModules={() => setCurrentSystemModule(null)}
            />
            <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4 lg:p-6 relative">
              {notification && (
                <div className={`fixed top-20 right-8 z-50 animate-in slide-in-from-right px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' :
                  notification.type === 'error' ? 'bg-red-500 text-white border-red-400' :
                    notification.type === 'info' ? 'bg-blue-500 text-white border-blue-400' :
                      'bg-amber-500 text-white border-amber-400'
                  }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <span className="font-bold text-sm">{notification.message}</span>
                </div>
              )}

              {isDeferredModuleLoading && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-xl">
                  Carregando dados completos do módulo...
                </div>
              )}

              {/* Warehouse Selector Integration */}
              <WarehouseSelector
                warehouses={warehouses}
                activeWarehouse={activeWarehouse}
                userWarehouses={userWarehouses}
                onWarehouseChange={(id) => {
                  if (userWarehouses.includes(id) || user?.role === 'admin') {
                    setActiveWarehouse(id);
                  } else {
                    showNotification('Você não tem permissão para acessar este armazém', 'error');
                  }
                }}
              />

              <Suspense
                fallback={
                  <div className="w-full flex items-center justify-center py-20">
                    <div className="flex items-center gap-3 text-slate-500">
                      <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-black uppercase tracking-wider">Carregando módulo...</span>
                    </div>
                  </div>
                }
              >
                {activeModule === 'dashboard' && (
                  <Dashboard
                    inventory={inventoryCatalog.length > 0 ? inventoryCatalog : inventory.filter(i => i.warehouseId === activeWarehouse)}
                    activities={activities}
                  />
                )}
                {activeModule === 'recebimento' && (
                  <Receiving
                    onFinalize={handleFinalizeReceipt}
                    availablePOs={purchaseOrders.filter(po => po.warehouseId === activeWarehouse && po.status === 'enviado')}
                  />
                )}
                {activeModule === 'movimentacoes' && (
                  <Movements
                    movements={pagedMovements}
                    currentPage={movementsPage}
                    pageSize={MOVEMENTS_PAGE_SIZE}
                    hasNextPage={hasMoreMovements}
                    isPageLoading={isMovementsPageLoading}
                    onPageChange={setMovementsPage}
                  />
                )}
                {activeModule === 'auditoria_geral' && (
                  <GeneralAudit activeWarehouse={activeWarehouse} />
                )}
                {activeModule === 'estoque' && (
                  <Inventory
                    items={inventory.filter(i => i.warehouseId === activeWarehouse)}
                    onUpdateItem={handleUpdateInventoryItem}
                    onCreateAutoPO={handleCreateAutoPO}
                    onRecalculateROP={handleRecalculateROP}
                  />
                )}
                {activeModule === 'expedicao' && (
                  <Expedition
                    inventory={inventory.filter(i => i.warehouseId === activeWarehouse)}
                    vehicles={vehicles}
                    requests={pagedMaterialRequests}
                    canApproveRequests={user?.role === 'admin'}
                    onProcessPicking={handleUpdateInventoryQuantity}
                    onRequestCreate={handleRequestCreate}
                    onRequestUpdate={handleRequestUpdate}
                    onRequestEdit={handleRequestEdit}
                    onRequestDelete={handleRequestDelete}
                    activeWarehouse={activeWarehouse}
                    currentPage={materialRequestsPage}
                    pageSize={MATERIAL_REQUESTS_PAGE_SIZE}
                    hasNextPage={hasMoreMaterialRequests}
                    isPageLoading={isMaterialRequestsPageLoading}
                    onPageChange={setMaterialRequestsPage}
                  />
                )}
                {activeModule === 'inventario_ciclico' && (
                  <CyclicInventory
                    activeWarehouse={activeWarehouse}
                    inventory={inventory.filter(i => i.warehouseId === activeWarehouse)}
                    batches={cyclicBatches.filter(b => b.warehouseId === activeWarehouse)}
                    onCreateBatch={handleCreateCyclicBatch}
                    onFinalizeBatch={handleFinalizeCyclicBatch}
                    onClassifyABC={handleClassifyABC}
                  />
                )}

                {activeModule === 'compras' && (
                  <PurchaseOrders
                    user={user}
                    activeWarehouse={activeWarehouse}
                    orders={purchaseOrders.filter(po => po.warehouseId === activeWarehouse)}
                    vendors={vendors}
                    inventory={inventory.filter(i => i.warehouseId === activeWarehouse)}
                    vehicles={vehicles}
                    onCreateOrder={handleCreatePO}
                    onAddQuotes={handleAddQuotes}
                    onSendToApproval={handleSendToApproval}
                    onMarkAsSent={handleMarkAsSent}
                    onApprove={handleApprovePO}
                    onReject={handleRejectPO}
                    onDeleteOrder={handleDeletePO}
                    currentPage={purchaseOrdersPage}
                    pageSize={PURCHASE_ORDERS_PAGE_SIZE}
                    hasNextPage={false}
                    isPageLoading={false}
                    onPageChange={setPurchaseOrdersPage}
                  />
                )}
                {activeModule === 'cadastro' && (
                  <MasterData
                    inventory={pagedMasterDataItems}
                    vendors={pagedVendors}
                    onAddRecord={handleAddMasterRecord}
                    onRemoveRecord={handleRemoveMasterRecord}
                    onImportRecords={handleImportMasterRecords}
                    inventoryPagination={{
                      currentPage: masterDataItemsPage,
                      pageSize: MASTER_DATA_ITEMS_PAGE_SIZE,
                      totalItems: masterDataItemsTotal,
                      hasNextPage: hasMoreMasterDataItems,
                      isLoading: isMasterDataItemsPageLoading,
                      onPageChange: setMasterDataItemsPage,
                    }}
                    vendorsPagination={{
                      currentPage: vendorsPage,
                      pageSize: VENDORS_PAGE_SIZE,
                      totalItems: vendorsTotal,
                      hasNextPage: hasMoreVendors,
                      isLoading: isVendorsPageLoading,
                      onPageChange: setVendorsPage,
                    }}
                  />
                )}
                {activeModule === 'relatorios' && (
                  <Reports
                    orders={purchaseOrders.filter(po => po.warehouseId === activeWarehouse)}
                  />
                )}
                {activeModule === 'configuracoes' && (
                  <Settings
                    users={users}
                    warehouses={warehouses}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                  />
                )}
              </Suspense>
            </main>
          </div>
        </>
      )}

      {currentSystemModule === 'workshop' && (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-background-light dark:bg-background-dark">
          {/* Workshop Top Bar */}
          <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentSystemModule(null)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Voltar</span>
              </button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Oficina</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">{user?.name}</span>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Workshop Navigation */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigateWorkshopModule('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'dashboard'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateWorkshopModule('panel')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'panel'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Painel
              </button>
              <button
                onClick={() => navigateWorkshopModule('orders')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'orders'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Ordens de Serviço
              </button>
              <button
                onClick={() => navigateWorkshopModule('mechanics')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'mechanics'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Mecânicos
              </button>
              <button
                onClick={() => navigateWorkshopModule('productivity')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'productivity'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Produtividade
              </button>
              <button
                onClick={() => navigateWorkshopModule('preventive')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'preventive'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Preventiva
              </button>
              <button
                onClick={() => navigateWorkshopModule('plans')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'plans'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Planos de Manutenção
              </button>
              <button
                onClick={() => navigateWorkshopModule('checklists')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${workshopActiveModule === 'checklists'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Checklists
              </button>
            </div>
          </div>

          {/* Workshop Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Suspense
              fallback={
                <div className="w-full flex items-center justify-center py-20">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">Carregando...</span>
                  </div>
                </div>
              }
            >
              {workshopActiveModule === 'dashboard' && (
                <WorkshopDashboard
                  kpis={workshopKPIs}
                  workOrders={workOrders}
                  mechanics={mechanics}
                  onNavigateToOrders={() => navigateWorkshopModule('orders')}
                  onNavigateToMechanics={() => navigateWorkshopModule('mechanics')}
                  onNavigateToMaintenance={() => navigateWorkshopModule('preventive')}
                />
              )}
              {workshopActiveModule === 'panel' && (
                <WorkshopPanel
                  workOrders={workOrders}
                  vehicles={vehicles}
                />
              )}
              {workshopActiveModule === 'orders' && (
                <WorkshopErrorBoundary
                  resetKey={workshopActiveModule}
                  onError={(error, info) => {
                    console.error('Erro na tela de ordens de servico', { error, info });
                    showNotification('Falha ao carregar ordens de serviço. Redirecionando...', 'error');
                    setWorkshopActiveModule('dashboard');
                  }}
                >
                  <WorkOrderKanban
                    workOrders={workOrders}
                    mechanics={mechanics}
                    supervisors={workshopSupervisors}
                    defaultSupervisor={defaultWorkshopSupervisor}
                    vehicles={vehicles}
                    onUpdateStatus={handleUpdateWorkOrderStatus}
                    onUpdateOrder={handleUpdateWorkOrder}
                    onAssignMechanic={handleAssignMechanic}
                    onCreateOrder={handleCreateWorkOrder}
                    onViewOrder={(order) => { }}
                    onLockOrder={handleLockWorkOrder}
                    onUnlockOrder={handleUnlockWorkOrder}
                    currentUserId={user?.id}
                    onError={(message, error) => {
                      console.error('Erro na oficina', { message, error });
                      showNotification(message, 'error');
                    }}
                  />
                </WorkshopErrorBoundary>
              )}
              {workshopActiveModule === 'mechanics' && (
                <MechanicsManagement
                  mechanics={mechanics}
                  onUpdateMechanic={handleUpdateMechanic}
                  onCreateMechanic={handleCreateMechanic}
                />
              )}
              {workshopActiveModule === 'productivity' && (
                <MechanicProductivity
                  assignments={workOrderAssignments}
                  mechanics={mechanics}
                />
              )}
              {workshopActiveModule === 'preventive' && (
                <PreventiveDashboard
                  kpis={preventiveKPIs}
                  activePlans={activePlans}
                  alerts={maintenanceAlerts}
                  onViewVehicle={handleViewVehicle}
                  onCreatePlan={() => setWorkshopActiveModule('plans')}
                  onViewAllVehicles={() => setWorkshopActiveModule('vehicles')}
                  onResolveAlert={(id) => setMaintenanceAlerts(prev => prev.filter(a => a.id !== id))}
                />
              )}
              {workshopActiveModule === 'vehicles' && selectedVehicle && (
                <VehicleDetailView
                  vehicle={selectedVehicle}
                  onBack={() => navigateWorkshopModule('preventive')}
                  onCreateMaintenance={() => navigateWorkshopModule('plans')}
                  onViewEvent={(event) => { }}
                />
              )}
              {workshopActiveModule === 'plans' && (
                <MaintenancePlanWizard
                  onSave={handleCreateMaintenancePlan}
                  onCancel={() => navigateWorkshopModule('preventive')}
                  availableVehicles={vehicles.map(v => ({ model: v.model, type: v.type }))}
                  inventory={inventory}
                />
              )}
              {workshopActiveModule === 'schedules' && selectedSchedule && (
                <ScheduleDetail
                  schedule={selectedSchedule}
                  onBack={() => navigateWorkshopModule('preventive')}
                  onExportPDF={() => showNotification('PDF exportado!', 'success')}
                  onScheduleAppointment={() => showNotification('Agendamento solicitado!', 'success')}
                  onViewCalendar={() => { }}
                />
              )}
              {workshopActiveModule === 'checklists' && (
                <InspectionChecklistEditor
                  onSave={handleSaveInspectionTemplate}
                  onCancel={() => navigateWorkshopModule('dashboard')}
                  availableModels={vehicles.map(v => v.model)}
                />
              )}
            </Suspense>
          </main>
        </div>
      )}

      {currentSystemModule === 'fleet' && (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-black uppercase tracking-wider">Carregando módulo de frota...</span>
              </div>
            </div>
          }
        >
          <FleetModule onBackToModules={() => setCurrentSystemModule(null)} />
        </Suspense>
      )}
    </div>
  );
};
