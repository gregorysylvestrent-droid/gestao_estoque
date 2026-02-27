BEGIN;
SET client_encoding = 'UTF8';
UPDATE purchase_orders 
SET quotes =
'[
    {
        "id": "Q-083909 - 01-1772128729337",
        "items": [
            {
                "sku": "0000018",
                "leadTime": "7 dias",
                "unitPrice": 19.6
            },
            {
                "sku": "0000031",
                "leadTime": "7 dias",
                "unitPrice": 93.1
            }
        ],
        "notes": "",
        "quotedAt": "26/02/2026, 14:58:49",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "083909 - 01",
        "isSelected": true,
        "totalValue": 112.69999999999999,
        "validUntil": "2026-02-26",
        "vendorName": "PMZ DISTRIBUIDORA S.A"
    },
    {
        "id": "Q-087982 - 01-1772128729338",
        "items": [
            {
                "sku": "0000018",
                "leadTime": "7 dias",
                "unitPrice": 20.66
            },
            {
                "sku": "0000033",
                "leadTime": "7 dias",
                "unitPrice": 22.68
            }
        ],
        "notes": "",
        "quotedAt": "26/02/2026, 14:58:49",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "087982 - 01",
        "isSelected": false,
        "totalValue": 43.34,
        "validUntil": "2026-02-26",
        "vendorName": "FORTBRAS AUTOPECAS S.A."
    },
    {
        "id": "Q-083175 - 01-1772128729339",
        "items": [
            {
                "sku": "0000018",
                "leadTime": "7 dias",
                "unitPrice": 24.83
            },
            {
                "sku": "0000031",
                "leadTime": "7 dias",
                "unitPrice": 113.21
            },
            {
                "sku": "0000033",
                "leadTime": "7 dias",
                "unitPrice": 120.03
            }
        ],
        "notes": "",
        "quotedAt": "26/02/2026, 14:58:49",
        "quotedBy": "Gregory Sylvestre",
        "vendorId": "083175 - 01",
        "isSelected": false,
        "totalValue": 258.07,
        "validUntil": "2026-02-26",
        "vendorName": "SRJ DISTRIBUIDORA DE AUTO PEÇAS LTDA"
    }
]'::jsonb
WHERE id = 'PO-2026-1558';
COMMIT;