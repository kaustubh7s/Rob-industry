// Standard Factory Bill of Materials (BOM) Templates for RSB Equipments Machines
// Blank factory reset baseline: Add custom machine BOM templates as needed

export interface BOMPartTemplate {
  srNo: number;
  description: string;
  materialType: 'SS Flat' | 'SS Pipe' | 'SS Circle' | 'SS Bar' | 'SS Sheet' | 'SS Angle' | 'Hardware';
  sizeSpecification: string;
  quantity: number;
  unit: string;
  recommendedVendor: string;
  estimatedWeightKg?: number;
  notes?: string;
}

export interface MachineBOMTemplate {
  machineName: string;
  category: 'Rotary Machine' | 'Conveyor Unit' | 'Washing System' | 'Fluid & CIP' | 'Custom Assembly';
  totalStandardParts: number;
  estimatedRawSSKg: number;
  standardAssemblyDays: number;
  description: string;
  parts: BOMPartTemplate[];
}

export const MACHINE_BOM_TEMPLATES: Record<string, MachineBOMTemplate> = {};
