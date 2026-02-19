import { describe, expect, it } from 'vitest';
import { normalizeWorkOrders } from '../utils/workshopSanitizers';

describe('normalizeWorkOrders', () => {
  it('normaliza estruturas incompletas sem lançar exceções', () => {
    const result = normalizeWorkOrders(
      [
        {
          id: null,
          vehicle_plate: null,
          status: 'em_execucao',
          type: 'corretiva',
          priority: 'alta',
          services: null,
          parts: undefined,
        },
      ],
      { warehouseId: 'ARMZ1', createdBy: 'Sistema' }
    );

    expect(result).toHaveLength(1);
    expect(result[0].services).toEqual([]);
    expect(result[0].parts).toEqual([]);
    expect(result[0].warehouseId).toBe('ARMZ1');
  });

  it('usa valores padrao quando campos sao invalidos', () => {
    const result = normalizeWorkOrders(
      [
        {
          id: 'OS-TESTE',
          vehicle_plate: 'AAA-0001',
          status: 'invalido',
          type: 'invalido',
          priority: 'invalido',
          services: [{ description: 'x', category: 'invalido' }],
          parts: [{ sku: 'P1', name: 'Peca', qty_requested: '5' }],
        },
      ],
      { warehouseId: 'ARMZ1', createdBy: 'Sistema' }
    );

    expect(result[0].status).toBe('aguardando');
    expect(result[0].type).toBe('corretiva');
    expect(result[0].priority).toBe('normal');
    expect(result[0].services[0].category).toBe('outros');
    expect(result[0].parts[0].qtyRequested).toBe(5);
  });
});
