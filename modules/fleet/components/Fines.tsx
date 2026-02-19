
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MaterialIcon, Badge } from '../constants';

const Fines: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const data = [
    { name: 'Velocidade', value: 45, color: '#137fec' },
    { name: 'Sinal Vermelho', value: 25, color: '#e73908' },
    { name: 'Estacionamento', value: 15, color: '#ffc107' },
    { name: 'Outros', value: 15, color: '#64748b' },
  ];

  const topDrivers = [
    { name: 'Joao Silva', fines: 12, perc: 85, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3yp5bZoqUClTXuLenWskcAiEjj_UMlgEPgrFLXaNqL8FgA58BdLQueBaMahbBszGiaAqstOlRT7IbpBW_1BEXY-f7T6juSUqQA0OhceuoHbF7epiEnk7hixSa_5veuZy9GR-Nilwqo9cvRxANd8VcjRm9YvifGpBAvWnk_AdvBpKtQtysJH-_chSJTxRZxv0qs93L3byQDMAAHpwNTNj7-6rv0ghtlWSH2hdDGR774IcqC5oTdF40qLZiYCAYvqtlJcGvSmIruRGT' },
    { name: 'Maria Santos', fines: 8, perc: 60, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQ0dZxI7duqN7uUAJ2Lc-BdwhdGlGEUQb7HmWTINmKoKJqdWr1-5U4P7tYr8MLjIuKbTNKPAa8x3eQ0xqfoK8-wpA9HVTj2pb2SgQCeh-TMUDwzeDiendrQ7rCgYIzWtHNQ69Z5c21TXAbbxVSTLZVaaZgse201m4eKCeyQe1rlg_AZIEYeMlsdW3I7gVB9d7ooSeRZVGcR8FpWi6R48ox3rYZ-P946AzC_Rw4nCGW6PxtNkE4maUUBeJ6Eobh6P_PpGGTG1QCEYle' },
  ];

  const finesList = [
    { id: '1', vehicle: 'ABC-1234', model: 'Toyota Corolla', driver: 'Joao Silva', date: '12/10/2023', time: '14:35', value: 293.47, gravity: 'Gravissima', status: 'Pendente', ain: 'T12345678' },
    { id: '2', vehicle: 'XYZ-9876', model: 'Volvo FH 540', driver: 'Carlos Melo', date: '05/11/2023', time: '09:12', value: 195.23, gravity: 'Grave', status: 'Pago', ain: 'P98765432' },
  ];

  const filteredFines = finesList.filter(f => 
    f.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.ain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Total Pendente</p>
          <div className="flex items-end gap-3 mb-2">
             <h2 className="text-4xl font-black">R$ 12.450</h2>
             <span className="text-xs font-bold text-emerald-500 pb-1">+5.2%</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">8 multas aguardando pagamento</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Valor Total (Anual)</p>
          <div className="flex items-end gap-3 mb-2">
             <h2 className="text-4xl font-black">R$ 45.200</h2>
             <span className="text-xs font-bold text-red-500 pb-1">-2.1%</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Historico acumulado em 2023</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recursos Ativos</p>
          <div className="flex items-end gap-3 mb-2">
             <h2 className="text-4xl font-black">18</h2>
             <span className="text-xs font-bold text-emerald-500 pb-1">12 em analise</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Processos em andamento JARI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <h3 className="font-bold mb-6">Multas por Tipo de Infracao</h3>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-48 h-48 shrink-0 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black">150</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</span>
               </div>
            </div>
            <div className="flex-1 space-y-3">
              {data.map((d, i) => (
                <div key={i} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold group-hover:text-primary transition-colors">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <h3 className="font-bold mb-6">Top Condutores com Infracoes</h3>
          <div className="space-y-6">
            {topDrivers.map((driver, i) => (
              <div key={i} className="flex items-center gap-4">
                <div 
                  className="size-10 rounded-full bg-cover bg-center border-2 border-primary/10 shrink-0"
                  style={{ backgroundImage: `url('${driver.img}')` }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-sm font-bold">{driver.name}</span>
                    <span className="text-[11px] font-bold text-slate-400">{driver.fines} multas</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${driver.perc}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
         <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div>
               <h3 className="font-bold">Listagem de Infracoes</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase">Gestao de autos e notificacoes</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]" />
                <input 
                  type="text" 
                  placeholder="Buscar AIN, Placa ou Condutor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2">
                <MaterialIcon name="download" className="!text-[16px]" />
                Exportar
              </button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-4">Veiculo</th>
                     <th className="px-8 py-4">AIN / Registro</th>
                     <th className="px-8 py-4">Condutor</th>
                     <th className="px-8 py-4">Data / Hora</th>
                     <th className="px-8 py-4">Valor</th>
                     <th className="px-8 py-4 text-center">Gravidade</th>
                     <th className="px-8 py-4 text-center">Status</th>
                     <th className="px-8 py-4 text-right">Acoes</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFines.map((fine) => (
                    <tr key={fine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                       <td className="px-8 py-4">
                          <p className="text-sm font-bold">{fine.vehicle}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{fine.model}</p>
                       </td>
                       <td className="px-8 py-4">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">{fine.ain}</span>
                       </td>
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                             <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                               {fine.driver.split(' ').map(n => n[0]).join('')}
                             </div>
                             <span className="text-sm font-bold">{fine.driver}</span>
                          </div>
                       </td>
                       <td className="px-8 py-4">
                          <p className="text-sm font-bold">{fine.date}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{fine.time}</p>
                       </td>
                       <td className="px-8 py-4 text-sm font-black text-slate-900 dark:text-white">
                          {fine.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </td>
                       <td className="px-8 py-4 text-center">
                          <Badge variant={fine.gravity === 'Gravissima' ? 'danger' : 'warning'}>{fine.gravity}</Badge>
                       </td>
                       <td className="px-8 py-4 text-center">
                          <Badge variant={fine.status === 'Pago' ? 'success' : 'danger'}>{fine.status}</Badge>
                       </td>
                       <td className="px-8 py-4 text-right">
                          <button title="Detalhes da Multa" className="p-2 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-95">
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

export default Fines;

