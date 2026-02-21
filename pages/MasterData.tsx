import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { PaginationBar } from '../components/PaginationBar';
import { InventoryItem, Vendor, Vehicle } from '../types';

type Tab = 'itens' | 'fornecedores' | 'veiculos';

interface InventoryPagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

interface MasterDataProps {
  inventory: InventoryItem[];
  vendors: Vendor[];
  vehicles: Vehicle[];
  onAddRecord: (type: 'item' | 'vendor' | 'vehicle' | 'cost_center', data: any, isEdit: boolean) => void;
  onRemoveRecord?: (type: 'item' | 'vendor' | 'vehicle', id: string) => void;
  onImportRecords: (type: 'item' | 'vendor' | 'vehicle', data: any[]) => void;
  inventoryPagination?: InventoryPagination;
  vendorsPagination?: InventoryPagination;
}

const ITEMS_PER_PAGE = 50;

const normalizeDigits = (value: unknown) => String(value ?? '').replace(/\D+/g, '');
const formatCnpj = (value: unknown) => {
  const digits = normalizeDigits(value).slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatPhone = (value: unknown) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const findSheetKeyValue = (row: Record<string, any>, ...keys: string[]) => {
  const rowKeys = Object.keys(row || {});
  for (const key of keys) {
    const found = rowKeys.find((rowKey) => rowKey.trim().toLowerCase() === key.trim().toLowerCase());
    if (found) return row[found];
  }
  return undefined;
};

export const MasterData: React.FC<MasterDataProps> = ({
  inventory,
  vendors,
  vehicles,
  onAddRecord,
  onRemoveRecord,
  onImportRecords,
  inventoryPagination,
  vendorsPagination,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('itens');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [localItemsPage, setLocalItemsPage] = useState(1);
  const [localVendorsPage, setLocalVendorsPage] = useState(1);
  const [localVehiclesPage, setLocalVehiclesPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'itens' && inventoryPagination) {
      inventoryPagination.onPageChange(1);
    }
    if (activeTab === 'fornecedores' && vendorsPagination) {
      vendorsPagination.onPageChange(1);
    }
    setLocalItemsPage(1);
    setLocalVendorsPage(1);
    setLocalVehiclesPage(1);
    setSearchTerm('');
  }, [activeTab, inventoryPagination, vendorsPagination]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedSearchDigits = normalizeDigits(searchTerm);
  const isSearching = normalizedSearch.length > 0;

  const filteredInventory = useMemo(() => {
    if (!isSearching) return inventory;
    return inventory.filter((item) =>
      String(item.sku || '').toLowerCase().includes(normalizedSearch) ||
      String(item.name || '').toLowerCase().includes(normalizedSearch)
    );
  }, [inventory, isSearching, normalizedSearch]);

  const filteredVendors = useMemo(() => {
    if (!isSearching) return vendors;
    return vendors.filter((vendor) => {
      const razaoSocial = String(vendor.razaoSocial || vendor.name || '').toLowerCase();
      const cnpjDigits = normalizeDigits(vendor.cnpj);
      return razaoSocial.includes(normalizedSearch) || (normalizedSearchDigits && cnpjDigits.includes(normalizedSearchDigits));
    });
  }, [vendors, isSearching, normalizedSearch, normalizedSearchDigits]);

  const filteredVehicles = useMemo(() => {
    if (!isSearching) return vehicles;
    return vehicles.filter((vehicle) => {
      const plate = String(vehicle.plate || '').toLowerCase();
      const model = String(vehicle.model || '').toLowerCase();
      const center = String(vehicle.costCenter || '').toLowerCase();
      return plate.includes(normalizedSearch) || model.includes(normalizedSearch) || center.includes(normalizedSearch);
    });
  }, [vehicles, isSearching, normalizedSearch]);

  const isItemsRemotePagination = Boolean(inventoryPagination);
  const currentPage = inventoryPagination?.currentPage ?? localItemsPage;
  const pageSize = inventoryPagination?.pageSize ?? ITEMS_PER_PAGE;
  const hasNextPage = isSearching
    ? false
    : inventoryPagination?.hasNextPage ?? currentPage * pageSize < filteredInventory.length;
  const isPageLoading = inventoryPagination?.isLoading ?? false;
  const itemCount = isSearching ? filteredInventory.length : inventoryPagination?.totalItems ?? inventory.length;

  const isVendorsRemotePagination = Boolean(vendorsPagination);
  const vendorsCurrentPage = vendorsPagination?.currentPage ?? localVendorsPage;
  const vendorsPageSize = vendorsPagination?.pageSize ?? ITEMS_PER_PAGE;
  const vendorsHasNextPage = isSearching
    ? false
    : vendorsPagination?.hasNextPage ?? vendorsCurrentPage * vendorsPageSize < filteredVendors.length;
  const isVendorsLoading = vendorsPagination?.isLoading ?? false;
  const vendorsCount = isSearching ? filteredVendors.length : vendorsPagination?.totalItems ?? vendors.length;
  const vehiclesCount = filteredVehicles.length;

  const displayedInventory = useMemo(() => {
    if (isItemsRemotePagination) return filteredInventory;
    const start = (localItemsPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [isItemsRemotePagination, filteredInventory, localItemsPage]);

  const displayedVendors = useMemo(() => {
    if (isVendorsRemotePagination) return filteredVendors;
    const start = (localVendorsPage - 1) * ITEMS_PER_PAGE;
    return filteredVendors.slice(start, start + ITEMS_PER_PAGE);
  }, [isVendorsRemotePagination, filteredVendors, localVendorsPage]);

  const displayedVehicles = useMemo(() => {
    const start = (localVehiclesPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, localVehiclesPage]);

  useEffect(() => {
    if (!isSearching) return;

    if (activeTab === 'itens') {
      if (inventoryPagination) inventoryPagination.onPageChange(1);
      else setLocalItemsPage(1);
    }

    if (activeTab === 'fornecedores') {
      if (vendorsPagination) vendorsPagination.onPageChange(1);
      else setLocalVendorsPage(1);
    }

    if (activeTab === 'veiculos') {
      setLocalVehiclesPage(1);
    }
  }, [activeTab, isSearching, searchTerm, inventoryPagination, vendorsPagination]);

  const handleInventoryPageChange = (page: number) => {
    const safePage = Math.max(1, page);
    if (inventoryPagination) {
      inventoryPagination.onPageChange(safePage);
      return;
    }
    setLocalItemsPage(safePage);
  };

  const handleVendorsPageChange = (page: number) => {
    const safePage = Math.max(1, page);
    if (vendorsPagination) {
      vendorsPagination.onPageChange(safePage);
      return;
    }
    setLocalVendorsPage(safePage);
  };

  const handleVehiclesPageChange = (page: number) => {
    setLocalVehiclesPage(Math.max(1, page));
  };

  const handleOpenModal = (existingData?: any) => {
    if (existingData) {
      if (activeTab === 'fornecedores') {
        setFormData({
          id: existingData.id,
          idFornecedor: existingData.idFornecedor ?? '',
          razaoSocial: existingData.razaoSocial || existingData.name || '',
          nomeFantasia: existingData.nomeFantasia || '',
          cnpj: formatCnpj(existingData.cnpj || ''),
          telefone: formatPhone(existingData.telefone || existingData.contact || ''),
          status: existingData.status || 'Ativo',
        });
      } else if (activeTab === 'veiculos') {
        setFormData({
          plate: existingData.plate || '',
          model: existingData.model || '',
          type: existingData.type || 'PROPRIO',
          status: existingData.status || 'Disponível',
          costCenter: existingData.costCenter || '',
          lastMaintenance: existingData.lastMaintenance || '',
        });
      } else {
        setFormData(existingData);
      }
      setIsEditing(true);
    } else if (activeTab === 'itens') {
      setFormData({
        sku: '',
        name: '',
        category: 'GERAL',
        unit: 'UN',
        minQty: 0,
        imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=80',
      });
      setIsEditing(false);
    } else if (activeTab === 'fornecedores') {
      setFormData({
        idFornecedor: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        telefone: '',
        status: 'Ativo',
      });
      setIsEditing(false);
    } else {
      setFormData({
        plate: '',
        model: '',
        type: 'PROPRIO',
        status: 'Disponível',
        costCenter: '',
        lastMaintenance: '',
      });
      setIsEditing(false);
    }

    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const type = activeTab === 'itens' ? 'item' : activeTab === 'fornecedores' ? 'vendor' : 'vehicle';

    if (type === 'vendor') {
      const payload = {
        cnpj: normalizeDigits(formData.cnpj),
        razaoSocial: String(formData.razaoSocial || '').trim(),
        nomeFantasia: String(formData.nomeFantasia || '').trim(),
        telefone: String(formData.telefone || '').trim(),
        name: String(formData.razaoSocial || '').trim(),
        contact: String(formData.telefone || formData.nomeFantasia || '').trim(),
        status: formData.status || 'Ativo',
        ...(isEditing ? { id: formData.id } : {}),
      };
      onAddRecord(type, payload, isEditing);
    } else if (type === 'item') {
      const payload = {
        ...formData,
        sku: String(formData.sku || '').trim().toUpperCase(),
        name: String(formData.name || '').trim(),
      };
      onAddRecord(type, payload, isEditing);
    } else {
      const payload = {
        plate: String(formData.plate || '').trim().toUpperCase(),
        model: String(formData.model || '').trim(),
        type: String(formData.type || 'PROPRIO').trim(),
        status: String(formData.status || 'Disponível').trim(),
        costCenter: String(formData.costCenter || '').trim(),
        lastMaintenance: String(formData.lastMaintenance || '').trim(),
      };
      onAddRecord(type, payload, isEditing);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!onRemoveRecord) return;
    const type = activeTab === 'itens' ? 'item' : activeTab === 'fornecedores' ? 'vendor' : 'vehicle';
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      onRemoveRecord(type, id);
    }
  };

  const handleDownloadTemplate = () => {
    const headers =
      activeTab === 'itens'
        ? ['CODIGO ITEM', 'DESCRICAO']
        : activeTab === 'fornecedores'
          ? ['RAZAO SOCIAL', 'NOME FANTASIA', 'CNPJ', 'TELEFONE']
          : ['PLACA', 'MODELO', 'TIPO', 'STATUS', 'CENTRO DE CUSTO'];

    const fileName =
      activeTab === 'itens'
        ? 'template_itens_logiwms.xlsx'
        : activeTab === 'fornecedores'
          ? 'template_fornecedores_logiwms.xlsx'
          : 'template_veiculos_logiwms.xlsx';

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const type = activeTab === 'itens' ? 'item' : activeTab === 'fornecedores' ? 'vendor' : 'vehicle';
      let mappedData: any[] = [];

      if (activeTab === 'itens') {
        mappedData = data
          .map((row: any) => ({
            sku: String(findSheetKeyValue(row, 'CODIGO ITEM', 'CODIGO', 'SKU', 'COD. PRODUTO') || '').trim().toUpperCase(),
            name: String(findSheetKeyValue(row, 'DESCRICAO', 'DESCRIÇÃO', 'NOME', 'PRODUTO') || '').trim(),
            unit: String(findSheetKeyValue(row, 'UNIDADE', 'UN') || 'UN'),
            category: String(findSheetKeyValue(row, 'CATEGORIA') || 'GERAL'),
            quantity: Math.round(Number(findSheetKeyValue(row, 'QUANTIDADE', 'QTD')) || 0),
            minQty: Math.round(Number(findSheetKeyValue(row, 'QUANTIDADE MINIMA', 'QUANTIDADE MÍNIMA', 'QTD_MIN')) || 0),
            maxQty: 1000,
            imageUrl:
              String(findSheetKeyValue(row, 'IMAGEM', 'URL') || '') ||
              'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&q=80',
            status: 'disponivel',
            batch: 'N/A',
            expiry: 'N/A',
            location: 'DOCA-01',
          }))
          .filter((item) => item.sku && item.name);
      } else if (activeTab === 'fornecedores') {
        mappedData = data
          .map((row: any) => ({
            id: `VEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            razaoSocial: String(findSheetKeyValue(row, 'RAZAO SOCIAL', 'RAZÃO SOCIAL', 'NOME') || '').trim(),
            nomeFantasia: String(findSheetKeyValue(row, 'NOME FANTASIA', 'FANTASIA', 'CONTATO') || '').trim(),
            cnpj: normalizeDigits(findSheetKeyValue(row, 'CNPJ', 'DOCUMENTO', 'ID') || ''),
            telefone: String(findSheetKeyValue(row, 'TELEFONE', 'CONTATO', 'CELULAR') || '').trim(),
            status: String(findSheetKeyValue(row, 'STATUS', 'SITUACAO') || 'Ativo'),
          }))
          .filter((vendor) => vendor.razaoSocial);
      } else {
        mappedData = data
          .map((row: any) => ({
            plate: String(findSheetKeyValue(row, 'PLACA', 'COD_PLACA') || '').trim().toUpperCase(),
            model: String(findSheetKeyValue(row, 'MODELO', 'DESC_MODELO', 'NOME') || '').trim(),
            type: String(findSheetKeyValue(row, 'TIPO', 'CLASSE') || 'PROPRIO').trim(),
            status: String(findSheetKeyValue(row, 'STATUS', 'SITUACAO') || 'Disponível').trim(),
            costCenter: String(findSheetKeyValue(row, 'CENTRO DE CUSTO', 'CENTRO_CUSTO', 'COD_CENTRO_CUSTO') || '').trim(),
            lastMaintenance: String(findSheetKeyValue(row, 'ULTIMA MANUTENCAO', 'DATA ULT MANUT') || '').trim(),
          }))
          .filter((vehicle) => vehicle.plate && vehicle.model);
      }

      onImportRecords(type, mappedData);
      e.target.value = '';
    };

    reader.readAsBinaryString(file);
  };

  const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div className="flex items-center gap-3 justify-end">
      <button onClick={onEdit} className="group relative size-11 flex items-center justify-center transition-all active:scale-95" title="Editar">
        <div className="absolute inset-0 border-[2.5px] border-primary rounded-xl bg-primary/5 group-hover:bg-primary/10 group-hover:scale-105 transition-all" />
        <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <button onClick={onDelete} className="group relative size-11 flex items-center justify-center transition-all active:scale-95" title="Excluir">
        <div className="absolute inset-0 border-[2.5px] border-rose-500 rounded-xl bg-rose-500/5 group-hover:bg-rose-500/10 group-hover:scale-105 transition-all" />
        <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-rose-500 z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl lg:text-4xl font-black tracking-tighter text-slate-800 dark:text-white">Cadastro Geral</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestao centralizada de ativos, parceiros e logistica.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadTemplate}
            className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
          >
            Baixar Modelo (.xlsx)
          </button>

          <label className="px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
            Importar (.xlsx)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>

          <button
            onClick={() => handleOpenModal()}
            className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2"
          >
            Novo {activeTab === 'itens' ? 'Item' : activeTab === 'fornecedores' ? 'Fornecedor' : 'Veículo'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl w-fit border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('itens')}
          className={`px-6 lg:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'itens'
            ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
        >
          itens
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'itens' ? 'bg-primary/10 text-primary' : 'bg-slate-300/30 text-slate-400'}`}>
            {itemCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fornecedores')}
          className={`px-6 lg:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'fornecedores'
            ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
        >
          fornecedores
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'fornecedores' ? 'bg-primary/10 text-primary' : 'bg-slate-300/30 text-slate-400'}`}>
            {vendorsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('veiculos')}
          className={`px-6 lg:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'veiculos'
            ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
        >
          veículos
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'veiculos' ? 'bg-primary/10 text-primary' : 'bg-slate-300/30 text-slate-400'}`}>
            {vehiclesCount}
          </span>
        </button>
      </div>

      <div className="relative max-w-xl">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            activeTab === 'itens'
              ? 'Buscar por SKU ou Nome do item...'
              : activeTab === 'fornecedores'
                ? 'Buscar por Razão Social ou CNPJ...'
                : 'Buscar por Placa, Modelo ou Centro de Custo...'
          }
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Limpar busca"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                {activeTab === 'itens' ? (
                  <>
                    <th className="px-8 py-6">Identificacao / Produto</th>
                    <th className="px-8 py-6">Codigo do Produto</th>
                    <th className="px-8 py-6">Categoria</th>
                    <th className="px-8 py-6 text-right">Gestao</th>
                  </>
                ) : activeTab === 'fornecedores' ? (
                  <>
                    <th className="px-8 py-6">Fornecedor</th>
                    <th className="px-8 py-6">CNPJ</th>
                    <th className="px-8 py-6">Telefone</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6 text-right">Gestao</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-6">Placa</th>
                    <th className="px-8 py-6">Modelo</th>
                    <th className="px-8 py-6">Tipo</th>
                    <th className="px-8 py-6">Centro de Custo</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6 text-right">Gestao</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeTab === 'itens' &&
                displayedInventory.map((item, index) => {
                  const eanSeed = (currentPage - 1) * pageSize + index;
                  return (
                    <tr key={item.sku} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <img src={item.imageUrl} className="size-12 rounded-xl object-cover shadow-sm border-2 border-white dark:border-slate-800" alt="" />
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase">EAN: 7891000{eanSeed}221</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-mono text-[11px] font-black text-primary">{item.sku}</td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 uppercase tracking-tighter">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end">
                          <ActionButtons onEdit={() => handleOpenModal(item)} onDelete={() => handleDelete(item.sku)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {activeTab === 'fornecedores' &&
                displayedVendors.map((vendor) => {
                  const razaoSocial = vendor.razaoSocial || vendor.name;
                  const nomeFantasia = vendor.nomeFantasia || '';
                  const telefone = vendor.telefone || vendor.contact || '-';

                  return (
                    <tr key={vendor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{razaoSocial}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{nomeFantasia || 'Sem nome fantasia'}</p>
                      </td>
                      <td className="px-8 py-5 font-mono text-[11px] font-black text-slate-500">{vendor.cnpj || '-'}</td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{telefone}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${vendor.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end">
                          <ActionButtons onEdit={() => handleOpenModal(vendor)} onDelete={() => handleDelete(vendor.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {activeTab === 'veiculos' &&
                displayedVehicles.map((vehicle) => (
                  <tr key={vehicle.plate} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-5 font-mono text-[11px] font-black text-primary">{vehicle.plate || '-'}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-700 dark:text-slate-200">{vehicle.model || '-'}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{vehicle.type || '-'}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{vehicle.costCenter || '-'}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {vehicle.status || '-'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end">
                        <ActionButtons onEdit={() => handleOpenModal(vehicle)} onDelete={() => handleDelete(vehicle.plate)} />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeTab === 'itens' && (
        <PaginationBar
          currentPage={currentPage}
          currentCount={displayedInventory.length}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          isLoading={isPageLoading}
          itemLabel="itens"
          onPageChange={handleInventoryPageChange}
        />
      )}

      {activeTab === 'fornecedores' && (
        <PaginationBar
          currentPage={vendorsCurrentPage}
          currentCount={displayedVendors.length}
          pageSize={vendorsPageSize}
          hasNextPage={vendorsHasNextPage}
          isLoading={isVendorsLoading}
          itemLabel="fornecedores"
          onPageChange={handleVendorsPageChange}
        />
      )}

      {activeTab === 'veiculos' && (
        <PaginationBar
          currentPage={localVehiclesPage}
          currentCount={displayedVehicles.length}
          pageSize={ITEMS_PER_PAGE}
          hasNextPage={localVehiclesPage * ITEMS_PER_PAGE < filteredVehicles.length}
          isLoading={false}
          itemLabel="veículos"
          onPageChange={handleVehiclesPageChange}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                  {isEditing ? 'Editar' : 'Novo'} {activeTab === 'itens' ? 'Item Mestre' : activeTab === 'fornecedores' ? 'Fornecedor' : 'Veículo'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Gestão de Compras e Estoque</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 shadow-sm transition-all border border-slate-100 dark:border-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'itens' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Codigo do Item</label>
                      <input
                        required
                        disabled={isEditing}
                        value={formData.sku || ''}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-primary rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descricao</label>
                      <input
                        required
                        maxLength={255}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-primary rounded-2xl font-bold text-sm"
                      />
                    </div>
                  </>
                ) : activeTab === 'fornecedores' ? (
                  <>
                    {isEditing && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Fornecedor (automatico)</label>
                        <input
                          value={formData.idFornecedor ?? '-'}
                          readOnly
                          className="w-full px-5 py-4 bg-slate-100/80 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-500"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Razao Social</label>
                      <input
                        required
                        maxLength={150}
                        value={formData.razaoSocial || ''}
                        onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Fantasia</label>
                      <input
                        maxLength={100}
                        value={formData.nomeFantasia || ''}
                        onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ</label>
                      <input
                        required
                        maxLength={18}
                        value={formData.cnpj || ''}
                        onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                      <input
                        maxLength={15}
                        value={formData.telefone || ''}
                        onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Placa</label>
                      <input
                        required
                        disabled={isEditing}
                        value={formData.plate || ''}
                        onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Modelo</label>
                      <input
                        required
                        value={formData.model || ''}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                      <input
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Centro de Custo</label>
                      <input
                        value={formData.costCenter || ''}
                        onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                      <input
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-8 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-[2] py-5 bg-primary text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
                  {isEditing ? 'Salvar Alteracoes' : 'Finalizar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
