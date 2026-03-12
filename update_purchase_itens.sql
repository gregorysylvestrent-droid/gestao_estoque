BEGIN;
SET client_encoding = 'UTF8';
UPDATE purchase_orders 
SET items =
'[
    {
      "qty": 10,
      "sku": "0000160",
      "name": "BARRA AXIAL DIREÇAO PARA FIAT NOVA STRADA 2021 2022 2023",
      "price": 0
    },
    {
      "qty": 10,
      "sku": "0000161",
      "name": "PAR TERMINAL AXIAL DIANTEIRO NOVO UNO PALIO GRAND SIENA MOBI",
      "price": 0
    },
    {
      "qty": 8,
      "sku": "0000162",
      "name": "COXIM MOTOR DIREITO NOVA STRADA 1.3 8V FLEX 4 CIL 2020 2025",
      "price": 0
    },
    {
      "qty": 10,
      "sku": "0000163",
      "name": "PIVO SUSPENSÃO DIANTEIRA LD STRADA 1.3/1.4 8V APÓS 2021",
      "price": 0
    },
    {
      "qty": 10,
      "sku": "0000164",
      "name": "PIVO SUSPENSÃO DIANTEIRA LE STRADA 1.3/1.4 8V APÓS 2021",
      "price": 0
    },
    {
      "qty": 8,
      "sku": "0000165",
      "name": "CUBO RODA DIANTEIRO COM ROLAMENTOS S10 TRAILBLAZER 2017-2024",
      "price": 0
    },
    {
      "qty": 6,
      "sku": "0000166",
      "name": "VENTILADOR DE CABINE CX EVAPORADORA VW GOL G5 G6, SAVEIRO",
      "price": 0
    },
    {
      "qty": 1,
      "sku": "0000167",
      "name": "MOTOR VENTILADOR AR CONDICIONADO S10 / BLAZER 2019 2020 2021",
      "price": 0
    },
    {
      "qty": 6,
      "sku": "0000168",
      "name": "5 POLIAS DA CORREIA ALTERNADOR S10 2.8 C/ DIR-ELÉTRICA 2021 EM DIANTE",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000169",
      "name": "RETENTOR COMANDO VÁLVULA VW 1.6 POWER 8V SAVEIRO",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000170",
      "name": "RETENTOR + SELO COMANDO DE VÁLVULAS NOVA S10 2.8 2019 2020",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000171",
      "name": "RETENTOR VIRABREQUIM S10/TRAILBLAZER 2.8 16V 12/ SABÓ 5831",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000172",
      "name": "SENSOR DE PRESSÃO DE ÓLEO 0,3-0,6 BAR - ORIGINAL VW SAVEIRO G5 G6 G7 1.0 1.6",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000173",
      "name": "JUNTA DA TAMPA DE VÁLVULAS FIAT MOBI MOTOR EVO TAMPA DE ALUMÍNIO 1.0",
      "price": 0
    },
    {
      "qty": 5,
      "sku": "0000174",
      "name": "JUNTA CABEÇOTE FIAT STRADA 1.4 2021-2025 EVO",
      "price": 0
    },
    {
      "qty": 6,
      "sku": "0000175",
      "name": "JUNTAS DESLIZANTE BOLACHÃO DO CÂMBIO SAVEIRO 1.6",
      "price": 0
    },
    {
      "qty": 3,
      "sku": "0000153",
      "name": "ATUADOR DA EMBREAGEM - RANGER",
      "price": 0
    },
    {
      "qty": 8,
      "sku": "0000098",
      "name": "ROLAMENTO DIANTEIRO COMPLETO C/ ROLAMENTO HILUX",
      "price": 0
    },
    {
      "qty": 8,
      "sku": "17213",
      "name": "BRAÇO ARTICULA. AXIAL D. HIDRAU - PALIO/STRADA/ANO 10(...)",
      "price": 0
    },
    {
      "qty": 10,
      "sku": "0000043",
      "name": "JUNTA DA TAMPA DE VALVULAS FIAT STRADA MOTOR EVO 1.0 1.3 1.4",
      "price": 0
    }
  ]'
WHERE id = 'PO-2026-8358';
COMMIT;