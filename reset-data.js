// Script para resetar dados no localStorage
// Cole isso no console do navegador (F12)

function resetLogiWMSData() {
  const setData = (key, data) => {
    localStorage.setItem(logiwms_, JSON.stringify(data));
  };

  setData('warehouses', [
    { id: 'ARMZ28', name: 'CD Manaus', description: 'Centro Manaus', location: 'Manaus - AM', is_active: true, manager_name: 'João', manager_email: 'joao@logiwms.com' },
    { id: 'ARMZ33', name: 'CD São Paulo', description: 'Centro SP', location: 'São Paulo - SP', is_active: true, manager_name: 'Maria', manager_email: 'maria@logiwms.com' }
  ]);
  
  setData('inventory', [
    { sku: 'SKU-000028', name: 'Item Teste 28', location: 'A-01-01', batch: 'B001', expiry: '2026-12-31', quantity: 50, status: 'disponivel', image_url: '', category: 'Teste', unit: 'UN', min_qty: 10, max_qty: 100, lead_time: 7, safety_stock: 5, warehouse_id: 'ARMZ28' },
    { sku: 'SKU-000030', name: 'Item Teste 30', location: 'A-01-02', batch: 'B002', expiry: '2026-12-31', quantity: 25, status: 'disponivel', image_url: '', category: 'Teste', unit: 'UN', min_qty: 5, max_qty: 50, lead_time: 7, safety_stock: 5, warehouse_id: 'ARMZ28' },
    { sku: 'SKU-000011', name: 'Pneu 295/80', location: 'B-02-01', batch: 'B003', expiry: '2026-12-31', quantity: 100, status: 'disponivel', image_url: '', category: 'Pneus', unit: 'UN', min_qty: 20, max_qty: 200, lead_time: 14, safety_stock: 10, warehouse_id: 'ARMZ28' },
    { sku: 'OLEO-15W40', name: 'Óleo Motor 15W40', location: 'C-01-01', batch: 'B004', expiry: '2027-06-30', quantity: 200, status: 'disponivel', image_url: '', category: 'Óleo', unit: 'L', min_qty: 50, max_qty: 500, lead_time: 10, safety_stock: 25, warehouse_id: 'ARMZ28' },
    { sku: 'FILT-001', name: 'Filtro de Óleo', location: 'C-01-02', batch: 'B005', expiry: '2027-12-31', quantity: 80, status: 'disponivel', image_url: '', category: 'Filtros', unit: 'UN', min_qty: 15, max_qty: 150, lead_time: 10, safety_stock: 10, warehouse_id: 'ARMZ28' }
  ]);
  
  setData('vehicles', [
    { plate: 'BGM-1001', model: 'Volvo FH 540', type: 'Caminhão', status: 'Disponível', last_maintenance: '15/01/2026', cost_center: 'OPS-CD' },
    { plate: 'CHN-1002', model: 'Mercedes Actros', type: 'Carreta', status: 'Disponível', last_maintenance: '20/01/2026', cost_center: 'MAN-OFI' },
    { plate: 'DIO-1003', model: 'Volvo FH 460', type: 'Utilitário', status: 'Em Viagem', last_maintenance: '10/01/2026', cost_center: 'OPS-CD' },
    { plate: 'ELQ-1004', model: 'Scania R450', type: 'Caminhão', status: 'Manutenção', last_maintenance: '25/01/2026', cost_center: 'OPS-CD' }
  ]);
  
  setData('material_requests', [
    { id: 'REQ-6037', sku: 'SKU-000028', name: 'Item Teste 28', qty: 2, plate: 'BGM-1001', dept: 'OF-OPERAÇÕES', priority: 'normal', status: 'aprovacao', created_at: new Date().toISOString(), cost_center: 'OPS-CD', warehouse_id: 'ARMZ28' },
    { id: 'REQ-TEST-000041', sku: 'SKU-000030', name: 'Item Teste 30', qty: 1, plate: 'CHN-1002', dept: 'MAN-OFICINA', priority: 'alta', status: 'separacao', created_at: new Date().toISOString(), cost_center: 'MAN-OFI', warehouse_id: 'ARMZ28' },
    { id: 'REQ-OLD-0001', sku: 'SKU-000011', name: 'Pneu 295/80', qty: 5, plate: 'DIO-1003', dept: 'OF-OPERAÇÕES', priority: 'normal', status: 'entregue', created_at: new Date().toISOString(), cost_center: 'OPS-CD', warehouse_id: 'ARMZ28' }
  ]);
  
  setData('users', [
    { id: 'admin', name: 'Administrador', email: 'admin@logiwms.com', role: 'admin', status: 'active', modules: ['warehouse', 'workshop'], allowed_warehouses: ['ARMZ28', 'ARMZ33'], password: 'admin' },
    { id: 'oper', name: 'Operador', email: 'oper@logiwms.com', role: 'operador', status: 'active', modules: ['warehouse'], allowed_warehouses: ['ARMZ28'], password: 'oper' }
  ]);
  
  setData('movements', [
    { id: 'M001', timestamp: new Date().toISOString(), type: 'entrada', sku: 'SKU-000028', product_name: 'Item Teste 28', quantity: 50, user: 'Sistema', location: 'A-01-01', reason: 'Carga inicial', warehouse_id: 'ARMZ28' },
    { id: 'M002', timestamp: new Date().toISOString(), type: 'entrada', sku: 'SKU-000030', product_name: 'Item Teste 30', quantity: 25, user: 'Sistema', location: 'A-01-02', reason: 'Carga inicial', warehouse_id: 'ARMZ28' }
  ]);
  
  setData('purchase_orders', [
    { id: 'PO-001', vendor: 'Fornecedor A', request_date: new Date().toISOString(), status: 'requisicao', priority: 'urgente', total: 5000, requester: 'Sistema', items: [{ sku: 'SKU-000028', name: 'Item Teste 28', qty: 20, price: 100 }], warehouse_id: 'ARMZ28', approval_history: [] },
    { id: 'PO-002', vendor: 'Fornecedor B', request_date: new Date().toISOString(), status: 'aprovado', priority: 'normal', total: 3000, requester: 'João Silva', items: [{ sku: 'OLEO-15W40', name: 'Óleo Motor 15W40', qty: 50, price: 30 }], warehouse_id: 'ARMZ28', approval_history: [] }
  ]);
  
  setData('cyclic_batches', []);
  
  console.log('? Dados restaurados! Recarregue a página (F5)');
  return 'Dados resetados com sucesso!';
}

// Executar automaticamente
resetLogiWMSData();
