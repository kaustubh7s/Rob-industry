const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function convertSerialDate(val) {
  if (typeof val === 'number' && val > 25000 && val < 65000) {
    // Excel base date conversion
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(dateInfo.getUTCDate()).padStart(2, '0');
    const month = months[dateInfo.getUTCMonth()];
    const year = String(dateInfo.getUTCFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }
  return val;
}

function processWorkbook(filePath, wbId, dirId, title, desc, tag) {
  const wb = XLSX.readFile(filePath);
  const sheets = wb.SheetNames.map((sheetName, sIdx) => {
    const ws = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
    const rowCount = Math.max(range.e.r + 1, 50);
    const colCount = Math.max(range.e.c + 1, 26);
    const cells = {};
    const colWidths = {};

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        const isRow1Header = R === 0;
        let val = cell.w || cell.v;
        let formula = cell.f ? `=${cell.f}` : undefined;

        if (typeof cell.v === 'number' && !cell.w) {
          val = convertSerialDate(cell.v);
        }

        let format = 'general';
        if (typeof val === 'number') {
          format = 'number';
        } else if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
          format = 'date';
        }

        cells[cellAddress] = {
          v: formula ? null : val,
          f: formula,
          bold: isRow1Header || !!cell.s?.font?.bold,
          align: isRow1Header ? 'center' : typeof val === 'number' ? 'right' : 'left',
          format,
          bgColor: isRow1Header ? '#ffffff' : undefined,
          textColor: '#0f172a',
        };

        const colKey = XLSX.utils.encode_col(C);
        const valStr = String(val || '');
        const estWidth = Math.min(Math.max(valStr.length * 8 + 35, 95), 320);
        if (!colWidths[colKey] || estWidth > colWidths[colKey]) {
          colWidths[colKey] = estWidth;
        }
      }
    }

    // Ensure A1 header exists
    if (!cells['A1'] && sIdx === 0) {
      cells['A1'] = {
        v: 'Sr. No',
        bold: true,
        align: 'center',
        format: 'text',
        textColor: '#0f172a',
      };
      if (!colWidths['A']) colWidths['A'] = 80;
    }

    return {
      id: `sheet-${wbId}-${sIdx}`,
      workbook_id: wbId,
      name: sheetName.trim() || `Sheet${sIdx + 1}`,
      tab_color: sIdx === 0 ? '#107c41' : '#3b82f6',
      order_index: sIdx,
      row_count: rowCount,
      col_count: colCount,
      col_widths: colWidths,
      frozen_rows: 1,
      frozen_cols: 0,
      cells,
    };
  });

  return {
    id: wbId,
    directory_id: dirId,
    title,
    description: desc,
    created_by: 'usr-amit',
    created_by_name: 'Amit',
    created_at: '2026-09-01T09:00:00Z',
    last_edited_by: 'usr-kaustubh',
    last_edited_by_name: 'Kaustubh',
    last_edited_at: '2026-10-04T10:45:00Z',
    is_pinned: true,
    is_favorite: true,
    tags: [tag, 'RSB Live Excel'],
    sheets,
  };
}

function processRSB1Workbook(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws0 = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
  const range0 = XLSX.utils.decode_range(ws0['!ref'] || 'A1:P425');

  const sheet0Cells = {
    A1: { v: 'Sr. No', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    B1: { v: 'Date', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    C1: { v: 'PO NO', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    D1: { v: 'PO Type', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    E1: { v: 'Material', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    F1: { v: 'Specifications', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    G1: { v: 'Qty', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    H1: { v: 'Received', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    I1: { v: 'PENDING', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    J1: { v: 'Supplier Name', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    K1: { v: 'M/C', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    L1: { v: 'Remarks', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    M1: { v: 'COUSTMER CODE', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    N1: { v: 'PO Status', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    O1: { v: 'order by', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    P1: { v: 'COMMENT', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
  };

  for (let R = 1; R <= range0.e.r; ++R) {
    const rowNum = R + 1;
    sheet0Cells[`A${rowNum}`] = {
      v: R,
      bold: false,
      align: 'center',
      format: 'number',
      textColor: '#0f172a',
    };

    for (let C = 1; C <= Math.max(range0.e.c, 15); ++C) {
      const origAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws0[origAddr];
      if (!cell) continue;

      let val = cell.w || cell.v;
      if (typeof cell.v === 'number' && !cell.w) {
        val = convertSerialDate(cell.v);
      }
      const targetCol = XLSX.utils.encode_col(C);
      sheet0Cells[`${targetCol}${rowNum}`] = {
        v: val,
        bold: false,
        align: C === 1 ? 'center' : typeof val === 'number' ? 'right' : 'left',
        format: typeof val === 'number' ? 'number' : 'text',
        textColor: '#0f172a',
      };
    }
  }

  // Sheet 1 (150 BPM)
  const ws1 = wb.Sheets['150 BPM '] || wb.Sheets[wb.SheetNames[1]];
  const sheet1Cells = {
    A1: { v: 'Sr. No', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    B1: { v: 'TYPE OF MATERIAL', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    C1: { v: 'SIZE OF MATERIAL', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    D1: { v: 'QTY', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
    E1: { v: 'REMARK', bold: true, align: 'center', format: 'text', bgColor: '#ffffff', textColor: '#0f172a' },
  };

  if (ws1) {
    let dataRowCount = 0;
    for (let R = 3; R <= 38; R++) {
      const bVal = ws1[`B${R + 1}`]?.v;
      if (!bVal) continue;
      dataRowCount++;
      const targetRow = dataRowCount + 1;
      sheet1Cells[`A${targetRow}`] = { v: dataRowCount, bold: false, align: 'center', format: 'number', textColor: '#0f172a' };
      sheet1Cells[`B${targetRow}`] = { v: ws1[`B${R + 1}`]?.v || '', bold: false, align: 'left', format: 'text', textColor: '#0f172a' };
      sheet1Cells[`C${targetRow}`] = { v: ws1[`C${R + 1}`]?.v || '', bold: false, align: 'left', format: 'text', textColor: '#0f172a' };
      sheet1Cells[`D${targetRow}`] = { v: ws1[`D${R + 1}`]?.v || '', bold: false, align: 'center', format: 'text', textColor: '#0f172a' };
      sheet1Cells[`E${targetRow}`] = { v: ws1[`E${R + 1}`]?.v || '', bold: false, align: 'left', format: 'text', textColor: '#0f172a' };
    }
  }

  return {
    id: 'wb-rsb1-daily-po',
    directory_id: 'dir-daily-po',
    title: 'RSB1 — DAILY PO SHEET RAHUL SIR & 150 BPM',
    description: 'Official 420+ Row Daily PO tracking register with supplier orders, received/pending status and 150 BPM specs.',
    created_by: 'usr-amit',
    created_by_name: 'Amit',
    created_at: '2026-09-01T09:00:00Z',
    last_edited_by: 'usr-kaustubh',
    last_edited_by_name: 'Kaustubh',
    last_edited_at: '2026-10-04T10:45:00Z',
    is_pinned: true,
    is_favorite: true,
    tags: ['Daily PO', 'RSB Live Excel'],
    sheets: [
      {
        id: 'sheet-wb-rsb1-daily-po-0',
        workbook_id: 'wb-rsb1-daily-po',
        name: 'Sheet1',
        tab_color: '#107c41',
        order_index: 0,
        row_count: Math.max(range0.e.r + 5, 100),
        col_count: 26,
        col_widths: { A: 70, B: 110, C: 90, D: 90, E: 200, F: 240, G: 90, H: 110, I: 100, J: 200, K: 110, L: 220, M: 240, N: 120, O: 130, P: 180 },
        frozen_rows: 1,
        frozen_cols: 0,
        cells: sheet0Cells,
      },
      {
        id: 'sheet-wb-rsb1-daily-po-1',
        workbook_id: 'wb-rsb1-daily-po',
        name: '150 BPM',
        tab_color: '#3b82f6',
        order_index: 1,
        row_count: 50,
        col_count: 26,
        col_widths: { A: 70, B: 220, C: 260, D: 90, E: 220 },
        frozen_rows: 1,
        frozen_cols: 0,
        cells: sheet1Cells,
      }
    ],
  };
}

const wb1 = processRSB1Workbook('/Users/kaustubh/Desktop/rsb i/rsb1.xlsx');

const wb2 = processWorkbook(
  '/Users/kaustubh/Desktop/rsb i/rsb2.xlsx',
  'wb-rsb2-dc-book',
  'dir-dc-book',
  'RSB2 — DC BOOK & VENDOR JOB WORK (3,000+ ROWS)',
  'Complete Subcontracting DC Book, Vendor Job Works, Quotations, Conveyors, and LM Material registers.',
  'DC Book'
);

const wb3 = processWorkbook(
  '/Users/kaustubh/Desktop/rsb i/rsb3.xlsx',
  'wb-rsb3-spare-parts',
  'dir-spare-parts',
  'RSB3 — SPARE PART DC & MACHINE BOM (1,300+ ROWS)',
  'Customer Spare Parts delivery challan list, Party rates, Mobile numbers, and Machine PO 001 Material BOM.',
  'Spare Parts'
);

const outputJson = JSON.stringify([wb1, wb2, wb3], null, 2);
fs.writeFileSync('/Users/kaustubh/Desktop/rsb i/src/data/realRsbWorkbooks.json', outputJson);
console.log('Successfully generated realRsbWorkbooks.json with accurate RSB-1 column headers and serial numbers!');
