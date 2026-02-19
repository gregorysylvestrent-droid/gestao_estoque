
import React from 'react';
import { Badge, MaterialIcon } from '../constants';
import { Vehicle } from '../types';

const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Total de Veículos', value: '152', sub: '+3 este mês', trend: 'up', icon: 'directions_car', color: 'blue' },
    { label: 'Documentos Vencidos', value: '08', sub: 'Ação imediata', trend: 'down', icon: 'error', color: 'red' },
    { label: 'A Vencer (30 dias)', value: '14', sub: 'Pagamentos pendentes', trend: 'neutral', icon: 'warning', color: 'amber' },
    { label: 'Regularizados', value: '130', sub: '85% da frota OK', trend: 'up', icon: 'check_circle', color: 'emerald' },
  ];

  const vehicles: Vehicle[] = [
    { id: '1', model: 'Volvo FH 540', plate: 'BRA2E24', type: 'truck', status: { crlv: 'REGULAR', ipva: 'PAGO', insurance: 'VALIDO', licensing: 'PENDENTE' } },
    { id: '2', model: 'Toyota Hilux', plate: 'PLK9G88', type: 'car', status: { crlv: 'VENCIDO', ipva: 'PAGO', insurance: 'VENCIDO', licensing: 'REGULAR' } },
    { id: '3', model: 'Scania R450', plate: 'OMK0A12', type: 'truck', status: { crlv: 'REGULAR', ipva: 'PENDENTE', insurance: 'VALIDO', licensing: 'REGULAR' } },
    { id: '4', model: 'Renault Kangoo', plate: 'EVP4H33', type: 'van', status: { crlv: 'REGULAR', ipva: 'PAGO', insurance: 'VALIDO', licensing: 'REGULAR' } },
  ];

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return 'local_shipping';
      case 'van': return 'airport_shuttle';
      default: return 'directions_car';
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-slate-500">{s.label}</p>
              <div className={`p-2 rounded-xl bg-${s.color}-100 dark:bg-${s.color}-900/20 text-${s.color}-600 dark:text-${s.color}-400 group-hover:scale-110 transition-transform`}>
                <MaterialIcon name={s.icon} />
              </div>
            </div>
            <h3 className="text-3xl font-black mb-1">{s.value}</h3>
            <div className="flex items-center gap-1">
               {s.trend === 'up' && <MaterialIcon name="trending_up" className="!text-[14px] text-emerald-500" />}
               {s.trend === 'down' && <MaterialIcon name="trending_down" className="!text-[14px] text-red-500" />}
               <p className={`text-[11px] font-bold ${s.trend === 'up' ? 'text-emerald-500' : s.trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold">Listagem Geral da Frota</h3>
          <button title="Filtrar Resultados" className="text-xs font-bold text-primary flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all active:scale-95">
            <MaterialIcon name="filter_list" className="!text-[16px]" />
            Filtros Avançados
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-8 py-4">Veículo / Placa</th>
                <th className="px-6 py-4 text-center">CRLV</th>
                <th className="px-6 py-4 text-center">IPVA</th>
                <th className="px-6 py-4 text-center">Seguro</th>
                <th className="px-6 py-4 text-center">Licenciamento</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                        <MaterialIcon name={getVehicleIcon(v.type)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{v.model}</p>
                        <p className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 mt-0.5">{v.plate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={v.status.crlv === 'REGULAR' ? 'success' : 'danger'}>{v.status.crlv}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={v.status.ipva === 'PAGO' ? 'success' : v.status.ipva === 'PENDENTE' ? 'warning' : 'danger'}>{v.status.ipva}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={v.status.insurance === 'VALIDO' ? 'success' : 'danger'}>{v.status.insurance}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={v.status.licensing === 'REGULAR' ? 'success' : 'warning'}>{v.status.licensing}</Badge>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button title="Visualizar" className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm">
                        <MaterialIcon name="visibility" className="text-slate-400 hover:text-primary transition-colors" />
                      </button>
                      <button title="Subir Documentação" className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm">
                        <MaterialIcon name="upload_file" className="text-slate-400 hover:text-primary transition-colors" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 bg-slate-50/30 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <p className="text-xs text-slate-400">Mostrando {vehicles.length} de 152 veículos</p>
          <div className="flex gap-2">
             <button className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-bold disabled:opacity-50">Anterior</button>
             <button className="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-bold">1</button>
             <button className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-bold">2</button>
             <button className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-bold">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

