import { MachineFolder, MasterBOM } from '../types/erp';

export const STOCK_MACHINE_IDS = new Set<string>([
  'mach-filling-machine',
  'mach-labelling-machine-amit',
  'mach-mono-conveyor',
  'mach-vial-washing',
]);

export const STOCK_MACHINE_NAMES = new Set<string>([
  'Filling machine',
  'LABELLING MACHINE AMIT',
  'Mono Conveyor System',
  'Automatic Vial Washing Machine',
]);

export const STOCK_BOM_IDS = new Set<string>([
  'bom-fm-nut-bolt-list',
  'bom-fm-rfc-switchgears',
  'bom-fm-filling-assembly',
  'bom-fm-sealing-assembly',
  'bom-fm-base-frame',
  'bom-lm-bearing-list',
  'bom-lm-base-frame',
  'bom-lm-conveyor',
  'bom-lm-drive-vacuum',
  'bom-conveyor-slat-std',
]);

export const isStockMachine = (machine: Partial<MachineFolder> | null | undefined): boolean => {
  if (!machine) return false;
  if (machine.id && STOCK_MACHINE_IDS.has(machine.id)) return true;
  if (machine.name && STOCK_MACHINE_NAMES.has(machine.name)) return true;
  return false;
};

export const isStockBOM = (bom: Partial<MasterBOM> | null | undefined): boolean => {
  if (!bom) return false;
  if (bom.id && STOCK_BOM_IDS.has(bom.id)) return true;
  if (bom.machineName && STOCK_MACHINE_NAMES.has(bom.machineName)) return true;
  return false;
};

export const INITIAL_MASTER_MACHINES: MachineFolder[] = [
  {
    id: 'mach-1793700467246-8lk9x',
    name: 'new',
    types: ['Standard Model'],
    typeDetails: { 'Standard Model': { name: 'Standard Model', isArchived: false } },
    createdBy: 'Amit',
    createdAt: '2026-11-03T10:07:47.247Z',
    updatedAt: '2026-11-03T10:07:47.247Z',
  },
];

export const INITIAL_MASTER_BOMS: MasterBOM[] = [];
