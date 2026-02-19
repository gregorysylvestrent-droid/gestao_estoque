import React, { useState } from 'react';
import { InspectionTemplate, ChecklistSection, ChecklistField } from '../../types';

interface InspectionChecklistEditorProps {
  template?: InspectionTemplate;
  onSave: (template: Omit<InspectionTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  availableModels: string[];
}

export const InspectionChecklistEditor: React.FC<InspectionChecklistEditorProps> = ({
  template,
  onSave,
  onCancel,
  availableModels
}) => {
  const [templateData, setTemplateData] = useState<Partial<InspectionTemplate>>(
    template || {
      name: '',
      version: '1.0',
      vehicleModel: '',
      description: '',
      sections: [],
      isActive: true,
      createdBy: ''
    }
  );

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newField, setNewField] = useState<Partial<ChecklistField>>({
    type: 'text',
    label: '',
    required: false
  });

  const fieldTypes = [
    { value: 'text', label: 'Texto', icon: 'T' },
    { value: 'number', label: 'Número', icon: '#' },
    { value: 'select', label: 'Seleção', icon: 'â˜°' },
    { value: 'date', label: 'Data', icon: 'ðŸ“…' },
    { value: 'photo', label: 'Foto', icon: 'ðŸ“·' },
    { value: 'signature', label: 'Assinatura', icon: 'âœï¸' },
    { value: 'checkbox', label: 'Checkbox', icon: 'â˜' }
  ];

  const addSection = () => {
    if (newSectionTitle.trim()) {
      const newSection: ChecklistSection = {
        id: `SECTION-${Date.now()}`,
        title: newSectionTitle,
        fields: [],
        order: templateData.sections?.length || 0
      };
      setTemplateData(prev => ({
        ...prev,
        sections: [...(prev.sections || []), newSection]
      }));
      setNewSectionTitle('');
      setActiveSection(newSection.id);
    }
  };

  const addField = (sectionId: string) => {
    if (newField.label?.trim()) {
      const field: ChecklistField = {
        id: `FIELD-${Date.now()}`,
        type: newField.type || 'text',
        label: newField.label,
        required: newField.required || false,
        options: newField.options,
        conditional: newField.conditional
      };

      setTemplateData(prev => ({
        ...prev,
        sections: prev.sections?.map(section =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, field] }
            : section
        ) || []
      }));
      setNewField({ type: 'text', label: '', required: false });
    }
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      ) || []
    }));
  };

  const removeSection = (sectionId: string) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections?.filter(s => s.id !== sectionId) || []
    }));
    if (activeSection === sectionId) {
      setActiveSection(null);
    }
  };

  const handleSave = () => {
    if (templateData.name) {
      onSave(templateData as Omit<InspectionTemplate, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {template ? 'Editar Template' : 'Novo Template'}
              </h1>
              {template && (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded">
                  DRAFT v{template.version}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {}}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Visualizar no App
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Salvar Rascunho
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {template?.description || 'Checklist avançado para mecânicos de oficina interna - Controle de desgaste e segurança.'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Models */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-4">Modelos Ativos</h3>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Inspeção Preventiva FH 540</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">v2.4 â€¢ Atualizado há 2 dias</p>
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-400 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Checklist de Pneus & Rodas</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">v1.8 â€¢ Atualizado há 1 sem.</p>
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-400 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Controle de Abastecimento</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">v1.0 â€¢ Atualizado há 1 mês</p>
            </div>
          </div>
          <button className="w-full mt-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Template
          </button>
        </div>

        {/* Center - Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Template Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do Template</label>
                <input
                  type="text"
                  value={templateData.name}
                  onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                  placeholder="Ex: Inspeção Preventiva FH 540"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo do Veículo</label>
                <select
                  value={templateData.vehicleModel}
                  onChange={(e) => setTemplateData({ ...templateData, vehicleModel: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                >
                  <option value="">Selecione...</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {templateData.sections?.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border ${
                  activeSection === section.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Section Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="text-xs font-semibold uppercase">Sessão {sectionIndex + 1}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{section.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                      className="p-2 text-slate-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        activeSection === section.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Section Content */}
                {activeSection === section.id && (
                  <div className="px-4 pb-4">
                    {/* Fields */}
                    <div className="space-y-3">
                      {section.fields.map((field, fieldIndex) => (
                        <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Campo {fieldIndex + 1}</span>
                              {field.required && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Obrigatório</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeField(section.id, field.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white mb-2">{field.label}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded">{field.type}</span>
                            {field.conditional && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Lógica Condicional
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Field Form */}
                    <div className="mt-4 p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Adicionar Campo</h4>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <input
                          type="text"
                          value={newField.label}
                          onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                          placeholder="Nome do campo"
                          className="col-span-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                        />
                        <select
                          value={newField.type}
                          onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                          className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={newField.required}
                            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          Campo obrigatório
                        </label>
                        <button
                          onClick={() => addField(section.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Adicionar Campo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Section */}
            <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Nome da nova sessão"
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && addSection()}
                />
                <button
                  onClick={addSection}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Adicionar Sessão
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Components */}
        <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-4">Componentes</h3>
          <p className="text-xs text-slate-500 mb-4">Arraste para o editor para adicionar</p>

          {/* Basic Fields */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Campos Básicos</h4>
            <div className="grid grid-cols-2 gap-2">
              {fieldTypes.slice(0, 4).map(type => (
                <div
                  key={type.value}
                  className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-move hover:border-blue-500"
                >
                  <div className="text-center text-lg mb-1">{type.icon}</div>
                  <p className="text-xs text-center text-slate-700 dark:text-slate-300">{type.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Media & Validation */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Mídias & Validação</h4>
            <div className="grid grid-cols-2 gap-2">
              {fieldTypes.slice(4, 6).map(type => (
                <div
                  key={type.value}
                  className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-move hover:border-blue-500"
                >
                  <div className="text-center text-lg mb-1">{type.icon}</div>
                  <p className="text-xs text-center text-slate-700 dark:text-slate-300">{type.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Actions */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Ações Inteligentes</h4>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Condicional</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Trigger de O.S. Automática</p>
            </div>
          </div>

          {/* Tip */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Dica:</strong> Use lógicas condicionais para diminuir o tempo de preenchimento do mecânico e focar no que importa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionChecklistEditor;

