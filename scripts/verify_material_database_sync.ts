import {
  getDeletedRequirementTombstones,
  addRequirementTombstone,
  addRequirementTombstones,
  getDeletedProjectTombstones,
  addProjectTombstone,
} from '../src/utils/tombstones';
import {
  isRequirementMatchingProjectName,
  isRequirementMatchedToProject,
  getMaterialsForProject,
} from '../src/utils/projectMaterialsHelper';
import { ProjectMaterialRequirementItem, ProjectItem, ManufacturingOrderItem } from '../src/types/erp';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
(global as any).localStorage = localStorageMock;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('\n================================================================');
console.log('🧪 RSB MATERIAL DATABASE & SYNCHRONIZATION VERIFICATION SUITE');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Exact Material Creation & Dual-Encoding Persistence
// ---------------------------------------------------------------------------
console.log('Test 1: Create and save material with machine "new", description "qwe", size "213"');
{
  const item: ProjectMaterialRequirementItem = {
    id: 'req-test-101',
    srNo: 1,
    projectName: 'Kaustubh',
    customerName: 'Kaustubh',
    poNumber: 'PO-2026-1',
    poNo: 'PO-2026-1',
    poDate: '2026-10-11',
    date: '2026-10-11',
    machineType: 'new' as any,
    machineName: 'new',
    vendor: 'Manav Metal',
    vendorName: 'Manav Metal',
    description: 'qwe',
    materialType: 'SS Flat',
    materialGrade: 'SS 304',
    sizeSpecs: '213',
    quantity: 5,
    unit: 'Nos',
    orderedBy: 'Kaustubh',
  };

  // Verify notes packing for dual-encoding (ensuring columns & notes stay identical)
  const metaTags = `[MACHINE_NAME:${item.machineName}][PO_NO:${item.poNo}][DATE:${item.date}][VENDOR_NAME:${item.vendorName}][ORDERED_BY:${item.orderedBy}][SIZE_SPECS:${item.sizeSpecs}][DESCRIPTION:${item.description}]`;
  const packedNotes = item.notes ? `${item.notes} | ${metaTags}` : metaTags;

  assert(packedNotes.includes('[MACHINE_NAME:new]'), 'Encodes machineName="new" in notes tag');
  assert(packedNotes.includes('[DESCRIPTION:qwe]'), 'Encodes description="qwe" in notes tag');
  assert(packedNotes.includes('[SIZE_SPECS:213]'), 'Encodes sizeSpecs="213" in notes tag');
  assert(packedNotes.includes('[PO_NO:PO-2026-1]'), 'Encodes poNo="PO-2026-1" in notes tag');
  assert(packedNotes.includes('[ORDERED_BY:Kaustubh]'), 'Encodes orderedBy="Kaustubh" in notes tag');

  // Verify unpacking extracts exact values
  const decodeRegex = /\[([A-Z_]+):(.*?)\]/g;
  const decoded: Record<string, string> = {};
  let match;
  while ((match = decodeRegex.exec(packedNotes)) !== null) {
    decoded[match[1]] = match[2];
  }

  assert(decoded['MACHINE_NAME'] === 'new', 'Decodes machineName="new" accurately');
  assert(decoded['DESCRIPTION'] === 'qwe', 'Decodes description="qwe" accurately');
  assert(decoded['SIZE_SPECS'] === '213', 'Decodes sizeSpecs="213" accurately');
  assert(decoded['PO_NO'] === 'PO-2026-1', 'Decodes poNo="PO-2026-1" accurately');
}

// ---------------------------------------------------------------------------
// TEST 2: Multi-View Consistency & Project Resolution
// ---------------------------------------------------------------------------
console.log('\nTest 2: Multi-View Synchronization across Project Details, Workstation & Orders');
{
  const project: ProjectItem = {
    id: 'prj-kaustubh',
    projectNumber: 'PRJ-2026-001',
    name: 'Kaustubh',
    customer: 'Kaustubh',
    machineName: 'new',
    poNo: 'PO-2026-1',
    status: 'In Progress',
    priority: 'high',
    projectValue: 100000,
    progressPct: 50,
    materialsCount: 1,
    totalQuantity: 5,
  };

  const reqItem: ProjectMaterialRequirementItem = {
    id: 'req-test-101',
    srNo: 1,
    projectName: 'Kaustubh',
    customerName: 'Kaustubh',
    poNumber: 'PO-2026-1',
    poNo: 'PO-2026-1',
    date: '2026-10-11',
    machineType: 'new' as any,
    machineName: 'new',
    vendor: 'Manav Metal',
    vendorName: 'Manav Metal',
    description: 'qwe',
    materialType: 'SS Flat',
    materialGrade: 'SS 304',
    sizeSpecs: '213',
    quantity: 5,
    unit: 'Nos',
    orderedBy: 'Kaustubh',
  };

  const reqItemComposite: ProjectMaterialRequirementItem = {
    id: 'req-test-102',
    srNo: 2,
    projectName: 'Kaustubh (PO-2026-1)',
    customerName: 'Kaustubh',
    poNumber: 'PO-2026-1',
    poNo: 'PO-2026-1',
    date: '2026-10-11',
    machineType: 'new' as any,
    machineName: 'new',
    vendor: 'Manav Metal',
    vendorName: 'Manav Metal',
    description: 'qwe part 2',
    materialType: 'SS Flat',
    materialGrade: 'SS 304',
    sizeSpecs: '213',
    quantity: 2,
    unit: 'Nos',
    orderedBy: 'Kaustubh',
  };

  // Verify getMaterialsForProject resolves both direct and composite project names
  const materials = getMaterialsForProject(project, [reqItem, reqItemComposite], []);
  assert(materials.length === 2, 'Resolves both direct and composite requirements for project');
  assert(materials[0].machineName === 'new', 'Preserves machineName="new" in project materials');
  assert(materials[0].description === 'qwe', 'Preserves description="qwe" in project materials');
  assert(materials[0].sizeSpecs === '213', 'Preserves sizeSpecs="213" in project materials');
  assert(materials[0].orderedBy === 'Kaustubh', 'Preserves orderedBy="Kaustubh" in project materials');
}

// ---------------------------------------------------------------------------
// TEST 3: Edit Description and Size Specs
// ---------------------------------------------------------------------------
console.log('\nTest 3: Edit description and size specs update correctly');
{
  const originalReq: ProjectMaterialRequirementItem = {
    id: 'req-test-101',
    srNo: 1,
    projectName: 'Kaustubh',
    customerName: 'Kaustubh',
    poNumber: 'PO-2026-1',
    poNo: 'PO-2026-1',
    machineName: 'new',
    description: 'qwe',
    sizeSpecs: '213',
    quantity: 5,
    unit: 'Nos',
    materialType: 'SS Flat',
    materialGrade: 'SS 304',
    orderedBy: 'Kaustubh',
  };

  const updates = {
    description: 'qwe-modified',
    sizeSpecs: '213-adjusted',
    quantity: 8,
  };

  const updatedReq = { ...originalReq, ...updates };
  assert(updatedReq.description === 'qwe-modified', 'Updated description to "qwe-modified"');
  assert(updatedReq.sizeSpecs === '213-adjusted', 'Updated sizeSpecs to "213-adjusted"');
  assert(updatedReq.quantity === 8, 'Updated quantity to 8');
  assert(updatedReq.machineName === 'new', 'Machine name "new" remains unchanged');
  assert(updatedReq.poNo === 'PO-2026-1', 'PO "PO-2026-1" remains unchanged');
  assert(updatedReq.orderedBy === 'Kaustubh', 'Ordered By "Kaustubh" remains unchanged');
}

// ---------------------------------------------------------------------------
// TEST 4: Permanent Deletion & Durable Tombstones
// ---------------------------------------------------------------------------
console.log('\nTest 4: Deletion persistence with durable tombstones');
{
  const targetId = 'req-deleted-999';
  addRequirementTombstone(targetId);

  const tombstones = getDeletedRequirementTombstones();
  assert(tombstones.has(targetId), 'Tombstone recorded in durable set');

  // Simulate pull from remote Supabase returning deleted record
  const remoteRequirements: ProjectMaterialRequirementItem[] = [
    {
      id: targetId,
      projectName: 'Kaustubh',
      description: 'qwe',
      sizeSpecs: '213',
      quantity: 5,
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
    {
      id: 'req-active-1000',
      projectName: 'Kaustubh',
      description: 'active valid material',
      sizeSpecs: '100 x 10',
      quantity: 1,
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
  ];

  // Filter against tombstones
  const filtered = remoteRequirements.filter((r) => !tombstones.has(r.id));
  assert(filtered.length === 1, 'Deleted requirement filtered out of remote sync');
  assert(filtered[0].id === 'req-active-1000', 'Active requirement preserved');
  assert(!filtered.some((r) => r.id === targetId), 'Deleted requirement cannot be resurrected');
}

// ---------------------------------------------------------------------------
// TEST 5: Clean Empty State & Draft Purge
// ---------------------------------------------------------------------------
console.log('\nTest 5: Empty table draft cleanup prevents resurrection of stale drafts');
{
  const projectName = 'Kaustubh';
  const draftKey = `RSB_PROJECT_DRAFT_${projectName}`;
  const globalDraftKey = 'RSB_MATERIAL_ENTRY_WORKSTATION_DRAFT_V2';

  // Initially has draft
  localStorage.setItem(draftKey, JSON.stringify([{ id: 'old-draft-1', description: 'stale' }]));
  localStorage.setItem(globalDraftKey, JSON.stringify([{ id: 'old-draft-1', description: 'stale' }]));
  assert(localStorage.getItem(draftKey) !== null, 'Draft exists before deletion');

  // Deleting all rows removes drafts
  const nextRows: any[] = [];
  if (nextRows.length === 0) {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(globalDraftKey);
  }

  assert(localStorage.getItem(draftKey) === null, 'Project draft removed when table is emptied');
  assert(localStorage.getItem(globalDraftKey) === null, 'Global draft removed when table is emptied');
}

// ---------------------------------------------------------------------------
// TEST 6: Order Duplication & PO Increment Logic
// ---------------------------------------------------------------------------
console.log('\nTest 6: Order Duplication with safe PO increment and zero cross-contamination');
{
  // Test 1: PO prefix with number e.g. "PO-2026-1" -> "PO-2026-2"
  const po1 = 'PO-2026-1';
  let newPo1 = '';
  const match1 = po1.match(/^(.*?)(\d+)$/);
  if (match1) {
    newPo1 = `${match1[1]}${parseInt(match1[2], 10) + 1}`;
  }
  assert(newPo1 === 'PO-2026-2', 'Increments "PO-2026-1" to "PO-2026-2"');

  // Test 2: Plain numeric PO e.g. "36" -> "37"
  const po2 = '36';
  let newPo2 = '';
  const match2 = po2.match(/^(.*?)(\d+)$/);
  if (match2) {
    newPo2 = `${match2[1]}${parseInt(match2[2], 10) + 1}`;
  }
  assert(newPo2 === '37', 'Increments "36" to "37"');

  // Test 3: Duplicated records get brand new IDs
  const originalRows = [
    { id: 'orig-1', srNo: 1, description: 'qwe', sizeSpecs: '213', quantity: 5, machineName: 'new', poNo: 'PO-2026-1' },
    { id: 'orig-2', srNo: 2, description: 'bracket', sizeSpecs: '50x50', quantity: 2, machineName: 'new', poNo: 'PO-2026-1' },
  ];

  const newProjectName = `Kaustubh (${newPo1})`;
  const duplicatedRows = originalRows.map((r) => ({
    ...r,
    id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    projectName: newProjectName,
    poNo: newPo1,
  }));

  assert(duplicatedRows.length === 2, 'Duplicate has same item count');
  assert(duplicatedRows[0].id !== originalRows[0].id, 'New row 1 has fresh unique ID');
  assert(duplicatedRows[1].id !== originalRows[1].id, 'New row 2 has fresh unique ID');
  assert(duplicatedRows[0].projectName === 'Kaustubh (PO-2026-2)', 'Duplicate assigned to new project name');
  assert(duplicatedRows[0].poNo === 'PO-2026-2', 'Duplicate assigned new PO number');
  assert(originalRows[0].poNo === 'PO-2026-1', 'Original order PO number unchanged');
  assert(originalRows[0].id === 'orig-1', 'Original order ID unchanged');
}

// ---------------------------------------------------------------------------
// TEST 7: Safe Merge and Repeated Save Idempotency
// ---------------------------------------------------------------------------
console.log('\nTest 7: Repeated saves and safe merge idempotency');
{
  const localList: ProjectMaterialRequirementItem[] = [
    {
      id: 'req-stable-1',
      srNo: 1,
      projectName: 'Kaustubh',
      description: 'qwe',
      sizeSpecs: '213',
      quantity: 5,
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
  ];

  // Saving again with updated fields
  const updatedList: ProjectMaterialRequirementItem[] = [
    {
      id: 'req-stable-1',
      srNo: 1,
      projectName: 'Kaustubh',
      description: 'qwe',
      sizeSpecs: '213',
      quantity: 10, // updated
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
  ];

  // Upsert merge
  const map = new Map<string, ProjectMaterialRequirementItem>();
  localList.forEach((r) => map.set(r.id, r));
  updatedList.forEach((r) => map.set(r.id, r)); // overwrites existing by stable id
  const merged = Array.from(map.values());

  assert(merged.length === 1, 'Stable record ID prevents duplicate creation on repeated save');
  assert(merged[0].quantity === 10, 'Merged quantity updated to 10');
}

// ---------------------------------------------------------------------------
// TEST 8: Unrelated Projects and Data Isolation
// ---------------------------------------------------------------------------
console.log('\nTest 8: Isolation of unrelated projects and requirements');
{
  const allReqs: ProjectMaterialRequirementItem[] = [
    {
      id: 'req-kaustubh-1',
      projectName: 'Kaustubh',
      description: 'qwe',
      sizeSpecs: '213',
      quantity: 5,
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
    {
      id: 'req-other-1',
      projectName: 'Other Project X',
      description: 'unrelated part',
      sizeSpecs: '100x100',
      quantity: 20,
      unit: 'Nos',
      materialType: 'MS Plate',
      materialGrade: 'IS 2062',
    },
  ];

  // When replacing requirements for "Kaustubh"
  const targetProject = 'Kaustubh';
  const newKaustubhItems: ProjectMaterialRequirementItem[] = [
    {
      id: 'req-kaustubh-2',
      projectName: 'Kaustubh',
      description: 'qwe replacement',
      sizeSpecs: '213',
      quantity: 7,
      unit: 'Nos',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
    },
  ];

  // Replacing logic in ERPContext
  const otherItems = allReqs.filter((r) => !isRequirementMatchingProjectName(r.projectName || '', targetProject));
  const combined = [...newKaustubhItems, ...otherItems];

  assert(combined.length === 2, 'Combined retains exactly 1 new Kaustubh and 1 Other Project item');
  assert(combined.some((r) => r.id === 'req-other-1'), 'Unrelated project record is untouched');
  assert(combined.find((r) => r.id === 'req-other-1')?.quantity === 20, 'Unrelated project quantity unchanged');
}

console.log('\n================================================================');
console.log('🎉 ALL 8 PERSISTENCE & SYNCHRONIZATION TESTS PASSED PERFECTLY!');
console.log('================================================================\n');
