
import React from 'react';
import { MaterialIcon, Badge } from '../constants';
import { Tachograph as TachographType } from '../types';

const Tachograph: React.FC = () => {
  const tachos: TachographType[] = [
    { id: '1', vehiclePlate: 'BRA2E24', certificateNumber: '12345678/2023', lastCalibration: '15/10/2023', nextCalibration: '15/10/2025', feeValue: 149.90, status: 'REGULAR' },
    { id: '2', vehiclePlate: 'PLK9G88', certificateNumber: '98765432/2022', lastCalibration: '10/01/2022', nextCalibration: '10/01/2024', feeValue: 149.90, status: 'ALERTA' },
    { id: '3', vehiclePlate: 'OMK0A12', certificateNumber: '22334455/2021', lastCalibration: '05/05/2021', nextCalibration: '05/05/2023', feeValue: 149.90, status: 'VENCIDO' },
    { id: '4', vehiclePlate: 'KLP2J99', certificateNumber: '55667788/2023', lastCalibration: '20/08/2023', nextCalibration: '20/08/2025', feeValue: 149.90, status: 'REGULAR' },
  ];

  const stats = [
    { label: 'Afericoes Vencidas', value: '12', color: 'red', icon: 'timer_off' },
    { label: 'Vencendo em 30 dias', value: '08', color: 'amber', icon: 'history' },
    { label: 'Total em Taxas (Ano)', value: 'R$ 4.250', color: 'blue', icon: 'payments' },
    { label: 'Frota Regularizada', value: '85%', color: 'emerald', icon: 'verified' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Resumo Estatistico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <div className={`p-2 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-900/20 text-${s.color}-600 dark:text-${s.color}-400`}>
                   <MaterialIcon name={s.icon} />
                </div>
             </div>
             <h3 className="text-2xl font-black">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Alerta de Fiscalizacao */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-3xl flex items-center gap-4">
         <div className="size-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
            <MaterialIcon name="info" fill />
         </div>
         <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Regras de Fiscalizacao (CONTRAN)</h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
               Lembre-se: O certificado de verificacao do tacografo tem validade de 2 anos. A ausencia ou vencimento gera infracao grave e retencao do veiculo.
            </p>
         </div>
      </div>

      {/* Listagem de Tacografos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
         <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
               <h3 className="font-bold">Controle de Certificados Inmetro</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Afericoes e Taxas de Certificacao</p>
            </div>
            <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2">
               <MaterialIcon name="picture_as_pdf" className="!text-[16px]" />
               Baixar Relatorio Geral
            </button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-4">Veiculo</th>
                     <th className="px-6 py-4">Certificado Inmetro</th>
                     <th className="px-6 py-4 text-center">Ultima Afericao</th>
                     <th className="px-6 py-4 text-center">Vencimento</th>
                     <th className="px-6 py-4 text-center">Taxa (R$)</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-8 py-4 text-right">Acoes</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tachos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                             <div className="size-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                <MaterialIcon name="local_shipping" className="!text-[16px]" />
                             </div>
                             <span className="text-sm font-bold font-mono">{t.vehiclePlate}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.certificateNumber}</p>
                       </td>
                       <td className="px-6 py-4 text-center text-xs font-medium">{t.lastCalibration}</td>
                       <td className="px-6 py-4 text-center text-xs font-black text-slate-900 dark:text-white">{t.nextCalibration}</td>
                       <td className="px-6 py-4 text-center text-xs font-bold text-emerald-600">{t.feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                       <td className="px-6 py-4 text-center">
                          <Badge variant={t.status === 'REGULAR' ? 'success' : t.status === 'ALERTA' ? 'warning' : 'danger'}>
                             {t.status}
                          </Badge>
                       </td>
                       <td className="px-8 py-4 text-right">
                          <button title="Opcoes" className="p-2 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-95">
                             <MaterialIcon name="more_vert" className="text-slate-400 hover:text-primary transition-colors cursor-pointer" />
                          </button>
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

export default Tachograph;

