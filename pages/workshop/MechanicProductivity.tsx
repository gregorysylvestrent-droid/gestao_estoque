import React, { useMemo, useState } from 'react';
import { Mechanic, ServiceCategory, SERVICE_CATEGORY_LABELS, WorkOrderAssignmentLog } from '../../types';

interface MechanicProductivityProps {
  assignments: WorkOrderAssignmentLog[];
  mechanics: Mechanic[];
}

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

const formatHours = (seconds: number) => {
  const hours = Math.max(0, seconds) / 3600;
  return `${hours.toFixed(1)}h`;
};

export const MechanicProductivity: React.FC<MechanicProductivityProps> = ({ assignments, mechanics }) => {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toDateInput(date);
  });
  const [toDate, setToDate] = useState(() => toDateInput(new Date()));
  const [selectedMechanic, setSelectedMechanic] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((log) => {
      const timestamp = new Date(log.timestamp);
      if (Number.isNaN(timestamp.getTime())) return false;

      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (timestamp < from) return false;
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`);
        if (timestamp > to) return false;
      }

      if (selectedMechanic !== 'all' && log.newMechanicId !== selectedMechanic) return false;
      if (selectedCategory !== 'all' && log.serviceCategory !== selectedCategory) return false;
      return true;
    });
  }, [assignments, fromDate, toDate, selectedMechanic, selectedCategory]);

  const summary = useMemo(() => {
    const totalAssignments = filteredAssignments.length;
    const totalSeconds = filteredAssignments.reduce((acc, log) => acc + (log.accumulatedSeconds || 0), 0);
    const avgSeconds = totalAssignments > 0 ? totalSeconds / totalAssignments : 0;

    const byMechanic = new Map<string, { name: string; count: number; seconds: number }>();
    filteredAssignments.forEach((log) => {
      const id = log.newMechanicId || 'nao_definido';
      const name = log.newMechanicName || 'Nao definido';
      const current = byMechanic.get(id) || { name, count: 0, seconds: 0 };
      current.count += 1;
      current.seconds += log.accumulatedSeconds || 0;
      byMechanic.set(id, current);
    });

    return {
      totalAssignments,
      totalSeconds,
      avgSeconds,
      byMechanic: Array.from(byMechanic.values()).sort((a, b) => b.count - a.count),
    };
  }, [filteredAssignments]);

  const mechanicOptions = useMemo(() => {
    const list = mechanics.map((m) => ({ id: m.id, name: m.name }));
    const fallback = assignments
      .map((log) => ({ id: log.newMechanicId || '', name: log.newMechanicName || '' }))
      .filter((entry) => entry.id && entry.name);
    const map = new Map<string, string>();
    [...list, ...fallback].forEach((item) => map.set(item.id, item.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments, mechanics]);

  const categoryOptions = useMemo(() => {
    return (Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((category) => ({
      id: category,
      name: SERVICE_CATEGORY_LABELS[category],
    }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analise de Produtividade</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitoramento das atribuicoes de servicos por mecanico.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">De</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Ate</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Mecanico</label>
          <select
            value={selectedMechanic}
            onChange={(event) => setSelectedMechanic(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="all">Todos</option>
            {mechanicOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Tipo de Servico</label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="all">Todos</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase font-bold text-slate-500">Atribuicoes</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{summary.totalAssignments}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase font-bold text-slate-500">Tempo acumulado</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatHours(summary.totalSeconds)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase font-bold text-slate-500">Media por atribuicao</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatHours(summary.avgSeconds)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Resumo por mecanico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.byMechanic.map((entry) => (
            <div key={entry.name} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                <span>{entry.name}</span>
                <span>{entry.count} atrib.</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Tempo acumulado: {formatHours(entry.seconds)}</p>
            </div>
          ))}
          {summary.byMechanic.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum dado encontrado para o periodo selecionado.</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Historico detalhado</h3>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredAssignments.map((log) => (
            <div key={log.id} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase">Data</p>
                <p className="font-semibold">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Servico</p>
                <p className="font-semibold">{log.serviceDescription || 'Servico'}</p>
                <p className="text-xs text-slate-500">{log.serviceCategory ? SERVICE_CATEGORY_LABELS[log.serviceCategory] : 'Nao definido'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Mecanico anterior</p>
                <p className="font-semibold">{log.previousMechanicName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Mecanico novo</p>
                <p className="font-semibold">{log.newMechanicName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Tempo acumulado</p>
                <p className="font-semibold">{formatHours(log.accumulatedSeconds || 0)}</p>
              </div>
            </div>
          ))}
          {filteredAssignments.length === 0 && (
            <div className="p-6 text-sm text-slate-400">Nenhum registro encontrado para o periodo.</div>
          )}
        </div>
      </div>
    </div>
  );
};

