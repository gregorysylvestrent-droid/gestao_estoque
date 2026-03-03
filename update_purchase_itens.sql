BEGIN;
SET client_encoding = 'UTF8';
UPDATE purchase_orders 
SET quotes =
'[
    {
        "id": "Q-082923 - 01-1772203787911",
        "items": [
            {
                "sku": "7469",
                "leadTime": "7 dias",
                "unitPrice": 3000
            }
        ],
        "notes": "REPARO DA TURBINA",
        "quotedAt": "27/02/2026, 11:49:47",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "082923 - 01",
        "isSelected": true,
        "totalValue": 3000,
        "validUntil": "2026-03-06",
        "vendorName": "J. P. DA SILVA"
    },
    {
        "id": "Q-001279 - 01-1772203787912",
        "items": [
            {
                "sku": "7469",
                "leadTime": "7 dias",
                "unitPrice": 14677.77
            }
        ],
        "notes": "TURBINA NOVA 30 DIAS PARA CHEGAR",
        "quotedAt": "27/02/2026, 11:49:47",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "001279 - 01",
        "isSelected": false,
        "totalValue": 14677.77,
        "validUntil": "2026-03-26",
        "vendorName": "TOYOLEX AUTOS LTDA"
    },
    {
        "id": "Q-089532 - 01-1772203787913",
        "items": [
            {
                "sku": "7469",
                "leadTime": "7 dias",
                "unitPrice": 6500
            }
        ],
        "notes": "SUCATA | SUCATÃO",
        "quotedAt": "27/02/2026, 11:49:47",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "089532 - 01",
        "isSelected": false,
        "totalValue": 6500,
        "validUntil": "2026-02-26",
        "vendorName": "B. L. TELES MARQUES LTDA"
    },
    {
        "id": "Q-087525 - 01-1772203787914",
        "items": [
            {
                "sku": "16336",
                "leadTime": "7 dias",
                "unitPrice": 120
            }
        ],
        "notes": "",
        "quotedAt": "27/02/2026, 11:49:47",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "087525 - 01",
        "isSelected": true,
        "totalValue": 120,
        "validUntil": "29/03/2026",
        "vendorName": "LUMI COMERCIO VAREJISTA DE PECAS AUTOMOTIVO LTDA"
    }
]'::jsonb
WHERE id = 'PO-2026-878';
COMMIT;