﻿import React, { useState } from 'react';
import { Mechanic, MECHANIC_STATUS_LABELS } from '../../types';
import NewMechanicModal from './components/NewMechanicModal';

interface MechanicsManagementProps {
  mechanics: Mechanic[];
  onUpdateMechanic: (mechanic: Mechanic) => void;
  onCreateMechanic: (mechanic: Omit<Mechanic, 'id' | 'productivity' | 'currentWorkOrders'>) => Promise<void>;
}

export const MechanicsManagement: React.FC<MechanicsManagementProps> = ({
  mechanics,
  onUpdateMechanic,
  onCreateMechanic
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMechanics = mechanics.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    disponivel: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    ocupado: 'bg-blue-100 text-blue-700 border-blue-300',
    ferias: 'bg-amber-100 text-amber-700 border-amber-300',
    afastado: 'bg-red-100 text-red-700 border-red-300'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Equipe Técnica
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie mecânicos e suas atribuições
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-2a2 2 0 112 2h-3a2 2 0 01-2-2V7a2 2 0 012-2h3a2 2 0 012 2v3" />
          </svg>
          Novo Mecânico
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar mecânico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['disponivel', 'ocupado', 'ferias', 'afastado'].map((status) => {
          const count = mechanics.filter(m => m.status === status).length;
          return (
            <div key={status} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[status as keyof typeof statusColors]}`}>
                  <span className="text-lg font-bold">{count}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {MECHANIC_STATUS_LABELS[status as keyof typeof MECHANIC_STATUS_LABELS]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mechanics List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMechanics.map((mechanic) => (
          <div
            key={mechanic.id}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {mechanic.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{mechanic.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{mechanic.specialty}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[mechanic.status]}`}>
                {MECHANIC_STATUS_LABELS[mechanic.status]}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Turno</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {mechanic.shift === 'manha' ? 'Manhã' : mechanic.shift === 'tarde' ? 'Tarde' : 'Noite'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">OS em andamento</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {mechanic.currentWorkOrders.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">OS concluídas</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {mechanic.productivity.ordersCompleted}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tempo médio/OS</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {mechanic.productivity.avgHoursPerOrder.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Taxa no prazo</span>
                <span className="font-medium text-emerald-600">
                  {mechanic.productivity.onTimeRate.toFixed(0)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setEditingMechanic(mechanic)}
              className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Editar
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMechanics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Nenhum mecânico encontrado</p>
        </div>
      )}

      <NewMechanicModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={onCreateMechanic}
      />
    </div>
  );
};

