const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function convertSerialDate(val) {
  if (typeof val === 'number' && val > 25000 && val < 65000) {
    // Excel base date conversion
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const day = dateInfo.getUTCDate();
    const month = dateInfo.getUTCMonth() + 1;
    const year = dateInfo.getUTCFullYear();
    return `${day}/${month}/${year}`;
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

const wb1 = processWorkbook(
  '/Users/kaustubh/Desktop/rsb i/rsb1.xlsx',
  'wb-rsb1-daily-po',
  'dir-daily-po',
  'RSB1 — DAILY PO SHEET RAHUL SIR & 150 BPM',
  'Official 420+ Row Daily PO tracking register with supplier orders, received/pending status and 150 BPM specs.',
  'Daily PO'
);

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
console.log('Successfully generated realRsbWorkbooks.json with rsb1, rsb2, and rsb3!');
