// Sure Seal Production System — Standalone Demo Mode
// Provides full in-memory / localStorage database and Supabase mock
// Allows testing all features (Formulas, Batches, Stock, Receiving, Costing, Reports)
// without needing a Supabase database connection.

(function() {
  const STORAGE_KEY = 'ss_demo_store_v2';
  const ROLE_KEY = 'ss-demo-role';

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(target, source) {
    const out = Array.isArray(target) ? [...target] : { ...target };
    for (const k of Object.keys(source || {})) {
      const sv = source[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], sv);
      } else {
        out[k] = sv;
      }
    }
    return out;
  }

  function getInitialDemoStore() {
    return {
      materials: {
        'RM-001': { id: 'RM-001', code: 'RM-001', type: 'raw', unit: 'kg', reorder: 100, location: 'Flammables Store Bay 1', active: true },
        'RM-002': { id: 'RM-002', code: 'RM-002', type: 'raw', unit: 'kg', reorder: 500, location: 'Solvent Tank 2', active: true },
        'RM-003': { id: 'RM-003', code: 'RM-003', type: 'raw', unit: 'kg', reorder: 250, location: 'Flammables Store Bay 3', active: true },
        'RM-004': { id: 'RM-004', code: 'RM-004', type: 'raw', unit: 'kg', reorder: 100, location: 'Chemical Rack A2', active: true },
        'RM-005': { id: 'RM-005', code: 'RM-005', type: 'raw', unit: 'kg', nonStock: true, location: 'Mains DI System', active: true },
        'RM-006': { id: 'RM-006', code: 'RM-006', type: 'raw', unit: 'kg', reorder: 200, location: 'Chemical Rack B1', active: true },
        'RM-007': { id: 'RM-007', code: 'RM-007', type: 'raw', unit: 'kg', reorder: 150, location: 'Dry Store Pallet 4', active: true },
        'RM-008': { id: 'RM-008', code: 'RM-008', type: 'raw', unit: 'kg', reorder: 25, location: 'Fragrance Locker', active: true },
        'RM-009': { id: 'RM-009', code: 'RM-009', type: 'raw', unit: 'kg', reorder: 300, location: 'Gas Compound', active: true },
        'RM-010': { id: 'RM-010', code: 'RM-010', type: 'raw', unit: 'kg', reorder: 200, location: 'Dry Store Pallet 2', active: true },

        'PK-001': { id: 'PK-001', code: 'PK-001', type: 'pack', unit: 'ea', reorder: 500, location: 'Packaging Bay 1', desc: '1L natural HDPE bottle 28/410', active: true },
        'PK-002': { id: 'PK-002', code: 'PK-002', type: 'pack', unit: 'ea', reorder: 1000, location: 'Packaging Bin 12', desc: '28/410 child resistant cap white', active: true },
        'PK-003': { id: 'PK-003', code: 'PK-003', type: 'pack', unit: 'ea', reorder: 200, location: 'Packaging Bay 2', desc: '4L natural HDPE jerry can', active: true },
        'PK-004': { id: 'PK-004', code: 'PK-004', type: 'pack', unit: 'ea', reorder: 400, location: 'Packaging Bin 14', desc: '38mm tamper evident screw cap red', active: true },
        'PK-005': { id: 'PK-005', code: 'PK-005', type: 'pack', unit: 'ea', reorder: 40, location: 'Drum Yard Bay 4', desc: '20L blue HDPE drum with bung', active: true },
        'PK-006': { id: 'PK-006', code: 'PK-006', type: 'pack', unit: 'ea', reorder: 400, location: 'Packaging Bay 3', desc: '750ml clear PET trigger bottle 28/400', active: true },
        'PK-007': { id: 'PK-007', code: 'PK-007', type: 'pack', unit: 'ea', reorder: 500, location: 'Packaging Bin 18', desc: 'Heavy duty trigger spray head white/blue', active: true },
        'PK-008': { id: 'PK-008', code: 'PK-008', type: 'pack', unit: 'ea', reorder: 800, location: 'Aerosol Bay 1', desc: '300g aerosol tinplate can', active: true },
        'PK-009': { id: 'PK-009', code: 'PK-009', type: 'pack', unit: 'ea', reorder: 1000, location: 'Aerosol Bin 2', desc: '1-inch aerosol valve and actuator button', active: true },

        'LB-001': { id: 'LB-001', code: 'LB-001', type: 'label', unit: 'ea', reorder: 600, location: 'Label Cabinet Shelf 1', desc: 'GTS 1L front & back roll labels', active: true },
        'LB-002': { id: 'LB-002', code: 'LB-002', type: 'label', unit: 'ea', reorder: 250, location: 'Label Cabinet Shelf 2', desc: 'GTS 4L front & back roll labels', active: true },
        'LB-003': { id: 'LB-003', code: 'LB-003', type: 'label', unit: 'ea', reorder: 80, location: 'Label Cabinet Shelf 3', desc: 'GTS 20L drum warning & barcode label', active: true },
        'LB-004': { id: 'LB-004', code: 'LB-004', type: 'label', unit: 'ea', reorder: 1000, location: 'Label Cabinet Shelf 4', desc: 'QDA 300g aerosol body wrap label', active: true },

        'BX-001': { id: 'BX-001', code: 'BX-001', type: 'box', unit: 'ea', reorder: 80, location: 'Pallet Racking C1', dims: '380 × 285 × 250 mm', desc: 'Carton 12 x 1L heavy duty RSC', active: true },
        'BX-002': { id: 'BX-002', code: 'BX-002', type: 'box', unit: 'ea', reorder: 50, location: 'Pallet Racking C2', dims: '390 × 390 × 300 mm', desc: 'Carton 4 x 4L heavy duty RSC', active: true },
        'BX-003': { id: 'BX-003', code: 'BX-003', type: 'box', unit: 'ea', reorder: 60, location: 'Pallet Racking C3', dims: '360 × 270 × 280 mm', desc: 'Carton 12 x 750ml trigger spray RSC', active: true },
        'BX-004': { id: 'BX-004', code: 'BX-004', type: 'box', unit: 'ea', reorder: 100, location: 'Pallet Racking C4', dims: '270 × 205 × 240 mm', desc: 'Carton 12 x 300g aerosol RSC', active: true }
      },

      secret_materials: {
        'RM-001': { id: 'RM-001', name: 'Fluoropolymer Resin 20% Active Solids', supplier: 'Chemours / Brenntag', supplierCode: 'CP-FL-20', cost: 48.50 },
        'RM-002': { id: 'RM-002', name: 'Dearomatised Hydrocarbon Solvent (D60)', supplier: 'Shell Chemicals', supplierCode: 'SH-D60', cost: 3.80 },
        'RM-003': { id: 'RM-003', name: 'Isopropanol Anhydrous 99.8%', supplier: 'Redox Pty Ltd', supplierCode: 'RDX-IPA-A', cost: 2.90 },
        'RM-004': { id: 'RM-004', name: 'Polysiloxane Hydrophobic Booster Emulsion', supplier: 'Wacker Silicones', supplierCode: 'WCK-SIL-88', cost: 22.40 },
        'RM-005': { id: 'RM-005', name: 'Deionised Water (Reverse Osmosis)', supplier: 'In-House System', supplierCode: 'DI-01', cost: 0.05 },
        'RM-006': { id: 'RM-006', name: 'Non-ionic Surfactant Blend 90%', supplier: 'Huntsman Corporation', supplierCode: 'HNT-SRF-90', cost: 5.60 },
        'RM-007': { id: 'RM-007', name: 'Citric Acid Anhydrous USP Food Grade', supplier: 'Jungbunzlauer', supplierCode: 'JGB-CA-ANH', cost: 3.20 },
        'RM-008': { id: 'RM-008', name: 'Citrus Terpene Fragrance Oil Essential', supplier: 'Symrise Australia', supplierCode: 'SYM-CIT-08', cost: 38.00 },
        'RM-009': { id: 'RM-009', name: 'Hydrocarbon Aerosol Propellant (A-48)', supplier: 'A-Gas Australia', supplierCode: 'AGS-A48', cost: 4.10 },
        'RM-010': { id: 'RM-010', name: 'Micro-fine Calcined Aluminium Oxide 15um', supplier: 'Almatis Pty Ltd', supplierCode: 'ALM-AO-15', cost: 8.90 },

        'PK-001': { id: 'PK-001', name: '1L Natural HDPE Bottle', supplier: 'Viscount Plastics', supplierCode: 'VP-1L-NAT', cost: 0.62 },
        'PK-002': { id: 'PK-002', name: '28/410 Child Resistant Cap White', supplier: 'Cospak Pty Ltd', supplierCode: 'CSP-CRC-28', cost: 0.18 },
        'PK-003': { id: 'PK-003', name: '4L Natural HDPE Jerry Can', supplier: 'Pact Group', supplierCode: 'PCT-4L-JC', cost: 1.85 },
        'PK-004': { id: 'PK-004', name: '38mm TE Cap Red', supplier: 'Pact Group', supplierCode: 'PCT-38TE-R', cost: 0.32 },
        'PK-005': { id: 'PK-005', name: '20L Blue HDPE Drum 58mm Bung', supplier: 'Viper Packaging', supplierCode: 'VIP-20L-DR', cost: 8.40 },
        'PK-006': { id: 'PK-006', name: '750ml Clear PET Trigger Bottle', supplier: 'Plasdene Glass-Pak', supplierCode: 'PLS-750-TR', cost: 0.55 },
        'PK-007': { id: 'PK-007', name: 'Canyon Heavy Duty Trigger Sprayer', supplier: 'Canyon Australia', supplierCode: 'CYN-HD-28', cost: 0.48 },
        'PK-008': { id: 'PK-008', name: '300g Tinplate Aerosol Can', supplier: 'Jamestrong Packaging', supplierCode: 'JMS-300-TP', cost: 0.72 },
        'PK-009': { id: 'PK-009', name: 'Precision Aerosol Valve + Actuator', supplier: 'Precision Valve', supplierCode: 'PRC-VLV-1', cost: 0.25 },

        'LB-001': { id: 'LB-001', name: 'GTS 1L Front/Back Roll Labels', supplier: 'Impresstik Labels', supplierCode: 'IMP-GTS-1L', cost: 0.22 },
        'LB-002': { id: 'LB-002', name: 'GTS 4L Front/Back Roll Labels', supplier: 'Impresstik Labels', supplierCode: 'IMP-GTS-4L', cost: 0.35 },
        'LB-003': { id: 'LB-003', name: 'GTS 20L Drum Warning Label', supplier: 'Impresstik Labels', supplierCode: 'IMP-GTS-20L', cost: 0.85 },
        'LB-004': { id: 'LB-004', name: 'QDA 300g Aerosol Body Wrap Label', supplier: 'Impresstik Labels', supplierCode: 'IMP-QDA-300', cost: 0.28 },

        'BX-001': { id: 'BX-001', name: 'Carton 12x1L Double Flute RSC', supplier: 'Opal ANZ', supplierCode: 'OPL-BX-121L', cost: 1.40 },
        'BX-002': { id: 'BX-002', name: 'Carton 4x4L Heavy Duty RSC', supplier: 'Opal ANZ', supplierCode: 'OPL-BX-44L', cost: 1.95 },
        'BX-003': { id: 'BX-003', name: 'Carton 12x750ml Divider RSC', supplier: 'Opal ANZ', supplierCode: 'OPL-BX-12TR', cost: 1.65 },
        'BX-004': { id: 'BX-004', name: 'Carton 12x300g Aerosol RSC', supplier: 'Opal ANZ', supplierCode: 'OPL-BX-12AER', cost: 1.35 }
      },

      formulas: {
        'F-GTS-01': {
          id: 'F-GTS-01',
          name: 'Grout, Tile & Stone Cleaner Base (Concentrate)',
          version: 1,
          notes: 'Target pH: 2.8 - 3.2. Target SG: 1.025 ± 0.005 @ 20°C. Clear pale yellow liquid. Mix at ambient temperature.',
          lines: [
            { rm: 'RM-005', pct: '75.000', note: 'Charge bulk DI water to mix tank at ambient' },
            { rm: 'RM-007', pct: '6.000', note: 'Add citric acid slowly under medium agitation until dissolved' },
            { rm: 'RM-006', pct: '14.000', note: 'Add non-ionic surfactant blend under low shear to avoid foaming' },
            { rm: 'RM-003', pct: '4.500', note: 'Add isopropanol solvent; verify temperature < 30°C' },
            { rm: 'RM-008', pct: '0.500', note: 'Add citrus fragrance, mix 15 mins until uniform and clear' }
          ]
        },
        'F-QDA-01': {
          id: 'F-QDA-01',
          name: 'Quick Drying Aerosol Sealer Active Bulk',
          version: 1,
          notes: 'Flammable mixture. Earth all equipment. Target active solids: 10.0 ± 0.5%. Gas under hood.',
          lines: [
            { rm: 'RM-002', pct: '55.000', note: 'Charge dearomatised hydrocarbon to sealed jacketed vessel' },
            { rm: 'RM-001', pct: '25.000', note: 'Add fluoropolymer active resin solution slowly under N2 purge' },
            { rm: 'RM-004', pct: '20.000', note: 'Add polysiloxane hydrophobic booster, blend 20 min' }
          ]
        },
        'F-SC-01': {
          id: 'F-SC-01',
          name: 'Sure Clean Porcelain Paste Cleaner',
          version: 1,
          notes: 'Viscous white suspension paste. Hegman grind gauge < 25 microns.',
          lines: [
            { rm: 'RM-005', pct: '38.000', note: 'Charge water to high-viscosity paste mixer' },
            { rm: 'RM-006', pct: '15.000', note: 'Blend in surfactant blend' },
            { rm: 'RM-010', pct: '45.000', note: 'Sift abrasive powder slowly under high torque' },
            { rm: 'RM-008', pct: '2.000', note: 'Blend fragrance and preservative' }
          ]
        }
      },

      products: {
        'GTS1U': {
          id: 'GTS1U',
          code: 'GTS1U',
          name: 'Grout, Tile & Stone Cleaner Concentrate 1L',
          formula: 'F-GTS-01',
          fillKg: 1.025,
          reorder: 48,
          shelfMonths: 36,
          packaging: [{ rm: 'PK-001', qty: 1 }, { rm: 'PK-002', qty: 1 }, { rm: 'LB-001', qty: 1 }],
          box: 'BX-001',
          perBox: 12,
          lossPct: 2.5,
          active: true
        },
        'GTS1C': {
          id: 'GTS1C',
          code: 'GTS1C',
          name: 'Grout, Tile & Stone Cleaner Concentrate 1L (Carton of 12)',
          packOf: 'GTS1U',
          perPack: 12,
          active: true
        },
        'GTS4U': {
          id: 'GTS4U',
          code: 'GTS4U',
          name: 'Grout, Tile & Stone Cleaner Concentrate 4L',
          formula: 'F-GTS-01',
          fillKg: 4.10,
          reorder: 24,
          shelfMonths: 36,
          packaging: [{ rm: 'PK-003', qty: 1 }, { rm: 'PK-004', qty: 1 }, { rm: 'LB-002', qty: 1 }],
          box: 'BX-002',
          perBox: 4,
          lossPct: 2.0,
          active: true
        },
        'GTS4C': {
          id: 'GTS4C',
          code: 'GTS4C',
          name: 'Grout, Tile & Stone Cleaner Concentrate 4L (Carton of 4)',
          packOf: 'GTS4U',
          perPack: 4,
          active: true
        },
        'GTS20D': {
          id: 'GTS20D',
          code: 'GTS20D',
          name: 'Grout, Tile & Stone Cleaner Concentrate 20L Drum',
          formula: 'F-GTS-01',
          fillKg: 20.5,
          reorder: 10,
          shelfMonths: 36,
          packaging: [{ rm: 'PK-005', qty: 1 }, { rm: 'LB-003', qty: 1 }],
          lossPct: 1.5,
          active: true
        },
        'GTS750U': {
          id: 'GTS750U',
          code: 'GTS750U',
          name: 'Grout, Tile & Stone Cleaner Spray & Wipe 750ml',
          formula: 'F-GTS-01',
          fillKg: 0.765,
          reorder: 60,
          shelfMonths: 36,
          packaging: [{ rm: 'PK-006', qty: 1 }, { rm: 'PK-007', qty: 1 }, { rm: 'LB-001', qty: 1 }],
          box: 'BX-003',
          perBox: 12,
          lossPct: 3.0,
          active: true
        },
        'QDAU': {
          id: 'QDAU',
          code: 'QDAU',
          name: 'Grout, Tile & Stone Sealer Quick Drying Aerosol 300g',
          formula: 'F-QDA-01',
          fillKg: 0.300,
          reorder: 120,
          shelfMonths: 48,
          packaging: [{ rm: 'PK-008', qty: 1 }, { rm: 'PK-009', qty: 1 }, { rm: 'LB-004', qty: 1 }],
          box: 'BX-004',
          perBox: 12,
          lossPct: 4.0,
          active: true
        },
        'SC1U': {
          id: 'SC1U',
          code: 'SC1U',
          name: 'Sure Clean Porcelain Paste Cleaner 1L',
          formula: 'F-SC-01',
          fillKg: 1.35,
          reorder: 30,
          shelfMonths: 24,
          packaging: [{ rm: 'PK-001', qty: 1 }, { rm: 'PK-002', qty: 1 }],
          box: 'BX-001',
          perBox: 12,
          lossPct: 2.5,
          active: true
        }
      },

      secret_products: {
        '__rates': { id: '__rates', labourRate: 42.00, overheadKg: 0.95 },
        'GTS1U': { id: 'GTS1U', price: 12.10, labMin: 1.8 },
        'GTS1C': { id: 'GTS1C', price: 135.00 },
        'GTS4U': { id: 'GTS4U', price: 38.50, labMin: 2.5 },
        'GTS4C': { id: 'GTS4C', price: 145.00 },
        'GTS20D': { id: 'GTS20D', price: 165.00, labMin: 4.0 },
        'GTS750U': { id: 'GTS750U', price: 10.37, labMin: 1.5 },
        'QDAU': { id: 'QDAU', price: 21.90, labMin: 1.2 },
        'SC1U': { id: 'SC1U', price: 17.16, labMin: 2.2 }
      },

      lots: {
        'lot_rm1': { id: 'lot_rm1', rm: 'RM-001', lot: 'LOT-CHM-9021', qty: 250, qtyLeft: 180, received: '2026-10-15', expiry: '2027-10-15', site: 'main' },
        'lot_rm2': { id: 'lot_rm2', rm: 'RM-002', lot: 'LOT-SHL-4412', qty: 1200, qtyLeft: 840, received: '2026-10-10', expiry: '2028-10-10', site: 'main' },
        'lot_rm3': { id: 'lot_rm3', rm: 'RM-003', lot: 'LOT-RDX-2026-10', qty: 1000, qtyLeft: 720, received: '2026-10-12', expiry: '2028-10-12', site: 'main' },
        'lot_rm4': { id: 'lot_rm4', rm: 'RM-004', lot: 'LOT-WCK-1182', qty: 200, qtyLeft: 140, received: '2026-10-18', expiry: '2027-10-18', site: 'main' },
        'lot_rm6': { id: 'lot_rm6', rm: 'RM-006', lot: 'LOT-HNT-8723', qty: 500, qtyLeft: 340, received: '2026-10-05', expiry: '2027-10-05', site: 'main' },
        'lot_rm7': { id: 'lot_rm7', rm: 'RM-007', lot: 'LOT-JGB-3340', qty: 400, qtyLeft: 280, received: '2026-10-08', expiry: '2028-10-08', site: 'main' },
        'lot_rm8': { id: 'lot_rm8', rm: 'RM-008', lot: 'LOT-SYM-6712', qty: 50, qtyLeft: 38, received: '2026-10-14', expiry: '2027-10-14', site: 'main' },
        'lot_rm9': { id: 'lot_rm9', rm: 'RM-009', lot: 'LOT-AGS-5520', qty: 800, qtyLeft: 600, received: '2026-10-19', expiry: '2028-10-19', site: 'main' },
        'lot_rm10': { id: 'lot_rm10', rm: 'RM-010', lot: 'LOT-ALM-1029', qty: 500, qtyLeft: 410, received: '2026-10-11', expiry: '2028-10-11', site: 'main' },

        'lot_pk1': { id: 'lot_pk1', rm: 'PK-001', lot: 'LOT-VIS-1001', qty: 2000, qtyLeft: 1420, received: '2026-10-02', site: 'main' },
        'lot_pk2': { id: 'lot_pk2', rm: 'PK-002', lot: 'LOT-CSP-2044', qty: 3000, qtyLeft: 2200, received: '2026-10-02', site: 'main' },
        'lot_pk3': { id: 'lot_pk3', rm: 'PK-003', lot: 'LOT-PCT-3012', qty: 800, qtyLeft: 460, received: '2026-10-04', site: 'main' },
        'lot_pk4': { id: 'lot_pk4', rm: 'PK-004', lot: 'LOT-PCT-3015', qty: 1000, qtyLeft: 620, received: '2026-10-04', site: 'main' },
        'lot_pk5': { id: 'lot_pk5', rm: 'PK-005', lot: 'LOT-VIP-5011', qty: 150, qtyLeft: 84, received: '2026-10-06', site: 'main' },
        'lot_pk6': { id: 'lot_pk6', rm: 'PK-006', lot: 'LOT-PLS-6022', qty: 1200, qtyLeft: 710, received: '2026-10-09', site: 'main' },
        'lot_pk7': { id: 'lot_pk7', rm: 'PK-007', lot: 'LOT-CYN-7019', qty: 1500, qtyLeft: 940, received: '2026-10-09', site: 'main' },
        'lot_pk8': { id: 'lot_pk8', rm: 'PK-008', lot: 'LOT-JMS-8033', qty: 2400, qtyLeft: 1600, received: '2026-10-14', site: 'main' },
        'lot_pk9': { id: 'lot_pk9', rm: 'PK-009', lot: 'LOT-PRC-9044', qty: 3000, qtyLeft: 2100, received: '2026-10-14', site: 'main' },

        'lot_lb1': { id: 'lot_lb1', rm: 'LB-001', lot: 'LOT-IMP-101', qty: 2000, qtyLeft: 1250, received: '2026-10-05', site: 'main' },
        'lot_lb2': { id: 'lot_lb2', rm: 'LB-002', lot: 'LOT-IMP-102', qty: 1000, qtyLeft: 680, received: '2026-10-05', site: 'main' },
        'lot_lb3': { id: 'lot_lb3', rm: 'LB-003', lot: 'LOT-IMP-103', qty: 300, qtyLeft: 190, received: '2026-10-05', site: 'main' },
        'lot_lb4': { id: 'lot_lb4', rm: 'LB-004', lot: 'LOT-IMP-104', qty: 3000, qtyLeft: 2200, received: '2026-10-05', site: 'main' },

        'lot_bx1': { id: 'lot_bx1', rm: 'BX-001', lot: 'LOT-OPL-201', qty: 200, qtyLeft: 130, received: '2026-10-07', site: 'main' },
        'lot_bx2': { id: 'lot_bx2', rm: 'BX-002', lot: 'LOT-OPL-202', qty: 150, qtyLeft: 95, received: '2026-10-07', site: 'main' },
        'lot_bx3': { id: 'lot_bx3', rm: 'BX-003', lot: 'LOT-OPL-203', qty: 150, qtyLeft: 110, received: '2026-10-07', site: 'main' },
        'lot_bx4': { id: 'lot_bx4', rm: 'BX-004', lot: 'LOT-OPL-204', qty: 250, qtyLeft: 180, received: '2026-10-07', site: 'main' }
      },

      batches: {
        'SS-261028-01': {
          id: 'SS-261028-01',
          site: 'main',
          product: 'GTS1U',
          formula: 'F-GTS-01',
          fver: 1,
          date: '2026-10-28',
          sizeKg: 500,
          status: 'released',
          unitsPlanned: 480,
          unitsMade: 485,
          unitsLeft: 365,
          packs: { 'GTS1C': { left: 25, made: 30 } },
          lines: [
            { rm: 'RM-005', req: 375, act: 375, lot: 'ON-TAP' },
            { rm: 'RM-007', req: 30, act: 30.1, lot: 'LOT-JGB-3340' },
            { rm: 'RM-006', req: 70, act: 69.9, lot: 'LOT-HNT-8723' },
            { rm: 'RM-003', req: 22.5, act: 22.5, lot: 'LOT-RDX-2026-10' },
            { rm: 'RM-008', req: 2.5, act: 2.5, lot: 'LOT-SYM-6712' }
          ],
          pack: [
            { rm: 'PK-001', req: 480, per: 1 },
            { rm: 'PK-002', req: 480, per: 1 },
            { rm: 'LB-001', req: 480, per: 1 },
            { rm: 'BX-001', req: 40, per: 0, perBox: 12 }
          ],
          qc: { ph: '3.08', sg: '1.025', clarity: 'Pass - clear liquid', retainSample: 'Stored in Shelf B2', pass: true, approvedBy: 'Kevin' },
          crew: 2,
          hrs: 3.2,
          created: '2026-10-27T08:30:00Z',
          createdBy: 'Kevin'
        },
        'SS-261029-01': {
          id: 'SS-261029-01',
          site: 'main',
          product: 'GTS750U',
          formula: 'F-GTS-01',
          fver: 1,
          date: '2026-10-29',
          sizeKg: 400,
          status: 'qc',
          unitsPlanned: 500,
          unitsMade: 510,
          unitsLeft: 510,
          lines: [
            { rm: 'RM-005', req: 300, act: 300, lot: 'ON-TAP' },
            { rm: 'RM-007', req: 24, act: 24, lot: 'LOT-JGB-3340' },
            { rm: 'RM-006', req: 56, act: 56.2, lot: 'LOT-HNT-8723' },
            { rm: 'RM-003', req: 18, act: 18, lot: 'LOT-RDX-2026-10' },
            { rm: 'RM-008', req: 2, act: 2, lot: 'LOT-SYM-6712' }
          ],
          pack: [
            { rm: 'PK-006', req: 500, per: 1 },
            { rm: 'PK-007', req: 500, per: 1 },
            { rm: 'LB-001', req: 500, per: 1 },
            { rm: 'BX-003', req: 42, per: 0, perBox: 12 }
          ],
          qc: { ph: '3.12', sg: '1.024', clarity: 'Clear', holdReason: 'Awaiting 24-hr stability retain check' },
          crew: 2,
          hrs: 2.8,
          created: '2026-10-28T10:00:00Z',
          createdBy: 'Kevin'
        },
        'SS-261031-01': {
          id: 'SS-261031-01',
          site: 'main',
          product: 'GTS1U',
          formula: 'F-GTS-01',
          fver: 1,
          date: '2026-10-31',
          sizeKg: 600,
          status: 'inprod',
          unitsPlanned: 580,
          lines: [
            { rm: 'RM-005', req: 450, act: 450, lot: 'ON-TAP' },
            { rm: 'RM-007', req: 36, act: 36, lot: 'LOT-JGB-3340' },
            { rm: 'RM-006', req: 84, act: null, lot: '' },
            { rm: 'RM-003', req: 27, act: null, lot: '' },
            { rm: 'RM-008', req: 3, act: null, lot: '' }
          ],
          pack: [
            { rm: 'PK-001', req: 580, per: 1 },
            { rm: 'PK-002', req: 580, per: 1 },
            { rm: 'LB-001', req: 580, per: 1 },
            { rm: 'BX-001', req: 48, per: 0, perBox: 12 }
          ],
          created: '2026-10-30T14:00:00Z',
          createdBy: 'Kevin'
        },
        'SS-261102-01': {
          id: 'SS-261102-01',
          site: 'main',
          product: 'QDAU',
          formula: 'F-QDA-01',
          fver: 1,
          date: '2026-11-02',
          sizeKg: 350,
          status: 'planned',
          unitsPlanned: 1100,
          lines: [
            { rm: 'RM-002', req: 192.5, act: null, lot: '' },
            { rm: 'RM-001', req: 87.5, act: null, lot: '' },
            { rm: 'RM-004', req: 70, act: null, lot: '' }
          ],
          pack: [
            { rm: 'PK-008', req: 1100, per: 1 },
            { rm: 'PK-009', req: 1100, per: 1 },
            { rm: 'LB-004', req: 1100, per: 1 },
            { rm: 'BX-004', req: 92, per: 0, perBox: 12 }
          ],
          created: '2026-10-30T16:00:00Z',
          createdBy: 'Kevin'
        }
      },

      expected: {
        'exp_1': { id: 'exp_1', site: 'main', po: 'PO-4410', rm: 'RM-003', qty: 1000, received: 1000, status: 'received', due: '2026-10-25', closed: '2026-10-25' },
        'exp_2': { id: 'exp_2', site: 'main', po: 'PO-4415', rm: 'PK-001', qty: 2500, received: 1000, status: 'open', due: '2026-10-31', note: 'Viscount Plastics - 1000 received yesterday, balance due today' },
        'exp_3': { id: 'exp_3', site: 'main', po: 'PO-4418', rm: 'RM-001', qty: 200, received: 0, status: 'open', due: '2026-11-04', note: 'Chemours Fluoropolymer resin' }
      },

      requests: {
        'req_1': { id: 'req_1', site: 'main', rm: 'PK-001', qty: 500, need: '2026-10-31', status: 'open', why: 'Need bottles on floor for Batch SS-261031-01', created: '2026-10-31T08:30:00Z', createdBy: 'Production Floor Tablet' },
        'req_2': { id: 'req_2', site: 'main', rm: 'BX-001', qty: 50, need: '2026-10-31', status: 'open', why: 'Packaging floor cartons', created: '2026-10-31T09:00:00Z', createdBy: 'Production Floor Tablet' }
      },

      counts: {
        'cnt_1': { id: 'cnt_1', site: 'main', name: 'October End-of-Month Stocktake', status: 'closed', created: '2026-10-28T09:00:00Z', closed: '2026-10-28T17:00:00Z', scope: 'all' }
      },

      moves: {
        'mov_1': { id: 'mov_1', site: 'main', type: 'receive', kind: 'lot', code: 'RM-003', lot: 'LOT-RDX-2026-10', qty: 1000, at: '2026-10-25T11:20:00Z', by: 'Warehouse Team', ref: 'PO-4410' },
        'mov_2': { id: 'mov_2', site: 'main', type: 'batch_dispense', kind: 'lot', code: 'RM-003', lot: 'LOT-RDX-2026-10', qty: -22.5, at: '2026-10-28T09:15:00Z', by: 'Production Floor Tablet', ref: 'SS-261028-01' },
        'mov_3': { id: 'mov_3', site: 'main', type: 'batch_release', kind: 'fg', product: 'GTS1U', qty: 485, at: '2026-10-28T16:00:00Z', by: 'Kevin (Owner)', ref: 'SS-261028-01' },
        'mov_4': { id: 'mov_4', site: 'main', type: 'dispatch', kind: 'fg', product: 'GTS1U', qty: -120, at: '2026-10-30T14:30:00Z', by: 'Warehouse Team', ref: 'INV-8891 - National Tile Supplies' }
      },

      config: {
        'sites': {
          id: 'sites',
          list: [
            { id: 'main', name: 'Sydney Plant', address: '12 Commercial Rd, Hallam VIC', prefix: 'SS-' },
            { id: 'melb', name: 'Melbourne Warehouse', address: '45 Industrial Ave, Dandenong VIC', prefix: 'SSM-' }
          ]
        },
        'brand': {
          id: 'brand',
          primary: '#0f4c81',
          accent: '#e87722',
          logo: null
        },
        'reports': {
          id: 'reports',
          staff: ['soh', 'batch', 'mat', 'qc']
        }
      },

      labels: {},
      sds: {},
      secret_sales: {},

      profiles: {
        'usr_owner': { id: 'usr_owner', name: 'Kevin (Owner)', email: 'kevin@sureseal.com.au', role: 'owner', active: true, created_at: '2026-10-01T00:00:00Z' },
        'usr_mgr': { id: 'usr_mgr', name: 'Alex Miller (Manager)', email: 'alex@sureseal.com.au', role: 'manager', active: true, created_at: '2026-10-02T00:00:00Z' },
        'usr_prod': { id: 'usr_prod', name: 'Production Floor Tablet', email: 'floor@sureseal.com.au', role: 'production', active: true, created_at: '2026-10-03T00:00:00Z' },
        'usr_wh': { id: 'usr_wh', name: 'Warehouse Team', email: 'warehouse@sureseal.com.au', role: 'warehouse', active: true, created_at: '2026-10-04T00:00:00Z' },
        'usr_off': { id: 'usr_off', name: 'Office & Sales', email: 'office@sureseal.com.au', role: 'office', active: true, created_at: '2026-10-05T00:00:00Z' }
      }
    };
  }

  function loadDemoStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Could not read demo storage:', e);
    }
    const init = getInitialDemoStore();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    } catch (_) {}
    return init;
  }

  function saveDemoStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('Could not save demo storage:', e);
    }
  }

  window.SS_DEMO = {
    STORAGE_KEY,
    ROLE_KEY,
    getInitialDemoStore,
    loadDemoStore,
    saveDemoStore,
    resetData() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      location.reload();
    },
    exitDemo() {
      try {
        localStorage.removeItem('ss-demo');
        localStorage.removeItem(ROLE_KEY);
      } catch (_) {}
      const cfg = window.SS_CONFIG || {};
      if (cfg.demo) {
        alert('Demo mode is enabled in config.js. To connect your real Supabase database, set demo: false in config.js and add your Supabase project URL and anon key.');
      }
      location.reload();
    }
  };
})();
