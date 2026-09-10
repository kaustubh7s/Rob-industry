import { ProjectItem, ProjectMaterialRequirementItem, ManufacturingOrderItem, MaterialType, MachineCategory } from '../types/erp';

interface StandardPartTemplate {
  description: string;
  materialType: MaterialType;
  materialGrade: string;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  defaultVendor?: string;
  weightKg?: number;
}

const MACHINE_TEMPLATE_COMPONENTS: Record<string, StandardPartTemplate[]> = {
  'Washing Unit': [
    { description: 'Washing Clamp Bracket', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '50 x 16 x 83', quantity: 3, unit: 'Nos', weightKg: 1.58 },
    { description: 'Washing Distributor Barrel Manifold', materialType: 'SS Pipe', materialGrade: 'SS 316', sizeSpecs: 'OD 160 x ID 120 x 145', quantity: 4, unit: 'Nos', weightKg: 10.2 },
    { description: 'Washing Cam Rotary Track', materialType: 'SS Circle', materialGrade: 'SS 304', sizeSpecs: 'OD 180 x 25 MM', quantity: 2, unit: 'Nos', weightKg: 5.1 },
    { description: 'High-Pressure Spray Header Pipe', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 60 x ID 45 x 650', quantity: 2, unit: 'Nos', weightKg: 3.4 },
    { description: 'Multi-Jet Nozzle Mounting Patti', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '80 x 8 x 320', quantity: 4, unit: 'Nos', weightKg: 1.6 },
    { description: 'Sanitization Base Skid Frame', materialType: 'SS Angle', materialGrade: 'SS 304', sizeSpecs: '50 x 50 x 6 x 850', quantity: 4, unit: 'Nos', weightKg: 3.8 },
    { description: 'Tri-Clamp Ferrule Connector TC-50', materialType: 'Hardware', materialGrade: 'SS 316', sizeSpecs: '2 Inch TC SS 316', quantity: 6, unit: 'Nos', weightKg: 0.4 },
    { description: 'Drain Sight Glass Bush', materialType: 'SS Pipe', materialGrade: 'SS 316', sizeSpecs: 'OD 90 x ID 65 x 85', quantity: 2, unit: 'Nos', weightKg: 1.8 },
  ],
  'Mono Conveyor': [
    { description: 'Mono Conveyor Inlet Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '80 x 6 x 485', quantity: 2, unit: 'Nos', weightKg: 1.85 },
    { description: 'Conveyor Support Patti', materialType: 'SS Angle', materialGrade: 'SS 304', sizeSpecs: '50 x 50 x 6 x 500', quantity: 4, unit: 'Nos', weightKg: 2.3 },
    { description: 'Outlet Bridge Guide Rail', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '90 x 12 x 580', quantity: 1, unit: 'Nos', weightKg: 4.9 },
    { description: 'Main Conveyor Central Drive Shaft', materialType: 'SS Bar', materialGrade: 'SS 304', sizeSpecs: 'Dia 45 x 350 MM', quantity: 2, unit: 'Nos', weightKg: 4.3 },
    { description: 'Pillow Block Drive Bearing UC205', materialType: 'Hardware', materialGrade: 'SS 304 Casing', sizeSpecs: '25mm Shaft Bore', quantity: 4, unit: 'Nos', weightKg: 0.8 },
    { description: 'Bridge Support Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '65 x 10 x 420', quantity: 2, unit: 'Nos', weightKg: 2.1 },
    { description: 'Conveyor Return Idler Roller', materialType: 'SS Pipe', materialGrade: 'SS 304', sizeSpecs: 'OD 60 x ID 45 x 420', quantity: 2, unit: 'Nos', weightKg: 2.2 },
    { description: 'Idler Sprocket Hub Plate', materialType: 'SS Circle', materialGrade: 'SS 304', sizeSpecs: 'OD 120 x 20 MM', quantity: 2, unit: 'Nos', weightKg: 1.8 },
  ],
  'Sealing Unit': [
    { description: 'Sealing Clamp Block', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '60 x 16 x 110', quantity: 2, unit: 'Nos', weightKg: 0.84 },
    { description: 'Sealing Clamp Secondary Base', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '50 x 16 x 112', quantity: 1, unit: 'Nos', weightKg: 0.71 },
    { description: 'Clamp Ghode Stiffener Plate', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '60 x 16 x 135', quantity: 2, unit: 'Nos', weightKg: 1.02 },
    { description: 'Hardened Rotary Cam Track Plate', materialType: 'SS Circle', materialGrade: 'SS 420', sizeSpecs: 'OD 240 x 30 MM', quantity: 1, unit: 'Nos', weightKg: 10.6 },
    { description: 'Sealing Head Plunger Shaft', materialType: 'SS Bar', materialGrade: 'SS 316', sizeSpecs: 'Dia 32 x 280 MM', quantity: 4, unit: 'Nos', weightKg: 1.76 },
    { description: 'Vacuum Distribution Manifold Block', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '100 x 25 x 180', quantity: 2, unit: 'Nos', weightKg: 3.5 },
    { description: 'Capping Torque Spindle Housing', materialType: 'SS Pipe', materialGrade: 'SS 304', sizeSpecs: 'OD 80 x ID 55 x 160', quantity: 4, unit: 'Nos', weightKg: 2.1 },
    { description: 'Stainless Compression Springs Heavy', materialType: 'Hardware', materialGrade: 'SS 302 Wire', sizeSpecs: 'Wire 3.5mm x OD 28mm', quantity: 8, unit: 'Nos', weightKg: 0.2 },
  ],
  'Pipeline System': [
    { description: 'Sanitary Header Main Run Pipe', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 106 x ID 75 x 1200', quantity: 2, unit: 'Nos', weightKg: 18.5 },
    { description: 'Branch Tee Distribution Header', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 60 x ID 45 x 180', quantity: 6, unit: 'Nos', weightKg: 2.1 },
    { description: 'Heavy Pipeline Mounting Saddle Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '65 x 10 x 240', quantity: 6, unit: 'Nos', weightKg: 1.2 },
    { description: 'Sanitary Butterfly Valve Backing Flange', materialType: 'SS Circle', materialGrade: 'SS 316', sizeSpecs: 'OD 165 x 16 MM', quantity: 4, unit: 'Nos', weightKg: 2.7 },
    { description: 'Orbital Weld Backing Collar Ring', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 76 x ID 70 x 15', quantity: 12, unit: 'Nos', weightKg: 0.2 },
  ],
  'Distributor': [
    { description: '6-Station Rotary Star Wheel Plate', materialType: 'SS Sheet', materialGrade: 'SS 304', sizeSpecs: '450 x 450 x 12 mm', quantity: 2, unit: 'Nos', weightKg: 19.1 },
    { description: 'Distributor Support Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '50 x 12 x 320', quantity: 2, unit: 'Nos', weightKg: 1.5 },
    { description: 'Center Indexing Turret Spindle', materialType: 'SS Bar', materialGrade: 'SS 304', sizeSpecs: 'Dia 55 x 480 MM', quantity: 1, unit: 'Nos', weightKg: 8.9 },
    { description: 'Infeed Guide Pocket Plate', materialType: 'SS Sheet', materialGrade: 'SS 304', sizeSpecs: '250 x 180 x 6 mm', quantity: 6, unit: 'Nos', weightKg: 2.1 },
    { description: 'Distributor Stand Mount Bracket', materialType: 'SS Angle', materialGrade: 'SS 304', sizeSpecs: '50 x 50 x 6 x 450', quantity: 4, unit: 'Nos', weightKg: 2.1 },
  ],
  'Cap Transfer': [
    { description: 'Cap Transfer Rotary Sleeve Bush', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 106 x ID 75 x 110', quantity: 2, unit: 'Nos', weightKg: 3.8 },
    { description: 'Elevating Feeder Chute Tray Sheet', materialType: 'SS Sheet', materialGrade: 'SS 304', sizeSpecs: '600 x 350 x 3 mm', quantity: 2, unit: 'Nos', weightKg: 4.9 },
    { description: 'Cap Orientation Guide Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '35 x 6 x 420', quantity: 4, unit: 'Nos', weightKg: 0.7 },
    { description: 'Hopper Agitator Push Arm', materialType: 'SS Bar', materialGrade: 'SS 304', sizeSpecs: 'Dia 16 x 220 MM', quantity: 3, unit: 'Nos', weightKg: 0.35 },
  ],
  'DEFAULT': [
    { description: 'Mono Conveyor Inlet Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '80 x 6 x 485', quantity: 2, unit: 'Nos', weightKg: 1.85 },
    { description: 'Sealing Clamp Block', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '60 x 16 x 110', quantity: 2, unit: 'Nos', weightKg: 0.84 },
    { description: 'Clamp Ghode Stiffener', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '60 x 16 x 135', quantity: 2, unit: 'Nos', weightKg: 1.02 },
    { description: 'Washing Clamp Bracket', materialType: 'SS Flat', materialGrade: 'SS 316', sizeSpecs: '50 x 16 x 83', quantity: 3, unit: 'Nos', weightKg: 1.58 },
    { description: 'Distributor Support Patti', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '50 x 12 x 320', quantity: 2, unit: 'Nos', weightKg: 1.5 },
    { description: 'Pipe Line Clamp Ring', materialType: 'SS Pipe', materialGrade: 'SS 304', sizeSpecs: 'OD 60 x ID 45 x 120', quantity: 4, unit: 'Nos', weightKg: 0.8 },
    { description: 'Bridge Support Rail', materialType: 'SS Flat', materialGrade: 'SS 304', sizeSpecs: '100 x 12 x 650', quantity: 1, unit: 'Nos', weightKg: 6.1 },
    { description: 'Conveyor Support Patti', materialType: 'SS Angle', materialGrade: 'SS 304', sizeSpecs: '50 x 50 x 6 x 500', quantity: 4, unit: 'Nos', weightKg: 2.3 },
    { description: 'Washing Cam Rotary Track', materialType: 'SS Circle', materialGrade: 'SS 304', sizeSpecs: 'OD 180 x 25 MM', quantity: 2, unit: 'Nos', weightKg: 5.1 },
    { description: 'Outlet Roll End Flange Cover', materialType: 'SS Circle', materialGrade: 'SS 304', sizeSpecs: 'OD 285 x 12 MM', quantity: 1, unit: 'Nos', weightKg: 6.08 },
    { description: 'Outlet Roll Drive Shaft', materialType: 'SS Bar', materialGrade: 'SS 304', sizeSpecs: 'Dia 45 x 620 mm', quantity: 2, unit: 'Nos', weightKg: 7.7 },
    { description: 'Cap Transfer Rotary Bush', materialType: 'SS Pipe', materialGrade: 'SS 316L', sizeSpecs: 'OD 106 x ID 75 x 110', quantity: 2, unit: 'Nos', weightKg: 3.8 },
  ],
};

/**
 * Extracts normalized search tokens from a project name or ID.
 */
function getTokens(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !['and', 'the', 'with', 'line', 'skid', 'unit', 'high', 'speed'].includes(t));
}

/**
 * Robust matcher checking if a requirement or order belongs to a project.
 */
export function isRequirementMatchedToProject(reqProjectName: string, project: ProjectItem): boolean {
  if (!reqProjectName || !project || !project.name) return false;

  const rName = reqProjectName.trim().toLowerCase();
  const pName = project.name.trim().toLowerCase();
  const pNum = (project.projectNumber || '').trim().toLowerCase();

  // Exact or direct substring
  if (rName === pName || pName.includes(rName) || rName.includes(pName)) return true;
  if (pNum && (rName.includes(pNum) || pNum.includes(rName))) return true;

  // Keyword token match (e.g. "foha" in both, or "cip" and "torrent" in both)
  const rTokens = getTokens(rName);
  const pTokens = getTokens(pName);

  const hasOverlap = rTokens.some((t) => pTokens.includes(t));
  if (hasOverlap) return true;

  // Common aliases
  if (pName.includes('foha') && rName.includes('foha')) return true;
  if (pName.includes('cip') && rName.includes('cip')) return true;
  if (pName.includes('sealing') && rName.includes('sealing')) return true;
  if (pName.includes('pipeline') && rName.includes('pipeline')) return true;
  if (pName.includes('distributor') && rName.includes('distributor')) return true;
  if (pName.includes('transfer') && rName.includes('transfer')) return true;

  return false;
}

/**
 * Retrieves all materials for a project. If no materials are explicitly registered yet,
 * it dynamically produces standard RSB fabrication component specifications tailored for that project.
 */
export function getMaterialsForProject(
  project: ProjectItem,
  projectRequirements: ProjectMaterialRequirementItem[],
  orders: ManufacturingOrderItem[] = []
): ProjectMaterialRequirementItem[] {
  // 1. Check projectRequirements first
  const matched = projectRequirements.filter((r) => isRequirementMatchedToProject(r.projectName, project));
  if (matched.length > 0) {
    return matched;
  }

  // 2. Check manufacturing orders
  const matchedOrders = orders.filter((o) => isRequirementMatchedToProject(o.project, project));
  if (matchedOrders.length > 0) {
    return matchedOrders.map((o, idx) => ({
      id: `ord-mat-${o.id}`,
      srNo: idx + 1,
      description: o.drawingRef ? `${o.materialType} Part (${o.drawingRef})` : `${o.materialType} Component`,
      materialType: o.materialType,
      materialGrade: 'SS 304',
      sizeSpecs: o.sizeSpecs,
      quantity: o.quantity,
      unit: o.unit || 'Nos',
      weightKg: 2.5,
      projectName: project.name,
      customerName: o.customer || project.customer,
      poNumber: o.poNumber || project.poNumber,
      poDate: o.date || project.startDate,
      machineType: (o.machineType || project.machineType) as MachineCategory,
      orderSource: o.orderSource || project.orderSource,
      deliveryDate: o.deliveryDate || project.targetCompletionDate,
      vendor: o.vendor || project.vendor || 'Manav Metal',
      bomRef: `BOM-${o.orderNumber}`,
      stockStatus: o.status === 'Completed' ? 'Available' : 'Partial Available',
      availableStock: o.currentStock || 15,
      shortageQty: 0,
      productionStatus: o.status,
      qcStatus: 'Passed',
      dispatchStatus: 'Not Ready',
      materialCost: 450 * o.quantity,
      laborCost: 180 * o.quantity,
      machineCost: 120 * o.quantity,
      outsourcingCost: 0,
      totalCost: o.totalAmount || 750 * o.quantity,
    } as ProjectMaterialRequirementItem));
  }

  // 3. Dynamic Tailored RSB Component Specification Generator
  const mch = project.machineType || 'Mono Conveyor';
  const templates = MACHINE_TEMPLATE_COMPONENTS[mch] || MACHINE_TEMPLATE_COMPONENTS['DEFAULT'];

  return templates.map((tpl, idx) => {
    const unitCost = tpl.materialType === 'Hardware' ? 650 : 450;
    const matCost = tpl.quantity * unitCost;
    const laborCost = Math.round(matCost * 0.4);
    const machineCost = Math.round(matCost * 0.25);
    const totalCost = matCost + laborCost + machineCost;

    return {
      id: `gen-req-${project.id}-${idx + 1}`,
      srNo: idx + 1,
      description: tpl.description,
      materialType: tpl.materialType,
      materialGrade: tpl.materialGrade,
      sizeSpecs: tpl.sizeSpecs,
      quantity: tpl.quantity,
      unit: tpl.unit,
      weightKg: tpl.weightKg || 2.0,
      projectName: project.name,
      customerName: project.customer || 'Cadila Healthcare Ltd (Zydus)',
      poNumber: project.poNumber || 'PO-2026-36',
      poDate: project.startDate || new Date().toISOString().split('T')[0],
      machineType: project.machineType || '16 HD',
      orderSource: project.orderSource || 'Customer PO',
      deliveryDate: project.targetCompletionDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      vendor: project.vendor || tpl.defaultVendor || 'Manav Metal',
      bomRef: `BOM-${(project.machineType || 'MC').replace(/\s+/g, '').substring(0, 4)}`,
      stockStatus: idx % 3 === 0 ? 'Available' : 'Partial Available',
      availableStock: 20,
      shortageQty: 0,
      productionStatus: idx === 0 ? 'Completed' : idx === 1 ? 'Cutting' : 'Pending',
      qcStatus: idx === 0 ? 'Passed' : 'Not Started',
      dispatchStatus: idx === 0 ? 'Ready' : 'Not Ready',
      materialCost: matCost,
      laborCost,
      machineCost,
      outsourcingCost: 0,
      totalCost,
      notes: `${project.machineType} assembly component`,
    };
  });
}
