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

  // 1. Decided Amount
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DECIDED AMOUNT', 18, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatINR(deal.decidedAmount), 18, startY + 17);

  // 2. Advance Received
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14 + colW + gap, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ADVANCE RECEIVED', 14 + colW + gap + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatINR(deal.advanceAmount), 14 + colW + gap + 4, startY + 17);

  // 3. Total Received
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(14 + (colW + gap) * 2, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text('TOTAL RECEIVED', 14 + (colW + gap) * 2 + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatINR(deal.totalReceived), 14 + (colW + gap) * 2 + 4, startY + 17);

  // 4. Remaining Balance
  const isRemainingZero = deal.remainingBalance <= 0;
  doc.setFillColor(isRemainingZero ? 241 : 255, isRemainingZero ? 245 : 247, isRemainingZero ? 249 : 237); // amber-50
  doc.roundedRect(14 + (colW + gap) * 3, startY, colW, 24, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isRemainingZero ? 100 : 180, isRemainingZero ? 116 : 83, isRemainingZero ? 139 : 9);
  doc.text('PENDING BALANCE', 14 + (colW + gap) * 3 + 4, startY + 7);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isRemainingZero ? 15 : 217, isRemainingZero ? 23 : 119, isRemainingZero ? 42 : 6);
  doc.text(formatINR(deal.remainingBalance), 14 + (colW + gap) * 3 + 4, startY + 17);

  // Payment History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Transaction History', 14, 118);

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

  doc.save(`${deal.dealNumber}_${deal.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Summary.pdf`);
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
      'Decided Amount (INR)': d.decidedAmount,
      'Advance Received (INR)': d.advanceAmount,
      'Total Received (INR)': d.totalReceived,
      'Pending Balance (INR)': d.remainingBalance,
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
