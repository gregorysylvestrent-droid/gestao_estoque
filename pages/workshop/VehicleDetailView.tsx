﻿import React, { useState } from 'react';
import { VehicleDetail, VehicleEvent, VehicleComponent, VehicleDocument } from '../../types';

interface VehicleDetailViewProps {
  vehicle: VehicleDetail;
  onBack: () => void;
  onCreateMaintenance: () => void;
  onViewEvent: (event: VehicleEvent) => void;
}

export const VehicleDetailView: React.FC<VehicleDetailViewProps> = ({
  vehicle,
  onBack,
  onCreateMaintenance,
  onViewEvent
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'exploded' | 'xray'>('overview');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'maintenance' | 'alert' | 'checklist'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bom':
      case 'pago':
      case 'ativo':
      case 'operacional':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'atencao':
      case 'pendente':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'critico':
      case 'vencido':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getComponentIcon = (category: string) => {
    switch (category) {
      case 'oleo_motor':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'pneus':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'bateria':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'manutencao':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case 'alerta':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'checklist':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const filteredEvents = vehicle.events.filter(event => 
    eventFilter === 'all' || event.type === eventFilter
  );

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      operacional: 'Operacional',
      manutencao: 'Em Manutenção',
      parado: 'Parado',
      em_viagem: 'Em Viagem'
    };
    return labels[status] || status;
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ipva: 'IPVA 2024',
      seguro: 'SEGURO',
      licenciamento: 'LICENCIAMENTO',
      circulacao: 'CIRCULAÇÃO'
    };
    return labels[type] || type.toUpperCase();
  };

  const getDocStatusLabel = (status: string, expiry?: string, notes?: string) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'ativo': return `Ativo (Vence ${expiry || 'N/A'})`;
      case 'pendente': return `Pendente (${notes || ''})`;
      case 'vencido': return `Vencido (${notes || ''})`;
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <button onClick={onBack} className="hover:text-slate-700 dark:hover:text-slate-200">Frotas & Logística</button>
            <span>/</span>
            <span>Veículos</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">{vehicle.plate}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{vehicle.model}</h1>
              <span className="px-3 py-1 bg-slate-900 text-white text-sm font-semibold rounded-lg">{vehicle.plate}</span>
              <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${getStatusColor(vehicle.statusOperacional)}`}>
                {getStatusLabel(vehicle.statusOperacional)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar Veículo..."
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-sm w-64"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={onCreateMaintenance}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nova Manutenção
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Série: {vehicle.chassis} â€¢ Ano: {vehicle.year} â€¢ Hodômetro: {vehicle.mileage.toLocaleString()} km
          </p>
        </div>

        {/* Documents Status */}
        <div className="px-6 pb-4 flex gap-4">
          {vehicle.documents.map((doc, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                doc.status === 'pago' || doc.status === 'ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {doc.type === 'ipva' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {doc.type === 'seguro' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                {doc.type === 'licenciamento' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{getDocTypeLabel(doc.type)}</p>
                <p className={`text-sm font-semibold ${
                  doc.status === 'pago' || doc.status === 'ativo' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {getDocStatusLabel(doc.status, doc.expiryDate, doc.notes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-12 gap-6">
        {/* Left Column - Vehicle Model */}
        <div className="col-span-7">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* View Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Vista Explosiva
              </button>
              <button
                onClick={() => setActiveTab('xray')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'xray'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Raio-X
              </button>
            </div>

            {/* Model View */}
            <div className="relative h-96 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              {/* Interactive Vehicle Model (Simplified) */}
              <div className="relative">
                <svg viewBox="0 0 400 200" className="w-80 h-40">
                  {/* Truck Body */}
                  <rect x="50" y="60" width="200" height="80" rx="8" fill="#3B82F6" />
                  <rect x="250" y="80" width="100" height="60" rx="4" fill="#1E40AF" />
                  {/* Wheels */}
                  <circle cx="90" cy="140" r="25" fill="#1F2937" stroke="#4B5563" strokeWidth="4" />
                  <circle cx="90" cy="140" r="12" fill="#9CA3AF" />
                  <circle cx="180" cy="140" r="25" fill="#1F2937" stroke="#4B5563" strokeWidth="4" />
                  <circle cx="180" cy="140" r="12" fill="#9CA3AF" />
                  <circle cx="290" cy="140" r="25" fill="#1F2937" stroke="#4B5563" strokeWidth="4" />
                  <circle cx="290" cy="140" r="12" fill="#9CA3AF" />
                  {/* Hotspots */}
                  <circle
                    cx="150" cy="100" r="8"
                    fill={selectedComponent === 'motor' ? '#EF4444' : '#10B981'}
                    className="cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedComponent(selectedComponent === 'motor' ? null : 'motor')}
                  />
                  <circle
                    cx="90" cy="140" r="8"
                    fill={selectedComponent === 'pneus' ? '#EF4444' : '#10B981'}
                    className="cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedComponent(selectedComponent === 'pneus' ? null : 'pneus')}
                  />
                  <circle
                    cx="290" cy="100" r="8"
                    fill={selectedComponent === 'transmissao' ? '#EF4444' : '#10B981'}
                    className="cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedComponent(selectedComponent === 'transmissao' ? null : 'transmissao')}
                  />
                </svg>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Modelo Digital Interativo</p>
                  <p className="text-xs text-slate-400">Clique nos pontos para ver detalhes</p>
                </div>
              </div>

              {/* View Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Component Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {vehicle.components.slice(0, 4).map((component) => (
              <div key={component.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    component.status === 'bom' ? 'bg-emerald-100 text-emerald-600' :
                    component.status === 'atencao' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {getComponentIcon(component.category)}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    {component.name}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{component.currentValue || component.health + '%'}</p>
                <p className={`text-sm ${
                  component.status === 'bom' ? 'text-emerald-600' :
                  component.status === 'atencao' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {component.status === 'bom' ? 'Bom estado' :
                   component.status === 'atencao' ? 'Atenção Necessária' :
                   'Crítico'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Event History */}
        <div className="col-span-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Eventos</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEventFilter('all')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      eventFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Tudo
                  </button>
                  <button
                    onClick={() => setEventFilter('maintenance')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      eventFilter === 'maintenance' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Manutenção
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto">
              <div className="space-y-6">
                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    {getEventIcon(event.type)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{event.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {event.date} â€¢ {event.mechanic || event.workshop}
                          </p>
                        </div>
                        {event.osId && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                            OS {event.osId}
                          </span>
                        )}
                        {event.status === 'critico' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                            Crítico
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{event.description}</p>
                      {event.parts && event.parts.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs font-medium">RM</span>
                            <span>Mecânico: {event.mechanic}</span>
                          </div>
                        </div>
                      )}
                      {event.cost && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Custo Total:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            R$ {event.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {event.type === 'revisao' && (
                        <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Ver Nota Fiscal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Carregar Histórico Antigo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-400 text-center">
          © 2023 Sistema de Gestão de Frota - Módulo de Oficina
        </p>
      </div>
    </div>
  );
};

export default VehicleDetailView;

