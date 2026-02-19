
export enum Screen {
  PAINEL = 'PAINEL',
  VEICULOS = 'VEICULOS',
  MULTAS = 'MULTAS',
  TACOGRAFO = 'TACOGRAFO',
  RNTRC = 'RNTRC',
  RELATORIOS = 'RELATORIOS',
  PERFIL = 'PERFIL',
  FISCAL = 'FISCAL',
  CONDUTORES = 'CONDUTORES'
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  type: 'truck' | 'car' | 'van';
  status: {
    crlv: 'REGULAR' | 'VENCIDO' | 'PENDENTE';
    ipva: 'PAGO' | 'VENCIDO' | 'PENDENTE';
    insurance: 'VALIDO' | 'VENCIDO';
    licensing: 'REGULAR' | 'PENDENTE' | 'VENCIDO';
  };
}

export interface Tachograph {
  id: string;
  vehiclePlate: string;
  certificateNumber: string;
  lastCalibration: string;
  nextCalibration: string;
  feeValue: number;
  status: 'REGULAR' | 'VENCIDO' | 'ALERTA';
}

export interface RNTRCRegistration {
  id: string;
  name: string;
  document: string; // CNPJ/CPF
  rntrcNumber: string;
  category: 'ETC' | 'TAC' | 'CTC';
  expiration: string;
  status: 'ATIVO' | 'PENDENTE' | 'VENCIDO';
  feeValue: number;
}
