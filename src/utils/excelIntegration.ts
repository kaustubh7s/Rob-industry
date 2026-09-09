import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export any JSON data array to an Excel (.xlsx) file
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'RSB_Data'): void {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, safeFileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export Excel file. Please check data format.');
  }
}

/**
 * Export data to standard CSV
 */
export function exportToCsv(data: Record<string, any>[], fileName: string): void {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
  }
}

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file into JSON objects
 */
export function importFromExcel(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export const parseExcelFile = importFromExcel;

/**
 * Download standard pre-formatted Excel template for bulk import
 */
export function downloadTemplate(templateType: 'materials' | 'vendors' | 'customers' | 'orders' | 'inward' | 'projects'): void {
  let sampleData: Record<string, any>[] = [];

  switch (templateType) {
    case 'materials':
      sampleData = [
        {
          'Material Code': 'MAT-SS-FLAT-80-6',
          'Material Name': 'SS 304 Flat Bar 80x6',
          'Material Type': 'SS Flat',
          'Grade': 'SS 304',
          'Thickness (mm)': 6,
          'Size Specifications': '80 x 6 x 485',
          'Unit': 'Nos',
          'Unit Cost (INR)': 420,
          'Current Stock': 150,
          'Reorder Level': 30,
          'Preferred Vendor': 'Manav Metal',
        },
        {
          'Material Code': 'MAT-SS-PIPE-106-75',
          'Material Name': 'SS 316 Seamless Pipe',
          'Material Type': 'SS Pipe',
          'Grade': 'SS 316',
          'Thickness (mm)': 15.5,
          'Size Specifications': 'OD 106 x ID 75 x 110',
          'Unit': 'Nos',
          'Unit Cost (INR)': 1850,
          'Current Stock': 45,
          'Reorder Level': 10,
          'Preferred Vendor': 'Manav Metal',
        },
      ];
      break;

    case 'orders':
      sampleData = [
        {
          'Material Type': 'SS Flat',
          'Size Specifications': '80 x 6 x 485',
          'Qty': 2,
          'Unit': 'Nos',
          'Vendor': 'Manav Metal',
          'Machine Type': 'Mono Conveyor',
          'Project': 'FOHA',
          'Order Source': 'Customer PO',
          'PO No': '36',
          'Customer': 'Cadila Pharma',
          'Drawing Ref': 'DWG-RSB-MC-04',
          'Status': 'Pending',
          'Delivery Date': '2026-09-20',
        },
        {
          'Material Type': 'SS Pipe',
          'Size Specifications': 'OD 106 x ID 75 x 110',
          'Qty': 2,
          'Unit': 'Nos',
          'Vendor': 'Manav Metal',
          'Machine Type': 'Cap Transfer',
          'Project': 'FOHA',
          'Order Source': 'Customer PO',
          'PO No': '36',
          'Customer': 'Cadila Pharma',
          'Drawing Ref': 'DWG-RSB-CT-02',
          'Status': 'In Production',
          'Delivery Date': '2026-09-22',
        },
      ];
      break;

    case 'inward':
      sampleData = [
        {
          'Date': new Date().toISOString().split('T')[0],
          'Vendor': 'Manav Metal',
          'PO Number': 'PO-2026-036',
          'Challan Number': 'CH-9941',
          'Invoice Number': 'MM-INV-2026-88',
          'Material Type': 'SS Flat',
          'Size Specification': '80 x 6 x 485',
          'Quantity': 25,
          'Unit': 'Nos',
          'Weight (Kg)': 45.6,
          'Received By': 'Ramesh Patel',
          'Quality Status': 'Approved',
          'Remarks': 'Dimensions verified with vernier',
        },
      ];
      break;

    case 'vendors':
      sampleData = [
        {
          'Vendor Name': 'Manav Metal',
          'Contact Person': 'Sunil Shah',
          'Mobile': '+91 98250 12345',
          'Email': 'sales@manavmetal.com',
          'GST Number': '24AAECM1234F1Z8',
          'Address': 'Plot 44, GIDC Industrial Estate, Vatva, Ahmedabad',
          'Material Supplied': 'SS Flat, SS Pipe, SS Circle',
          'Payment Terms': '30 Days Net',
        },
      ];
      break;

    case 'customers':
      sampleData = [
        {
          'Customer Name': 'Cadila Healthcare Ltd',
          'Contact Person': 'Dr. K. Verma',
          'Mobile': '+91 98980 67890',
          'Email': 'procurement@cadila.com',
          'GST Number': '24AABCC1234D1Z2',
          'Address': 'Sarkhej-Bavla Highway, Changodar, Ahmedabad',
          'Segment': 'Pharma Machinery',
          'Payment Terms': '45 Days',
        },
      ];
      break;

    case 'projects':
      sampleData = [
        {
          'Project ID': 'PRJ-2026-092',
          'Project Name': 'FOHA Washing & Conveyor Line',
          'Customer': 'Cadila Healthcare Ltd',
          'Machine Type': 'Mono Conveyor',
          'Order Source': 'Customer PO',
          'PO Number': '36',
          'Start Date': '2026-09-01',
          'Delivery Date': '2026-10-15',
          'Project Value': 1850000,
          'Priority': 'High',
          'Status': 'Production',
        },
      ];
      break;
  }

  exportToExcel(sampleData, `RSB_Template_${templateType.toUpperCase()}`, 'Template');
}

/**
 * Generate PDF report with RSB Private Limited branding
 */
export function exportToPdfReport(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
  subtitle?: string
): void {
  try {
    const doc = new jsPDF('landscape');

    // Header Branding
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RSB PRIVATE LIMITED – MANUFACTURING ERP', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 215, 15);

    // Document Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 34);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, 40);
    }

    // Table
    autoTable(doc, {
      startY: subtitle ? 45 : 38,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 15, right: 14, bottom: 15, left: 14 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `RSB Private Limited | Precision Industrial Components & Assemblies | Page ${i} of ${pageCount}`,
        14,
        205
      );
    }

    doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    alert('Failed to generate PDF. Check console for details.');
  }
}
