
import React, { useState } from 'react';
import { PurchaseOrder, InventoryItem } from '../types';

interface ProcurementManagementProps {
  pendingOrders?: PurchaseOrder[];
  inventory?: InventoryItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

export const ProcurementManagement: React.FC<ProcurementManagementProps> = ({
  pendingOrders = [],
  onApprove,
  onReject
}) => {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = () => {
    if (selectedOrder) {
      onApprove(selectedOrder.id);
      setSelectedOrder(null);
    }
  };

  const handleReject = () => {
    if (selectedOrder) {
      onReject(selectedOrder.id, rejectionReason.trim() || undefined);
      setSelectedOrder(null);
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Controladoria de Suprimentos</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Gestão de Compras</h2>
          <p className="text-slate-500 text-sm font-medium">Aprovação estratégica de requisições e análise de budget operacional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Requisições Aguardando Análise</h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase">{pendingOrders.length} Pendentes</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingOrders.length > 0 ? pendingOrders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${order.priority === 'urgente' ? 'bg-red-500 shadow-red-500/20' : 'bg-slate-800'
                    }`}>
                    {order.id.slice(-2)}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-800 dark:text-white leading-tight">{order.vendor}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      ID: {order.id} • {order.items.length} Itens • R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all active:scale-95"
                >
                  Analisar Pedido
                </button>
              </div>
            )) : (
              <div className="p-20 text-center flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-12 text-slate-100 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 11 3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tudo em dia. Nenhuma requisição pendente.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-slate-400">Budget Global</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>Utilizado</span><span>72%</span></div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: '72%' }}></div></div>
              </div>
              <div>
                <p className="text-3xl font-black">R$ 42.150,00</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Saldo Disponível em Caixa</p>
              </div>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Detalhes Financeiros</button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
              <h3 className="text-xs font-black uppercase tracking-widest">Sugestão LogiAI</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
              "O faturamento deste mês está 15% acima da projeção. Recomendo aprovação de pedidos urgentes de reposição para não comprometer as vendas do próximo ciclo."
            </p>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Análise de Pedido: {selectedOrder.id}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Controladoria • Auditoria de Requisição</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="size-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Solicitante</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{selectedOrder.requester || 'Operação Automática'}</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Valor Total</p>
                <p className="text-sm font-black text-primary">R$ {selectedOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-4 max-h-48 overflow-y-auto pr-2 mb-8 scrollbar-hide">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cód. Produto: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800 dark:text-white">{item.qty} un.</p>
                    <p className="text-[10px] font-bold text-slate-400">R$ {item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Exibir Cotações se existirem */}
            {selectedOrder.quotes && selectedOrder.quotes.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Cotações Recebidas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedOrder.quotes.map((quote, idx) => (
                    <div
                      key={quote.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${quote.isSelected
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`size-6 rounded-full flex items-center justify-center text-xs font-black text-white ${quote.isSelected ? 'bg-green-500' : 'bg-slate-400'
                          }`}>{idx + 1}</span>
                        {quote.isSelected && (
                          <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase">Selecionada</span>
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-800 dark:text-white mb-1">{quote.vendorName}</p>
                      <p className="text-lg font-black text-primary mb-2">R$ {quote.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Validade: {quote.validUntil}</p>
                      {quote.notes && (
                        <p className="text-[9px] text-slate-500 mt-2 italic">{quote.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de Motivo de Rejeição */}
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Motivo da Rejeição (Opcional)</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Descreva o motivo caso rejeite este pedido..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium focus:border-red-500 transition-all resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReject}
                className="flex-1 py-5 bg-white dark:bg-slate-800 text-red-500 border border-red-100 dark:border-red-900/30 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95"
              >
                Rejeitar Pedido
              </button>
              <button
                onClick={handleApprove}
                className="flex-[2] py-5 bg-emerald-500 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
              >
                Aprovar para Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
