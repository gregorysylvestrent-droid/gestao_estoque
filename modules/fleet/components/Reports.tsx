
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MaterialIcon, Badge } from '../constants';

const Reports: React.FC = () => {
  const chartData = [
    { name: 'Jan', costs: 4000, fines: 2400 },
    { name: 'Fev', costs: 3000, fines: 1398 },
    { name: 'Mar', costs: 2000, fines: 9800 },
    { name: 'Abr', costs: 2780, fines: 3908 },
    { name: 'Mai', costs: 1890, fines: 4800 },
    { name: 'Jun', costs: 2390, fines: 3800 },
  ];

  const fleetHealth = [
    { label: 'Disponibilidade', value: '94%', color: 'emerald' },
    { label: 'Custo por Km', value: 'R$ 2,45', color: 'blue' },
    { label: 'Eficiencia Energ.', value: '18km/L', color: 'amber' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {fleetHealth.map((item, i) => (
          <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
             <h3 className={`text-3xl font-black text-${item.color}-600 dark:text-${item.color}-400`}>{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold">Evolucao de Custos vs Multas</h3>
            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold px-4 py-2">
              <option>Ultimos 6 meses</option>
              <option>Ultimo ano</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#137fec" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#137fec" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="costs" stroke="#137fec" strokeWidth={3} fillOpacity={1} fill="url(#colorCosts)" />
                <Area type="monotone" dataKey="fines" stroke="#e11d48" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
           <h3 className="font-bold mb-8">Consumo por Categoria</h3>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                   <YAxis hide />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                   <Bar dataKey="costs" fill="#137fec" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 text-center md:text-left">
            <div className="size-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
               <MaterialIcon name="auto_awesome" className="!text-[32px]" />
            </div>
            <div>
               <h4 className="text-xl font-black text-slate-900 dark:text-white">Relatorio de IA Gerado</h4>
               <p className="text-sm text-slate-600 dark:text-slate-400">Identificamos uma economia potencial de 12% na rota Sul.</p>
            </div>
         </div>
         <button className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95">
            Ver Insights Detalhados
         </button>
      </div>
    </div>
  );
};

export default Reports;


