
import React from 'react';
import { MaterialIcon } from '../constants';

const FiscalCalendar: React.FC = () => {
  const urgentActions = [
    { title: 'IPVA: Final 4', detail: 'Vence amanha - 12 veiculos', color: 'red', icon: 'priority_high' },
    { title: 'Recurso de Multa', detail: 'Prazo fatal em 48h (ABC-1234)', color: 'amber', icon: 'gavel' },
  ];

  const calendarDays = Array.from({ length: 35 }, (_, i) => i - 2);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Widget */}
      <aside className="w-full lg:w-80 shrink-0 space-y-6">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
           <h3 className="font-black text-lg mb-1">Acoes Urgentes</h3>
           <p className="text-xs text-slate-400 font-medium mb-6">Vencimentos proximos (48h)</p>
           
           <div className="space-y-4">
              {urgentActions.map((action, i) => (
                <div key={i} className={`p-4 rounded-2xl bg-${action.color}-50 dark:bg-${action.color}-900/20 border border-${action.color}-100 dark:border-${action.color}-900/30 flex gap-3`}>
                   <MaterialIcon name={action.icon} className={`text-${action.color}-600 dark:text-${action.color}-400 mt-0.5`} />
                   <div>
                      <p className="text-sm font-bold">{action.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium mb-2">{action.detail}</p>
                      <button
                        className={`text-[10px] font-bold text-${action.color}-700 dark:text-${action.color}-300 px-3 py-1 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30 border border-${action.color}-200/60 dark:border-${action.color}-900/40 hover:bg-${action.color}-200/60 dark:hover:bg-${action.color}-900/50 transition-all active:scale-95`}
                      >
                        Resolver Agora
                      </button>
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                <MaterialIcon name="calendar_month" />
                Calendario Fiscal
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                <MaterialIcon name="description" />
                IPVA / Licenciamento
              </button>
           </div>
        </div>

        <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl">
           <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Pendente Outubro</p>
           <h2 className="text-3xl font-black mb-1">R$ 48.920</h2>
           <p className="text-xs text-slate-500 font-medium">42 guias para pagamento</p>
        </div>
      </aside>

      {/* Main Calendar Area */}
      <section className="flex-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                 <h3 className="text-xl font-black">Calendario de Obrigacoes</h3>
                 <p className="text-sm text-slate-400 font-medium">Outubro 2023</p>
              </div>
              <div className="flex items-center gap-2">
                 <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><MaterialIcon name="chevron_left" /></button>
                 <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">Hoje</button>
                 <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><MaterialIcon name="chevron_right" /></button>
              </div>
           </div>

           <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                <div key={d} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
              ))}
           </div>

           <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => (
                <div key={idx} className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 last:border-r-0 ${day <= 0 ? 'opacity-30 bg-slate-50/50' : ''}`}>
                   <span className={`text-xs font-bold ${day === 7 ? 'size-6 rounded-full bg-primary text-white flex items-center justify-center' : 'text-slate-400'}`}>
                     {day > 0 ? day : day + 30}
                   </span>
                   {day === 1 && (
                     <div className="mt-2 p-1.5 bg-primary/10 rounded-lg">
                        <p className="text-[9px] font-black text-primary uppercase truncate">IPVA: Final 1</p>
                     </div>
                   )}
                   {day === 7 && (
                     <div className="mt-2 space-y-1">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                           <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase truncate">Recurso JARI</p>
                        </div>
                        <div className="p-1.5 bg-primary rounded-lg">
                           <p className="text-[9px] font-black text-white uppercase truncate">Licenciam. Final 2</p>
                        </div>
                     </div>
                   )}
                   {day === 10 && (
                     <div className="mt-2 p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase truncate">IPVA Final 4</p>
                     </div>
                   )}
                </div>
              ))}
           </div>

           <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-6">
              {[
                { label: 'IPVA / Licenciamento', color: 'bg-primary' },
                { label: 'Seguros', color: 'bg-emerald-500' },
                { label: 'Recursos', color: 'bg-amber-500' },
                { label: 'Prazo Fatal', color: 'bg-red-500' },
              ].map(leg => (
                <div key={leg.label} className="flex items-center gap-2">
                   <div className={`size-3 rounded-full ${leg.color}`}></div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase">{leg.label}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Map Preview */}
        <div className="relative h-48 rounded-3xl overflow-hidden group shadow-lg">
           <img 
              src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1200&h=400" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Fleet Map"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
           <div className="absolute bottom-6 left-6 text-white">
              <h4 className="font-black text-lg">Cobertura da Frota em Tempo Real</h4>
              <p className="text-xs font-medium opacity-80">Rastreamento de 152 veiculos ativos</p>
           </div>
           <button className="absolute bottom-6 right-6 px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-xl hover:bg-slate-100 transition-all">
              Abrir Mapa Completo
           </button>
        </div>
      </section>
    </div>
  );
};

export default FiscalCalendar;

