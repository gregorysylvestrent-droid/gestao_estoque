import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, Activity, PurchaseOrder } from '../types';
import { parseDateLike } from '../utils/dateTime';

interface DashboardProps {
  inventory: InventoryItem[];
  activities: Activity[];
  purchaseOrders: PurchaseOrder[];
}

const KPI_IMAGES = {
  alerta: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
  volume: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=80',
  ocupacao: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&q=80',
  acuracidade: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?w=400&q=80',
};

const getBuyerFromApprovalHistory = (order: PurchaseOrder) => {
  const requisitionEntry = (order.approvalHistory || []).find((entry) => entry?.status === 'requisicao' && String(entry?.by || '').trim().length > 0);
  return String(requisitionEntry?.by || '').trim() || 'Não identificado';
};

export const Dashboard: React.FC<DashboardProps> = ({ inventory, activities, purchaseOrders }) => {
  const toPositiveNumber = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
  };

  const totalVolume = inventory.reduce((acc, item) => acc + toPositiveNumber(item.quantity), 0);
  const criticalItems = inventory.filter((item) => item.quantity < item.minQty);
  const totalCapacity = inventory.reduce((acc, item) => acc + toPositiveNumber(item.maxQty), 0);
  const occupancyRate =
    totalCapacity > 0
      ? Math.min(100, Math.round((totalVolume / totalCapacity) * 100))
      : 0;

  const dynamicKpis = [
    { label: 'Itens em Alerta', value: criticalItems.length, bg: KPI_IMAGES.alerta },
    { label: 'Volume Total CD', value: totalVolume.toLocaleString('pt-BR'), bg: KPI_IMAGES.volume },
    { label: 'Ocupação Real', value: `${occupancyRate}%`, bg: KPI_IMAGES.ocupacao },
    { label: 'Acuracidade', value: '99,8%', bg: KPI_IMAGES.acuracidade },
  ];

  const latestActivities = useMemo(() => activities.slice(0, 5), [activities]);
  const criticalItemsPreview = useMemo(() => criticalItems.slice(0, 10), [criticalItems]);

  const purchaseAgingByBuyer = useMemo(() => {
    const now = new Date();
    const pendingOrders = purchaseOrders.filter((order) => order.status === 'requisicao');

    type BuyerAgingMetrics = { count: number; totalAgingDays: number; maxAgingDays: number };
    const grouped: Record<string, BuyerAgingMetrics> = pendingOrders.reduce((acc, order) => {
      const buyer = getBuyerFromApprovalHistory(order);
      const createdAt = parseDateLike(order.requestDate) || new Date(order.requestDate);
      const isValidDate = Number.isFinite(createdAt?.getTime?.());
      const agingDays = isValidDate ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      if (!acc[buyer]) {
        acc[buyer] = { count: 0, totalAgingDays: 0, maxAgingDays: 0 };
      }

      acc[buyer].count += 1;
      acc[buyer].totalAgingDays += agingDays;
      acc[buyer].maxAgingDays = Math.max(acc[buyer].maxAgingDays, agingDays);
      return acc;
    }, {} as Record<string, BuyerAgingMetrics>);

    return Object.entries(grouped)
      .map(([buyer, metrics]) => ({
        buyer,
        count: metrics.count,
        avgAgingDays: metrics.count > 0 ? Number((metrics.totalAgingDays / metrics.count).toFixed(1)) : 0,
        maxAgingDays: metrics.maxAgingDays,
      }))
      .sort((a, b) => b.count - a.count);
  }, [purchaseOrders]);

  const maxBuyerCount = Math.max(...purchaseAgingByBuyer.map((item) => item.count), 1);

  const handleExportCriticalItems = () => {
    if (criticalItems.length === 0) return;

    const exportRows = criticalItems.map((item) => ({
      SKU: item.sku,
      Produto: item.name,
      Saldo: item.quantity,
      Unidade: item.unit || 'UN',
      Minimo: item.minQty,
      Maximo: item.maxQty,
      Localizacao: item.location || '-',
      Armazem: item.warehouseId || '-',
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque Critico');
    XLSX.writeFile(workbook, `estoque-critico-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-slate-800 dark:text-white">
            Status do Armazém
            <span className="size-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Dados consolidados do CD - Manaus-AM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dynamicKpis.map((kpi, idx) => (
          <div
            key={idx}
            className="relative h-32 sm:h-40 rounded-3xl sm:rounded-[2rem] overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
          >
            <div className="absolute inset-0">
              <img src={kpi.bg} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-900/40" />
            </div>

            <div className="relative z-10 p-5 sm:p-6 h-full flex flex-col justify-between">
              <div />
              <div>
                <p className="text-white/60 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1">{kpi.label}</p>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">{kpi.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8 lg:mb-10">
              <div>
                <h3 className="text-lg lg:text-xl font-black tracking-tight text-slate-800 dark:text-white">Aging de Pedidos de Compra (Pendente)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Quantidade e envelhecimento por comprador responsável</p>
              </div>
            </div>

            <div className="h-[250px] lg:h-[300px] rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              {purchaseAgingByBuyer.length > 0 ? (
                <div className="h-full flex items-end gap-2">
                  {purchaseAgingByBuyer.map((point) => (
                    <div key={point.buyer} className="flex-1 min-w-0 flex flex-col justify-end items-center gap-2">
                      <div className="w-full h-full rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-end">
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-primary to-blue-300 transition-all duration-500"
                          style={{ height: `${Math.max(8, Math.round((point.count / maxBuyerCount) * 100))}%` }}
                          title={`${point.buyer}: ${point.count} pedidos | Aging médio ${point.avgAgingDays}d`}
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase text-slate-400 whitespace-nowrap max-w-full truncate">{point.buyer}</span>
                      <span className="text-[9px] font-black uppercase text-primary whitespace-nowrap">{point.count} PO</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-black text-slate-400 uppercase tracking-widest">
                  Sem pedidos pendentes para análise de aging
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-3 text-slate-800 dark:text-white">Feed de Atividades Reais</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {latestActivities.length > 0 ? (
                latestActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-6 flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black truncate group-hover:text-primary transition-colors tracking-tight text-slate-800 dark:text-white">{act.title}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">{act.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase">{act.time}</span>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Aguardando movimentações...</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between mb-8 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Estoque Crítico</h3>
                {criticalItems.length > 0 && (
                  <span className="flex items-center justify-center bg-red-500 text-white text-[12px] font-black px-4 py-1.5 rounded-full animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)] border-2 border-white dark:border-slate-800 translate-y-[-2px]">
                    {criticalItems.length} ITENS
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleExportCriticalItems}
                disabled={criticalItems.length === 0}
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${criticalItems.length === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'}`}
              >
                Exportar Excel
              </button>
            </div>
            <div className="space-y-4">
              {criticalItemsPreview.length > 0 ? criticalItemsPreview.map((item, i) => (
                <div key={i} className="p-5 rounded-3xl border border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30">
                  <p className="text-base font-black uppercase pr-2 leading-tight text-slate-800 dark:text-white truncate">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>
                      Saldo: <span className="text-red-600">{item.quantity} {item.unit || 'UN'}</span>
                    </span>
                    <span>Mín: {item.minQty} {item.unit || 'UN'}</span>
                  </div>
                </div>
              )) : (
                <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                  Sem itens críticos no momento
                </div>
              )}
            </div>
          </div>

          <div className="relative h-64 rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&q=80"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/40" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-black tracking-tight uppercase tracking-widest">LogiAI Insight</h3>
              </div>
              <p className="text-xs font-bold text-blue-100 mb-6 leading-relaxed">
                Otimização detectada: remanejamento recomendado da Doca 01 para agilizar a descarga de amanhã.
              </p>
              <button className="w-full py-4 bg-white text-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-100 transition-all active:scale-95">
                Otimizar Agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
