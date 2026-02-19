import React, { useMemo, useState } from 'react';
import { WorkshopKPIs, WorkOrder, WorkOrderStatus, WorkOrderType, Mechanic, WORK_ORDER_STATUS_LABELS, WORK_ORDER_TYPE_LABELS } from '../../types';
import { formatCurrency } from '../../utils/format';

interface WorkshopDashboardProps {
  kpis: WorkshopKPIs;
  workOrders: WorkOrder[];
  mechanics: Mechanic[];
  onNavigateToOrders: () => void;
  onNavigateToMechanics: () => void;
  onNavigateToMaintenance: () => void;
}

export const WorkshopDashboard: React.FC<WorkshopDashboardProps> = ({
  kpis,
  workOrders,
  mechanics,
  onNavigateToOrders,
  onNavigateToMechanics,
  onNavigateToMaintenance
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkOrderStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | WorkOrderType>('all');
  const [workshopFilter, setWorkshopFilter] = useState<'all' | string>('all');
  const [mechanicFilter, setMechanicFilter] = useState<'all' | string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const STATUS_KEYS: WorkOrderStatus[] = ['aguardando', 'em_execucao', 'aguardando_pecas', 'finalizada', 'cancelada'];

  const STATUS_TIME_LABELS: Record<WorkOrderStatus, string> = {
    aguardando: 'Aguardando',
    em_execucao: 'Em Execução',
    aguardando_pecas: 'Pausada (Aguardando Peças)',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada'
  };

  const formatDuration = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds: number) => {
    const hours = Math.max(0, seconds) / 3600;
    return `${hours.toFixed(1)}h`;
  };

  const buildStatusTimers = (order: WorkOrder, nowMs: number) => {
    const timers: Record<WorkOrderStatus, number> = {
      aguardando: 0,
      em_execucao: 0,
      aguardando_pecas: 0,
      finalizada: 0,
      cancelada: 0
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

  const rangeStart = useMemo(() => {
    const now = new Date();
    if (timeRange === 'year') return new Date(now.getFullYear(), 0, 1);
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return start;
  }, [timeRange]);

  const workshopOptions = useMemo(() => {
    const map = new Map<string, string>();
    workOrders.forEach((order) => {
      if (order.workshopUnit) map.set(order.workshopUnit, order.workshopUnit);
    });
    return Array.from(map.values());
  }, [workOrders]);

  const supervisorOptions = useMemo(() => {
    const map = new Map<string, string>();
    workOrders.forEach((order) => {
      if (order.supervisorId && order.supervisorName) map.set(order.supervisorId, order.supervisorName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    const nowMs = Date.now();
    const term = searchTerm.trim().toLowerCase();
    return (workOrders || []).filter((order) => {
      if (!order) return false;

      if (rangeStart) {
        const openedAt = new Date(order.openedAt || '');
        if (!Number.isNaN(openedAt.getTime()) && openedAt < rangeStart) {
          return false;
        }
      }

      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (typeFilter !== 'all' && order.type !== typeFilter) return false;
      if (workshopFilter !== 'all' && order.workshopUnit !== workshopFilter) return false;
      if (mechanicFilter !== 'all' && order.mechanicId !== mechanicFilter) return false;
      if (supervisorFilter !== 'all' && order.supervisorId !== supervisorFilter) return false;

      if (term) {
        const matchesPlate = String(order.vehiclePlate || '').toLowerCase().includes(term);
        const matchesModel = String(order.vehicleModel || '').toLowerCase().includes(term);
        const matchesId = String(order.id || '').toLowerCase().includes(term);
        const matchesDesc = String(order.description || '').toLowerCase().includes(term);
        if (!matchesPlate && !matchesModel && !matchesId && !matchesDesc) return false;
      }

      if (onlyOverdue) {
        const timers = buildStatusTimers(order, nowMs);
        const totalSeconds = STATUS_KEYS.reduce((acc, key) => acc + (timers[key] || 0), 0);
        const estimatedSeconds = Math.max(0, (order.estimatedHours || 0) * 3600);
        const isOverdue = estimatedSeconds > 0 && totalSeconds > estimatedSeconds;
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [
    workOrders,
    rangeStart,
    statusFilter,
    typeFilter,
    workshopFilter,
    mechanicFilter,
    supervisorFilter,
    searchTerm,
    onlyOverdue,
    STATUS_KEYS
  ]);

  const stats = useMemo(() => {
    const nowMs = Date.now();
    const statusCounts: Record<WorkOrderStatus, number> = {
      aguardando: 0,
      em_execucao: 0,
      aguardando_pecas: 0,
      finalizada: 0,
      cancelada: 0
    };
    const statusTimes: Record<WorkOrderStatus, number> = {
      aguardando: 0,
      em_execucao: 0,
      aguardando_pecas: 0,
      finalizada: 0,
      cancelada: 0
    };

    const typeCounts = Object.keys(WORK_ORDER_TYPE_LABELS).reduce((acc, type) => {
      acc[type as WorkOrderType] = 0;
      return acc;
    }, {} as Record<WorkOrderType, number>);

    let openOrders = 0;
    let overdueOrders = 0;
    let closedOrders = 0;
    let onTimeClosed = 0;
    let totalCycleSeconds = 0;
    let totalPausedSeconds = 0;

    filteredOrders.forEach((order) => {
      statusCounts[order.status] += 1;
      if (typeCounts[order.type] !== undefined) {
        typeCounts[order.type] += 1;
      }

      const timers = buildStatusTimers(order, nowMs);
      STATUS_KEYS.forEach((status) => {
        statusTimes[status] += timers[status] || 0;
      });

      const totalSeconds = STATUS_KEYS.reduce((acc, key) => acc + (timers[key] || 0), 0);
      totalCycleSeconds += totalSeconds;
      totalPausedSeconds += timers.aguardando_pecas || 0;

      const estimatedSeconds = Math.max(0, (order.estimatedHours || 0) * 3600);
      const isOverdue = estimatedSeconds > 0 && totalSeconds > estimatedSeconds;
      if (!['finalizada', 'cancelada'].includes(order.status)) {
        openOrders += 1;
        if (isOverdue) overdueOrders += 1;
      }

      if (order.status === 'finalizada') {
        closedOrders += 1;
        if (!isOverdue) onTimeClosed += 1;
      }
    });

    const avgCycleSeconds = closedOrders > 0 ? totalCycleSeconds / closedOrders : 0;
    const avgPausedSeconds = filteredOrders.length > 0 ? totalPausedSeconds / filteredOrders.length : 0;
    const onTimeRate = closedOrders > 0 ? (onTimeClosed / closedOrders) * 100 : 100;
    const totalTimeAllStatuses = STATUS_KEYS.reduce((acc, key) => acc + statusTimes[key], 0);

    return {
      statusCounts,
      statusTimes,
      totalTimeAllStatuses,
      typeCounts,
      openOrders,
      overdueOrders,
      avgCycleSeconds,
      avgPausedSeconds,
      onTimeRate
    };
  }, [filteredOrders, STATUS_KEYS, buildStatusTimers]);

  // Cores por status
  const statusColors = {
    aguardando: 'bg-slate-500',
    em_execucao: 'bg-blue-500',
    aguardando_pecas: 'bg-amber-500',
    finalizada: 'bg-emerald-500',
    cancelada: 'bg-rose-500'
  };

  // Cards de KPI
  const kpiCards = [
    {
      label: 'OS Abertas',
      value: stats.openOrders.toString(),
      subtext: `${stats.overdueOrders} em atraso`,
      trend: null,
      trendLabel: '',
      icon: 'clipboard',
      color: 'blue'
    },
    {
      label: 'Taxa no Prazo',
      value: `${stats.onTimeRate.toFixed(0)}%`,
      subtext: 'OS finalizadas dentro do prazo',
      trend: null,
      trendLabel: '',
      icon: 'check',
      color: 'emerald'
    },
    {
      label: 'Tempo Médio de Ciclo',
      value: formatHours(stats.avgCycleSeconds),
      subtext: 'Do início à conclusão',
      trend: null,
      trendLabel: '',
      icon: 'clock',
      color: 'indigo'
    },
    {
      label: 'Tempo Médio em Pausa',
      value: formatHours(stats.avgPausedSeconds),
      subtext: 'Aguardando peças',
      trend: null,
      trendLabel: '',
      icon: 'pause',
      color: 'amber'
    },
    {
      label: 'Disponibilidade da Frota',
      value: `${kpis.availability.toFixed(1)}%`,
      subtext: 'Meta: 95%',
      trend: null,
      trendLabel: '',
      icon: 'chart',
      color: 'emerald'
    },
    {
      label: 'Custo de Manutenção',
      value: formatCurrency(kpis.totalCost),
      subtext: 'Custo total do período',
      trend: null,
      trendLabel: '',
      icon: 'currency',
      color: 'red'
    }
  ];

  const preventiveCount = stats.typeCounts.preventiva || 0;
  const correctiveCount = stats.typeCounts.corretiva || 0;
  const preventiveTotal = preventiveCount + correctiveCount;
  const preventivePercentage = preventiveTotal > 0 ? (preventiveCount / preventiveTotal) * 100 : 0;
  const statusEntries = STATUS_KEYS.filter((status) => status !== 'cancelada' || stats.statusCounts[status] > 0);

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Executivo Oficina
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Visão geral da operação de manutenção
          </p>
        </div>
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
          {(['7d', '30d', '90d', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {range === '7d' && '7 dias'}
              {range === '30d' && '30 dias'}
              {range === '90d' && '90 dias'}
              {range === 'year' && 'Este ano'}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros avançados */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Placa, modelo, OS ou descrição"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              {STATUS_KEYS.map((status) => (
                <option key={status} value={status}>{WORK_ORDER_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              {Object.entries(WORK_ORDER_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Oficina</label>
            <select
              value={workshopFilter}
              onChange={(event) => setWorkshopFilter(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todas</option>
              {workshopOptions.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mecânico</label>
            <select
              value={mechanicFilter}
              onChange={(event) => setMechanicFilter(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Supervisor</label>
            <select
              value={supervisorFilter}
              onChange={(event) => setSupervisorFilter(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Todos</option>
              {supervisorOptions.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(event) => setOnlyOverdue(event.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Mostrar apenas OS em atraso
          </label>
          <span className="text-xs text-slate-400">Total filtrado: {filteredOrders.length} OS</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {kpi.value}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-${kpi.color}-100 dark:bg-${kpi.color}-900/30 flex items-center justify-center`}>
                <svg className={`w-5 h-5 text-${kpi.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {kpi.icon === 'clock' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                  {kpi.icon === 'chart' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  )}
                  {kpi.icon === 'currency' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                  {kpi.icon === 'clipboard' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  )}
                  {kpi.icon === 'check' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                  {kpi.icon === 'pause' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {kpi.trend !== null && (
                <span className={`text-sm font-medium ${kpi.trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.trend >= 0 ? 'â†‘' : 'â†“'} {Math.abs(kpi.trend)}%
                </span>
              )}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {kpi.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Preventivas vs Corretivas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Preventivas vs Corretivas
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Preventivas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Corretivas</span>
            </div>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">
            {preventivePercentage.toFixed(0)}%
          </span>
          <span className="text-lg text-slate-500 dark:text-slate-400">
            / {(100 - preventivePercentage).toFixed(0)}%
          </span>
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${preventivePercentage}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {preventiveCount} preventivas / {correctiveCount} corretivas no período
        </p>
      </div>

      {/* Grid de análises */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ordens por Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Ordens de Serviço por Status
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total de {filteredOrders.length} OS no período
              </p>
            </div>
            <button 
              onClick={onNavigateToOrders}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          {/* Visualização tipo Kanban resumido */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {statusEntries.map((status) => (
              <button
                key={status}
                onClick={onNavigateToOrders}
                className="flex flex-col items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className={`w-12 h-12 ${statusColors[status as keyof typeof statusColors]} rounded-xl flex items-center justify-center mb-2 shadow-sm`}>
                  <span className="text-lg font-bold text-white">{stats.statusCounts[status]}</span>
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">
                  {STATUS_TIME_LABELS[status]}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  {formatDuration(stats.statusTimes[status])}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tempo total somado (todos os status)</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{formatDuration(stats.totalTimeAllStatuses)}</span>
          </div>
        </div>

        {/* Distribuição por Tipo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Distribuição por Tipo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Análise de manutenções
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(stats.typeCounts).map(([type, count]) => {
              const total = (Object.values(stats.typeCounts) as number[]).reduce((a, b) => a + b, 0);
              const countValue = Number(count || 0);
              const percentage = total > 0 ? (countValue / total) * 100 : 0;
              
              const colors = {
                preventiva: 'bg-blue-500',
                corretiva: 'bg-amber-500',
                urgente: 'bg-red-500',
                revisao: 'bg-purple-500',
                garantia: 'bg-emerald-500',
                tav: 'bg-slate-500',
                terceiros: 'bg-orange-500'
              };
              
              return (
                <div key={type} className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {WORK_ORDER_TYPE_LABELS[type as keyof typeof WORK_ORDER_TYPE_LABELS]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[type as keyof typeof colors]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {countValue}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Equipe e Disponibilidade */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mecânicos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Equipe Técnica
            </h3>
            <button 
              onClick={onNavigateToMechanics}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Gerenciar
            </button>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-emerald-500">{kpis.mechanicsAvailable}</span>
                <span className="text-lg text-slate-400">/</span>
                <span className="text-2xl text-slate-600 dark:text-slate-400">{mechanics.length}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Mecânicos disponíveis
              </p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {mechanics.slice(0, 3).map((mechanic) => (
              <div key={mechanic.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${mechanic.status === 'disponivel' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mechanic.name}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {mechanic.currentWorkOrders.length} OS
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas Manutenções */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Próximas Manutenções
            </h3>
            <button 
              onClick={onNavigateToMaintenance}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver agenda
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Revisão 50.000 km</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">BRA-2E19 - Volvo FH 540</p>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Amanhã</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="w-10 h-10 rounded-lg bg-slate-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Troca de Óleo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">OPJ-9812 - Mercedes Actros</p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">3 dias</span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Alertas
          </h3>
          <div className="space-y-3">
            {kpis.lateOrders > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {kpis.lateOrders} OS em atraso
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Requer atenção imediata
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Estoque de peças crítico
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  3 itens abaixo do mínimo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

