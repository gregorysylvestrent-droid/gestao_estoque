﻿import React, { useMemo, useState } from 'react';
import { MaintenancePlan, MaintenanceTrigger, MaintenancePart, ChecklistSection, InventoryItem } from '../../types';

interface MaintenancePlanWizardProps {
  onSave: (plan: Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  availableVehicles: { model: string; type: string }[];
  inventory: InventoryItem[];
}

type WizardStep = 1 | 2 | 3 | 4;

export const MaintenancePlanWizard: React.FC<MaintenancePlanWizardProps> = ({
  onSave,
  onCancel,
  availableVehicles,
  inventory
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [planData, setPlanData] = useState<Partial<MaintenancePlan>>({
    name: '',
    vehicleType: '',
    vehicleModel: '',
    operationType: 'normal',
    triggers: [{ type: 'km', value: 20000 }],
    parts: [],
    checklistSections: [],
    estimatedHours: 4,
    estimatedCost: 0,
    services: []
  });

  const [newPart, setNewPart] = useState<Partial<MaintenancePart>>({
    sku: '',
    name: '',
    quantity: 1,
    unit: 'UN',
    estimatedCost: 0
  });

  const operationTypes = [
    { value: 'normal', label: 'Normal (Estrada/Asfalto)' },
    { value: 'severa', label: 'Severa (Mineração/Fora de estrada)' },
    { value: 'muito_severa', label: 'Muito Severa' }
  ];

  const triggerTypes = [
    { value: 'km', label: 'Quilometragem' },
    { value: 'hours', label: 'Horímetro' },
    { value: 'months', label: 'Tempo (Meses)' }
  ];

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((prev) => (prev + 1) as WizardStep);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as WizardStep);
  };

  const handleSave = () => {
    const hasName = Boolean(String(planData.name || '').trim());
    const hasVehicleContext = Boolean(String(planData.vehicleType || planData.vehicleModel || '').trim());
    if (!hasName || !hasVehicleContext) return;

    onSave({
      ...planData,
      vehicleType: String(planData.vehicleType || 'GERAL'),
    } as Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>);
  };

  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return [];
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, inventory]);

  const addPart = () => {
    if (selectedInventoryItem) {
      setPlanData(prev => ({
        ...prev,
        parts: [...(prev.parts || []), { 
          id: `PART-${Date.now()}`,
          sku: selectedInventoryItem.sku,
          name: selectedInventoryItem.name,
          quantity: newPart.quantity,
          unit: selectedInventoryItem.unit,
          estimatedCost: selectedInventoryItem.unitPrice
        }]
      }));
      setNewPart({ sku: '', name: '', quantity: 1, unit: 'UN', estimatedCost: 0 });
      setSelectedInventoryItem(null);
      setSearchTerm('');
    } else if (newPart.name && newPart.sku) {
      setPlanData(prev => ({
        ...prev,
        parts: [...(prev.parts || []), { ...newPart, id: `PART-${Date.now()}` } as MaintenancePart]
      }));
      setNewPart({ sku: '', name: '', quantity: 1, unit: 'UN', estimatedCost: 0 });
    }
  };

  const removePart = (id: string) => {
    setPlanData(prev => ({
      ...prev,
      parts: prev.parts?.filter(p => p.id !== id) || []
    }));
  };

  const totalCost = planData.parts?.reduce((sum, part) => sum + (part.estimatedCost * part.quantity), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <button onClick={onCancel} className="hover:text-slate-700">Configurações</button>
          <span>/</span>
          <span>Planos de Manutenção</span>
          <span>/</span>
          <span className="text-blue-600 font-medium">Novo Plano</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Cadastro de Planos de Manutenção</h1>
        <p className="text-slate-500 dark:text-slate-400">Defina as regras, intervalos e itens de revisão para sua frota.</p>
      </div>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: 'Identificação' },
            { step: 2, label: 'Intervalos' },
            { step: 3, label: 'Checklist & Peças' },
            { step: 4, label: 'Revisão Final' }
          ].map((item, index) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 ${
                  currentStep >= item.step
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {currentStep > item.step ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step.toString().padStart(2, '0')
                  )}
                </div>
                <span className={`text-xs font-medium uppercase ${
                  currentStep >= item.step ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > item.step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6">
        {/* Main Form */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Identificação do Plano
                </h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do Plano</label>
                  <input
                    type="text"
                    value={planData.name}
                    onChange={(e) => setPlanData({ ...planData, name: e.target.value })}
                    placeholder="Ex: Plano Preventivo Ouro - Linha FH"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo do Veículo</label>
                    <select
                      value={planData.vehicleModel}
                      onChange={(e) => {
                        const selectedModel = e.target.value;
                        const selectedVehicle = availableVehicles.find((v) => v.model === selectedModel);
                        setPlanData({
                          ...planData,
                          vehicleModel: selectedModel,
                          vehicleType: selectedVehicle?.type || '',
                        });
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {availableVehicles.map(v => (
                        <option key={v.model} value={v.model}>{v.model}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo do Veiculo</label>
                    <input
                      type="text"
                      value={planData.vehicleType || ''}
                      readOnly
                      placeholder="Selecionado automaticamente"
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Operação</label>
                    <select
                      value={planData.operationType}
                      onChange={(e) => setPlanData({ ...planData, operationType: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {operationTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Configuração de Intervalos e Gatilhos
                </h2>
                <p className="text-sm text-slate-500">Definição de Gatilhos (O que ocorrer primeiro)</p>
                <div className="grid grid-cols-3 gap-4">
                  {triggerTypes.map((trigger) => (
                    <div key={trigger.value} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          {trigger.value === 'km' && <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                          {trigger.value === 'hours' && <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          {trigger.value === 'months' && <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        </div>
                        <span className="text-xs font-semibold uppercase text-slate-500">{trigger.label}</span>
                      </div>
                      <input
                        type="number"
                        value={planData.triggers?.find(t => t.type === trigger.value)?.value || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 0;
                          setPlanData((prev) => {
                            const current = Array.isArray(prev.triggers) ? [...prev.triggers] : [];
                            const index = current.findIndex((t) => t.type === trigger.value);

                            if (index >= 0) {
                              current[index] = { ...current[index], value };
                            } else {
                              current.push({ type: trigger.value as MaintenanceTrigger['type'], value });
                            }

                            return {
                              ...prev,
                              triggers: current,
                            };
                          });
                        }}
                        className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0"
                        placeholder="0"
                      />
                      <span className="text-sm text-slate-500">
                        {trigger.value === 'km' ? 'KM' : trigger.value === 'hours' ? 'HRS' : 'MESES'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Peças e Insumos Obrigatórios
                </h2>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Buscar Peça / Insumo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!e.target.value) setSelectedInventoryItem(null);
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          placeholder="Buscar por nome ou SKU..."
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>

                      {/* Resultados da Busca */}
                      {searchTerm && !selectedInventoryItem && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredInventory.length > 0 ? (
                            filteredInventory.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedInventoryItem(item);
                                  setSearchTerm(item.name);
                                  setNewPart(prev => ({ ...prev, sku: item.sku, name: item.name, unit: item.unit, estimatedCost: item.unitPrice }));
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center group"
                              >
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                                  <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                                  </p>
                                  <p className="text-xs text-slate-500">{item.quantity} {item.unit} disp.</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-500">
                              Nenhum item encontrado
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Quantidade
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={newPart.quantity}
                          onChange={(e) => setNewPart(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={addPart}
                          disabled={!selectedInventoryItem && (!newPart.name || !newPart.sku)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campos Manuais (Fallback) */}
                  {!selectedInventoryItem && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">SKU (Manual)</label>
                        <input
                          type="text"
                          value={newPart.sku}
                          onChange={(e) => setNewPart(prev => ({ ...prev, sku: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                          placeholder="Código..."
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Nome (Manual)</label>
                        <input
                          type="text"
                          value={newPart.name}
                          onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                          placeholder="Nome da peça..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Peça / Insumo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Quantidade</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Custo Est.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {planData.parts?.map((part) => (
                        <tr key={part.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-white">{part.name}</p>
                            <p className="text-xs text-slate-500">SKU: {part.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{part.quantity} {part.unit}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            R$ {part.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removePart(part.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revisão Final</h2>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Veículo Alvo:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{planData.vehicleModel || 'Não selecionado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Tipo de Operação:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {operationTypes.find(t => t.value === planData.operationType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Gatilho KM:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {planData.triggers?.find(t => t.type === 'km')?.value.toLocaleString()} KM
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Itens no Checklist:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{planData.checklistSections?.length || 0} itens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Peças Vinculadas:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{planData.parts?.length || 0} tipos</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-4 flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Custo Est. Peças:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={currentStep === 1 ? onCancel : handleBack}
                className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {currentStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  Próximo Passo
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                >
                  Salvar Plano
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Dica do Especialista */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300">Dica do Especialista</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Para este modelo de veículo em operação normal, a montadora recomenda a troca de óleo a cada <strong className="text-blue-600">25.000 KM</strong>.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              Definir intervalos menores (como 20.000 KM) pode aumentar a vida útil do motor em frotas com alta carga de trabalho.
            </p>
          </div>

          {/* Resumo do Plano */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Resumo do Plano</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Veículo Alvo:</span>
                <span className="font-medium text-slate-900 dark:text-white">{planData.vehicleModel || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Gatilho KM:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {planData.triggers?.find(t => t.type === 'km')?.value.toLocaleString()} KM
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Itens no Checklist:</span>
                <span className="font-medium text-slate-900 dark:text-white">{planData.checklistSections?.length || 0} itens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peças Vinculadas:</span>
                <span className="font-medium text-slate-900 dark:text-white">{planData.parts?.length || 0} tipos</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="text-slate-500">Custo Est. Peças:</span>
                <span className="font-bold text-blue-600">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Checklist Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Pré-visualização da Checklist</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-slate-600 dark:text-slate-400">Verificar nível e estado do fluido de arrefecimento</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-slate-600 dark:text-slate-400">Inspeção visual de vazamentos no motor</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-slate-600 dark:text-slate-400">Drenagem do filtro separador de água</span>
              </div>
            </div>
            <button className="mt-4 text-sm text-blue-600 font-medium hover:text-blue-700">
              Configurar checklist completa no passo 3
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-400 text-center">
          © {new Date().getFullYear()} Sistema de Gestão de Frota - Módulo de Planejamento de Oficina
        </p>
      </div>
    </div>
  );
};

export default MaintenancePlanWizard;



