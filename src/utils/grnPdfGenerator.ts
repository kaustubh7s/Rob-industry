import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GRNItem {
  id?: string;
  srNo?: number | string;
  description: string;
  materialType?: string;
  sizeSpecs?: string;
  sizeSpecification?: string;
  orderedQty?: number;
  poQuantity?: number;
  receivedQty?: number;
  receivedQuantity?: number;
  unit: string;
  vendorName?: string;
  projectName?: string;
  machineName?: string;
  targetProject?: string;
  poNumber?: string;
  qcStatus?: 'Accepted' | 'Rejected' | 'Conditional' | string;
  qualityStatus?: string;
  remarks?: string;
  inspectionNotes?: string;
}

export interface GRNOptions {
  grnNumber?: string;
  grnDate?: string;
  receivingTime?: string;
  vendorName?: string;
  vendorGst?: string;
  poNumber?: string;
  challanNumber?: string;
  challanDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  projectName?: string;
  machineName?: string;
  receivedBy?: string;
  inspectedBy?: string;
  authorizedBy?: string;
  qcRemarks?: string;
  items: GRNItem[];
}

const formatDateClean = (dStr?: string): string => {
  if (!dStr) return new Date().toLocaleDateString('en-GB');
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dStr;
  }
};

/**
 * Builds an official high-resolution RSB Goods Receipt Note (GRN / सामग्री आवक पावती) PDF document.
 */
export const buildGRNPdfDoc = (options: GRNOptions): { doc: jsPDF; safeFileName: string } => {
  const {
    grnNumber = `GRN-RSB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    grnDate = new Date().toISOString().split('T')[0],
    receivingTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    vendorName = 'Standard Supplier / Manav Metal',
    vendorGst = '27AABCM8821K1Z8',
    poNumber = 'PO-RSB-2026-073',
    challanNumber = 'DC-8849 / INV-9241',
    challanDate = new Date().toISOString().split('T')[0],
    vehicleNumber = 'MH-20-DE-1234',
    transporterName = 'Direct Factory Delivery',
    projectName = 'Factory General Requirements',
    machineName = 'Standard Plant Assembly',
    receivedBy = 'Chandramani (Store Incharge)',
    inspectedBy = 'Stores Quality & Receiving Inspector',
    authorizedBy = 'Amit / Kaustubh (Director / Plant Head)',
    qcRemarks = 'All materials inspected upon gate arrival. Dimensions, quantities and material grades verified against vendor delivery challan. No physical transit damage observed. Accepted for plant staging & fabrication.',
    items = [],
  } = options;

  const PDFConstructor = (jsPDF as any).jsPDF || jsPDF;
  const doc = new PDFConstructor('portrait', 'mm', 'a4');

  // Page width = 210mm, Margin = 14mm -> Printable width = 182mm

  // 1. TOP HEADER BANNER (Corporate Slate-900)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RSB PRIVATE LIMITED', 14, 11);

  // Sub-industry badge
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('Manufacturing Industry | Plant Engineering & Industrial Machinery', 14, 17);

  // Address & Contacts
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007', 14, 23);
  doc.text('GSTIN: 27AABCR5891M1Z4 | Email: stores@rsbindustry.com | Web: www.rsbindustry.com', 14, 28);

  // 2. DOCUMENT TYPE STRIP (Slate-800 with Emerald Accent)
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 32, 210, 8.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT: GOODS RECEIPT NOTE (GRN)', 14, 37.8);

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFontSize(7.5);
  doc.text('OFFICIAL GATE RECEIVING RECORD', 150, 37.8);

  // 3. TWO-COLUMN METADATA SUMMARY BOX
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 43, 182, 38, 1.5, 1.5, 'FD');

  // Divider Line down the middle
  doc.setDrawColor(226, 232, 240);
  doc.line(105, 45, 105, 79);

  // --- LEFT COLUMN: VENDOR & DELIVERY DETAILS ---
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDOR & DELIVERY INFORMATION:', 18, 49);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(vendorName.substring(0, 38), 18, 55);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  if (vendorGst) {
    doc.text(`Vendor GSTIN: ${vendorGst}`, 18, 61);
  }
  doc.text(`Challan / Inv No: ${challanNumber || '-'}`, 18, vendorGst ? 66.5 : 61);
  doc.text(`Challan Date: ${formatDateClean(challanDate)}`, 18, vendorGst ? 72 : 66.5);

  // --- RIGHT COLUMN: RECEIVING & ORDER REFERENCES ---
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('GRN & ORDER REFERENCES:', 110, 49);

  // GRN No
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('GRN No:', 110, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(grnNumber, 138, 55);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  doc.text('Receipt Date & Time:', 110, 60.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatDateClean(grnDate)} | ${receivingTime}`, 142, 60.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Purchase Order No:', 110, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(poNumber || '-', 142, 66);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Target Project:', 110, 71.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(projectName.substring(0, 26) || '-', 142, 71.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Received By:', 110, 77);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(receivedBy.substring(0, 30), 142, 77);

  // 4. ITEMS TABLE
  const headers = [
    '#',
    'MATERIAL DESCRIPTION',
    'TYPE / GRADE',
    'SIZE SPECIFICATION',
    'PO QTY',
    'ARRIVED',
    'PENDING',
    'UNIT',
    'STATUS',
  ];

  const tableRows = items.map((it, idx) => {
    const sr = it.srNo !== undefined && it.srNo !== null && String(it.srNo).trim() !== '' ? it.srNo : idx + 1;
    const ord = Number(it.orderedQty ?? it.poQuantity) || 0;
    const rec = Number(it.receivedQty ?? it.receivedQuantity) || 0;
    const pen = Math.max(0, ord - rec);
    const spec = it.sizeSpecs || it.sizeSpecification || '-';
    const qc = it.qcStatus || it.qualityStatus || 'Accepted';

    return [
      sr,
      it.description,
      it.materialType || 'SS Flat',
      spec,
      ord > 0 ? String(ord) : '-',
      rec,
      pen > 0 ? pen : '0 (Nil)',
      it.unit || 'Nos',
      qc,
    ];
  });

  autoTable(doc, {
    startY: 86,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, // #
      1: { cellWidth: 46, fontStyle: 'bold', textColor: [15, 23, 42] }, // DESCRIPTION
      2: { cellWidth: 22, textColor: [51, 65, 85] }, // TYPE
      3: { cellWidth: 38, fontStyle: 'bold', textColor: [30, 58, 138] }, // SIZE SPECS
      4: { cellWidth: 14, halign: 'center', fontStyle: 'normal' }, // PO QTY
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] }, // ARRIVED
      6: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] }, // PENDING
      7: { cellWidth: 10, halign: 'center' }, // UNIT
      8: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] }, // INSPECTION
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;

  // 5. REMARKS (SIMPLE & CLEAN)
  const remarksY = finalY + 4;
  if (qcRemarks && qcRemarks.trim() && remarksY < 240) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`Remarks: ${qcRemarks.trim()}`, 14, remarksY + 4);
  }

  // 6. OFFICIAL 2-TIER SIGNATURE BLOCKS
  const sigY = Math.max(remarksY + 16, 252);

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineDashPattern([1, 1], 0);

  // Line 1: Store Receiver
  doc.line(20, sigY, 90, sigY);
  // Line 2: Authorized Signatory / QC
  doc.line(120, sigY, 190, sigY);

  doc.setLineDashPattern([], 0);

  // Receiver Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Material Received By (Stores)', 30, sigY + 4.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // blue
  doc.text(receivedBy, 28, sigY + 8.5);

  // Inspector / Authorized Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Inspected & Verified By (QC / Ops)', 130, sigY + 4.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(authorizedBy, 130, sigY + 8.5);

  // 7. FOOTER BAR
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Goods Receipt Note - RSB PRIVATE LIMITED | Date: ${formatDateClean(grnDate)} | GRN: ${grnNumber}`,
    14,
    288
  );

  const cleanFileTag = (vendorName || projectName || 'Consignment').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = `${grnNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cleanFileTag}.pdf`;

  return { doc, safeFileName };
};

/**
 * Directly downloads the generated GRN PDF in the user's browser.
 */
export const downloadGRNPdf = (options: GRNOptions): string => {
  const { doc, safeFileName } = buildGRNPdfDoc(options);
  doc.save(safeFileName);
  return safeFileName;
};

/**
 * Creates a Blob URL for interactive in-browser preview of the GRN PDF.
 */
export const createGRNPdfBlobUrl = (options: GRNOptions): string => {
  const { doc } = buildGRNPdfDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};
