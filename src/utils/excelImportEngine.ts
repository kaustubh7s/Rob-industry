import * as XLSX from 'xlsx';
import { MaterialType } from '../types/erp';

export interface ColumnMappingOption {
  key: string;
  label: string;
  required?: boolean;
}

export const ERP_TARGET_COLUMNS: ColumnMappingOption[] = [
  { key: 'srNo', label: 'Sr. No.', required: false },
  { key: 'projectName', label: 'Project Name / Customer', required: false },
  { key: 'machineName', label: 'Machine Name', required: false },
  { key: 'date', label: 'Date', required: false },
  { key: 'poNo', label: 'PO No.', required: false },
  { key: 'materialType', label: 'Material Type', required: false },
  { key: 'sizeSpecs', label: 'Size Specification', required: false },
  { key: 'quantity', label: 'Quantity', required: false },
  { key: 'unit', label: 'Unit (UOM)', required: false },
  { key: 'vendorName', label: 'Vendor Name', required: false },
  { key: 'description', label: 'Description / Particulars', required: false },
  { key: 'orderedBy', label: 'Ordered By', required: false },
];

export interface DetectedColumn {
  sourceIndex: number;
  sourceHeader: string;
  mappedField: string; // key of ERP_TARGET_COLUMNS or 'ignore'
  confidence: number; // 0 to 1
  sampleValues: (string | number)[];
}

export interface DetectedReportMetadata {
  customerName?: string;
  projectName?: string;
  machineName?: string;
  poNumber?: string;
  date?: string;
  vendorName?: string;
}

export interface ParsedImportRow {
  sourceRowIndex: number;
  srNo: string | number;
  projectName?: string;
  machineName?: string;
  date?: string;
  poNo?: string;
  materialType?: MaterialType;
  sizeSpecs?: string;
  quantity?: number;
  unit?: string;
  vendorName?: string;
  description?: string;
  orderedBy?: string;
  rawSourceData: Record<string, any>;
}

export interface SheetAnalysisResult {
  sheetNames: string[];
  activeSheetName: string;
  headerRowIndex: number; // 0-based index
  detectedMetadata: DetectedReportMetadata;
  columnMappings: DetectedColumn[];
  parsedRows: ParsedImportRow[];
  totalRawRows: number;
  unmappedColumns: string[];
}

// Synonyms dictionary for industrial manufacturing Excel formats
const FIELD_SYNONYMS: Record<string, string[]> = {
  srNo: [
    'sr no', 'sr. no', 'sr. no.', 'sr.no', 'sr.no.', 'sr #', 'sr_no',
    's no', 's. no', 's. no.', 's.no', 's.no.', 'sno', 'sl no', 'sl. no', 'sl.no',
    's.n.', 's.n', 'sn',
    'serial no', 'serial number', 'serial no.', 'serial #',
    'item no', 'item no.', 'item #', 'item number', 'line no', 'line item', '#'
  ],
  projectName: [
    'project name', 'project', 'project code', 'project no', 'project #', 'proj name',
    'customer name', 'customer', 'customer code', 'client name', 'client',
    'job code', 'job name', 'job number', 'job no', 'order id', 'order name'
  ],
  machineName: [
    'machine name', 'machine', 'equipment name', 'equipment', 'unit name',
    'sub assembly', 'assembly name', 'assembly', 'machine model', 'line name', 'target plant'
  ],
  date: [
    'date', 'order date', 'po date', 'purchase order date', 'indent date',
    'entry date', 'creation date', 'doc date', 'voucher date'
  ],
  poNo: [
    'po no', 'po no.', 'po number', 'purchase order no', 'purchase order no.',
    'purchase order number', 'p.o. no', 'p.o. no.', 'po #', 'p.o #', 'indent no'
  ],
  materialType: [
    'material type', 'material', 'product type', 'item type', 'metal type',
    'raw material type', 'category', 'grade / type'
  ],
  sizeSpecs: [
    'size specification', 'size specifications', 'size specs', 'size spec',
    'size', 'dimensions', 'dimension', 'specification', 'specifications',
    'specs', 'measurements', 'profile size', 'plate size', 'section'
  ],
  quantity: [
    'quantity', 'qty', 'required qty', 'req qty', 'order qty', 'indented qty',
    'pcs', 'numbers', 'nos', 'total qty', 'billed qty'
  ],
  unit: [
    'unit', 'uom', 'unit of measure', 'unit of measurement', 'units', 'measuring unit'
  ],
  vendorName: [
    'vendor name', 'vendor', 'supplier name', 'supplier', 'party name',
    'party', 'contractor', 'fabricator', 'supplier / party name'
  ],
  description: [
    'description', 'item description', 'part description', 'particulars',
    'item particulars', 'component description', 'material description',
    'details', 'name of item', 'part name', 'component name', 'item name', 'material name'
  ],
  orderedBy: [
    'ordered by', 'prepared by', 'requested by', 'indented by', 'entered by', 'user'
  ],
};

export const FIELD_SYNONYMS_DICT = FIELD_SYNONYMS;

export function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[_\-\/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchHeaderToField(header: string): string {
  const normalized = normalizeHeader(header);
  let bestField = 'ignore';
  let bestScore = 0;

  for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of synonyms) {
      if (normalized === syn) {
        return fieldKey;
      } else if (normalized.includes(syn) || syn.includes(normalized)) {
        if (bestScore < 0.75) {
          bestField = fieldKey;
          bestScore = 0.75;
        }
      }
    }
  }
  return bestField;
}

/**
 * Extract clean string / numeric representation from cell, preserving exact format
 */
export function extractRawCellValue(cell: XLSX.CellObject | undefined): string | number {
  if (!cell) return '';
  if (cell.t === 's' || typeof cell.v === 'string') {
    return String(cell.w ?? cell.v ?? '').trim();
  }
  if (cell.t === 'n' && typeof cell.v === 'number') {
    if (cell.w && cell.w.startsWith('0') && cell.w.length > 1 && !cell.w.includes('.')) {
      return cell.w.trim();
    }
    return cell.v;
  }
  return String(cell.w ?? cell.v ?? '').trim();
}

/**
 * Analyze an entire sheet, scanning for banner metadata, header row, column mappings, and data
 */
export function analyzeWorksheet(workbook: XLSX.WorkBook, sheetName: string): SheetAnalysisResult {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet || !worksheet['!ref']) {
    return {
      sheetNames: workbook.SheetNames,
      activeSheetName: sheetName,
      headerRowIndex: 0,
      detectedMetadata: {},
      columnMappings: [],
      parsedRows: [],
      totalRawRows: 0,
      unmappedColumns: [],
    };
  }

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const maxRows = Math.min(range.e.r + 1, 1000);
  const maxCols = range.e.c + 1;

  const rowDataList: (string | number)[][] = [];
  for (let r = 0; r < maxRows; r++) {
    const rowCells: (string | number)[] = [];
    for (let c = 0; c < maxCols; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];
      rowCells.push(extractRawCellValue(cell));
    }
    rowDataList.push(rowCells);
  }

  // 1. Scan for pre-header report metadata (e.g., Customer, PO, Project in introductory rows)
  const detectedMetadata: DetectedReportMetadata = {};
  const metadataScanLimit = Math.min(10, rowDataList.length);

  for (let r = 0; r < metadataScanLimit; r++) {
    const rowText = rowDataList[r].map((v) => String(v).trim()).filter(Boolean).join(' ');
    if (!rowText) continue;

    // Scan cell-by-cell first
    rowDataList[r].forEach((cellVal) => {
      const cellStr = String(cellVal || '').trim();
      if (!cellStr) return;

      const poCell = cellStr.match(/(?:PO|Purchase\s*Order)\s*(?:No|Number|#)?\s*[:=\-]\s*([A-Za-z0-9.,\-\/]+)/i);
      if (poCell && !detectedMetadata.poNumber) {
        detectedMetadata.poNumber = poCell[1].trim();
      }
      const vendorCell = cellStr.match(/(?:Supplier|Vendor|Party)\s*(?:Name)?\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+)/i);
      if (vendorCell && !detectedMetadata.vendorName) {
        detectedMetadata.vendorName = vendorCell[1].trim();
      }
      const prjCell = cellStr.match(/(?:Project|Job)\s*(?:Name|Code)?\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+)/i);
      if (prjCell && !detectedMetadata.projectName) {
        detectedMetadata.projectName = prjCell[1].trim();
      }
      const custCell = cellStr.match(/(?:Customer|Client)\s*(?:Name|Code)?\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+)/i);
      if (custCell && !detectedMetadata.customerName) {
        detectedMetadata.customerName = custCell[1].trim();
      }
    });

    // Customer
    const custMatch = rowText.match(/(?:Customer|Client)\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+?)(?=(?:\s{2,}|Project|Job|PO|Date|Supplier|Vendor|Party|$))/i);
    if (custMatch && !detectedMetadata.customerName) {
      detectedMetadata.customerName = custMatch[1].trim();
    }

    // Project
    const prjMatch = rowText.match(/(?:Project|Job)\s*(?:Name|Code)?\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+?)(?=(?:\s{2,}|Customer|Client|PO|Date|Supplier|Vendor|Party|$))/i);
    if (prjMatch && !detectedMetadata.projectName) {
      detectedMetadata.projectName = prjMatch[1].trim();
    }

    // PO Number
    const poMatch = rowText.match(/(?:PO|Purchase\s*Order)\s*(?:No|Number|#)?\s*[:=\-]\s*([A-Za-z0-9\s.,\-\/]+?)(?=(?:\s{2,}|Date|Customer|Client|Project|Job|Supplier|Vendor|Party|$))/i);
    if (poMatch && !detectedMetadata.poNumber) {
      detectedMetadata.poNumber = poMatch[1].trim();
    }

    // Date
    const dateMatch = rowText.match(/(?:Date|PO\s*Date)\s*[:=\-]\s*([0-9]{1,4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,4})/i);
    if (dateMatch && !detectedMetadata.date) {
      detectedMetadata.date = dateMatch[1].trim();
    }

    // Supplier / Vendor
    const vendorMatch = rowText.match(/(?:Supplier|Vendor|Party)\s*[:=\-]\s*([A-Za-z0-9\s&.,\-]+?)(?=(?:\s{2,}|Customer|Client|Project|Job|PO|Date|$))/i);
    if (vendorMatch && !detectedMetadata.vendorName) {
      detectedMetadata.vendorName = vendorMatch[1].trim();
    }
  }

  // 2. Identify the true header row
  let headerRowIndex = 0;
  let maxHeaderScore = -1;

  for (let r = 0; r < Math.min(15, rowDataList.length); r++) {
    const row = rowDataList[r];
    const filledCount = row.filter((v) => String(v).trim().length > 0).length;
    if (filledCount < 2) continue;

    let score = 0;
    row.forEach((cellVal) => {
      const normalized = normalizeHeader(cellVal);
      if (!normalized) return;

      for (const [, synonyms] of Object.entries(FIELD_SYNONYMS)) {
        if (synonyms.some((syn) => syn === normalized || normalized.includes(syn))) {
          score += 10;
          break;
        }
      }
    });

    if (score > maxHeaderScore) {
      maxHeaderScore = score;
      headerRowIndex = r;
    }
  }

  // 3. Map detected headers to ERP destination fields
  const headerRow = rowDataList[headerRowIndex] || [];
  const columnMappings: DetectedColumn[] = [];
  const assignedFields = new Set<string>();

  headerRow.forEach((colHeaderRaw, colIdx) => {
    const colHeader = String(colHeaderRaw || '').trim();
    if (!colHeader) return;

    const normalized = normalizeHeader(colHeader);
    let bestField = 'ignore';
    let bestScore = 0;

    for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (assignedFields.has(fieldKey)) continue;

      for (const syn of synonyms) {
        if (normalized === syn) {
          bestField = fieldKey;
          bestScore = 1.0;
          break;
        } else if (normalized.includes(syn) || syn.includes(normalized)) {
          if (bestScore < 0.75) {
            bestField = fieldKey;
            bestScore = 0.75;
          }
        }
      }
      if (bestScore === 1.0) break;
    }

    // Sample data values (first 3 valid rows below header)
    const sampleValues: (string | number)[] = [];
    for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 6, rowDataList.length); r++) {
      const val = rowDataList[r]?.[colIdx];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        sampleValues.push(val);
      }
    }

    if (bestField !== 'ignore') {
      assignedFields.add(bestField);
    }

    columnMappings.push({
      sourceIndex: colIdx,
      sourceHeader: colHeader,
      mappedField: bestField,
      confidence: bestScore,
      sampleValues,
    });
  });

  // 4. Parse material rows starting below header row
  const parsedRows: ParsedImportRow[] = [];
  const colMap = new Map<string, number>();
  columnMappings.forEach((m) => {
    if (m.mappedField && m.mappedField !== 'ignore') {
      colMap.set(m.mappedField, m.sourceIndex);
    }
  });

  for (let r = headerRowIndex + 1; r < rowDataList.length; r++) {
    const row = rowDataList[r];
    const isRowEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === '');
    if (isRowEmpty) continue;

    // Check if this row is an accidental duplicate header row inside the table
    const isRepeatedHeader = row.some((c) => {
      const norm = normalizeHeader(c);
      return norm === 'sr no' || norm === 'description' || norm === 'size specification';
    });
    if (isRepeatedHeader) continue;

    const rawSourceData: Record<string, any> = {};
    columnMappings.forEach((m) => {
      rawSourceData[m.sourceHeader] = row[m.sourceIndex] ?? '';
    });

    // Extract values
    const rawSrNo = colMap.has('srNo') ? row[colMap.get('srNo')!] : undefined;
    const desc = colMap.has('description') ? String(row[colMap.get('description')!] || '').trim() : '';
    const size = colMap.has('sizeSpecs') ? String(row[colMap.get('sizeSpecs')!] || '').trim() : '';
    const qtyRaw = colMap.has('quantity') ? row[colMap.get('quantity')!] : undefined;
    const unit = colMap.has('unit') ? String(row[colMap.get('unit')!] || '').trim() : 'Nos';
    const matTypeRaw = colMap.has('materialType') ? String(row[colMap.get('materialType')!] || '').trim() : '';
    const prj = colMap.has('projectName') ? String(row[colMap.get('projectName')!] || '').trim() : detectedMetadata.projectName || detectedMetadata.customerName || '';
    const mch = colMap.has('machineName') ? String(row[colMap.get('machineName')!] || '').trim() : detectedMetadata.machineName || '';
    const date = colMap.has('date') ? String(row[colMap.get('date')!] || '').trim() : detectedMetadata.date || '';
    const po = colMap.has('poNo') ? String(row[colMap.get('poNo')!] || '').trim() : detectedMetadata.poNumber || '';
    const vendor = colMap.has('vendorName') ? String(row[colMap.get('vendorName')!] || '').trim() : detectedMetadata.vendorName || '';
    const orderedBy = colMap.has('orderedBy') ? String(row[colMap.get('orderedBy')!] || '').trim() : '';

    // If description and sizeSpecs and qty are all blank, skip non-material row
    if (!desc && !size && qtyRaw === undefined) continue;

    // Clean Quantity without converting custom units
    let parsedQty = 1;
    if (qtyRaw !== undefined && qtyRaw !== null && String(qtyRaw).trim() !== '') {
      const numericMatch = String(qtyRaw).match(/([0-9]+(?:\.[0-9]+)?)/);
      if (numericMatch) {
        parsedQty = parseFloat(numericMatch[1]);
      }
    }

    // Material type normalization without dropping custom types
    let parsedMatType: MaterialType = 'SS Flat';
    const cleanMatType = matTypeRaw.toLowerCase();
    if (cleanMatType.includes('pipe')) parsedMatType = 'SS Pipe';
    else if (cleanMatType.includes('plate') || cleanMatType.includes('sheet')) parsedMatType = 'SS Sheet';
    else if (cleanMatType.includes('bar') || cleanMatType.includes('round')) parsedMatType = 'SS Bar';
    else if (cleanMatType.includes('circle')) parsedMatType = 'SS Circle';
    else if (cleanMatType.includes('angle')) parsedMatType = 'SS Angle';
    else if (cleanMatType.includes('hardware') || cleanMatType.includes('fastener')) parsedMatType = 'Hardware';
    else if (matTypeRaw) parsedMatType = matTypeRaw as MaterialType;

    // CRITICAL REQUIREMENT: PRESERVE EXACT ORIGINAL SR NO
    let finalSrNo: string | number = '';
    if (rawSrNo !== undefined && rawSrNo !== null && String(rawSrNo).trim() !== '') {
      finalSrNo = rawSrNo;
    } else {
      finalSrNo = parsedRows.length + 1;
    }

    parsedRows.push({
      sourceRowIndex: r + 1,
      srNo: finalSrNo,
      projectName: prj,
      machineName: mch,
      date,
      poNo: po,
      materialType: parsedMatType,
      sizeSpecs: size,
      quantity: parsedQty,
      unit: unit || 'Nos',
      vendorName: vendor,
      description: desc,
      orderedBy,
      rawSourceData,
    });
  }

  const unmapped = columnMappings.filter((m) => m.mappedField === 'ignore').map((m) => m.sourceHeader);

  return {
    sheetNames: workbook.SheetNames,
    activeSheetName: sheetName,
    headerRowIndex,
    detectedMetadata,
    columnMappings,
    parsedRows,
    totalRawRows: rowDataList.length,
    unmappedColumns: unmapped,
  };
}

/**
 * High-level parser that reads uploaded File and returns SheetAnalysisResult
 */
export async function analyzeExcelFile(file: File, selectedSheet?: string): Promise<{
  workbook: XLSX.WorkBook;
  analysis: SheetAnalysisResult;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: true,
    cellText: true,
  });

  const targetSheet = selectedSheet && workbook.SheetNames.includes(selectedSheet)
    ? selectedSheet
    : workbook.SheetNames[0];

  const analysis = analyzeWorksheet(workbook, targetSheet);

  return {
    workbook,
    analysis,
  };
}
