
import React from 'react';
import { MaterialIcon, Badge } from '../constants';
import { RNTRCRegistration } from '../types';

const RNTRC: React.FC = () => {
  const registrations: RNTRCRegistration[] = [
    { id: '1', name: 'Transportes TransLog Ltda', document: '12.345.678/0001-90', rntrcNumber: 'ETC-12345678', category: 'ETC', expiration: '20/12/2026', status: 'ATIVO', feeValue: 450.00 },
    { id: '2', name: 'Joao da Silva Transportes', document: '123.456.789-00', rntrcNumber: 'TAC-98765432', category: 'TAC', expiration: '15/05/2024', status: 'PENDENTE', feeValue: 180.00 },
    { id: '3', name: 'Coopercarga Cooperativa', document: '98.765.432/0001-11', rntrcNumber: 'CTC-55443322', category: 'CTC', expiration: '10/10/2023', status: 'VENCIDO', feeValue: 1200.00 },
  ];

  const stats = [
    { label: 'Registros Ativos', value: '08', icon: 'verified', color: 'emerald' },
    { label: 'Vencendo (90 dias)', value: '02', icon: 'schedule', color: 'amber' },
    { label: 'Vencidos / Irregulares', value: '01', icon: 'report_problem', color: 'red' },
    { label: 'Total em Taxas ANTT', value: 'R$ 1.830', icon: 'account_balance', color: 'blue' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <div className={`p-2 rounded-xl bg-${s.color}-100/50 text-${s.color}-600 dark:text-${s.color}-400`}>
                   <MaterialIcon name={s.icon} />
                </div>
             </div>
             <h3 className="text-2xl font-black">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl flex items-center gap-4">
        <div className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center shrink-0">
          <MaterialIcon name="policy" fill />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight">Obrigatoriedade RNTRC</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Todo transportador rodoviario remunerado de carga deve estar inscrito no RNTRC. A falta do registro ou porte de documento vencido resulta em multas pesadas e impedimento de circulacao.
          </p>
        </div>
      </div>

      {/* Tabela de Controle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
         <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
               <h3 className="font-bold">Certificados e Taxas ANTT</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestao de renovacoes e custas administrativas</p>
            </div>
            <div className="flex gap-2">
               <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase tracking-widest">
                  Consultar ANTT (API)
               </button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-4">Transportador / CNPJ</th>
                     <th className="px-6 py-4">No Registro RNTRC</th>
                     <th className="px-6 py-4 text-center">Categoria</th>
                     <th className="px-6 py-4 text-center">Validade</th>
                     <th className="px-6 py-4 text-center">Taxa Registro</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-8 py-4 text-right">Acoes</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {registrations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                       <td className="px-8 py-4">
                          <div>
                             <p className="text-sm font-bold">{r.name}</p>
                             <p className="text-[10px] text-slate-400 font-mono">{r.document}</p>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-xs font-black text-primary">{r.rntrcNumber}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                             {r.category === 'ETC' ? 'Empresa' : r.category === 'TAC' ? 'Autonomo' : 'Cooperativa'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center text-xs font-medium">{r.expiration}</td>
                       <td className="px-6 py-4 text-center text-xs font-bold text-emerald-600">
                          {r.feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </td>
                       <td className="px-6 py-4 text-center">
                          <Badge variant={r.status === 'ATIVO' ? 'success' : r.status === 'PENDENTE' ? 'warning' : 'danger'}>
                             {r.status}
                          </Badge>
                       </td>
                       <td className="px-8 py-4 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button title="Ver Comprovante" className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-all active:scale-95">
                               <MaterialIcon name="description" />
                             </button>
                             <button title="Editar" className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-all active:scale-95">
                               <MaterialIcon name="edit" />
                             </button>
                         </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default RNTRC;

