import React from 'react';
import { PreventiveSchedule, MaintenanceMilestone, SystemHealth } from '../../types';

interface ScheduleDetailProps {
  schedule: PreventiveSchedule;
  onBack: () => void;
  onExportPDF: () => void;
  onScheduleAppointment: () => void;
  onViewCalendar: () => void;
}

export const ScheduleDetail: React.FC<ScheduleDetailProps> = ({
  schedule,
  onBack,
  onExportPDF,
  onScheduleAppointment,
  onViewCalendar
}) => {
  const getMilestoneStatus = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'bg-blue-500', borderColor: 'border-blue-500', textColor: 'text-blue-600' };
      case 'proximo':
        return { color: 'bg-amber-500', borderColor: 'border-amber-500', textColor: 'text-amber-600' };
      default:
        return { color: 'bg-slate-300', borderColor: 'border-slate-300', textColor: 'text-slate-500' };
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-emerald-600';
    if (health >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Listagem
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Detalhamento de Cronograma Preventivo
              <span className="px-3 py-1 bg-slate-900 text-white text-sm rounded-lg">{schedule.vehiclePlate}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {schedule.vehicleModel} â€¢ Plano de {schedule.planName} â€¢ Próxima parada estimada para 15 Nov 2023
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onExportPDF}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar PDF
            </button>
            <button
              onClick={onScheduleAppointment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Solicitar Agendamento
            </button>
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Milestones de Manutenção (Próximos 12 meses)</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-600 dark:text-slate-400">Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-600 dark:text-slate-400">Próximo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              <span className="text-slate-600 dark:text-slate-400">Planejado</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex justify-between relative">
            {schedule.milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone.status);
              return (
                <div key={milestone.km} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full ${status.color} flex items-center justify-center mb-3 z-10`}>
                    {milestone.status === 'concluido' ? (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : milestone.type === 'revisao' ? (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    )}
                  </div>
                  <p className={`font-bold ${status.textColor}`}>{milestone.km.toLocaleString()} KM</p>
                  <p className="text-xs text-slate-500">{milestone.date}</p>
                  {milestone.status === 'proximo' && (
                    <p className="text-xs text-amber-600 font-medium">Faltam 7.420km</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Next Service Estimation */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Estimativa do Próximo Serviço</h2>
                <p className="text-sm text-slate-500">{schedule.nextService.description}</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                Prioridade: {schedule.nextService.priority === 'alta' ? 'Alta' : schedule.nextService.priority === 'media' ? 'Média' : 'Baixa'}
              </span>
            </div>

            <table className="w-full mb-6">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">Item/Descrição</th>
                  <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">QTD</th>
                  <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">Valor Unit.</th>
                  <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase">Total Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {schedule.nextService.parts.map((part, index) => (
                  <tr key={index}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{part.name}</p>
                          <p className="text-xs text-slate-500">SKU: {part.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-700 dark:text-slate-300">
                      {part.quantity} {part.unit}
                    </td>
                    <td className="py-4 text-slate-700 dark:text-slate-300">
                      R$ {(part.estimatedCost / part.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">
                      R$ {part.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-4" colSpan={2}>
                    <p className="font-medium text-slate-900 dark:text-white">Mão de Obra Especializada</p>
                    <p className="text-xs text-slate-500">Mecânica Geral + Inspeção</p>
                  </td>
                  <td className="py-4 text-slate-700 dark:text-slate-300">6h</td>
                  <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">R$ 180,00</td>
                </tr>
                <tr>
                  <td className="py-4" colSpan={2}>
                    <p className="font-medium text-slate-900 dark:text-white">Limpeza e Descarbonização</p>
                    <p className="text-xs text-slate-500">Serviço Preventivo</p>
                  </td>
                  <td className="py-4 text-slate-700 dark:text-slate-300">1 Un</td>
                  <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">R$ 450,00</td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Duração estimada: <span className="font-semibold text-slate-900 dark:text-white">1 dia útil</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">Total Previsto:</span>
                <span className="text-xl font-bold text-blue-600">
                  R$ {schedule.nextService.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Predictive Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Análise Preditiva
            </h3>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-2">Probabilidade de Downtime Não Planejado</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${100 - schedule.predictiveAnalysis.downtimeProbability}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-semibold ${
                  schedule.predictiveAnalysis.riskLevel === 'baixa' ? 'text-emerald-600' :
                  schedule.predictiveAnalysis.riskLevel === 'media' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {schedule.predictiveAnalysis.riskLevel === 'baixa' ? 'Baixa' : 
                   schedule.predictiveAnalysis.riskLevel === 'media' ? 'Média' : 'Alta'} ({schedule.predictiveAnalysis.downtimeProbability}%)
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Dica de Economia</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Agendar para a <strong className="text-blue-600">Terça-feira (14/11)</strong> garante uma redução de 5% no valor da mão de obra devido à baixa demanda na oficina parceira.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Custo/KM Atual</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  R$ {schedule.costPerKm.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Disponibilidade</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{schedule.availability}%</p>
              </div>
            </div>
          </div>

          {/* Workshop Calendar */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <h3 className="font-bold mb-2">Calendário de Oficina</h3>
            <p className="text-sm text-blue-100 mb-4">
              Verifique horários disponíveis em tempo real com nossas oficinas credenciadas e agende em um clique.
            </p>
            <button
              onClick={onViewCalendar}
              className="w-full py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Ver Agenda Disponível
            </button>
            <p className="text-xs text-blue-200 text-center mt-3">
              Sincronizado com 12 oficinas parceiras
            </p>
          </div>

          {/* System Health */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Saúde dos Sistemas</h3>
            <div className="space-y-3">
              {schedule.systemHealth.map((system) => (
                <div key={system.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      system.health >= 90 ? 'bg-emerald-500' : 
                      system.health >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{system.name}</span>
                  </div>
                  <span className={`font-semibold ${getHealthColor(system.health)}`}>
                    {system.health}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetail;

