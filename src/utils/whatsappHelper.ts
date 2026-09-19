import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface WhatsAppPOItem {
  id?: string;
  projectName?: string;
  machineName?: string;
  machineType?: string;
  description: string;
  materialType?: string;
  sizeSpecs: string;
  quantity: number;
  unit?: string;
  materialGrade?: string;
  vendor?: string;
  vendorName?: string;
  notes?: string;
}

export interface WhatsAppPOMessageOptions {
  poNumber?: string;
  vendorName: string;
  vendorMobile?: string;
  vendorContactPerson?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  paymentTerms?: string;
  status?: string;
  projectName?: string;
  machineName?: string;
  dateOfIssue?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: WhatsAppPOItem[];
}

/**
 * Formats a clean, concise notification message for WhatsApp
 * (Instructing vendor to check the attached PDF Purchase Order directly)
 */
/**
 * Cleans vendor name to ensure professional presentation without unwanted symbols
 */
export const cleanVendorName = (vendor?: string): string => {
  if (!vendor || vendor.trim() === '' || vendor.toLowerCase() === 'unassigned') {
    return 'Unassigned';
  }
  let clean = vendor.replace(/[+*#•·._🏢🏛️🏷️📦\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.toLowerCase() === 'kaustubh') return 'Kaustubh';
  return clean;
};

export const formatWhatsAppPOMessage = (options: WhatsAppPOMessageOptions): string => {
  const {
    poNumber = `PO-RSB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    projectName = 'jkjdsasds',
    dateOfIssue = new Date().toISOString().split('T')[0],
    expectedDeliveryDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    items,
  } = options;

  const totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  // Group breakdown by vendor in sequence
  const vendorBreakdown: Record<string, number> = {};
  items.forEach((item) => {
    const v = cleanVendorName(item.vendor || item.vendorName);
    vendorBreakdown[v] = (vendorBreakdown[v] || 0) + 1;
  });
  const vendorEntries = Object.entries(vendorBreakdown);

  let msg = `*🏭 RSB PRIVATE LIMITED*\n`;
  msg += `_Manufacturing Industry_\n`;
  msg += `*DOCUMENT TYPE:* MATERIAL PURCHASE ORDER\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *PO Number:* ${poNumber}\n`;
  msg += `📁 *Project Name:* ${projectName}\n`;
  msg += `📅 *Date of Issue:* ${dateOfIssue}\n`;
  msg += `🎯 *Target Delivery:* ${expectedDeliveryDate}\n`;
  msg += `📦 *Total Materials:* ${items.length} Parts (${totalQty} Nos Total)\n`;

  if (vendorEntries.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏢 *ASSIGNED VENDORS & SCOPE:*\n`;
    vendorEntries.forEach(([vnd, count]) => {
      msg += `• *${vnd}:* ${count} ${count === 1 ? 'Part' : 'Parts'}\n`;
    });
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📎 *Official Master Purchase Order PDF is attached with this message.*\n\n`;
  msg += `📍 *Delivery Address:*\nRSB PRIVATE LIMITED\nF, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana,\nChhatrapati Sambhajinagar, Maharashtra 431007\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_RSB Cloud Manufacturing ERP_`;

  return msg;
};

/**
 * Resolves accurate phone number for vendor
 */
export const getVendorMobile = (
  vendorName: string,
  vendorsList: { name: string; mobile?: string }[] = []
): string => {
  const norm = (vendorName || '').trim().toLowerCase();
  if (norm === 'kaustubh' || norm.includes('kaustubh')) {
    return '+91 7276939301';
  }
  const matched = vendorsList.find((v) => (v.name || '').trim().toLowerCase() === norm);
  if (matched && matched.mobile) {
    return matched.mobile;
  }
  if (norm.includes('manav')) return '+91 98250 12345';
  if (norm.includes('apex')) return '+91 94260 88776';
  if (norm.includes('precision')) return '+91 98980 33211';
  if (norm.includes('jindal')) return '+91 98110 44552';
  return '+91 7276939301';
};

/**
 * Cleans phone number and formats for WhatsApp wa.me link
 */
export const cleanWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '917276939301';
  let digits = phone.replace(/\D/g, '');
  
  // If Indian 10-digit number without country code, prepend 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  // If starts with 0 and has 11 digits, replace 0 with 91
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.substring(1);
  }
  
  return digits || '917276939301';
};

/**
 * Creates direct WhatsApp Web / App intent URL
 */
export const createWhatsAppUrl = (phone: string | undefined, message: string): string => {
  const cleanPhone = cleanWhatsAppNumber(phone || '7276939301');
  const encodedText = encodeURIComponent(message);
  
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

/**
 * Generates official RSB PRIVATE LIMITED Material Purchase Order PDF
 * matching the exact corporate multi-column layout and 3-tier signature structure.
 */
export const generatePurchaseOrderPDF = (options: WhatsAppPOMessageOptions): string => {
  const {
    poNumber = `PO-RSB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    vendorName,
    status = 'Sent',
    projectName = 'jkjdsasds',
    machineName,
    dateOfIssue = new Date().toISOString().split('T')[0],
    expectedDeliveryDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes,
    items,
  } = options;

  // Strict sequential sorting by vendor name (Vendor A parts first, then Vendor B parts, then Vendor C parts)
  const sequentialItems = [...items].sort((a, b) => {
    const vA = cleanVendorName(a.vendor || a.vendorName);
    const vB = cleanVendorName(b.vendor || b.vendorName);
    const vComp = vA.localeCompare(vB);
    if (vComp !== 0) return vComp;
    const mA = (a.machineName || a.machineType || '').toLowerCase();
    const mB = (b.machineName || b.machineType || '').toLowerCase();
    const mComp = mA.localeCompare(mB);
    if (mComp !== 0) return mComp;
    return (a.description || '').localeCompare(b.description || '');
  });

  const distinctVendors = Array.from(
    new Set(
      sequentialItems
        .map((i) => cleanVendorName(i.vendor || i.vendorName))
        .filter((v) => v && v !== 'Unassigned')
    )
  );

  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Top Dark Corporate Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Company Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RSB PRIVATE LIMITED', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('Manufacturing Industry', 14, 17);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007', 14, 23);
  doc.text('GSTIN: 27AABCR5891M1Z4 | Email: purchase@rsbindustry.com | Web: www.rsbindustry.com', 14, 28);

  // Document Type Header Strip
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 32, 210, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT TYPE: MATERIAL PURCHASE ORDER', 14, 37.5);

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`STATUS: ${status.toUpperCase()}`, 168, 37.5);

  // Two-Column Metadata Box (Project & Procurement Details + Order References)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 43, 182, 34, 1.5, 1.5, 'FD');

  // Left Column: PROJECT & PROCUREMENT DETAILS
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT & PROCUREMENT DETAILS:', 18, 49);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Project: ${projectName || 'jkjdsasds'}`, 18, 55);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const vendorSummaryStr = distinctVendors.length > 0 ? distinctVendors.join(', ') : 'All Assigned Suppliers';
  doc.text(`Assigned Vendors: ${vendorSummaryStr}`.substring(0, 60), 18, 60);
  doc.text(`Scope: All ${sequentialItems.length} Materials (Sequential Vendor Grouping)`, 18, 65);
  doc.text('Delivery: RSB Manufacturing Works, Chhatrapati Sambhajinagar', 18, 70);

  // Right Column: ORDER REFERENCES
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER REFERENCES:', 115, 49);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text('PO Number:', 115, 55);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(poNumber, 150, 55);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Date of Issue:', 115, 61);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dateOfIssue, 150, 61);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Target Delivery:', 115, 67);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(expectedDeliveryDate, 150, 67);

  // Check if items have multiple vendors
  const hasVendors = sequentialItems.some((i) => i.vendor || i.vendorName);

  const headers = hasVendors
    ? [
        '#',
        'PROJECT NAME',
        'MACHINE NAME',
        'MATERIAL DESCRIPTION',
        'MATERIAL TYPE',
        'SIZE SPECIFICATION',
        'QTY',
        'UNIT',
        'ASSIGNED VENDOR',
      ]
    : [
        '#',
        'PROJECT NAME',
        'MACHINE NAME',
        'MATERIAL DESCRIPTION',
        'MATERIAL TYPE',
        'SIZE SPECIFICATION',
        'QTY',
        'UNIT',
      ];

  const rows = sequentialItems.map((item, idx) => {
    const base = [
      idx + 1,
      item.projectName || projectName || 'jkjdsasds',
      item.machineName || machineName || 'Standard Machine',
      item.description,
      item.materialType || 'SS Flat',
      item.sizeSpecs,
      item.quantity,
      item.unit || 'Nos',
    ];
    if (hasVendors) {
      base.push(cleanVendorName(item.vendor || item.vendorName));
    }
    return base;
  });

  autoTable(doc, {
    startY: 81,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
    },
    columnStyles: hasVendors
      ? {
          0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' }, // #
          1: { cellWidth: 22, fontStyle: 'bold', textColor: [30, 41, 59] }, // PROJECT NAME
          2: { cellWidth: 18, fontStyle: 'bold', textColor: [79, 70, 229] }, // MACHINE NAME
          3: { cellWidth: 38, fontStyle: 'bold' }, // MATERIAL DESCRIPTION
          4: { cellWidth: 18 }, // MATERIAL TYPE
          5: { cellWidth: 32, fontStyle: 'bold', textColor: [30, 58, 138] }, // SIZE SPECIFICATION
          6: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, // QTY
          7: { cellWidth: 10, halign: 'center' }, // UNIT
          8: { cellWidth: 27, fontStyle: 'bold', textColor: [15, 23, 42] }, // ASSIGNED VENDOR
        }
      : {
          0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, // #
          1: { cellWidth: 26, fontStyle: 'bold', textColor: [30, 41, 59] }, // PROJECT NAME
          2: { cellWidth: 20, fontStyle: 'bold', textColor: [79, 70, 229] }, // MACHINE NAME
          3: { cellWidth: 46, fontStyle: 'bold' }, // MATERIAL DESCRIPTION
          4: { cellWidth: 22 }, // MATERIAL TYPE
          5: { cellWidth: 36, fontStyle: 'bold', textColor: [30, 58, 138] }, // SIZE SPECIFICATION
          6: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, // QTY
          7: { cellWidth: 12, halign: 'center' }, // UNIT
        },
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Get table bottom Y position
  const finalY = (doc as any).lastAutoTable.finalY || 180;

  // Notes & Instructions Box
  const notesY = finalY + 5;
  if (notesY < 235) {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, notesY, 182, 16, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('INSPECTION & DELIVERY INSTRUCTIONS:', 18, notesY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(
      notes ||
        '1. Material must conform strictly to size specs. 2. Provide Material Test Certificate (MTC) on delivery. 3. Immediate intimation in case of delivery delay.',
      18,
      notesY + 9.5,
      { maxWidth: 174 }
    );
  }

  // Exact 3-Tier Signatory Columns:
  // Prepared By (Material Planning Dept) | Verified By (Stores & Procurement Head) | Authorized Signatory (Director / Plant Operations)
  const sigY = Math.max(finalY + 32, 248);

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);

  // 3 Signature lines
  doc.line(18, sigY, 65, sigY);
  doc.line(78, sigY, 130, sigY);
  doc.line(142, sigY, 192, sigY);

  doc.setLineDashPattern([], 0);

  // Column 1: Prepared By
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared By', 30, sigY + 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Material Planning Dept', 23, sigY + 9.5);

  // Column 2: Verified By
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Verified By', 93, sigY + 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Stores & Procurement Head', 82, sigY + 9.5);

  // Column 3: Authorized Signatory
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', 151, sigY + 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Director / Plant Operations', 147, sigY + 9.5);

  // Footer Note
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Material Purchase Order – RSB PRIVATE LIMITED (${dateOfIssue}) • Document ID: ${poNumber}`,
    14,
    288
  );

  const fileVendorTag = (vendorName || projectName || 'Master_PO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = `RSB_PO_${poNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${fileVendorTag}.pdf`;
  doc.save(safeFileName);
  return safeFileName;
};

