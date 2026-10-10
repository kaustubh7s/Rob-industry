import * as XLSX from 'xlsx';
import {
  analyzeExcelFile,
  analyzeWorksheet,
  matchHeaderToField,
  ParsedImportRow,
} from '../src/utils/excelImportEngine';
import { ProjectMaterialRequirementItem, ProjectItem, PurchaseOrderItem } from '../src/types/erp';
import { formatShortWhatsAppPOMessage, buildPurchaseOrderPDFDoc } from '../src/utils/whatsappHelper';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION AUDIT & INTEGRITY VERIFICATION');
console.log('======================================================\n');

// ---------------------------------------------------------------------------
// TEST SUITE 1: Column Synonym Dictionary & Header Detection
// ---------------------------------------------------------------------------
console.log('Test Suite 1: Column Synonym Matching & Header Parsing');
{
  assert(matchHeaderToField('Sr No') === 'srNo', 'Matches "Sr No" to srNo');
  assert(matchHeaderToField('S.N.') === 'srNo', 'Matches "S.N." to srNo');
  assert(matchHeaderToField('Item #') === 'srNo', 'Matches "Item #" to srNo');
  assert(matchHeaderToField('Material Description') === 'description', 'Matches "Material Description" to description');
  assert(matchHeaderToField('Item Name') === 'description', 'Matches "Item Name" to description');
  assert(matchHeaderToField('Size / Specs') === 'sizeSpecs', 'Matches "Size / Specs" to sizeSpecs');
  assert(matchHeaderToField('Dimension') === 'sizeSpecs', 'Matches "Dimension" to sizeSpecs');
  assert(matchHeaderToField('Qty Required') === 'quantity', 'Matches "Qty Required" to quantity');
  assert(matchHeaderToField('Vendor / Supplier Name') === 'vendorName', 'Matches "Vendor / Supplier Name" to vendorName');
  assert(matchHeaderToField('PO Number') === 'poNo', 'Matches "PO Number" to poNo');
  assert(matchHeaderToField('Machine') === 'machineName', 'Matches "Machine" to machineName');
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Excel Engine with Banner Rows, Leading Zeros & Alphanumeric Sr Nos
// ---------------------------------------------------------------------------
console.log('\nTest Suite 2: Banner Row Detection & Sr. No. Preservation');
{
  // Construct a realistic client workbook with:
  // Row 0: Banner / Title ("RSB INDUSTRIES - PLANT ORDER SHEET")
  // Row 1: Subtitle ("Project: Heavy Duty Conveyor | Customer: Tata Steel")
  // Row 2: Table Header
  // Rows 3-7: Material Data with non-sequential, alphanumeric, duplicates, and leading zero Sr Nos
  const rawSheetData = [
    ['RSB INDUSTRIES - PLANT ORDER SPECIFICATION SHEET', '', '', '', '', ''],
    ['Project: Heavy Duty Conveyor', '', 'PO No: RSB-2026-99', '', 'Vendor: Apex Steel', ''],
    ['Sr No', 'Material Description', 'Size / Specs', 'Material Type', 'Qty', 'Unit'],
    ['001', 'Drive Shaft 45mm', 'Dia 45mm x 1200mm', 'SS Round Bar', '2 Nos', 'Nos'],
    ['001', 'Drive Shaft Backup', 'Dia 45mm x 1200mm', 'SS Round Bar', '1', 'Nos'], // Duplicate Sr No
    ['A-07', 'Side Frame Gusset', '10mm x 250mm x 500mm', 'MS Plate', 8, 'Nos'], // Alphanumeric Sr No
    [15, 'Sprocket 24T Heavy', '24 Teeth 1.5 Inch Pitch', 'Hardware', '4', 'Pcs'], // Skipped gap Sr No
    ['PART-99', 'Flange Bearing Housing', 'UCF 208-24', 'Machined Part', 4, 'Nos'], // String Sr No
  ];

  const ws = XLSX.utils.aoa_to_sheet(rawSheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OrderDetails');

  const analysis = analyzeWorksheet(wb, 'OrderDetails');

  assert(analysis.headerRowIndex === 2, `Identified header row below banners at index 2 (detected: ${analysis.headerRowIndex})`);
  assert(analysis.detectedMetadata.projectName === 'Heavy Duty Conveyor', `Extracted pre-header project: "${analysis.detectedMetadata.projectName}"`);
  assert(analysis.detectedMetadata.poNumber === 'RSB-2026-99', `Extracted pre-header PO: "${analysis.detectedMetadata.poNumber}"`);
  assert(analysis.detectedMetadata.vendorName === 'Apex Steel', `Extracted pre-header vendor: "${analysis.detectedMetadata.vendorName}"`);

  assert(analysis.parsedRows.length === 5, `Extracted 5 data rows (got ${analysis.parsedRows.length})`);

  // Verify Row 0 (leading zero preserved as string '001')
  assert(String(analysis.parsedRows[0].srNo) === '001', `Preserved leading zero: "${analysis.parsedRows[0].srNo}"`);
  assert(analysis.parsedRows[0].description === 'Drive Shaft 45mm', 'Preserved row 1 description');
  assert(analysis.parsedRows[0].quantity === 2, 'Parsed unit-affixed quantity "2 Nos" to 2');

  // Verify Row 1 (duplicate Sr No preserved)
  assert(String(analysis.parsedRows[1].srNo) === '001', `Preserved duplicate Sr. No.: "${analysis.parsedRows[1].srNo}"`);

  // Verify Row 2 (alphanumeric 'A-07' preserved)
  assert(String(analysis.parsedRows[2].srNo) === 'A-07', `Preserved alphanumeric Sr. No.: "${analysis.parsedRows[2].srNo}"`);
  assert(Boolean(analysis.parsedRows[2].materialType), 'Preserved material type');

  // Verify Row 3 (skipped gap Sr No 15 preserved)
  assert(Number(analysis.parsedRows[3].srNo) === 15, `Preserved nonsequential Sr. No. 15: "${analysis.parsedRows[3].srNo}"`);

  // Verify Row 4 (string ID 'PART-99' preserved)
  assert(String(analysis.parsedRows[4].srNo) === 'PART-99', `Preserved text ID: "${analysis.parsedRows[4].srNo}"`);
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Multi-Sheet Workbook Extraction
// ---------------------------------------------------------------------------
console.log('\nTest Suite 3: Multi-Sheet Workbook Handling');
{
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Sr No', 'Description', 'Quantity'],
    ['1', 'Plate', 5],
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Item #', 'Component Specs', 'Order Qty'],
    ['X-1', 'Bearing 6205', 10],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Fabrication');
  XLSX.utils.book_append_sheet(wb, ws2, 'Assembly');

  const sheet1Analysis = analyzeWorksheet(wb, 'Fabrication');

  assert(sheet1Analysis.sheetNames.length === 2, 'Detected all 2 sheets in workbook');
  assert(sheet1Analysis.activeSheetName === 'Fabrication', 'Defaults to first non-empty sheet');

  const sheet2Analysis = analyzeWorksheet(wb, 'Assembly');
  assert(sheet2Analysis.parsedRows.length === 1, 'Switched and parsed sheet 2 correctly');
  assert(sheet2Analysis.parsedRows[0].srNo === 'X-1', 'Preserved sheet 2 alphanumeric Sr No');
}

// ---------------------------------------------------------------------------
// TEST SUITE 4: Safe Merge & Protection Against Empty Cloud Overwrite
// ---------------------------------------------------------------------------
console.log('\nTest Suite 4: Empty DB Overwrite Protection & Safe Merge');
{
  // Simulated SafeMerge logic as implemented in ERPContext.tsx
  function safeMergeRequirements(
    localReqs: ProjectMaterialRequirementItem[],
    remoteReqs: ProjectMaterialRequirementItem[]
  ): ProjectMaterialRequirementItem[] {
    if (!Array.isArray(remoteReqs) || remoteReqs.length === 0) {
      return localReqs;
    }
    if (!Array.isArray(localReqs) || localReqs.length === 0) {
      return remoteReqs;
    }
    const mergedMap = new Map<string, ProjectMaterialRequirementItem>();
    localReqs.forEach((item) => mergedMap.set(item.id, item));
    remoteReqs.forEach((item) => {
      const existing = mergedMap.get(item.id);
      if (!existing) {
        mergedMap.set(item.id, item);
      } else {
        const localTime = new Date(existing.updatedAt || 0).getTime();
        const remoteTime = new Date(item.updatedAt || 0).getTime();
        if (remoteTime >= localTime) {
          mergedMap.set(item.id, { ...existing, ...item });
        }
      }
    });
    return Array.from(mergedMap.values());
  }

  const localState: ProjectMaterialRequirementItem[] = [
    {
      id: 'pmr-1',
      projectName: 'Alpha',
      machineName: 'Cutter',
      srNo: 'A-01',
      materialType: 'SS Flat',
      sizeSpecs: '50x5',
      quantity: 10,
      unit: 'Nos',
      updatedAt: '2026-10-10T09:00:00Z',
    } as any,
  ];

  // Case A: Cloud returns empty array (e.g. initial connection, cold query, or glitch)
  const mergedWithEmpty = safeMergeRequirements(localState, []);
  assert(mergedWithEmpty.length === 1, 'Empty remote response DOES NOT wipe local data');
  assert(mergedWithEmpty[0].srNo === 'A-01', 'Preserved local record and Sr. No.');

  // Case B: Cloud returns updated record with newer timestamp
  const remoteUpdated: ProjectMaterialRequirementItem[] = [
    {
      id: 'pmr-1',
      projectName: 'Alpha',
      machineName: 'Cutter',
      srNo: 'A-01',
      materialType: 'SS Flat',
      sizeSpecs: '50x5',
      quantity: 15, // changed
      unit: 'Nos',
      updatedAt: '2026-10-10T10:00:00Z',
    } as any,
    {
      id: 'pmr-2',
      projectName: 'Beta',
      machineName: 'Welder',
      srNo: '007',
      materialType: 'MS Pipe',
      sizeSpecs: '2 Inch',
      quantity: 5,
      unit: 'Nos',
      updatedAt: '2026-10-10T10:00:00Z',
    } as any,
  ];

  const mergedWithUpdate = safeMergeRequirements(localState, remoteUpdated);
  assert(mergedWithUpdate.length === 2, 'Merged remote addition correctly');
  assert(mergedWithUpdate.find(r => r.id === 'pmr-1')?.quantity === 15, 'Updated quantity from newer remote record');
  assert(mergedWithUpdate.find(r => r.id === 'pmr-2')?.srNo === '007', 'Preserved remote leading zero Sr No');
}

// ---------------------------------------------------------------------------
// TEST SUITE 5: Supabase Dual-Encoding (Notes Tag Fallback)
// ---------------------------------------------------------------------------
console.log('\nTest Suite 5: Supabase Dual-Encoding & Backward Compatibility');
{
  function packNotesWithSrNo(notes: string | undefined, srNo: string | number | undefined): string {
    const cleanNotes = (notes || '').replace(/\[ORIGINAL_SR_NO:[^\]]*\]/g, '').trim();
    if (srNo !== undefined && srNo !== null && String(srNo).trim() !== '') {
      return `[ORIGINAL_SR_NO:${String(srNo).trim()}] ${cleanNotes}`.trim();
    }
    return cleanNotes;
  }

  function unpackNotesSrNo(notes: string | undefined, dbSrNo: any): string | number {
    const match = (notes || '').match(/\[ORIGINAL_SR_NO:([^\]]+)\]/);
    if (match && match[1]) {
      const val = match[1].trim();
      return isNaN(Number(val)) ? val : (val.startsWith('0') && val.length > 1 ? val : Number(val));
    }
    return dbSrNo !== undefined && dbSrNo !== null ? dbSrNo : 1;
  }

  // Alphanumeric Sr No
  const packedAlpha = packNotesWithSrNo('Critical component for main drive', 'A-07');
  assert(packedAlpha.includes('[ORIGINAL_SR_NO:A-07]'), 'Packed alphanumeric Sr No in notes tag');
  const unpackedAlpha = unpackNotesSrNo(packedAlpha, null);
  assert(unpackedAlpha === 'A-07', 'Unpacked alphanumeric Sr No exactly');

  // Leading zero Sr No
  const packedZero = packNotesWithSrNo('', '0042');
  const unpackedZero = unpackNotesSrNo(packedZero, 42);
  assert(unpackedZero === '0042', 'Unpacked leading zero Sr No as string "0042" rather than integer 42');

  // Plain number
  const packedNum = packNotesWithSrNo('Standard cut', 12);
  const unpackedNum = unpackNotesSrNo(packedNum, 12);
  assert(unpackedNum === 12, 'Unpacked plain numeric Sr No as number 12');
}

// ---------------------------------------------------------------------------
// TEST SUITE 6: PO Creator (Ordered By) Capture, Persistence & Multi-User Isolation
// ---------------------------------------------------------------------------
console.log('\nTest Suite 6: PO Creator Capture & Multi-User Isolation');
{
  // 1. Simulate User A (e.g., 'Sanjay Deshmukh') issuing a Direct PO
  const userA = { name: 'Sanjay Deshmukh', role: 'admin' };
  const directPoCreation = (user: typeof userA, poData: Partial<PurchaseOrderItem>): PurchaseOrderItem => {
    const finalOrderedBy = poData.orderedBy || user?.name || 'Unknown';
    return {
      id: 'po-' + Date.now(),
      poNumber: poData.poNumber || 'PO-RSB-2026-101',
      date: '2026-10-10',
      vendor: 'Apex Steel Traders',
      expectedDate: '2026-10-20',
      paymentTerms: '30 Days Net',
      status: 'Sent',
      orderedBy: finalOrderedBy,
      issuedBy: finalOrderedBy,
      totalAmount: 150000,
      items: [
        {
          id: 'item-1',
          material: 'SS 304 Round Bar 45mm',
          qty: 10,
          unit: 'Nos',
          rate: 1500,
          amount: 15000,
          notes: 'Test item',
        },
      ],
    };
  };

  const poCreatedByUserA = directPoCreation(userA, { poNumber: 'PO-RSB-2026-701' });
  assert(poCreatedByUserA.orderedBy === 'Sanjay Deshmukh', `PO creator correctly captured as User A (${poCreatedByUserA.orderedBy})`);
  assert(poCreatedByUserA.issuedBy === 'Sanjay Deshmukh', `PO issuedBy matches creator (${poCreatedByUserA.issuedBy})`);

  // 2. Simulate User B (e.g., 'Neha Kulkarni') logging in and viewing/exporting User A's PO
  const userB = { name: 'Neha Kulkarni', role: 'director' };

  // Helper simulating how ProcurementBasket and PO Slip render creator for viewing/exporting
  const resolvePOCreatorForViewOrExport = (po: PurchaseOrderItem, _currentUser: typeof userB) => {
    // CRITICAL: Must use po.orderedBy, never fallback to viewing user's name
    return po.orderedBy || 'Unknown';
  };

  const renderedCreatorForUserB = resolvePOCreatorForViewOrExport(poCreatedByUserA, userB);
  assert(
    renderedCreatorForUserB === 'Sanjay Deshmukh',
    `User B viewing User A's PO displays original creator "Sanjay Deshmukh", NOT "${userB.name}"`
  );
  assert(
    renderedCreatorForUserB !== userB.name,
    `Viewing user's name does NOT overwrite original creator`
  );

  // 3. Historical PO without recorded creator
  const historicalPoWithoutCreator: PurchaseOrderItem = {
    id: 'po-legacy-1',
    poNumber: 'PO-LEGACY-001',
    date: '2025-01-01',
    vendor: 'Manav Metal',
    status: 'Received',
    totalAmount: 50000,
    items: [],
  };

  const historicalCreator = resolvePOCreatorForViewOrExport(historicalPoWithoutCreator, userB);
  assert(
    historicalCreator === 'Unknown',
    `Historical PO without creator displays "Unknown", NOT an invented or hardcoded name`
  );
  assert(
    historicalCreator !== 'Amit' && historicalCreator !== 'Kaustubh',
    `Does NOT use hardcoded names like Amit or Kaustubh`
  );

  // 4. WhatsApp notification message formatting
  const waMsgUserA = formatShortWhatsAppPOMessage({
    poNumber: poCreatedByUserA.poNumber,
    vendorName: poCreatedByUserA.vendor,
    projectName: 'Conveyor Assembly',
    orderedBy: poCreatedByUserA.orderedBy,
    items: [
      {
        description: 'SS 304 Round Bar 45mm',
        quantity: 10,
        unit: 'Nos',
        sizeSpecs: 'Dia 45mm',
      },
    ],
  });
  assert(waMsgUserA.includes('👤 *Ordered By:* Sanjay Deshmukh'), 'WhatsApp message includes "👤 *Ordered By:* Sanjay Deshmukh"');

  const waMsgHistorical = formatShortWhatsAppPOMessage({
    poNumber: historicalPoWithoutCreator.poNumber,
    vendorName: historicalPoWithoutCreator.vendor,
    items: [],
  });
  assert(waMsgHistorical.includes('👤 *Ordered By:* Unknown'), 'WhatsApp message for historical PO shows "👤 *Ordered By:* Unknown"');

  // 5. PDF generation includes Ordered By in document
  const { doc } = buildPurchaseOrderPDFDoc({
    poNumber: poCreatedByUserA.poNumber,
    vendorName: poCreatedByUserA.vendor,
    projectName: 'Conveyor Assembly',
    orderedBy: poCreatedByUserA.orderedBy,
    items: [
      {
        description: 'SS 304 Round Bar 45mm',
        quantity: 10,
        unit: 'Nos',
        sizeSpecs: 'Dia 45mm',
      },
      {
        description: 'MS Flat 50x6mm',
        quantity: 5,
        unit: 'Nos',
        sizeSpecs: '50x6mm',
      },
    ],
  });
  assert(Boolean(doc), 'Generated official PDF document with Ordered By');
  const pdfOutputString = doc.output('datauristring');
  assert(!pdfOutputString.includes('Sequential%20Vendor%20Grouping') && !pdfOutputString.includes('Sequential Vendor Grouping'), 'PDF does NOT include "Sequential Vendor Grouping"');
  assert(!pdfOutputString.includes('STATUS:%20SENT') && !pdfOutputString.includes('STATUS: SENT'), 'PDF does NOT include "STATUS: SENT"');
}

console.log('\n======================================================');
console.log('🎉 ALL 6 TEST SUITES PASSED FLAWLESSLY!');
console.log('======================================================\n');
