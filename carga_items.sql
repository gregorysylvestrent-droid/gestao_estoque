BEGIN;

UPDATE purchase_orders

SET items = '[{"qty": 15,"sku": "16637","name": "RELE AUXILIAR REVESOR 05 TERMINAIS C/SUPORTE 40 /10A 12V","price": 0},{"qty": 50,"sku": "20093","name": "PORTA FUSIVEL LAMINA","price": 0},{"qty": 100,"sku": "6721","name": "FUSIVEL LAMINA 10 AMP","price": 0}]'::jsonb

WHERE id='PO-2026-5836';

COMMIT;