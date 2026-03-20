BEGIN;
SET client_encoding = 'UTF8';
INSERT INTO movements 
(sku,product_name,type,quantity,"user",location,reason,order_id,warehouse_id)
VALUES
('0000173','JUNTA DA TAMPA DE VÁLVULAS FIAT MOBI MOTOR EVO TAMPA DE ALUMÍNIO 1.0','entrada',5,'vitoria.zuani@nortetech.net','DOCA-01','Entrada via Recebimento de PO-2026-8358','PO-2026-8358','ARMZ28'),
('0000174','JUNTA CABEÇOTE FIAT STRADA 1.4 2021-2025 EVO','entrada',5,'vitoria.zuani@nortetech.net','DOCA-01','Entrada via Recebimento de PO-2026-8358','PO-2026-8358','ARMZ28'),
('17213','BRAÇO ARTICULA. AXIAL D. HIDRAU - PALIO/STRADA/ANO 10(...)','entrada',8,'vitoria.zuani@nortetech.net','DOCA-01','Entrada via Recebimento de PO-2026-8358','PO-2026-8358','ARMZ28');
COMMIT;
