import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Fines from './components/Fines';
import Tachograph from './components/Tachograph';
import RNTRC from './components/RNTRC';
import DriverProfile from './components/DriverProfile';
import FiscalCalendar from './components/FiscalCalendar';
import Reports from './components/Reports';
import UserProfile from './components/UserProfile';
import { Screen, Vehicle } from './types';
import { Modal, Input, Select, MaterialIcon } from './constants';
import { FLEET_SCREEN_HINTS } from './derArchitecture';
import { api } from '../../api-client';

const normalizeVehicleText = (value: unknown) => String(value ?? '').trim();
const normalizeVehicleToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const inferVehicleType = (row: Record<string, unknown>): Vehicle['type'] => {
  const raw = `${normalizeVehicleText(row.classe)} ${normalizeVehicleText(row.desc_modelo)} ${normalizeVehicleText(row.desc_marca)}`;
  const token = normalizeVehicleToken(raw);
  if (token.includes('caminh') || token.includes('truck') || token.includes('carreta')) return 'truck';
  if (token.includes('util') || token.includes('van') || token.includes('furg') || token.includes('fiorino') || token.includes('kangoo')) return 'van';
  return 'car';
};

const buildVehicleStatus = (): Vehicle['status'] => ({
  crlv: 'REGULAR',
  ipva: 'PAGO',
  insurance: 'VALIDO',
  licensing: 'REGULAR',
});

const emptyVehicleForm = {
  placa: '',
  renavam: '',
  chassi: '',
  classe: '',
  cor: '',
  ano_modelo: '',
  ano_fabricacao: '',
  cidade: '',
  estado: '',
  proprietario: '',
  cod_centro_custo: '',
  desc_centro_custo: '',
  desc_modelo: '',
  desc_marca: '',
  desc_combustivel: '',
  km_atual: '0',
  km_anterior: '0',
  dta_ult_manutencao: '',
  dta_prox_manutencao: '',
  km_prox_manutencao: '',
  gestao_multa: 'NAO',
  setor_veiculo: '',
  responsavel_veiculo: '',
};

const toText = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const toDateInput = (value: unknown) => {
  const text = toText(value);
  if (!text) return '';
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

const mapFleetVehicleToForm = (row: Record<string, unknown>) => ({
  placa: toText(row.placa).toUpperCase(),
  renavam: toText(row.renavam),
  chassi: toText(row.chassi),
  classe: toText(row.classe),
  cor: toText(row.cor),
  ano_modelo: toText(row.ano_modelo),
  ano_fabricacao: toText(row.ano_fabricacao),
  cidade: toText(row.cidade),
  estado: toText(row.estado),
  proprietario: toText(row.proprietario),
  cod_centro_custo: toText(row.cod_centro_custo),
  desc_centro_custo: toText(row.desc_centro_custo),
  desc_modelo: toText(row.desc_modelo),
  desc_marca: toText(row.desc_marca),
  desc_combustivel: toText(row.desc_combustivel),
  km_atual: toText(row.km_atual ?? '0'),
  km_anterior: toText(row.km_anterior ?? '0'),
  dta_ult_manutencao: toDateInput(row.dta_ult_manutencao),
  dta_prox_manutencao: toDateInput(row.dta_prox_manutencao),
  km_prox_manutencao: toText(row.km_prox_manutencao),
  gestao_multa: toText(row.gestao_multa || 'NAO') || 'NAO',
  setor_veiculo: toText(row.setor_veiculo),
  responsavel_veiculo: toText(row.responsavel_veiculo),
});

const seedVehicleFormFromUi = (vehicle?: Vehicle) => {
  if (!vehicle) return emptyVehicleForm;
  return {
    ...emptyVehicleForm,
    placa: toText(vehicle.plate).toUpperCase(),
    desc_modelo: toText(vehicle.model),
  };
};

const mapFleetVehicleToUi = (row: Record<string, unknown>, index: number): Vehicle => {
  const plate = normalizeVehicleText(row.placa).toUpperCase();
  const brand = normalizeVehicleText(row.desc_marca);
  const model = normalizeVehicleText(row.desc_modelo);
  const classe = normalizeVehicleText(row.classe);
  const displayModel = [brand, model].filter(Boolean).join(' ').trim() || classe || 'Veiculo sem modelo';
  const createdAt = normalizeVehicleText(row.created_at);
  const id = `${plate || 'VEICULO'}-${createdAt || index}`;

  return {
    id,
    model: displayModel,
    plate: plate || 'N/A',
    type: inferVehicleType(row),
    status: buildVehicleStatus(),
  };
};

interface FleetModuleProps {
  onBackToModules?: () => void;
}

const FleetModule: React.FC<FleetModuleProps> = ({ onBackToModules }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.PAINEL);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([]);
  const [fleetVehiclesLoading, setFleetVehiclesLoading] = useState(false);
  const [fleetVehiclesError, setFleetVehiclesError] = useState<string | null>(null);
  const [vehicleModalMode, setVehicleModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [vehicleModalPlate, setVehicleModalPlate] = useState('');
  const [vehicleModalLoading, setVehicleModalLoading] = useState(false);

  const [vehicleForm, setVehicleForm] = useState<Record<string, string>>(emptyVehicleForm);

  const [driverForm, setDriverForm] = useState<Record<string, string>>({
    matricula: '',
    nome_completo: '',
    cpf: '',
    id_perfil: '005P',
    id_funcao: '001F',
    cod_centro_custo: '',
    cnh: '',
    categoria: 'B',
    validade_cnh: '',
    toxico_venc: '',
    telefone: '',
    email: '',
    status: 'ATIVO',
  });

  const [fineForm, setFineForm] = useState<Record<string, string>>({
    placa: '',
    ain: '',
    data: '',
    hora: '',
    local: '',
    valor: '0',
    gravidade: 'MEDIA',
    enquadramento: '',
    condutor: '',
  });

  const [tacoForm, setTacoForm] = useState<Record<string, string>>({
    placa: '',
    num_certificado: '',
    dta_afericao: '',
    dta_vencimento: '',
    valor_taxa: '149.90',
    status: 'REGULAR',
  });

  const [anttForm, setAnttForm] = useState<Record<string, string>>({
    razao_social: '',
    documento: '',
    rntrc: '',
    categoria: 'ETC',
    vencimento: '',
    status: 'ATIVO',
  });

  const [fiscalForm, setFiscalForm] = useState<Record<string, string>>({
    placa: '',
    tipo: 'IPVA',
    exercicio: new Date().getFullYear().toString(),
    vencimento: '',
    valor: '0',
    status: 'PENDENTE',
  });

  const getAddButtonConfig = () => {
    switch (currentScreen) {
      case Screen.VEICULOS:
        return { label: 'Novo Veiculo', icon: 'directions_car', action: () => openVehicleModal('create') };
      case Screen.CONDUTORES:
        return { label: 'Nova Pessoa', icon: 'person_add', action: () => setActiveModal('motorista') };
      case Screen.MULTAS:
        return { label: 'Nova Multa', icon: 'warning', action: () => setActiveModal('multa') };
      case Screen.TACOGRAFO:
        return { label: 'Nova Afericao', icon: 'speed', action: () => setActiveModal('taco') };
      case Screen.RNTRC:
        return { label: 'Novo Registro RNTRC', icon: 'verified_user', action: () => setActiveModal('rntrc') };
      case Screen.FISCAL:
        return { label: 'Novo Lancamento Fiscal', icon: 'payments', action: () => setActiveModal('fiscal') };
      default:
        return null;
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>, field: string, value: string) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const showToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 2800);
  };

  const loadFleetVehicles = useCallback(async () => {
    setFleetVehiclesLoading(true);
    setFleetVehiclesError(null);

    const { data, error } = await api.from('fleet_vehicles').order('created_at', { ascending: false });
    if (error) {
      setFleetVehiclesError(String(error));
      setFleetVehiclesLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setFleetVehicles(rows.map((row, index) => mapFleetVehicleToUi(row, index)));
    setFleetVehiclesLoading(false);
  }, []);

  useEffect(() => {
    if (currentScreen !== Screen.VEICULOS) return;
    loadFleetVehicles();
  }, [currentScreen, loadFleetVehicles]);

  const runAiSearch = async (_type: string, query: string) => {
    if (!query || query.trim().length < 5) return;
    setIsSearching(true);
    window.setTimeout(() => {
      setIsSearching(false);
      showToast('success', 'Sugestao carregada para o preenchimento.');
    }, 900);
  };

  const toNumber = (value: string, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const openVehicleModal = async (mode: 'create' | 'view' | 'edit', vehicle?: Vehicle) => {
    setVehicleModalMode(mode);
    if (mode === 'create') {
      setVehicleForm(emptyVehicleForm);
      setVehicleModalPlate('');
      setActiveModal('veiculo');
      return;
    }

    if (!vehicle?.plate) {
      showToast('error', 'Placa nao informada para abrir o veiculo.');
      return;
    }

    setVehicleForm(seedVehicleFormFromUi(vehicle));
    setVehicleModalPlate(vehicle.plate.toUpperCase());
    setVehicleModalLoading(true);
    setActiveModal('veiculo');
    try {
      const { data, error } = await api
        .from('fleet_vehicles')
        .eq('placa', vehicle.plate)
        .eq('source_module', 'gestao_frota');

      if (error) throw new Error(String(error));
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        showToast('error', 'Veiculo nao encontrado para abrir.');
        return;
      }

      setVehicleForm(mapFleetVehicleToForm(row));
      setVehicleModalPlate(String(row.placa || vehicle.plate).toUpperCase());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar veiculo.';
      showToast('error', message);
    } finally {
      setVehicleModalLoading(false);
    }
  };

  const persistActiveModal = async () => {
    const now = new Date().toISOString();

    if (activeModal === 'veiculo') {
      const payload = {
        ...vehicleForm,
        placa: vehicleForm.placa.trim().toUpperCase(),
        renavam: vehicleForm.renavam.trim(),
        chassi: vehicleForm.chassi.trim(),
        km_atual: toNumber(vehicleForm.km_atual),
        km_anterior: toNumber(vehicleForm.km_anterior),
        km_prox_manutencao: toNumber(vehicleForm.km_prox_manutencao),
      };
      if (!payload.placa) throw new Error('Informe a placa do veiculo.');
      if (vehicleModalMode === 'edit') {
        return api
          .from('fleet_vehicles')
          .eq('source_module', 'gestao_frota')
          .eq('placa', vehicleModalPlate || payload.placa)
          .update(payload);
      }
      return api
        .from('fleet_vehicles')
        .eq('source_module', 'gestao_frota')
        .insert({ ...payload, created_at: now });
    }

    if (activeModal === 'motorista') {
      const payload = {
        ...driverForm,
        cpf: driverForm.cpf.replace(/\D/g, ''),
        nome_completo: driverForm.nome_completo.trim(),
        email: driverForm.email.trim().toLowerCase(),
        created_at: now,
      };
      if (!payload.cpf) throw new Error('Informe um CPF valido.');
      if (!payload.nome_completo) throw new Error('Informe o nome completo.');
      return api.from('fleet_people').insert(payload);
    }

    if (activeModal === 'multa') {
      const payload = {
        ...fineForm,
        placa: fineForm.placa.trim().toUpperCase(),
        ain: fineForm.ain.trim(),
        valor: toNumber(fineForm.valor),
        status: 'PENDENTE',
        created_at: now,
      };
      if (!payload.placa) throw new Error('Informe a placa do veiculo.');
      if (!payload.ain) throw new Error('Informe o AIN da multa.');
      return api.from('fleet_fines').insert(payload);
    }

    if (activeModal === 'taco') {
      const payload = {
        ...tacoForm,
        placa: tacoForm.placa.trim().toUpperCase(),
        num_certificado: tacoForm.num_certificado.trim(),
        valor_taxa: toNumber(tacoForm.valor_taxa),
        created_at: now,
      };
      if (!payload.placa) throw new Error('Informe a placa do veiculo.');
      if (!payload.num_certificado) throw new Error('Informe o numero do certificado.');
      return api.from('fleet_tachograph_checks').insert(payload);
    }

    if (activeModal === 'rntrc') {
      const payload = {
        ...anttForm,
        documento: anttForm.documento.replace(/\D/g, ''),
        rntrc: anttForm.rntrc.trim(),
        created_at: now,
      };
      if (!payload.razao_social.trim()) throw new Error('Informe a razao social.');
      if (!payload.rntrc) throw new Error('Informe o numero do RNTRC.');
      return api.from('fleet_rntrc_records').insert(payload);
    }

    if (activeModal === 'fiscal') {
      const payload = {
        ...fiscalForm,
        placa: fiscalForm.placa.trim().toUpperCase(),
        exercicio: toNumber(fiscalForm.exercicio, new Date().getFullYear()),
        valor: toNumber(fiscalForm.valor),
        created_at: now,
      };
      if (!payload.placa) throw new Error('Informe a placa do veiculo.');
      return api.from('fleet_fiscal_obligations').insert(payload);
    }

    throw new Error('Nenhum formulario selecionado para salvar.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    if (activeModal === 'veiculo' && vehicleModalMode === 'view') {
      setActiveModal(null);
      return;
    }

    const shouldRefreshVehicles = activeModal === 'veiculo';
    setIsSaving(true);
    try {
      const result = await persistActiveModal();
      if (result?.error) throw new Error(String(result.error));

      setActiveModal(null);
      if (shouldRefreshVehicles) {
        await loadFleetVehicles();
      }
      showToast('success', 'Cadastro salvo com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar cadastro.';
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.PAINEL:
        return <Dashboard />;
      case Screen.VEICULOS:
        return (
          <Vehicles
            vehicles={fleetVehicles}
            loading={fleetVehiclesLoading}
            error={fleetVehiclesError}
            onRetry={loadFleetVehicles}
            onView={(vehicle) => openVehicleModal('view', vehicle)}
            onEdit={(vehicle) => openVehicleModal('edit', vehicle)}
          />
        );
      case Screen.MULTAS:
        return <Fines />;
      case Screen.TACOGRAFO:
        return <Tachograph />;
      case Screen.RNTRC:
        return <RNTRC />;
      case Screen.CONDUTORES:
        return <DriverProfile />;
      case Screen.FISCAL:
        return <FiscalCalendar />;
      case Screen.RELATORIOS:
        return <Reports />;
      case Screen.PERFIL:
        return <UserProfile />;
      default:
        return <Dashboard />;
    }
  };

  const btnConfig = getAddButtonConfig();
  const currentHint = useMemo(() => FLEET_SCREEN_HINTS[currentScreen], [currentScreen]);

  return (
    <Layout
      currentScreen={currentScreen}
      setScreen={setCurrentScreen}
      onAddClick={btnConfig?.action}
      addLabel={btnConfig?.label}
      addIcon={btnConfig?.icon}
      onBackToModules={onBackToModules}
    >
      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 flex items-start gap-3">
        <MaterialIcon name="schema" className="text-blue-600 !text-[18px] mt-0.5" />
        <p>{currentHint}</p>
      </div>

      {renderScreen()}

      <Modal
        isOpen={activeModal === 'veiculo'}
        onClose={() => setActiveModal(null)}
        title={vehicleModalMode === 'view' ? 'Detalhes do Veiculo' : vehicleModalMode === 'edit' ? 'Editar Veiculo' : 'Cadastro de Veiculo (DER: Veiculos)'}
      >
        {vehicleModalLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Carregando veiculo...
          </div>
        ) : (
        <form className="space-y-8" onSubmit={handleSave}>
          {vehicleModalMode === 'view' && (
            <div className="px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50/70 text-xs font-semibold text-slate-600">
              Modo visualização. Para alterar dados, clique em Editar.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Placa (PK) *"
              required
              value={vehicleForm.placa}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange(setVehicleForm, 'placa', e.target.value.toUpperCase())
              }
              onAction={() => runAiSearch('vehicle', vehicleForm.placa)}
              actionIcon="search"
              disabled={vehicleModalMode !== 'create'}
              className={vehicleModalMode !== 'create' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Renavam"
              value={vehicleForm.renavam}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'renavam', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Chassi"
              value={vehicleForm.chassi}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'chassi', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Marca', field: 'desc_marca' },
              { label: 'Modelo', field: 'desc_modelo' },
              { label: 'Classe', field: 'classe' },
              { label: 'Cor', field: 'cor' },
              { label: 'Ano Modelo', field: 'ano_modelo', type: 'number' },
              { label: 'Ano Fabricacao', field: 'ano_fabricacao', type: 'number' },
              { label: 'Cidade', field: 'cidade' },
              { label: 'Estado', field: 'estado' },
              { label: 'Proprietario', field: 'proprietario' },
              { label: 'Centro de Custo (FK)', field: 'cod_centro_custo' },
              { label: 'Desc. Centro de Custo', field: 'desc_centro_custo' },
              { label: 'Combustivel', field: 'desc_combustivel' },
            ].map((item) => (
              <Input
                key={item.field}
                label={item.label}
                type={item.type || 'text'}
                value={vehicleForm[item.field]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, item.field, e.target.value)}
                disabled={vehicleModalMode === 'view'}
                className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Input
              label="KM Atual"
              type="number"
              value={vehicleForm.km_atual}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'km_atual', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="KM Anterior"
              type="number"
              value={vehicleForm.km_anterior}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'km_anterior', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Data Ult. Manutencao"
              type="date"
              value={vehicleForm.dta_ult_manutencao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'dta_ult_manutencao', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Data Prox. Manutencao"
              type="date"
              value={vehicleForm.dta_prox_manutencao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'dta_prox_manutencao', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="KM Prox. Manutencao"
              type="number"
              value={vehicleForm.km_prox_manutencao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'km_prox_manutencao', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Select
              label="Gestao de Multa"
              value={vehicleForm.gestao_multa}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setVehicleForm, 'gestao_multa', e.target.value)}
              options={[
                { label: 'Sim', value: 'SIM' },
                { label: 'Nao', value: 'NAO' },
              ]}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Setor do Veiculo"
              value={vehicleForm.setor_veiculo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'setor_veiculo', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
            <Input
              label="Responsavel do Veiculo"
              value={vehicleForm.responsavel_veiculo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setVehicleForm, 'responsavel_veiculo', e.target.value)}
              disabled={vehicleModalMode === 'view'}
              className={vehicleModalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Fechar
            </button>
            {vehicleModalMode !== 'view' && (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Salvar Veiculo'}
              </button>
            )}
          </div>
        </form>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'motorista'} onClose={() => setActiveModal(null)} title="Cadastro de Pessoa e Funcao (DER: Pessoa)">
        <form className="space-y-8" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="CPF (PK) *" required value={driverForm.cpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'cpf', e.target.value)} onAction={() => runAiSearch('driver', driverForm.cpf)} actionIcon="person_search" />
            <Input label="Nome Completo" required value={driverForm.nome_completo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'nome_completo', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Input label="Matricula" value={driverForm.matricula} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'matricula', e.target.value)} />
            <Input label="Perfil (FK)" value={driverForm.id_perfil} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'id_perfil', e.target.value)} />
            <Input label="Funcao (FK)" value={driverForm.id_funcao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'id_funcao', e.target.value)} />
            <Input label="Centro de Custo (FK)" value={driverForm.cod_centro_custo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'cod_centro_custo', e.target.value)} />
            <Input label="Registro CNH" value={driverForm.cnh} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'cnh', e.target.value)} />
            <Select
              label="Categoria"
              value={driverForm.categoria}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setDriverForm, 'categoria', e.target.value)}
              options={[
                { label: 'A', value: 'A' },
                { label: 'B', value: 'B' },
                { label: 'C', value: 'C' },
                { label: 'D', value: 'D' },
                { label: 'E', value: 'E' },
              ]}
            />
            <Input label="Validade CNH" type="date" value={driverForm.validade_cnh} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'validade_cnh', e.target.value)} />
            <Input label="Toxicologico" type="date" value={driverForm.toxico_venc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'toxico_venc', e.target.value)} />
            <Input label="Telefone" value={driverForm.telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'telefone', e.target.value)} />
            <Input label="Email" value={driverForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setDriverForm, 'email', e.target.value)} />
            <Select
              label="Status"
              value={driverForm.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setDriverForm, 'status', e.target.value)}
              options={[
                { label: 'Ativo', value: 'ATIVO' },
                { label: 'Inativo', value: 'INATIVO' },
              ]}
            />
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs disabled:opacity-70">
            {isSaving ? 'Salvando...' : 'Salvar Pessoa'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'multa'} onClose={() => setActiveModal(null)} title="Cadastro de Infracao">
        <form className="space-y-8" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Placa do Veiculo" required value={fineForm.placa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'placa', e.target.value.toUpperCase())} />
            <Input label="Numero do Auto (AIN)" required value={fineForm.ain} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'ain', e.target.value)} />
            <Input label="Data da Infracao" type="date" value={fineForm.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'data', e.target.value)} />
          </div>
          <Input label="Descricao / Enquadramento (Busca assistida)" placeholder="Ex.: estacionar em local proibido..." value={fineForm.enquadramento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'enquadramento', e.target.value)} onAction={() => runAiSearch('fine', fineForm.enquadramento)} actionIcon="auto_awesome" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Valor (R$)" type="number" value={fineForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'valor', e.target.value)} />
            <Select
              label="Gravidade"
              value={fineForm.gravidade}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setFineForm, 'gravidade', e.target.value)}
              options={[
                { label: 'Leve', value: 'LEVE' },
                { label: 'Media', value: 'MEDIA' },
                { label: 'Grave', value: 'GRAVE' },
                { label: 'Gravissima', value: 'GRAVISSIMA' },
              ]}
            />
            <Input label="Condutor" value={fineForm.condutor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFineForm, 'condutor', e.target.value)} />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-600/20 disabled:opacity-70">
            {isSaving ? 'Salvando...' : 'Salvar Infracao'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'taco'} onClose={() => setActiveModal(null)} title="Cadastro de Afericao do Tacografo">
        <form className="space-y-8" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Placa do Veiculo" required value={tacoForm.placa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setTacoForm, 'placa', e.target.value.toUpperCase())} />
            <Input label="Numero do Certificado Inmetro" required value={tacoForm.num_certificado} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setTacoForm, 'num_certificado', e.target.value)} />
            <Input label="Data da Afericao" type="date" value={tacoForm.dta_afericao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setTacoForm, 'dta_afericao', e.target.value)} />
            <Input label="Data de Vencimento" type="date" value={tacoForm.dta_vencimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setTacoForm, 'dta_vencimento', e.target.value)} />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs disabled:opacity-70">
            {isSaving ? 'Salvando...' : 'Salvar Afericao'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'rntrc'} onClose={() => setActiveModal(null)} title="Cadastro de Registro RNTRC / ANTT">
        <form className="space-y-8" onSubmit={handleSave}>
          <Input label="Razao Social / Nome" required value={anttForm.razao_social} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setAnttForm, 'razao_social', e.target.value)} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Input label="CNPJ / CPF" value={anttForm.documento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setAnttForm, 'documento', e.target.value)} />
            <Input label="Numero do Registro" value={anttForm.rntrc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setAnttForm, 'rntrc', e.target.value)} />
            <Select
              label="Categoria"
              value={anttForm.categoria}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setAnttForm, 'categoria', e.target.value)}
              options={[
                { label: 'ETC', value: 'ETC' },
                { label: 'TAC', value: 'TAC' },
                { label: 'CTC', value: 'CTC' },
              ]}
            />
            <Input label="Validade" type="date" value={anttForm.vencimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setAnttForm, 'vencimento', e.target.value)} />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs disabled:opacity-70">
            {isSaving ? 'Salvando...' : 'Salvar Registro RNTRC'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'fiscal'} onClose={() => setActiveModal(null)} title="Cadastro de Obrigacao Fiscal">
        <form className="space-y-8" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Placa do Veiculo" required value={fiscalForm.placa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFiscalForm, 'placa', e.target.value.toUpperCase())} />
            <Select
              label="Tipo de Tributo"
              value={fiscalForm.tipo}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange(setFiscalForm, 'tipo', e.target.value)}
              options={[
                { label: 'IPVA', value: 'IPVA' },
                { label: 'Licenciamento', value: 'LIC' },
                { label: 'Seguro DPVAT', value: 'DPVAT' },
              ]}
            />
            <Input label="Exercicio" value={fiscalForm.exercicio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFiscalForm, 'exercicio', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Data de Vencimento" type="date" value={fiscalForm.vencimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFiscalForm, 'vencimento', e.target.value)} />
            <Input label="Valor Total (R$)" type="number" value={fiscalForm.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setFiscalForm, 'valor', e.target.value)} />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-emerald-600/20 disabled:opacity-70">
            {isSaving ? 'Salvando...' : 'Salvar Obrigacao Fiscal'}
          </button>
        </form>
      </Modal>

      {isSearching && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="size-20 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-2xl" />
          <p className="mt-6 text-white text-[10px] font-black uppercase tracking-[0.4em]">Consultando Base Assistida</p>
          <p className="text-white/60 text-[8px] font-bold uppercase mt-2">Buscando sugestoes para preenchimento...</p>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[210] text-white rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2 ${
            toast.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <MaterialIcon name={toast.kind === 'success' ? 'check_circle' : 'error'} className="!text-[18px]" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </Layout>
  );
};

export default FleetModule;
