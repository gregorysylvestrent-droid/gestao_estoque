﻿import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WorkOrder, WorkOrderStatus, WorkOrderType, Mechanic, Vehicle, WORK_ORDER_STATUS_LABELS, WORK_ORDER_TYPE_LABELS, SERVICE_CATEGORY_LABELS, WORK_ORDER_PRIORITY_LABELS } from '../../types';
import { formatCurrency } from '../../utils/format';
import { NewWorkOrderModal } from './components/NewWorkOrderModal';

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
  mechanics: Mechanic[];
  supervisors?: { id: string; name: string }[];
  defaultSupervisor?: { id: string; name: string } | null;
  vehicles: Vehicle[];
  onUpdateStatus: (orderId: string, newStatus: WorkOrderStatus) => void;
  onUpdateOrder: (orderId: string, updates: Partial<WorkOrder>) => Promise<void>;
  onAssignMechanic: (orderId: string, mechanicId: string) => void;
  onCreateOrder: (order: Partial<WorkOrder>) => Promise<string | undefined>;
  onViewOrder: (order: WorkOrder) => void;
  onLockOrder: (orderId: string) => Promise<void>;
  onUnlockOrder: (orderId: string) => Promise<void>;
  currentUserId?: string;
  onError?: (message: string, error?: unknown) => void;
}

type FilterType = 'all' | WorkOrderType;
type FilterPriority = 'all' | 'normal' | 'alta' | 'urgente';

const COLUMNS: WorkOrderStatus[] = ['aguardando', 'em_execucao', 'aguardando_pecas', 'finalizada'];

const STATUS_CONFIG: Record<WorkOrderStatus, { color: string; bgColor: string; borderColor: string }> = {
  aguardando: { color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-300' },
  em_execucao: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  aguardando_pecas: { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
  finalizada: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' },
  cancelada: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' }
};

const TYPE_COLORS: Record<string, string> = {
  preventiva: 'bg-blue-100 text-blue-700',
  corretiva: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
  revisao: 'bg-purple-100 text-purple-700',
  garantia: 'bg-emerald-100 text-emerald-700',
  tav: 'bg-slate-100 text-slate-700',
  terceiros: 'bg-orange-100 text-orange-700'
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  alta: 'bg-amber-100 text-amber-600',
  urgente: 'bg-red-100 text-red-600'
};

const TIMELINE_STATUSES: WorkOrderStatus[] = ['aguardando', 'em_execucao', 'aguardando_pecas', 'finalizada'];

const TIMELINE_LABELS: Record<WorkOrderStatus, string> = {
  aguardando: 'Aguardando',
  em_execucao: 'Em Execução',
  aguardando_pecas: 'Pausado',
  finalizada: 'Finalizado',
  cancelada: 'Cancelada'
};

const formatDurationShort = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m}m`;
};

const formatDurationLong = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getServiceActualSeconds = (service: WorkOrder['services'][number], nowMs: number) => {
  const baseSeconds = service.actualSeconds ?? ((service.actualHours || 0) * 3600);
  if (!service.isTimerActive || !service.startedAt) return baseSeconds;
  const start = new Date(service.startedAt).getTime();
  if (Number.isNaN(start)) return baseSeconds;
  const extra = Math.max(0, Math.floor((nowMs - start) / 1000));
  return baseSeconds + extra;
};

const getOrderActualSeconds = (order: WorkOrder, nowMs: number) => {
  const services = Array.isArray(order.services) ? order.services : [];
  if (services.length === 0 && order.actualHours) {
    return order.actualHours * 3600;
  }
  return services.reduce((acc, service) => acc + getServiceActualSeconds(service, nowMs), 0);
};

const buildTimelineTimers = (order: WorkOrder, nowMs: number) => {
  const timers: Record<WorkOrderStatus, number> = {
    aguardando: 0,
    em_execucao: 0,
    aguardando_pecas: 0,
    finalizada: 0,
    cancelada: 0,
  };

  const existing = order.statusTimers || {};
  Object.entries(existing).forEach(([key, value]) => {
    if (key in timers && Number.isFinite(Number(value))) {
      timers[key as WorkOrderStatus] = Number(value);
    }
  });

  if (order.lastStatusChange && order.status !== 'finalizada' && order.status !== 'cancelada') {
    const start = new Date(order.lastStatusChange).getTime();
    if (!Number.isNaN(start)) {
      const elapsed = Math.max(0, Math.floor((nowMs - start) / 1000));
      timers[order.status] = (timers[order.status] || 0) + elapsed;
    }
  }

  return timers;
};

const TimerDisplay: React.FC<{ totalSeconds: number; lastStatusChange?: string; isActive: boolean }> = ({ 
  totalSeconds, 
  lastStatusChange, 
  isActive 
}) => {
  const [displaySeconds, setDisplaySeconds] = useState(totalSeconds);

  useEffect(() => {
    setDisplaySeconds(totalSeconds);
    
    if (!isActive || !lastStatusChange) return;

    const interval = setInterval(() => {
      const start = new Date(lastStatusChange).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      setDisplaySeconds(totalSeconds + diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, lastStatusChange, isActive]);

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${isActive ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-500'}`}>
      <svg className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{formatDurationLong(displaySeconds)}</span>
    </div>
  );
};

export const WorkOrderKanban: React.FC<WorkOrderKanbanProps> = ({
  workOrders,
  mechanics,
  supervisors = [],
  defaultSupervisor = null,
  vehicles,
  onUpdateStatus,
  onUpdateOrder,
  onAssignMechanic,
  onCreateOrder,
  onViewOrder,
  onLockOrder,
  onUnlockOrder,
  currentUserId,
  onError
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('all');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | undefined>(undefined);
  const isDraggingRef = useRef(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    try {
      const safeOrders = Array.isArray(workOrders) ? workOrders : [];
      return safeOrders.filter(order => {
        if (!order) return false;
        if (filterType !== 'all' && order.type !== filterType) return false;
        if (filterPriority !== 'all' && order.priority !== filterPriority) return false;
        if (selectedMechanic !== 'all' && order.mechanicId !== selectedMechanic) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesPlate = String(order.vehiclePlate || '').toLowerCase().includes(term);
          const matchesModel = String(order.vehicleModel || '').toLowerCase().includes(term);
          const matchesId = String(order.id || '').toLowerCase().includes(term);
          const matchesDescription = String(order.description || '').toLowerCase().includes(term);
          if (!matchesPlate && !matchesModel && !matchesId && !matchesDescription) return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Erro ao filtrar ordens de servico', error);
      onError?.('Erro ao processar ordens de serviço.', error);
      return [];
    }
  }, [workOrders, filterType, filterPriority, selectedMechanic, searchTerm, onError]);

  const ordersByColumn = useMemo(() => {
    try {
      return COLUMNS.reduce((acc, status) => {
        acc[status] = filteredOrders.filter(o => o?.status === status);
        return acc;
      }, {} as Record<WorkOrderStatus, WorkOrder[]>);
    } catch (error) {
      console.error('Erro ao agrupar ordens de servico', error);
      onError?.('Erro ao agrupar ordens de serviço.', error);
      return { aguardando: [], em_execucao: [], aguardando_pecas: [], finalizada: [], cancelada: [] };
    }
  }, [filteredOrders, onError]);

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    isDraggingRef.current = true;
    e.dataTransfer.setData('orderId', orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: WorkOrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const order = workOrders.find((item) => item.id === orderId);

    if (orderId && order && order.status !== newStatus) {
      onUpdateStatus(orderId, newStatus);
    }

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

  const handleEditOrder = async (order: WorkOrder) => {
    try {
      const hasSessionUser = Boolean(String(currentUserId || '').trim());

      if (order.lockedBy && hasSessionUser && order.lockedBy !== currentUserId) {
        onError?.('Esta OS está sendo editada por outro usuário.');
        return;
      }

      if (hasSessionUser) {
        try {
          await onLockOrder(order.id);
        } catch (error) {
          console.warn('Falha ao bloquear OS para edição. Abrindo modal mesmo assim.', error);
        }
      }

      onViewOrder(order);
      setEditingOrder(order);
      setIsNewOrderModalOpen(true);
    } catch (error) {
      console.error('Erro ao abrir OS para edicao', error);
      onError?.('Erro ao abrir OS para edição.', error);
    }
  };

  const handleCloseModal = async () => {
    try {
      if (editingOrder && currentUserId) {
        await onUnlockOrder(editingOrder.id);
      }
    } catch (error) {
      console.error('Erro ao liberar OS', error);
      onError?.('Erro ao liberar OS para outros usuários.', error);
    } finally {
      setIsNewOrderModalOpen(false);
      setEditingOrder(undefined);
    }
  };

  const handleSaveOrder = async (orderData: Partial<WorkOrder>) => {
    try {
      if (!orderData.vehiclePlate) {
        onError?.('Selecione um veículo válido.');
        return;
      }
      if (editingOrder) {
        await onUpdateOrder(editingOrder.id, orderData);
      } else {
        const createdId = await onCreateOrder(orderData);
        if (!createdId) return;
      }
      await handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar OS', error);
      onError?.('Erro ao salvar OS.', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Ordens de Serviço
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie manutenções preventivas e corretivas da frota
          </p>
        </div>
        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova OS
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por placa, modelo, OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(WORK_ORDER_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Todas prioridades</option>
              {Object.entries(WORK_ORDER_PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Todos mecânicos</option>
              {mechanics.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((status) => {
          const config = STATUS_CONFIG[status];
          const orders = ordersByColumn[status] || [];
          
          return (
            <div
              key={status}
              className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[calc(100vh-300px)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b ${config.borderColor} ${config.bgColor} rounded-t-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                    <h3 className={`font-semibold ${config.color}`}>
                      {WORK_ORDER_STATUS_LABELS[status]}
                    </h3>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-white dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                    {orders.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {orders.map((order) => {
                  const services = Array.isArray(order.services) ? order.services : [];
                  const parts = Array.isArray(order.parts) ? order.parts : [];
                  const timeline = buildTimelineTimers(order, now);
                  const totalCycleSeconds = TIMELINE_STATUSES.reduce((acc, status) => acc + (timeline[status] || 0), 0);
                  const estimatedSeconds = Math.max(0, (order.estimatedHours || 0) * 3600);
                  const actualSeconds = getOrderActualSeconds(order, now);
                  const isOvertime = estimatedSeconds > 0 && actualSeconds > estimatedSeconds;
                  const execLimit = Math.max(2 * 3600, estimatedSeconds * 1.2);
                  const waitingAlert = timeline.aguardando > 4 * 3600;
                  const execAlert = timeline.em_execucao > execLimit;
                  const pausedAlert = timeline.aguardando_pecas > 6 * 3600;
                  const totalAlert = estimatedSeconds > 0 && totalCycleSeconds > estimatedSeconds * 2;
                  const hasAlert = waitingAlert || execAlert || pausedAlert || totalAlert;
                  return (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={() => {
                      setTimeout(() => {
                        isDraggingRef.current = false;
                      }, 0);
                    }}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      handleEditOrder(order);
                    }}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-900 dark:bg-slate-700 text-white">
                            {order.id}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${TYPE_COLORS[order.type] || 'bg-slate-100 text-slate-600'}`}>
                            {WORK_ORDER_TYPE_LABELS[order.type]}
                          </span>
                          {hasAlert && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-600">
                              Alerta
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {order.vehiclePlate}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order.vehicleModel || 'Modelo não informado'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLORS[order.priority] || 'bg-slate-100 text-slate-600'}`}>
                        {WORK_ORDER_PRIORITY_LABELS[order.priority]}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                      {order.description}
                    </p>
                    {order.workshopUnit && (
                      <div className="mb-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {order.workshopUnit}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-center gap-2 text-xs ${isOvertime ? 'text-red-600' : 'text-emerald-600'} mb-3`}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isOvertime ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10H9m10 2a8 8 0 11-16 0 8 8 0 0116 0zm-5.5 4a2.5 2.5 0 00-5 0" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01m-6.5 4a2.5 2.5 0 005 0m6.5-4a8 8 0 11-16 0 8 8 0 0116 0z" />
                        )}
                      </svg>
                      <span className="font-semibold">
                        Realizado { (actualSeconds / 3600).toFixed(1) }h / Est. { (estimatedSeconds / 3600).toFixed(1) }h
                      </span>
                    </div>

                    {/* Services */}
                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {services.slice(0, 3).map((service, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                          >
                            {SERVICE_CATEGORY_LABELS[service.category] || 'Serviço'}
                          </span>
                        ))}
                        {services.length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">
                            +{services.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {order.mechanicId ? (
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium">
                              {order.mechanicName?.charAt(0) || 'M'}
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                              {order.mechanicName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-500">Não atribuído</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {parts.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span>{parts.filter(p => p.status === 'pendente').length} peças</span>
                          </div>
                        )}
                        <span className="text-xs text-slate-400">
                        {order.openedAt ? new Date(order.openedAt).toLocaleDateString('pt-BR') : '--'}
                        </span>
                        <TimerDisplay 
                          totalSeconds={order.totalSeconds || 0}
                          lastStatusChange={order.lastStatusChange}
                          isActive={order.status !== 'finalizada' && order.status !== 'cancelada'}
                        />
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        {TIMELINE_STATUSES.map(status => (
                          <div key={status} className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status]?.color.replace('text-', 'bg-') || 'bg-slate-300'}`} />
                            <span className="font-semibold">{TIMELINE_LABELS[status]}</span>
                            <span className="ml-auto font-mono">{formatDurationShort(timeline[status] || 0)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>Total do ciclo</span>
                        <span className="font-mono">{formatDurationShort(totalCycleSeconds)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {status === 'em_execucao' && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${services.length > 0 ? (services.filter(s => s.completed).length / services.length) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {services.filter(s => s.completed).length}/{services.length} serviços
                        </p>
                      </div>
                    )}
                  </div>
                );
                })}
                
                {orders.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">Nenhuma OS nesta coluna</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NewWorkOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveOrder}
        mechanics={mechanics}
        supervisors={supervisors}
        defaultSupervisor={defaultSupervisor}
        vehicles={vehicles}
        initialData={editingOrder}
      />
    </div>
  );
};
