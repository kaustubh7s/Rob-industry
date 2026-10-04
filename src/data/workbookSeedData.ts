import { WorkbookDirectory, Workbook, WorkbookSheet, SheetCell } from '../types/workbook';
import realWorkbooksData from './realRsbWorkbooks.json';

export const INITIAL_WORKBOOK_DIRECTORIES: WorkbookDirectory[] = [];

// Helper to create header cells
function makeHeaderCell(val: string): SheetCell {
  return {
    v: val,
    bold: true,
    bgColor: '#1e293b', // slate-800
    textColor: '#ffffff',
    align: 'center',
    format: 'text',
    border: 'all',
  };
}

// 1. Initial Daily PO Sheet
function createDailyPOSheet(): WorkbookSheet {
  const headers = [
    'Date',
    'PO No',
    'Sr. No',
    'Material',
    'Specifications',
    'Qty',
    'Unit',
    'Received',
    'Pending',
    'Supplier Name',
    'Status',
    'Remarks',
  ];

  const cells: Record<string, SheetCell> = {};

  // Headers (Row 1)
  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    cells[`${colLetter}1`] = makeHeaderCell(h);
  });

  const rowData = [
    ['04-10-2026', 'PO-2026-891', 1, 'SS 304 Flat', '80 x 6 x 485 mm', 48, 'Nos', 48, '=F2-H2', 'Manav Metal', 'Received', 'Inspected OK'],
    ['04-10-2026', 'PO-2026-892', 2, 'SS 316 Seamless Pipe', 'OD 106 x ID 75 x 110 mm', 12, 'Mtr', 12, '=F3-H3', 'Apex Steel Tube', 'Received', 'Heat #A-8912 Verified'],
    ['03-10-2026', 'PO-2026-890', 3, 'SS 304 Circle Flange', 'OD 350 x 12 mm thk', 8, 'Nos', 4, '=F4-H4', 'Precision Laser Cut', 'Partially Received', '4 Pending by Monday'],
    ['02-10-2026', 'PO-2026-889', 4, 'SS 316 Round Bar', 'Dia 65 mm x 300 mm', 20, 'Nos', 20, '=F5-H5', 'Manav Metal', 'Received', 'Mill TC Available'],
    ['01-10-2026', 'PO-2026-888', 5, 'SS 304 Hex Bolt & Nut', 'M12 x 50 mm (A2-70)', 250, 'Nos', 150, '=F6-H6', 'Unbrako Fasteners', 'Partially Received', '100 short delivery'],
    ['30-09-2026', 'PO-2026-885', 6, 'SS 304 Perforated Sheet', '2440 x 1220 x 2 mm (3mm hole)', 6, 'Sheets', 0, '=F7-H7', 'Jindal Steel Depot', 'Pending', 'In transit expected tomorrow'],
    ['29-09-2026', 'PO-2026-882', 7, 'Argon Gas Cylinder', 'Commercial 99.99%', 10, 'Cyl', 10, '=F8-H8', 'Pravin Gases', 'Received', 'Cylinder swap done'],
  ];

  rowData.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const isFormula = typeof val === 'string' && val.startsWith('=');
      const isPending = cIdx === 8;
      const isStatus = cIdx === 10;

      cells[`${colLetter}${rowNum}`] = {
        v: isFormula ? null : val,
        f: isFormula ? val : undefined,
        align: cIdx === 2 || cIdx === 5 || cIdx === 7 || cIdx === 8 ? 'center' : 'left',
        textColor: isStatus && val === 'Pending' ? '#ef4444' : isPending ? '#f59e0b' : '#1e293b',
        bold: isStatus || isPending,
        format: typeof val === 'number' ? 'number' : 'text',
      };
    });
  });

  // Total Summary Row
  cells['E9'] = { v: 'TOTAL QTY:', bold: true, align: 'right' };
  cells['F9'] = { v: null, f: '=SUM(F2:F8)', bold: true, align: 'center', bgColor: '#f1f5f9' };
  cells['G9'] = { v: 'Nos/Units', italic: true, align: 'left' };
  cells['H9'] = { v: null, f: '=SUM(H2:H8)', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#059669' };
  cells['I9'] = { v: null, f: '=SUM(I2:I8)', bold: true, align: 'center', bgColor: '#fef2f2', textColor: '#dc2626' };

  return {
    id: 'sheet-daily-po-1',
    workbook_id: 'wb-daily-po-rahul',
    name: 'Daily PO Tracker',
    tab_color: '#3b82f6',
    order_index: 0,
    row_count: 50,
    col_count: 26,
    col_widths: {
      A: 110,
      B: 120,
      C: 70,
      D: 180,
      E: 220,
      F: 80,
      G: 80,
      H: 90,
      I: 90,
      J: 180,
      K: 140,
      L: 200,
    },
    frozen_rows: 1,
    frozen_cols: 0,
    cells,
  };
}

// 2. Initial DC Book Sheet
function createDCBookSheet(): WorkbookSheet {
  const headers = [
    'Date',
    'DC Number',
    'Vendor Name',
    'Description',
    'Qty',
    'Rate (₹)',
    'Amount (₹)',
    'Return Date',
    'Complete / Uncomplete',
    'Remark',
  ];

  const cells: Record<string, SheetCell> = {};

  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    cells[`${colLetter}1`] = makeHeaderCell(h);
  });

  const rowData = [
    ['04-10-2026', 'DC-2026-401', 'Shree Laser Tech', 'SS 316 Sheet Laser Cutting for Tank Shell', 16, 450, '=E2*F2', '08-10-2026', 'Uncomplete', 'Urgent for PRJ-081 Pharma Rinser'],
    ['03-10-2026', 'DC-2026-398', 'Omkar Electro-Polish', 'Impeller & Shaft Mirror Electro-polishing', 8, 1200, '=E3*F3', '06-10-2026', 'Complete', '0.2 Ra Surface Finish Verified'],
    ['02-10-2026', 'DC-2026-395', 'National CNC Works', 'SS 304 Rotary Disc Milling & Boring', 4, 3500, '=E4*F4', '07-10-2026', 'Uncomplete', 'Drawing revision 2 provided'],
    ['01-10-2026', 'DC-2026-391', 'Precision Heat Treaters', 'Hardening & Stress Relieving of Shafts', 12, 600, '=E5*F5', '04-10-2026', 'Complete', 'Hardness 45 HRC test certificate attached'],
    ['30-09-2026', 'DC-2026-388', 'Vinayak Bending Works', 'Cone Rolling & Bending 5mm thk', 2, 2800, '=E6*F6', '02-10-2026', 'Complete', 'Delivered at Plant 1'],
  ];

  rowData.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const isFormula = typeof val === 'string' && val.startsWith('=');
      const isAmount = cIdx === 6;
      const isRate = cIdx === 5;
      const isStatus = cIdx === 8;

      cells[`${colLetter}${rowNum}`] = {
        v: isFormula ? null : val,
        f: isFormula ? val : undefined,
        align: cIdx === 4 || cIdx === 5 || cIdx === 6 ? 'right' : cIdx === 0 || cIdx === 1 || cIdx === 7 ? 'center' : 'left',
        textColor: isStatus && val === 'Uncomplete' ? '#ef4444' : isStatus && val === 'Complete' ? '#10b981' : '#1e293b',
        bold: isStatus || isAmount,
        format: isRate || isAmount ? 'currency' : typeof val === 'number' ? 'number' : 'text',
      };
    });
  });

  // Total Summary
  cells['D7'] = { v: 'TOTAL DC OUTWARD VALUE:', bold: true, align: 'right' };
  cells['E7'] = { v: null, f: '=SUM(E2:E6)', bold: true, align: 'right' };
  cells['G7'] = { v: null, f: '=SUM(G2:G6)', bold: true, align: 'right', bgColor: '#ecfdf5', textColor: '#059669', format: 'currency' };

  return {
    id: 'sheet-dc-book-1',
    workbook_id: 'wb-dc-book',
    name: 'DC Register 2026',
    tab_color: '#8b5cf6',
    order_index: 0,
    row_count: 50,
    col_count: 26,
    col_widths: {
      A: 110,
      B: 120,
      C: 180,
      D: 280,
      E: 70,
      F: 100,
      G: 120,
      H: 110,
      I: 160,
      J: 240,
    },
    frozen_rows: 1,
    frozen_cols: 0,
    cells,
  };
}

// 3. Initial Spare Parts Sheet
function createSparePartSheet(): WorkbookSheet {
  const headers = [
    'Date',
    'DC Number',
    'Party Name',
    'Part Name',
    'Qty',
    'Rate (₹)',
    'Amount (₹)',
    'Remark',
    'Mobile Number',
  ];

  const cells: Record<string, SheetCell> = {};

  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    cells[`${colLetter}1`] = makeHeaderCell(h);
  });

  const rowData = [
    ['04-10-2026', 'DC-SP-109', 'Lupin Pharma Unit 2', 'Silicone Inflatable Seal for Autoclave', 4, 3200, '=E2*F2', 'Emergency Breakdown Spare', '+91 98220 11223'],
    ['03-10-2026', 'DC-SP-108', 'Cipla Kurkumbh', 'SS 316 Nozzle Tip 1.5mm', 12, 850, '=E3*F3', 'Regular Maintenance', '+91 94230 44556'],
    ['02-10-2026', 'DC-SP-107', 'Sun Pharma Vadodara', 'Ceramic Mechanical Seal 25mm', 2, 6500, '=E4*F4', 'For High Pressure Pump', '+91 98900 77889'],
    ['01-10-2026', 'DC-SP-106', 'Cadila Healthcare', 'Teflon Guide Ring OD 95mm', 8, 450, '=E5*F5', 'Standard Replacements', '+91 97654 33211'],
  ];

  rowData.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const isFormula = typeof val === 'string' && val.startsWith('=');
      const isAmount = cIdx === 6;
      const isRate = cIdx === 5;

      cells[`${colLetter}${rowNum}`] = {
        v: isFormula ? null : val,
        f: isFormula ? val : undefined,
        align: cIdx === 4 || cIdx === 5 || cIdx === 6 ? 'right' : cIdx === 0 || cIdx === 1 ? 'center' : 'left',
        bold: isAmount,
        format: isRate || isAmount ? 'currency' : typeof val === 'number' ? 'number' : 'text',
      };
    });
  });

  // Total Summary
  cells['D6'] = { v: 'TOTAL SPARES BILLED:', bold: true, align: 'right' };
  cells['E6'] = { v: null, f: '=SUM(E2:E5)', bold: true, align: 'right' };
  cells['G6'] = { v: null, f: '=SUM(G2:G5)', bold: true, align: 'right', bgColor: '#ecfdf5', textColor: '#059669', format: 'currency' };

  return {
    id: 'sheet-spare-parts-1',
    workbook_id: 'wb-spare-parts',
    name: 'Spare Part Orders',
    tab_color: '#f59e0b',
    order_index: 0,
    row_count: 50,
    col_count: 26,
    col_widths: {
      A: 110,
      B: 120,
      C: 200,
      D: 260,
      E: 70,
      F: 100,
      G: 120,
      H: 220,
      I: 140,
    },
    frozen_rows: 1,
    frozen_cols: 0,
    cells,
  };
}

// 4. Initial 150 BPM Material List Sheet
function create150BPMMaterialSheet(): WorkbookSheet {
  const headers = [
    'Sr No',
    'Material / Description',
    'Grade',
    'Size & Specification',
    'Req Qty',
    'Unit',
    'Stock Qty',
    'Shortage',
    'Rate (₹)',
    'Total Cost (₹)',
  ];

  const cells: Record<string, SheetCell> = {};

  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    cells[`${colLetter}1`] = makeHeaderCell(h);
  });

  const rowData = [
    [1, 'Main Rotary Carousel Table', 'SS 304', 'Dia 1200 mm x 20 mm thk Circle', 1, 'Nos', 1, 0, 48000, '=E2*I2'],
    [2, 'Bottle Gripper Arms (Set of 16)', 'SS 316', 'CNC Machined Gripper Assembly', 16, 'Sets', 16, 0, 3500, '=E3*I3'],
    [3, 'Rinsing Nozzle Manifold Header', 'SS 316L', 'OD 50.8 x 2.0 mm x 1800 mm Pipe', 2, 'Mtr', 0, 2, 4200, '=E4*I4'],
    [4, 'Support Framework & Base Legs', 'SS 304', '80 x 80 x 4 mm Square Tube', 24, 'Mtr', 18, 6, 1150, '=E5*I5'],
    [5, 'Polycarbonate Guard Doors', 'Clear Polycarb', '2000 x 900 x 6 mm with SS Hinges', 4, 'Sets', 4, 0, 7500, '=E6*I6'],
  ];

  rowData.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      const isFormula = typeof val === 'string' && val.startsWith('=');
      const isTotal = cIdx === 9;
      const isRate = cIdx === 8;
      const isShortage = cIdx === 7;

      cells[`${colLetter}${rowNum}`] = {
        v: isFormula ? null : val,
        f: isFormula ? val : undefined,
        align: cIdx === 0 || cIdx === 4 || cIdx === 6 || cIdx === 7 ? 'center' : cIdx === 8 || cIdx === 9 ? 'right' : 'left',
        textColor: isShortage && typeof val === 'number' && val > 0 ? '#ef4444' : '#1e293b',
        bold: isTotal || (isShortage && typeof val === 'number' && val > 0),
        format: isRate || isTotal ? 'currency' : typeof val === 'number' ? 'number' : 'text',
      };
    });
  });

  // Total Summary
  cells['H7'] = { v: 'TOTAL BOM COST:', bold: true, align: 'right' };
  cells['J7'] = { v: null, f: '=SUM(J2:J6)', bold: true, align: 'right', bgColor: '#ecfdf5', textColor: '#059669', format: 'currency' };

  return {
    id: 'sheet-150-bpm-1',
    workbook_id: 'wb-150-bpm-material',
    name: '150 BPM Mechanical BOM',
    tab_color: '#10b981',
    order_index: 0,
    row_count: 50,
    col_count: 26,
    col_widths: {
      A: 70,
      B: 240,
      C: 100,
      D: 260,
      E: 80,
      F: 70,
      G: 90,
      H: 90,
      I: 110,
      J: 140,
    },
    frozen_rows: 1,
    frozen_cols: 0,
    cells,
  };
}

// Initial Workbooks Array populated from real rsb1.xlsx, rsb2.xlsx, and rsb3.xlsx with clean names
const rawWbs = (realWorkbooksData as unknown as Workbook[]);

export const INITIAL_WORKBOOKS: Workbook[] = rawWbs.map((wb, index) => {
  let cleanTitle = `RSB-${index + 1} Master Register`;
  if (wb.id === 'wb-rsb1-daily-po') cleanTitle = 'RSB-1 Master Register';
  else if (wb.id === 'wb-rsb2-dc-book') cleanTitle = 'RSB-2 Master Register';
  else if (wb.id === 'wb-rsb3-spare-parts') cleanTitle = 'RSB-3 Master Register';

  return {
    ...wb,
    title: cleanTitle,
    directory_id: '',
    tags: [`Register ${index + 1}`, 'Live Sheet'],
    description: `Master spreadsheet register with comprehensive industrial records.`,
    sheets: wb.sheets.map((sheet, sIdx) => ({
      ...sheet,
      name: sIdx === 0 ? `Sheet1` : sheet.name,
    })),
  };
});

export interface SmartTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  iconName: string;
  defaultDirId: string;
  createSheets: (wbId: string) => WorkbookSheet[];
}

export const SMART_WORKBOOK_TEMPLATES: SmartTemplate[] = [
  {
    id: 'tmpl-blank',
    title: 'Blank Spreadsheet',
    category: 'General',
    description: 'Clean empty spreadsheet grid with 50 rows & 26 columns ready for custom registers.',
    iconName: 'FileSpreadsheet',
    defaultDirId: '',
    createSheets: (wbId) => [
      {
        id: `sheet-${Date.now()}-1`,
        workbook_id: wbId,
        name: 'Sheet1',
        tab_color: '#107c41',
        order_index: 0,
        row_count: 50,
        col_count: 26,
        col_widths: {},
        frozen_rows: 1,
        frozen_cols: 0,
        cells: {},
      },
    ],
  },
  {
    id: 'tmpl-standard-grid',
    title: 'Standard Data Register',
    category: 'General',
    description: 'Pre-formatted tabular spreadsheet ready for structured row and column data.',
    iconName: 'Layers',
    defaultDirId: '',
    createSheets: (wbId) => {
      const headers = ['Sr. No', 'Item Name', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Remarks'];
      const cells: Record<string, SheetCell> = {};
      headers.forEach((h, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        cells[`${colLetter}1`] = makeHeaderCell(h);
      });
      return [
        {
          id: `sheet-${Date.now()}-grid`,
          workbook_id: wbId,
          name: 'Sheet1',
          tab_color: '#3b82f6',
          order_index: 0,
          row_count: 50,
          col_count: 26,
          col_widths: { A: 70, B: 180, C: 220, D: 90, E: 80, F: 110, G: 120, H: 160 },
          frozen_rows: 1,
          frozen_cols: 0,
          cells,
        },
      ];
    },
  },
];
