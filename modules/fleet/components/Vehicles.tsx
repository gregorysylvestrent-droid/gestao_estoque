
import React, { useMemo, useState } from 'react';
import { Badge, MaterialIcon } from '../constants';
import { Vehicle } from '../types';

type VehicleFilter = 'all' | Vehicle['type'];

type VehiclesProps = {
  vehicles: Vehicle[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
};

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, loading = false, error = null, onRetry, onView, onEdit }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeFilter, setActiveFilter] = useState<VehicleFilter>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredVehicles = useMemo(() => {
    const scoped = activeFilter === 'all' ? vehicles : vehicles.filter((vehicle) => vehicle.type === activeFilter);
    const sorted = [...scoped].sort((a, b) => a.model.localeCompare(b.model));
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [activeFilter, sortDirection, vehicles]);

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return 'local_shipping';
      case 'van': return 'airport_shuttle';
      default: return 'directions_car';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Todos', value: 'all' },
            { label: 'Caminhoes', value: 'truck' },
            { label: 'Utilitarios', value: 'van' },
            { label: 'Leves', value: 'car' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value as VehicleFilter)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeFilter === filter.value
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')} 
              title="Visualizacao em Lista"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
            >
              <MaterialIcon name="list" className="!text-[20px]" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              title="Visualizacao em Grade"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
            >
              <MaterialIcon name="grid_view" className="!text-[20px]" />
            </button>
          </div>
          <button
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title={`Ordenar por modelo (${sortDirection === 'asc' ? 'A-Z' : 'Z-A'})`}
          >
            <MaterialIcon name="sort" className="!text-[18px]" />
            Ordenar
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <th className="px-8 py-4">Veiculo</th>
                  <th className="px-6 py-4">Placa</th>
                  <th className="px-6 py-4 text-center">CRLV</th>
                  <th className="px-6 py-4 text-center">Seguro</th>
                  <th className="px-6 py-4 text-center">Licenciamento</th>
                  <th className="px-8 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-6 text-sm text-slate-500">
                      Carregando veiculos...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-6 text-sm text-red-500">
                      Falha ao carregar veiculos.
                      {onRetry && (
                        <button onClick={onRetry} className="ml-3 text-xs font-bold text-primary underline">
                          Tentar novamente
                        </button>
                      )}
                    </td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-6 text-sm text-slate-500">
                      Nenhum veiculo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <MaterialIcon name={getVehicleIcon(v.type)} className="!text-[18px]" />
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight">{v.model}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                          {v.plate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={v.status.crlv === 'REGULAR' ? 'success' : 'danger'}>{v.status.crlv}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={v.status.insurance === 'VALIDO' ? 'success' : 'danger'}>{v.status.insurance}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={v.status.licensing === 'REGULAR' ? 'success' : 'warning'}>{v.status.licensing}</Badge>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            title="Visualizar Detalhes"
                            type="button"
                            onClick={() => onView?.(v)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                          >
                            <MaterialIcon name="visibility" className="!text-[16px]" />
                            <span className="hidden lg:inline">Ver</span>
                          </button>
                          <button
                            title="Editar Cadastro"
                            type="button"
                            onClick={() => onEdit?.(v)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all"
                          >
                            <MaterialIcon name="edit" className="!text-[16px]" />
                            <span className="hidden lg:inline">Editar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-sm text-slate-500">
              Carregando veiculos...
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-sm text-red-500">
              Falha ao carregar veiculos.
              {onRetry && (
                <button onClick={onRetry} className="ml-3 text-xs font-bold text-primary underline">
                  Tentar novamente
                </button>
              )}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-sm text-slate-500">
              Nenhum veiculo encontrado.
            </div>
          ) : (
            filteredVehicles.map((v) => (
              <div key={v.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <MaterialIcon name={getVehicleIcon(v.type)} />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={v.status.crlv === 'REGULAR' ? 'success' : 'danger'}>CRLV</Badge>
                    <button title="Opcoes" className="text-slate-300 hover:text-slate-500">
                      <MaterialIcon name="more_horiz" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-black mb-1 uppercase tracking-tight">{v.model}</h3>
                <p className="text-xs font-mono text-slate-400 mb-6">{v.plate}</p>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                    <span>Seguro</span>
                    <span className={v.status.insurance === 'VALIDO' ? 'text-emerald-500' : 'text-red-500'}>{v.status.insurance}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                    <span>Licenciamento</span>
                    <span className={v.status.licensing === 'REGULAR' ? 'text-emerald-500' : 'text-amber-500'}>{v.status.licensing}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onView?.(v)}
                    className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(v)}
                    className="px-3 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                    title="Editar"
                  >
                    <MaterialIcon name="edit" className="!text-[18px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Vehicles;

