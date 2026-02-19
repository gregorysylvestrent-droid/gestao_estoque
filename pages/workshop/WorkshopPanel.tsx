import React, { useEffect, useMemo, useState } from 'react';
import { WorkOrder, WorkOrderStatus, Vehicle } from '../../types';

interface WorkshopPanelProps {
  workOrders: WorkOrder[];
  vehicles: Vehicle[];
}

const STATUS_KEYS: WorkOrderStatus[] = ['aguardando', 'em_execucao', 'aguardando_pecas', 'finalizada', 'cancelada'];

const STATUS_COLUMNS: Array<{
  key: WorkOrderStatus;
  label: string;
  color: string;
  chip: string;
  border: string;
}> = [
  { key: 'aguardando', label: 'Aguardando', color: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
  { key: 'em_execucao', label: 'Em Execução', color: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { key: 'aguardando_pecas', label: 'Aguardando Peças', color: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  { key: 'finalizada', label: 'Finalizada', color: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
];

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const mapVehicleType = (value: string) => {
  const token = normalizeToken(value || '');
  if (token.includes('moto')) return 'moto';
  if (token.includes('lancha') || token.includes('barco') || token.includes('jet')) return 'lancha';
  if (token.includes('onibus')) return 'onibus';
  if (token.includes('caminh') || token.includes('truck') || token.includes('pesad')) return 'caminhao';
  if (token.includes('carro') || token.includes('passeio') || token.includes('leve')) return 'carro';
  return 'outros';
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  carro: {
    label: 'Carro',
    color: 'bg-sky-500',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13m-14 0h14m-14 0a2 2 0 00-2 2v2h3m13-4a2 2 0 012 2v2h-3m-9 0h6" />
      </svg>
    ),
  },
  caminhao: {
    label: 'Caminhão',
    color: 'bg-amber-500',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h11v8H3V7zm11 4h4l3 3v1h-7V11zm-8 6a2 2 0 104 0m8 0a2 2 0 104 0" />
      </svg>
    ),
  },
  moto: {
    label: 'Moto',
    color: 'bg-fuchsia-500',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 16a3 3 0 106 0 3 3 0 10-6 0zm8-6h3l3 3m-2 3a3 3 0 103 0 3 3 0 00-3 0zm-7-6h4l1 2h-3l-2 3" />
      </svg>
    ),
  },
  lancha: {
    label: 'Lancha',
    color: 'bg-blue-600',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15l8-4 8 4M3 19h18M6 13l6-9 6 9" />
      </svg>
    ),
  },
  onibus: {
    label: 'Ônibus',
    color: 'bg-emerald-500',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 15a2 2 0 104 0m6 0a2 2 0 104 0M7 7h10M7 11h10" />
      </svg>
    ),
  },
  outros: {
    label: 'Outro',
    color: 'bg-slate-500',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M4 12h16M6 17h12" />
      </svg>
    ),
  },
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({ workOrders, vehicles }) => {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const orders = useMemo(() => {
    const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.plate, vehicle]));
    return (workOrders || [])
      .filter((order) => order && order.status !== 'cancelada')
      .map((order) => {
        const vehicle = vehicleMap.get(order.vehiclePlate);
        const typeKey = mapVehicleType(vehicle?.type || '');
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
        const computedTotal = STATUS_KEYS.reduce((acc, status) => acc + (timers[status] || 0), 0);
        const totalSeconds = computedTotal > 0 ? computedTotal : Number(order.totalSeconds || 0);
        return {
          id: order.id,
          plate: order.vehiclePlate,
          openedAt: order.openedAt,
          totalSeconds,
          typeKey,
          status: order.status,
        };
      });
  }, [workOrders, vehicles, nowMs]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<WorkOrderStatus, typeof orders>();
    STATUS_COLUMNS.forEach((col) => map.set(col.key, []));
    orders.forEach((order) => {
      const list = map.get(order.status as WorkOrderStatus) || [];
      list.push(order);
      map.set(order.status as WorkOrderStatus, list);
    });
    return map;
  }, [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel Operacional</h1>
        <p className="text-slate-500 dark:text-slate-400">
          OS organizadas por situação com cards compactos por tipo de veículo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const items = ordersByStatus.get(column.key) || [];
          return (
            <div key={column.key} className={`rounded-2xl border ${column.border} bg-white dark:bg-slate-800 overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${column.border} bg-slate-50 dark:bg-slate-900/40`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.label}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.chip}`}>{items.length}</span>
              </div>

              <div className="p-3 space-y-3 min-h-[120px]">
                {items.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-8">Nenhuma OS neste status</div>
                )}
                {items.map((order) => {
                  const config = TYPE_CONFIG[order.typeKey] || TYPE_CONFIG.outros;
                  return (
                    <div
                      key={order.id}
                      className={`rounded-xl border ${column.border} bg-slate-50 dark:bg-slate-900/40 p-3 shadow-sm`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>{config.icon}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{order.plate}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">{config.label}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">{order.id}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Abertura: {order.openedAt ? new Date(order.openedAt).toLocaleDateString('pt-BR') : '--'}
                      </div>
                      <div className="mt-2 text-xs font-mono text-slate-700 dark:text-slate-200">
                        Tempo total: {formatDuration(order.totalSeconds)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
