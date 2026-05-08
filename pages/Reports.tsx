
import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import * as XLSX from 'xlsx';
import { PurchaseOrder, PurchaseOrderStatus, PO_STATUS_LABELS } from '../types';
import { parseDateLike } from '../utils/dateTime';


const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrency = (value: unknown) => {
  const numberValue = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(numberValue) ? numberValue : 0);
};

const getOrderItems = (order: PurchaseOrder) => (Array.isArray(order.items) ? order.items : []);

const getOrderQuotes = (order: PurchaseOrder) => (Array.isArray(order.quotes) ? order.quotes : []);

const getItemDescription = (item: PurchaseOrder['items'][number]) => String(item.name || (item as any).productName || 'Produto sem descrição');

const getSelectedSupplierForItem = (order: PurchaseOrder, item: PurchaseOrder['items'][number]) => {
  if (item.selectedVendorName) return item.selectedVendorName;
  const selectedQuoteId = item.selectedQuoteId || order.selectedQuoteId;
  return getOrderQuotes(order).find((quote) => quote.id === selectedQuoteId)?.vendorName || order.vendor || '';
};

interface PurchaseOrderProductReportRow {
  orderId: string;
  requestDate: string;
  status: string;
  priority: string;
  requester: string;
  buyer: string;
  plate: string;
  costCenter: string;
  sku: string;
  description: string;
  qty: number;
  selectedSupplier: string;
  quotedSupplier: string;
  quotedUnitPrice: number | null;
  quotedTotalValue: number | null;
  quoteLeadTime: string;
  quoteValidUntil: string;
  quoteNotes: string;
  isSelectedQuote: boolean;
}

const buildPurchaseOrderProductReportRows = (orders: PurchaseOrder[]): PurchaseOrderProductReportRow[] => {
  return orders.flatMap((order) => {
    const items = getOrderItems(order);
    if (items.length === 0) {
      return [{
        orderId: order.id,
        requestDate: order.requestDate || '',
        status: PO_STATUS_LABELS[order.status] || order.status,
        priority: order.priority || '',
        requester: order.requester || '',
        buyer: getBuyerFromApprovalHistory(order),
        plate: order.plate || '',
        costCenter: order.costCenter || '',
        sku: '',
        description: 'Pedido sem itens vinculados',
        qty: 0,
        selectedSupplier: order.vendor || '',
        quotedSupplier: '',
        quotedUnitPrice: null,
        quotedTotalValue: null,
        quoteLeadTime: '',
        quoteValidUntil: '',
        quoteNotes: '',
        isSelectedQuote: false,
      }];
    }

    return items.flatMap((item) => {
      const quotesForItem = getOrderQuotes(order)
        .map((quote) => ({
          quote,
          quotedItem: quote.items?.find((quoteItem) => quoteItem.sku === item.sku),
        }))
        .filter(({ quotedItem }) => Boolean(quotedItem));

      const baseRow = {
        orderId: order.id,
        requestDate: order.requestDate || '',
        status: PO_STATUS_LABELS[order.status] || order.status,
        priority: order.priority || '',
        requester: order.requester || '',
        buyer: getBuyerFromApprovalHistory(order),
        plate: order.plate || '',
        costCenter: order.costCenter || '',
        sku: item.sku || '',
        description: getItemDescription(item),
        qty: Number(item.qty || 0),
        selectedSupplier: getSelectedSupplierForItem(order, item),
      };

      if (quotesForItem.length === 0) {
        return [{
          ...baseRow,
          quotedSupplier: '',
          quotedUnitPrice: Number(item.price || 0) || null,
          quotedTotalValue: Number(item.price || 0) * Number(item.qty || 0) || null,
          quoteLeadTime: '',
          quoteValidUntil: '',
          quoteNotes: '',
          isSelectedQuote: false,
        }];
      }

      return quotesForItem.map(({ quote, quotedItem }) => {
        const unitPrice = Number(quotedItem?.unitPrice || 0);
        const qty = Number(item.qty || 0);
        const selectedQuoteId = item.selectedQuoteId || order.selectedQuoteId;
        return {
          ...baseRow,
          quotedSupplier: quote.vendorName || '',
          quotedUnitPrice: Number.isFinite(unitPrice) ? unitPrice : null,
          quotedTotalValue: Number.isFinite(unitPrice) && Number.isFinite(qty) ? unitPrice * qty : null,
          quoteLeadTime: quotedItem?.leadTime || '',
          quoteValidUntil: quote.validUntil || '',
          quoteNotes: quote.notes || '',
          isSelectedQuote: Boolean(selectedQuoteId && quote.id === selectedQuoteId) || Boolean(item.selectedVendorId && quote.vendorId === item.selectedVendorId),
        };
      });
    });
  });
};

const SUPPLY_STATUS_FLOW: PurchaseOrderStatus[] = ['requisicao', 'cotacao', 'pendente', 'aprovado', 'enviado', 'recebido', 'cancelado'];

const STATUS_VISUALS: Record<PurchaseOrderStatus, { color: string; bg: string; ring: string }> = {
  rascunho: { color: 'text-slate-500', bg: 'bg-slate-500/10', ring: 'ring-slate-500/20' },
  requisicao: { color: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
  cotacao: { color: 'text-blue-500', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
  pendente: { color: 'text-purple-500', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
  aprovado: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  enviado: { color: 'text-indigo-500', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20' },
  recebido: { color: 'text-slate-600', bg: 'bg-slate-500/10', ring: 'ring-slate-500/20' },
  cancelado: { color: 'text-red-500', bg: 'bg-red-500/10', ring: 'ring-red-500/20' }
};

const REPORT_STATUS_FLOW: PurchaseOrderStatus[] = ['requisicao', 'cotacao', 'pendente', 'aprovado', 'enviado', 'recebido'];

const getHistoryStatusTimestamp = (order: PurchaseOrder, status: PurchaseOrderStatus): Date | null => {
  const historyMatches = (order.approvalHistory || [])
    .filter((entry) => entry?.status === status && entry?.at)
    .map((entry) => parseDateLike(entry.at))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return historyMatches[0] || null;
};

const getOrderStatusTimestampMap = (order: PurchaseOrder): Record<PurchaseOrderStatus, Date | null> => ({
  rascunho: getHistoryStatusTimestamp(order, 'rascunho'),
  requisicao: parseDateLike(order.requestDate) || getHistoryStatusTimestamp(order, 'requisicao'),
  cotacao: parseDateLike(order.quotesAddedAt || '') || getHistoryStatusTimestamp(order, 'cotacao'),
  pendente: getHistoryStatusTimestamp(order, 'pendente'),
  aprovado: parseDateLike(order.approvedAt || '') || getHistoryStatusTimestamp(order, 'aprovado'),
  enviado: parseDateLike(order.sentToVendorAt || '') || getHistoryStatusTimestamp(order, 'enviado'),
  recebido: parseDateLike(order.receivedAt || '') || getHistoryStatusTimestamp(order, 'recebido'),
  cancelado: getHistoryStatusTimestamp(order, 'cancelado'),
});

const formatDateTimeForExport = (value: Date | null) => {
  if (!value) return '';
  return value.toLocaleString('pt-BR');
};

const diffDays = (start: Date | null, end: Date | null) => {
  if (!start || !end) return '';
  const delta = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Number.isFinite(delta) && delta >= 0 ? delta.toFixed(2) : '';
};

const getBuyerFromApprovalHistory = (order: PurchaseOrder) => {
  const requisitionEntry = (order.approvalHistory || [])
    .find((entry) => entry?.status === 'requisicao' && String(entry?.by || '').trim().length > 0);
  return String(requisitionEntry?.by || '').trim();
};

const ProcurementDashboard: React.FC<{ orders: PurchaseOrder[] }> = ({ orders }) => {
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState<{ label: string; orders: PurchaseOrder[] } | null>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - periodDays);

    const activePOs = orders.filter(o => !['recebido', 'cancelado'].includes(o.status));
    const completedPOs = orders.filter(o => o.status === 'recebido');
    const canceledPOs = orders.filter(o => o.status === 'cancelado');
    const waitingApprovalPOs = orders.filter(o => o.status === 'pendente');
    const sentPOs = orders.filter(o => o.status === 'enviado');

    const inFlux = activePOs.length;
    const finalizedTotal = completedPOs.length + canceledPOs.length;

    const parseDate = (d: string) => parseDateLike(d) || new Date(0);

    const ordersInPeriod = orders.filter(o => parseDate(o.requestDate) >= periodStart);

    const entered = ordersInPeriod.length;
    const finalizedInPeriod = ordersInPeriod.filter(o => o.status === 'recebido').length;
    const canceledInPeriod = ordersInPeriod.filter(o => o.status === 'cancelado').length;
    const quotedInPeriod = ordersInPeriod.filter(o => o.status === 'cotacao').length;
    const waitingApprovalInPeriod = ordersInPeriod.filter(o => o.status === 'pendente').length;
    const sentInPeriod = ordersInPeriod.filter(o => o.status === 'enviado').length;

    const completedInPeriod = ordersInPeriod.filter(o => o.status === 'recebido' && o.receivedAt);
    const leadTimes = completedInPeriod.map(o => {
      const start = parseDate(o.requestDate);
      const end = parseDate(o.receivedAt!);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgLeadTime = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : '---';

    const itemsRequested = ordersInPeriod.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);
    const avgOrderValue = ordersInPeriod.length > 0 ? (ordersInPeriod.reduce((sum, o) => sum + o.total, 0) / ordersInPeriod.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const uniqueVendors = new Set(ordersInPeriod.map(o => o.vendor)).size;
    const urgentPOs = ordersInPeriod.filter(o => o.priority === 'urgente');

    const getRanking = (key: 'requester' | 'category' | 'vendor') => {
      const counts: Record<string, number> = {};
      orders.forEach(o => {
        const val = key === 'requester' ? o.requester : key === 'category' ? o.items[0]?.category : o.vendor;
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    };

    const statusSummary = SUPPLY_STATUS_FLOW.map((status) => {
      const statusOrders = orders.filter((order) => order.status === status);
      return {
        status,
        label: PO_STATUS_LABELS[status],
        orders: statusOrders,
        value: statusOrders.length,
        ...STATUS_VISUALS[status]
      };
    });

    return {
      statusSummary,
      activeList: activePOs,
      completedList: completedPOs,
      canceledList: canceledPOs,
      waitingApprovalList: waitingApprovalPOs,
      sentList: sentPOs,
      inFlux,
      finalizedTotal,
      entered,
      enteredList: ordersInPeriod,
      finalizedInPeriod,
      canceledInPeriod,
      quotedInPeriod,
      waitingApprovalInPeriod,
      sentInPeriod,
      avgLeadTime,
      itemsRequested,
      avgOrderValue,
      uniqueVendors,
      urgentCount: urgentPOs.length,
      urgentList: urgentPOs,
      leaderRank: getRanking('requester'),
      categoryRank: getRanking('category'),
      vendorRank: getRanking('vendor')
    };
  }, [orders, periodDays]);

  const handleExportLeadTimeReport = () => {
    if (!Array.isArray(orders) || orders.length === 0) return;

    const headers = [
      'ID do Pedido',
      'Status Atual',
      'Fornecedor',
      'Centro de Custo',
      'Placa',
      'Solicitante',
      'Comprador',
      'Prioridade',
      'Data/Hora Requisição',
      'Data/Hora Cotação',
      'Data/Hora Pendente',
      'Data/Hora Aprovado',
      'Data/Hora Enviado',
      'Data/Hora Recebido',
      'Dias Requisição → Cotação',
      'Dias Cotação → Pendente',
      'Dias Pendente → Aprovado',
      'Dias Aprovado → Enviado',
      'Dias Enviado → Recebido',
      'Total de Dias Requisição → Recebido',
      'Total de Dias Cotação → Recebido',
    ];

    const rows = orders.map((order) => {
      const timestamps = getOrderStatusTimestampMap(order);
      const flowPairs: Array<[PurchaseOrderStatus, PurchaseOrderStatus]> = [
        ['requisicao', 'cotacao'],
        ['cotacao', 'pendente'],
        ['pendente', 'aprovado'],
        ['aprovado', 'enviado'],
        ['enviado', 'recebido'],
      ];

      const daysByFlow = flowPairs.map(([startStatus, endStatus]) =>
        diffDays(timestamps[startStatus], timestamps[endStatus])
      );

      return [
        order.id,
        PO_STATUS_LABELS[order.status] || order.status,
        order.vendor,
        order.costCenter || '',
        order.plate || '',
        order.requester || '',
        getBuyerFromApprovalHistory(order),
        order.priority || '',
        ...REPORT_STATUS_FLOW.map((status) => formatDateTimeForExport(timestamps[status])),
        ...daysByFlow,
        diffDays(timestamps.requisicao, timestamps.recebido),
        diffDays(timestamps.cotacao, timestamps.recebido),
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lead Time Pedidos');
    XLSX.writeFile(workbook, `relatorio-leadtime-pedidos-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 mt-12 pt-12 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Analytics de Suprimentos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        {stats.statusSummary.map((item, i) => (
          <button
            key={i}
            onClick={() => setSelectedMetric({ label: item.label, orders: item.items })}
            className="group bg-white dark:bg-[#1a222c] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02] active:scale-95"
          >
            <div className={`absolute -top-4 -right-4 size-20 ${item.bg} rounded-full transition-all group-hover:scale-110`} />
            <div className={`size-12 rounded-2xl ${item.bg} ring-4 ${item.ring} flex items-center justify-center mb-4 z-10`}>
              <span className={`text-[10px] font-black ${item.color} uppercase tracking-tighter`}>{item.label.substring(0, 3)}</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 z-10">Status {item.label}</p>
            <h4 className="text-4xl font-black text-slate-800 dark:text-white z-10">{item.value}</h4>
            <div className="mt-4 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Explorar Dados</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <button
            onClick={() => setSelectedMetric({ label: 'Cards no Fluxo', orders: stats.activeList })}
            className="w-full group bg-white dark:bg-[#1a222c] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fluxo Ativo de Suprimentos</p>
            <h4 className="text-5xl font-black text-slate-800 dark:text-white">{stats.inFlux}</h4>
            <span className="text-[8px] font-black text-primary uppercase mt-2 tracking-widest opacity-50 group-hover:opacity-100">Clique p/ Detalhes</span>
          </button>
          <button
            onClick={() => setSelectedMetric({ label: 'Cards Finalizados', orders: [...stats.completedList, ...stats.canceledList] })}
            className="w-full group bg-white dark:bg-[#1a222c] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cards Finalizados</p>
            <h4 className="text-5xl font-black text-slate-800 dark:text-white">{stats.finalizedTotal}</h4>
            <span className="text-[8px] font-black text-primary uppercase mt-2 tracking-widest opacity-50 group-hover:opacity-100">Clique p/ Detalhes</span>
          </button>
        </div>

        <div className="lg:col-span-9 bg-white dark:bg-[#1a222c] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Líderes</h5>
              </div>
              <div className="space-y-4">
                {stats.leaderRank.map(([name, count], i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-tight">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{name}</span>
                      <span className="text-slate-800 dark:text-white">{count} CARDS</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / (stats.leaderRank[0]?.[1] || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Equipes (Deptos)</h5>
              </div>
              <div className="space-y-4">
                {stats.categoryRank.map(([category, count], i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-tight">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{category || 'Geral'}</span>
                      <span className="text-slate-800 dark:text-white">{count} CARDS</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(count / (stats.categoryRank[0]?.[1] || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Fornecedores Top</h5>
              </div>
              <div className="space-y-4">
                {stats.vendorRank.map(([vendor, count], i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-tight">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{vendor}</span>
                      <span className="text-slate-800 dark:text-white">{count} CARDS</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(count / (stats.vendorRank[0]?.[1] || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/50 dark:bg-slate-800/10 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Indicadores do fluxo no período</h5>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="bg-white dark:bg-[#1a222c] border-2 border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <button
              onClick={handleExportLeadTimeReport}
              disabled={orders.length === 0}
              className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Exportar Lead Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Cards Inseridos', value: stats.entered, items: stats.enteredList, color: 'bg-blue-500', help: 'Novos pedidos criados' },
            { label: 'Cards Finalizados', value: stats.finalizedInPeriod, items: stats.completedList.filter(o => stats.enteredList.includes(o)), color: 'bg-emerald-500', help: 'Pedidos recebidos' },
            { label: 'Cards Cancelados', value: stats.canceledInPeriod, items: stats.canceledList.filter(o => stats.enteredList.includes(o)), color: 'bg-red-500', help: 'Pedidos cancelados' },
            { label: 'Em Cotação', value: stats.quotedInPeriod, items: stats.enteredList.filter(o => o.status === 'cotacao'), color: 'bg-blue-500', help: 'Negociação com fornecedores' },
            { label: 'Aguardando Aprovação', value: stats.waitingApprovalInPeriod, items: stats.waitingApprovalList.filter(o => stats.enteredList.includes(o)), color: 'bg-purple-500', help: 'Pendente de gestor' },
            { label: 'Enviados ao Fornecedor', value: stats.sentInPeriod, items: stats.sentList.filter(o => stats.enteredList.includes(o)), color: 'bg-indigo-500', help: 'Em processamento externo' },
            { label: 'Lead Time Médio', value: `${stats.avgLeadTime} d`, items: stats.completedList.filter(o => stats.enteredList.includes(o)), color: 'bg-amber-500', help: 'Média de ciclo' },
            { label: 'Itens Solicitados', value: stats.itemsRequested, items: stats.enteredList, color: 'bg-indigo-500', help: 'Soma de quantidades' },
            { label: 'Ticket Médio (PO)', value: stats.avgOrderValue, items: stats.enteredList, color: 'bg-violet-500', help: 'Valor médio p/ pedido' },
            { label: 'Mix Fornecedores', value: stats.uniqueVendors, items: stats.enteredList, color: 'bg-slate-500', help: 'Fornecedores distintos' },
            { label: 'Pedidos Urgentes', value: stats.urgentCount, items: stats.urgentList, color: 'bg-rose-500', help: 'Prioridade Urgente' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setSelectedMetric({ label: item.label, orders: item.items || [] })}
              className="group bg-white dark:bg-[#1a222c] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all text-left relative overflow-hidden active:scale-95"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                <div className={`size-1.5 rounded-full ${item.color} animate-pulse`} />
              </div>
              <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{item.value}</h4>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${item.color} opacity-30 transition-all group-hover:opacity-100`} style={{ width: '65%' }} />
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight opacity-100 group-hover:opacity-0 transition-opacity">{item.help}</p>
              <div className="absolute inset-x-0 bottom-0 py-2 bg-primary/10 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform">
                <span className="text-[7px] font-black text-primary uppercase tracking-tighter">Explorar Registros</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#101922] w-full max-w-5xl max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M8 14v4" />
                    <path d="M12 10v8" />
                    <path d="M16 6v12" />
                    <path d="M20 12v6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Detalhes: {selectedMetric.label}</h3>
                  <p className="text-xs font-bold text-slate-400">{selectedMetric.orders.length} registros encontrados</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMetric(null)}
                className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 gap-4">
                {selectedMetric.orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3">ID / Data</th>
                          <th className="px-4 py-3">Fornecedor</th>
                          <th className="px-4 py-3">Produtos</th>
                          <th className="px-4 py-3">Valor Total</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {selectedMetric.orders.map((o, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-4">
                              <div className="text-xs font-black text-slate-800 dark:text-white">#{o.id}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{o.requestDate}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{o.vendor}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1">
                                {o.items.slice(0, 2).map((item, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold text-slate-500">
                                    {getItemDescription(item)} ({item.qty})
                                  </span>
                                ))}
                                {getOrderItems(o).length > 2 && (
                                  <span className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-bold text-primary">+{getOrderItems(o).length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(o.total)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${(STATUS_VISUALS[o.status] || STATUS_VISUALS.rascunho).bg} ${(STATUS_VISUALS[o.status] || STATUS_VISUALS.rascunho).color}`}>
                                {PO_STATUS_LABELS[o.status] || o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-14 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <p className="font-black uppercase tracking-widest">Nenhum pedido encontrado</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 flex justify-end">
              <button
                onClick={() => setSelectedMetric(null)}
                className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/25 active:scale-95 transition-all"
              >
                Fechar Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportsProps {
  orders?: PurchaseOrder[];
}

export const Reports: React.FC<ReportsProps> = ({ orders = [] }) => {
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [plateFilter, setPlateFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [requesterFilter, setRequesterFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');

  const filterOptions = useMemo(() => {
    const unique = (values: string[]) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return {
      plates: unique(orders.map((order) => order.plate || '')),
      costCenters: unique(orders.map((order) => order.costCenter || '')),
      vendors: unique(orders.map((order) => order.vendor || '')),
      requesters: unique(orders.map((order) => order.requester || '')),
      buyers: unique(orders.map((order) => getBuyerFromApprovalHistory(order))),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const fromDate = dateFromFilter ? parseDateLike(`${dateFromFilter}T00:00:00`) : null;
    const toDate = dateToFilter ? parseDateLike(`${dateToFilter}T23:59:59`) : null;

    return orders.filter((order) => {
      const orderDate = parseDateLike(order.requestDate);
      if (!orderDate) return false;
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      if (plateFilter && order.plate !== plateFilter) return false;
      if (costCenterFilter && order.costCenter !== costCenterFilter) return false;
      if (vendorFilter && order.vendor !== vendorFilter) return false;
      if (requesterFilter && (order.requester || '') !== requesterFilter) return false;
      if (buyerFilter && getBuyerFromApprovalHistory(order) !== buyerFilter) return false;
      return true;
    });
  }, [orders, dateFromFilter, dateToFilter, plateFilter, costCenterFilter, vendorFilter, requesterFilter, buyerFilter]);

  const kpis = useMemo(() => {
    const completedOrders = filteredOrders.filter((order) => order.status === 'recebido');
    const avgInDays = (values: string[]) => {
      const parsed = values.map(Number).filter((value) => Number.isFinite(value) && value >= 0);
      if (parsed.length === 0) return '---';
      return `${(parsed.reduce((sum, value) => sum + value, 0) / parsed.length).toFixed(1)} dias`;
    };

    const cycleTimeValues = completedOrders.map((order) => {
      const timestamps = getOrderStatusTimestampMap(order);
      return diffDays(timestamps.requisicao, timestamps.recebido);
    });

    const leadTimeValues = completedOrders.map((order) => {
      const timestamps = getOrderStatusTimestampMap(order);
      return diffDays(timestamps.enviado, timestamps.recebido);
    });

    const operationCost = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      cycleTime: avgInDays(cycleTimeValues),
      leadTime: avgInDays(leadTimeValues),
      operationCost: operationCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      completedCount: completedOrders.length,
    };
  }, [filteredOrders]);

  const purchaseOrderLeadTimeByMonth = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
    const aggregated = new Map<string, { label: string; totalDays: number; count: number; order: number }>();

    filteredOrders.forEach((order) => {
      if (order.status !== 'recebido' || !order.receivedAt) return;

      const createdAt = parseDateLike(order.requestDate);
      const finishedAt = parseDateLike(order.receivedAt);
      if (!createdAt || !finishedAt) return;

      const diffInDays = (finishedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (!Number.isFinite(diffInDays) || diffInDays < 0) return;

      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const current = aggregated.get(monthKey) || {
        label: monthFormatter.format(createdAt).replace('.', '').replace(/^\w/, (char) => char.toUpperCase()),
        totalDays: 0,
        count: 0,
        order: createdAt.getFullYear() * 12 + createdAt.getMonth(),
      };

      current.totalDays += diffInDays;
      current.count += 1;
      aggregated.set(monthKey, current);
    });

    return [...aggregated.values()]
      .sort((a, b) => a.order - b.order)
      .map((month) => ({
        month: month.label,
        avgDays: Number((month.totalDays / month.count).toFixed(1)),
      }));
  }, [filteredOrders]);

  const detailedReportRows = useMemo(
    () => buildPurchaseOrderProductReportRows(filteredOrders),
    [filteredOrders]
  );

  const handleExportPurchaseOrderProductsReport = () => {
    const headers = [
      'Pedido',
      'Data de abertura',
      'Status',
      'Prioridade',
      'Solicitante',
      'Comprador',
      'Placa',
      'Centro de custo',
      'Código do produto',
      'Descrição do produto',
      'Quantidade',
      'Fornecedor selecionado',
      'Fornecedor cotado',
      'Valor unitário cotado',
      'Valor total cotado',
      'Prazo cotado',
      'Validade da cotação',
      'Cotação selecionada',
      'Observações da cotação',
    ];

    const rows = detailedReportRows.map((row) => [
      row.orderId,
      row.requestDate,
      row.status,
      row.priority,
      row.requester,
      row.buyer,
      row.plate,
      row.costCenter,
      row.sku,
      row.description,
      row.qty,
      row.selectedSupplier,
      row.quotedSupplier,
      row.quotedUnitPrice ?? '',
      row.quotedTotalValue ?? '',
      row.quoteLeadTime,
      row.quoteValidUntil,
      row.isSelectedQuote ? 'Sim' : 'Não',
      row.quoteNotes,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos e Produtos');
    XLSX.writeFile(workbook, `relatorio-pedidos-produtos-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Relatórios e BI</h2>
          <p className="text-[#617589] font-medium">Análise de performance, acuracidade e throughput do armazém.</p>
        </div>
        <button
          onClick={() => {
            setDateFromFilter('');
            setDateToFilter('');
            setPlateFilter('');
            setCostCenterFilter('');
            setVendorFilter('');
            setRequesterFilter('');
            setBuyerFilter('');
          }}
          className="px-4 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold"
        >
          Limpar Filtros
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" title="Data inicial do pedido" />
        <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm" title="Data final do pedido" />
        <select value={plateFilter} onChange={(e) => setPlateFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm"><option value="">Todas as placas</option>{filterOptions.plates.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={costCenterFilter} onChange={(e) => setCostCenterFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm"><option value="">Todos os centros de custo</option>{filterOptions.costCenters.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm"><option value="">Todos os fornecedores</option>{filterOptions.vendors.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={requesterFilter} onChange={(e) => setRequesterFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm"><option value="">Todos os solicitantes</option>{filterOptions.requesters.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm"><option value="">Todos os compradores</option>{filterOptions.buyers.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </div>

      <div className="bg-white dark:bg-[#1a222c] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Relatório operacional</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Pedidos, Produtos e Cotações</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {detailedReportRows.length} linhas com pedido, produto, quantidade e valor por fornecedor cotado.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPurchaseOrderProductsReport}
            disabled={detailedReportRows.length === 0}
            className="px-5 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            Exportar Pedidos/Produtos
          </button>
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left min-w-[1500px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3">Pedido / Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Solicitante / Comprador</th>
                <th className="px-4 py-3">Placa / Centro</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Qtd.</th>
                <th className="px-4 py-3">Fornecedor cotado</th>
                <th className="px-4 py-3 text-right">Valor unit.</th>
                <th className="px-4 py-3 text-right">Valor total</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Selecionado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {detailedReportRows.length > 0 ? detailedReportRows.map((row, index) => (
                <tr key={`${row.orderId}-${row.sku}-${row.quotedSupplier}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <p className="text-xs font-black text-slate-800 dark:text-white">#{row.orderId}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{row.requestDate || '-'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">
                      {row.status || '-'}
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{row.priority || '-'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{row.requester || '-'}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{row.buyer || 'Comprador não informado'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{row.plate || '-'}</p>
                    <p className="text-[10px] font-semibold text-primary">{row.costCenter || '-'}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-xs font-black text-primary">{row.sku || '-'}</td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[260px]">{row.description}</p>
                    <p className="text-[10px] font-semibold text-slate-500">Fornecedor escolhido: {row.selectedSupplier || '-'}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-right text-xs font-black text-slate-700 dark:text-slate-200">{row.qty}</td>
                  <td className="px-4 py-3 align-top text-xs font-bold text-slate-700 dark:text-slate-200">{row.quotedSupplier || 'Sem cotação'}</td>
                  <td className="px-4 py-3 align-top text-right text-xs font-black text-slate-700 dark:text-slate-200">{row.quotedUnitPrice === null ? '-' : formatCurrency(row.quotedUnitPrice)}</td>
                  <td className="px-4 py-3 align-top text-right text-xs font-black text-emerald-600 dark:text-emerald-400">{row.quotedTotalValue === null ? '-' : formatCurrency(row.quotedTotalValue)}</td>
                  <td className="px-4 py-3 align-top text-xs font-bold text-slate-500">{row.quoteLeadTime || '-'}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${row.isSelectedQuote ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {row.isSelectedQuote ? 'Sim' : 'Não'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1a222c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold">Produtividade de Operações</h3>
              <p className="text-xs text-gray-500 font-medium">Tempo médio de finalização (status recebido) por mês de criação</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseOrderLeadTimeByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#617589" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#617589"
                  fontSize={11}
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Dias', angle: -90, position: 'insideLeft', fill: '#617589' }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} dias`, 'Média']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine
                  y={15}
                  stroke="#ef4444"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  label={{ value: 'Meta 15 dias', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                />
                <Bar dataKey="avgDays" fill="#137fec" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a222c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Acuracidade de Inventário</h3>
          <div className="space-y-6">
            {[
              { label: 'Acuracidade Geral', value: '99.85%', color: 'bg-green-500', width: '99.85%' },
              { label: 'Setor A - Eletrônicos', value: '98.20%', color: 'bg-primary', width: '98.20%' },
              { label: 'Setor B - Alimentos', value: '99.95%', color: 'bg-green-500', width: '99.95%' },
              { label: 'Setor C - Ferramentas', value: '97.50%', color: 'bg-orange-500', width: '97.50%' },
            ].map((row, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">{row.label}</span>
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300">{row.value}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color}`} style={{ width: row.width }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 leading-relaxed italic">
              "A acuracidade geral está acima da meta (99.50%). O Setor C requer auditoria preventiva devido a divergências recorrentes no último trimestre."
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Cycle Time Médio',
            value: kpis.cycleTime,
            change: `${kpis.completedCount} pedidos recebidos`,
            color: 'text-blue-500',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="size-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )
          },
          {
            label: 'Lead Time Médio',
            value: kpis.leadTime,
            change: 'Enviado → Recebido',
            color: 'text-purple-500',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="size-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            )
          },
          {
            label: 'Custo de Operação',
            value: kpis.operationCost,
            change: 'Total dos pedidos recebidos',
            color: 'text-green-500',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="size-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-[#1a222c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-[10px] font-black uppercase mb-1 tracking-widest">{kpi.label}</p>
              <p className="text-2xl font-black">{kpi.value}</p>
              <span className="text-xs font-black text-green-600">{kpi.change}</span>
            </div>
            <div className={kpi.color}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>
      <ProcurementDashboard orders={filteredOrders} />
    </div>
  );
};
