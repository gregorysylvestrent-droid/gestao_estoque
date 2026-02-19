import React, { useState } from 'react';
import { PreventiveKPIs, ActivePlan, MaintenanceAlert } from '../../types';

interface PreventiveDashboardProps {
  kpis: PreventiveKPIs;
  activePlans: ActivePlan[];
  alerts: MaintenanceAlert[];
  onViewVehicle: (plate: string) => void;
  onCreatePlan: () => void;
  onViewAllVehicles: () => void;
  onResolveAlert: (alertId: string) => void;
}

export const PreventiveDashboard: React.FC<PreventiveDashboardProps> = ({
  kpis,
  activePlans,
  alerts,
  onViewVehicle,
  onCreatePlan,
  onViewAllVehicles,
  onResolveAlert
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'compliance' | 'action' | 'critical'>('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_conformidade':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
            Em Conformidade
          </span>
        );
      case 'acao_necessaria':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            Ação Necessária
          </span>
        );
      case 'critico':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            Crítico
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
            {status}
          </span>
        );
    }
  };

  const getProgressColor = (percentage: number, status: string) => {
    if (status === 'critico') return 'bg-red-500';
    if (status === 'acao_necessaria') return 'bg-amber-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const filteredPlans = activePlans.filter(plan => {
    if (activeTab === 'all') return true;
    return plan.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard de Controle de Preventiva</h1>
        <p className="text-slate-500 dark:text-slate-400">Monitoramento em tempo real da saúde da frota e conformidade de manutenção.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Compliance Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={`text-xs font-semibold ${kpis.complianceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {kpis.complianceChange >= 0 ? '+' : ''}{kpis.complianceChange}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Conformidade de Preventiva</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpis.complianceRate.toFixed(1)}%</p>
        </div>

        {/* Vehicles Near Service */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-red-600">{kpis.urgentCount} Urgentes</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Veículos Próximos da Revisão</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpis.vehiclesNearService}</p>
        </div>

        {/* MTBS Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              {kpis.mtbsTrend === 'up' ? 'â†‘' : kpis.mtbsTrend === 'down' ? 'â†“' : 'â†’'} Estável
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">MTBS (Médio entre Falhas)</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpis.mtbs} dias</p>
        </div>

        {/* Savings Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-emerald-600">Mensal</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Economia por Prevenção</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            R$ {(kpis.savings / 1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Active Maintenance Plans Table */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Plano de Manutenção Ativo</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Exportar PDF
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    Filtros Avançados
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Todos ({activePlans.length})
              </button>
              <button
                onClick={() => setActiveTab('em_conformidade')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'em_conformidade'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Em Conformidade
              </button>
              <button
                onClick={() => setActiveTab('acao_necessaria')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'acao_necessaria'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Ação Necessária
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Veículo / Placa</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Progresso (KM/Dias)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Próximo Serviço</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPlans.slice(0, 4).map((plan) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => onViewVehicle(plan.vehiclePlate)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{plan.vehiclePlate.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{plan.planName}</p>
                            <p className="text-sm text-slate-500">{plan.vehiclePlate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-48">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className={`font-semibold ${plan.progress.percentage >= 90 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                              {plan.progress.percentage}%
                            </span>
                            <span className="text-slate-500">{plan.progress.remainingKm?.toLocaleString()} km rest.</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(plan.progress.percentage, plan.status)}`}
                              style={{ width: `${Math.min(plan.progress.percentage, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${plan.status === 'atrasado' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {plan.status === 'atrasado' ? 'Vencido há 2 dias' : `Previsão: ${plan.nextService.daysRemaining} dias`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">{plan.nextService.description}</p>
                        <p className="text-sm text-slate-500">Previsão: {plan.nextService.dueDate}</p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(plan.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
              <button
                onClick={onViewAllVehicles}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Ver todos os {activePlans.length} veículos
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Gestão Master */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              Gestão Master
            </h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Planos de Revisão</span>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Checklists Master</span>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Alertas de Vencimento</span>
                </div>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">12</span>
              </button>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Alertas Recentes</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Silenciar</button>
            </div>
            <div className="space-y-4">
              {alerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{alert.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{alert.description}</p>
                      {alert.action && (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          {alert.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
            <p className="text-sm font-medium text-blue-100 mb-1">RESUMO DA SEMANA</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold">18</span>
              <span className="text-sm text-blue-100 mb-1">Manutenções<br/>Concluídas</span>
            </div>
            <div className="h-1 bg-white/20 rounded-full mb-2">
              <div className="h-full w-3/4 bg-white rounded-full" />
            </div>
            <p className="text-sm text-blue-100">Sua meta de 25 manutenções está 72% concluída.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreventiveDashboard;

