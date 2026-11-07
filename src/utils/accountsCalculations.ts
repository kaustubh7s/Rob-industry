import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AccountCompany, AccountDeal, AccountPayment, DealStatus } from '../types/accounts';

/**
 * Formats a number to Indian Rupee (INR) representation with ₹ symbol and Indian comma notation (lakhs, crores).
 * Example: 1000000 -> "₹10,00,000"
 */
export function formatINR(val: number | string | undefined | null): string {
  const num = Math.round(Number(val) || 0);
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

/**
 * Validates a 15-character Indian Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 digits (State code) + 10 chars (PAN) + 1 digit (entity) + 'Z' + 1 checksum
 * Returns true if empty (since optional) or if matching official regex.
 */
export function isValidGSTIN(gstin: string | undefined | null): boolean {
  if (!gstin || !gstin.trim()) return true;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
  return regex.test(gstin.trim());
}

/**
 * Calculates current deal financial status.
 */
export function computeDealStatus(deal: {
  decidedAmount: number;
  totalReceived: number;
  expectedPaymentDate?: string;
}): DealStatus {
  const decided = Math.round(Number(deal.decidedAmount) || 0);
  const received = Math.round(Number(deal.totalReceived) || 0);
  const remaining = Math.max(0, decided - received);

  if (decided > 0 && received >= decided) {
    return 'fully_paid';
  }

  // Check overdue: if expected payment date passed and remaining balance is positive
  if (deal.expectedPaymentDate && remaining > 0) {
    const today = new Date().toISOString().split('T')[0];
    if (deal.expectedPaymentDate < today) {
      return 'overdue';
    }
  }

  if (received > 0) {
    return 'partially_received';
  }

  return 'awaiting_advance';
}

/**
 * Generates sequential RSB Deal ID, e.g. RSB-ACC-2026-001
 */
export function generateNextDealId(existingDeals: { dealNumber?: string }[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `RSB-ACC-${currentYear}-`;
  let maxNum = 0;
  (existingDeals || []).forEach((d) => {
    if (d.dealNumber && d.dealNumber.startsWith(prefix)) {
      const numPart = parseInt(d.dealNumber.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

/**
 * Formats ISO date (YYYY-MM-DD) to friendly Indian format (DD MMM YYYY)
 */
export function formatDateIndian(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates an official, clean PDF summary for an individual deal and its payments.
 */
export function exportDealSummaryPDF(
  deal: AccountDeal,
  company?: AccountCompany | null,
  payments: AccountPayment[] = []
): void {
  const PDFConstructor = (jsPDF as any).jsPDF || jsPDF;
  const doc = new PDFConstructor('portrait', 'mm', 'a4');

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RSB EQUIPMENTS PRIVATE LIMITED', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('ACCOUNTS & FINANCE DEPARTMENT • OFFICIAL DEAL SUMMARY', 14, 20);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Ref: ${deal.dealNumber}`, 14, 26);

  // Status Badge
  const statusLabels: Record<DealStatus, string> = {
    awaiting_advance: 'AWAITING ADVANCE',
    partially_received: 'PARTIALLY RECEIVED',
    fully_paid: 'FULLY PAID',
    overdue: 'PAYMENT OVERDUE',
  };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(statusLabels[deal.status] || deal.status.toUpperCase(), 196, 20, { align: 'right' });

  // Company Details Block
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 40, 182, 34, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(deal.companyName, 20, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`GSTIN: ${deal.companyGstin || company?.gstin || 'Not Provided'}`, 20, 56);
  doc.text(`Contact: ${deal.contactPerson || company?.contactPerson || '-'}`, 20, 62);
  doc.text(`Phone: ${deal.companyPhone || company?.phone || '-'}`, 20, 68);

  doc.text(`Deal Date: ${formatDateIndian(deal.dealDate)}`, 130, 48);
  doc.text(`Payment Terms: ${deal.paymentTerms}`, 130, 56);
  doc.text(`Due Date: ${formatDateIndian(deal.expectedPaymentDate)}`, 130, 62);
  doc.text(`Taxation: ${deal.gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}`, 130, 68);

  // Financial Cards Strip
  const startY = 82;
  const colW = 43;
  const gap = 3.3;

  // 1. Total Deal Amount
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DEAL AMOUNT', 18, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatINR(deal.decidedAmount), 18, startY + 17);

  // 2. Advance Payment
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14 + colW + gap, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ADVANCE PAYMENT', 14 + colW + gap + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatINR(deal.advanceAmount), 14 + colW + gap + 4, startY + 17);

  // 3. Money Received
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(14 + (colW + gap) * 2, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text('MONEY RECEIVED', 14 + (colW + gap) * 2 + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatINR(deal.totalReceived), 14 + (colW + gap) * 2 + 4, startY + 17);

  // 4. Pending Amount
  const isRemainingZero = deal.remainingBalance <= 0;
  doc.setFillColor(isRemainingZero ? 241 : 255, isRemainingZero ? 245 : 247, isRemainingZero ? 249 : 237); // amber-50
  doc.roundedRect(14 + (colW + gap) * 3, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isRemainingZero ? 100 : 180, isRemainingZero ? 116 : 83, isRemainingZero ? 139 : 9);
  doc.text('PENDING AMOUNT', 14 + (colW + gap) * 3 + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isRemainingZero ? 15 : 217, isRemainingZero ? 23 : 119, isRemainingZero ? 42 : 6);
  doc.text(formatINR(deal.remainingBalance), 14 + (colW + gap) * 3 + 4, startY + 17);

  // Payment History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment History', 14, 118);

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  const tableRows = sortedPayments.map((p, idx) => [
    `#${idx + 1}`,
    formatDateIndian(p.paymentDate),
    p.isAdvance ? 'Initial Advance Payment' : (p.remarks || 'Stage Payment'),
    p.paymentMode,
    p.transactionReference || '-',
    formatINR(p.amount),
  ]);

  if (tableRows.length === 0) {
    tableRows.push(['-', '-', 'No payment records found', '-', '-', formatINR(0)]);
  }

  autoTable(doc, {
    startY: 122,
    head: [['Sr No', 'Date', 'Description / Remarks', 'Mode', 'Ref No / UTR', 'Amount Received']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 60 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer Signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = pageHeight - 32;

  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 70, signY);
  doc.line(140, signY, 196, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared By (Accounts)', 14, signY + 5);
  doc.text('Authorized Signatory (RSB)', 140, signY + 5);

  const cleanName = deal.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${deal.dealNumber}_${cleanName}_Summary.pdf`);
}

/**
 * Converts a numeric amount to Indian Rupee Words representation (e.g., 200000 -> "Rupees Two Lakh Only")
 */
export function convertNumberToWordsINR(num: number): string {
  const rounded = Math.round(Math.abs(num || 0));
  if (rounded === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return a[n];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return b[tens] + (units ? ' ' + a[units] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundreds > 0) {
      res += a[hundreds] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  const hundredsAndUnits = remainder % 1000;

  const parts: string[] = [];
  if (crore > 0) {
    parts.push(convertThreeDigits(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertThreeDigits(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertThreeDigits(thousand) + ' Thousand');
  }
  if (hundredsAndUnits > 0) {
    parts.push(convertThreeDigits(hundredsAndUnits));
  }

  return 'Rupees ' + parts.join(' ') + ' Only';
}

/**
 * Generates an official single-page Payment Receipt Voucher PDF for a specific transaction.
 */
export function exportPaymentReceiptPDF(
  payment: AccountPayment,
  deal: AccountDeal,
  company?: AccountCompany | null
): void {
  const PDFConstructor = (jsPDF as any).jsPDF || jsPDF;
  const doc = new PDFConstructor('portrait', 'mm', 'a4');

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RSB EQUIPMENTS PRIVATE LIMITED', 14, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('MANUFACTURERS OF INDUSTRIAL EQUIPMENT & CONVEYOR SYSTEMS', 14, 20);
  doc.text('Plot No. 42/A, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat • GSTIN: 24AAACR1234F1Z0', 14, 25);
  doc.text('Phone: +91 98250 12345 • Email: accounts@rsbequipments.com', 14, 30);

  // Voucher Title Ribbon
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(0, 36, 210, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL PAYMENT RECEIPT VOUCHER (भुगतान पावती)', 14, 44);

  const voucherNo = `REC-${payment.id.replace('pay-', '').toUpperCase()}`;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Voucher No: ${voucherNo}`, 196, 44, { align: 'right' });

  // Receipt Metadata Grid
  const metaY = 52;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, metaY, 182, 17, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIPT DATE', 20, metaY + 6);
  doc.text('DEAL NUMBER', 80, metaY + 6);
  doc.text('DEAL DATE', 140, metaY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateIndian(payment.paymentDate), 20, metaY + 12.5);
  doc.text(deal.dealNumber, 80, metaY + 12.5);
  doc.text(formatDateIndian(deal.dealDate), 140, metaY + 12.5);

  // Received From Box
  const clientY = 73;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, clientY, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIVED WITH THANKS FROM:', 20, clientY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(deal.companyName, 20, clientY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`GSTIN: ${deal.companyGstin || company?.gstin || 'Not Provided'}`, 20, clientY + 20);
  doc.text(
    `Contact: ${deal.contactPerson || company?.contactPerson || '-'} (${deal.companyPhone || company?.phone || '-'})`,
    20,
    clientY + 24.5
  );

  // Payment Amount Highlight Box
  const amtY = 105;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(14, amtY, 182, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text('AMOUNT RECEIVED', 20, amtY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatINR(payment.amount), 20, amtY + 15);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`(${convertNumberToWordsINR(payment.amount)})`, 20, amtY + 22);

  // Transaction Particulars Table
  autoTable(doc, {
    startY: 135,
    head: [['Particulars', 'Transaction Information']],
    body: [
      ['Payment Type', payment.isAdvance ? 'Advance Payment (Initial Booking)' : 'Stage / Installment Payment'],
      ['Payment Mode', payment.paymentMode],
      ['Transaction Ref / UTR / Cheque', payment.transactionReference || 'Not Provided / Direct'],
      ['Payment Remarks / Description', payment.remarks || (payment.isAdvance ? 'Initial Booking Advance' : 'Stage Payment')],
      ['Recorded By', payment.createdBy || 'Finance & Accounts'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 127 },
    },
    margin: { left: 14, right: 14 },
  });

  // Current Deal Snapshot Strip
  const currentY = (doc as any).lastAutoTable.finalY + 6;
  const colW = 58;
  const gap = 4;

  // Box 1: Total Deal Amount
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, colW, 17, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DEAL AMOUNT', 18, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(formatINR(deal.decidedAmount), 18, currentY + 12);

  // Box 2: Total Money Received
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(14 + colW + gap, currentY, colW, 17, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.text('MONEY RECEIVED TO DATE', 14 + colW + gap + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(formatINR(deal.totalReceived), 14 + colW + gap + 4, currentY + 12);

  // Box 3: Pending Balance
  const isZero = deal.remainingBalance <= 0;
  doc.setFillColor(isZero ? 241 : 255, isZero ? 245 : 247, isZero ? 249 : 237);
  doc.setDrawColor(isZero ? 226 : 253, isZero ? 232 : 230, isZero ? 240 : 138);
  doc.roundedRect(14 + (colW + gap) * 2, currentY, colW, 17, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(isZero ? 100 : 180, isZero ? 116 : 83, isZero ? 139 : 9);
  doc.text('CURRENT PENDING BALANCE', 14 + (colW + gap) * 2 + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(isZero ? 15 : 217, isZero ? 23 : 119, isZero ? 42 : 6);
  doc.text(formatINR(deal.remainingBalance), 14 + (colW + gap) * 2 + 4, currentY + 12);

  // Note
  const dispatchY = currentY + 23;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Note: Payment receipt subject to bank realization of cheques / online credits. Computer generated voucher.',
    14,
    dispatchY
  );

  // Signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = pageHeight - 28;

  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 70, signY);
  doc.line(140, signY, 196, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Received By (Finance & Accounts)', 14, signY + 5);
  doc.text('Authorized Signatory (RSB Equipments)', 140, signY + 5);

  const cleanCompanyName = deal.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`RSB_Receipt_${deal.dealNumber}_${payment.paymentDate}_${cleanCompanyName}.pdf`);
}

/**
 * Exports all deals register to Excel (.xlsx)
 */
export function exportAllDealsToExcel(deals: AccountDeal[]): void {
  const data = deals.map((d, index) => {
    const pct = d.decidedAmount > 0 ? Math.round((d.totalReceived / d.decidedAmount) * 100) : 0;
    return {
      'Sr No': index + 1,
      'Deal ID': d.dealNumber,
      'Company Name': d.companyName,
      'GSTIN': d.companyGstin || 'Not Provided',
      'Deal Date': formatDateIndian(d.dealDate),
      'Total Deal Amount (INR)': d.decidedAmount,
      'Advance Payment (INR)': d.advanceAmount,
      'Money Received (INR)': d.totalReceived,
      'Pending Amount (INR)': d.remainingBalance,
      'Received %': `${pct}%`,
      'Payment Terms': d.paymentTerms,
      'Due Date': formatDateIndian(d.expectedPaymentDate),
      'Status': d.status.toUpperCase(),
      'Contact Person': d.contactPerson || '-',
      'Phone': d.companyPhone || '-',
      'Taxation': d.gstInclusive ? 'GST Inclusive' : 'GST Exclusive',
      'Remarks': d.remarks || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'All Deals');

  const fileName = `RSB_Accounts_Deals_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports payment transactions register to Excel (.xlsx)
 */
export function exportPaymentHistoryToExcel(
  payments: AccountPayment[],
  dealMap?: Map<string, AccountDeal>
): void {
  const data = payments.map((p, index) => {
    const deal = dealMap?.get(p.dealId);
    return {
      'Sr No': index + 1,
      'Payment Date': formatDateIndian(p.paymentDate),
      'Deal ID': deal?.dealNumber || p.dealId,
      'Company Name': deal?.companyName || '-',
      'Amount Received (INR)': p.amount,
      'Payment Mode': p.paymentMode,
      'Transaction Ref / UTR': p.transactionReference || '-',
      'Type': p.isAdvance ? 'Advance Payment' : 'Stage Payment',
      'Remarks': p.remarks || '-',
      'Recorded By': p.createdBy || 'Accountant',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payment History');

  const fileName = `RSB_Accounts_Payments_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

