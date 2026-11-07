import React, { useState, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  FileText,
  Clock,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { useAccounts, AccountsView } from '../../context/AccountsContext';

interface FinancialReportsViewProps {
  initialTab?: AccountsView;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  initialTab = 'trial-balance',
}) => {
  const {
    chartOfAccounts,
    journalEntries,
    salesInvoices,
    purchaseBills,
    deals,
    financeVendors,
    companies,
    companyProfile,
  } = useAccounts();

  // Active report tab
  const [activeTab, setActiveTab] = useState<
    'trial-balance' | 'profit-loss' | 'balance-sheet' | 'gst-reports' | 'receivables' | 'payables'
  >(
    initialTab === 'profit-loss' ||
      initialTab === 'balance-sheet' ||
      initialTab === 'gst-reports' ||
      initialTab === 'receivables' ||
      initialTab === 'payables'
      ? initialTab
      : 'trial-balance'
  );

  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // -------------------------------------------------------------
  // 1. TRIAL BALANCE COMPUTATION
  // -------------------------------------------------------------
  const trialBalanceData = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;

    const rows = chartOfAccounts.map((acc) => {
      // Find all journal lines for this account
      let debits = 0;
      let credits = 0;

      journalEntries.forEach((jv) => {
        if (jv.date >= dateFrom && jv.date <= dateTo) {
          jv.lines.forEach((l) => {
            if (l.accountCode === acc.code) {
              debits += l.debit || 0;
              credits += l.credit || 0;
            }
          });
        }
      });

      const isAssetOrExpense = acc.category === 'Assets' || acc.category === 'Expenses';
      const netMovement = isAssetOrExpense ? debits - credits : credits - debits;
      const closing = (acc.openingBalance || 0) + netMovement;

      let closingDr = 0;
      let closingCr = 0;
      if (isAssetOrExpense) {
        if (closing >= 0) closingDr = closing;
        else closingCr = Math.abs(closing);
      } else {
        if (closing >= 0) closingCr = closing;
        else closingDr = Math.abs(closing);
      }

      totalDr += closingDr;
      totalCr += closingCr;

      return {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        group: acc.group,
        openingBalance: acc.openingBalance || 0,
        debits,
        credits,
        closingDr,
        closingCr,
      };
    });

    const isBalanced = Math.abs(totalDr - totalCr) < 0.05;

    return {
      rows,
      totalDr,
      totalCr,
      isBalanced,
      difference: Math.abs(totalDr - totalCr),
    };
  }, [chartOfAccounts, journalEntries, dateFrom, dateTo]);

  // -------------------------------------------------------------
  // 2. PROFIT & LOSS STATEMENT COMPUTATION
  // -------------------------------------------------------------
  const profitLossData = useMemo(() => {
    // Revenue Accounts: 4000s
    let salesRevenue = 0;
    const revenueDetails: Array<{ name: string; amount: number }> = [];

    // Direct Cost / Purchase: 5000 Raw Materials
    let cogsAmount = 0;
    const cogsDetails: Array<{ name: string; amount: number }> = [];

    // Operating & Admin Expenses: 5010 to 5050
    let opexAmount = 0;
    const opexDetails: Array<{ name: string; amount: number }> = [];

    chartOfAccounts.forEach((acc) => {
      let accDebits = 0;
      let accCredits = 0;

      journalEntries.forEach((jv) => {
        if (jv.date >= dateFrom && jv.date <= dateTo) {
          jv.lines.forEach((l) => {
            if (l.accountCode === acc.code) {
              accDebits += l.debit || 0;
              accCredits += l.credit || 0;
            }
          });
        }
      });

      if (acc.category === 'Income') {
        const net = accCredits - accDebits;
        if (net > 0) {
          salesRevenue += net;
          revenueDetails.push({ name: acc.name, amount: net });
        }
      } else if (acc.category === 'Expenses') {
        const net = accDebits - accCredits;
        if (acc.group === 'Cost of Goods Sold' || acc.code === '5000') {
          cogsAmount += net;
          cogsDetails.push({ name: acc.name, amount: net });
        } else {
          opexAmount += net;
          opexDetails.push({ name: acc.name, amount: net });
        }
      }
    });

    const grossProfit = salesRevenue - cogsAmount;
    const netProfit = grossProfit - opexAmount;

    return {
      salesRevenue,
      revenueDetails,
      cogsAmount,
      cogsDetails,
      grossProfit,
      opexAmount,
      opexDetails,
      netProfit,
    };
  }, [chartOfAccounts, journalEntries, dateFrom, dateTo]);

  // -------------------------------------------------------------
  // 3. BALANCE SHEET COMPUTATION
  // -------------------------------------------------------------
  const balanceSheetData = useMemo(() => {
    // Assets
    const fixedAssets: Array<{ name: string; amount: number }> = [];
    const currentAssets: Array<{ name: string; amount: number }> = [];
    let totalAssets = 0;

    // Liabilities
    const currentLiabilities: Array<{ name: string; amount: number }> = [];
    let totalLiabilities = 0;

    // Equity
    const equityAccounts: Array<{ name: string; amount: number }> = [];
    let totalEquity = 0;

    chartOfAccounts.forEach((acc) => {
      let accDebits = 0;
      let accCredits = 0;

      journalEntries.forEach((jv) => {
        if (jv.date <= dateTo) {
          jv.lines.forEach((l) => {
            if (l.accountCode === acc.code) {
              accDebits += l.debit || 0;
              accCredits += l.credit || 0;
            }
          });
        }
      });

      if (acc.category === 'Assets') {
        const net = (acc.openingBalance || 0) + (accDebits - accCredits);
        if (acc.group === 'Fixed Assets') {
          fixedAssets.push({ name: acc.name, amount: net });
        } else {
          currentAssets.push({ name: acc.name, amount: net });
        }
        totalAssets += net;
      } else if (acc.category === 'Liabilities') {
        const net = (acc.openingBalance || 0) + (accCredits - accDebits);
        currentLiabilities.push({ name: acc.name, amount: net });
        totalLiabilities += net;
      } else if (acc.category === 'Equity') {
        const net = (acc.openingBalance || 0) + (accCredits - accDebits);
        equityAccounts.push({ name: acc.name, amount: net });
        totalEquity += net;
      }
    });

    // Add current period Net Profit to Equity
    const currentYearProfit = profitLossData.netProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + currentYearProfit;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

    return {
      fixedAssets,
      currentAssets,
      totalAssets,
      currentLiabilities,
      totalLiabilities,
      equityAccounts,
      currentYearProfit,
      totalEquity: totalEquity + currentYearProfit,
      totalLiabilitiesAndEquity,
      isBalanced,
    };
  }, [chartOfAccounts, journalEntries, dateTo, profitLossData.netProfit]);

  // -------------------------------------------------------------
  // 4. GST TAX REPORTS (GSTR-1 & GSTR-2B)
  // -------------------------------------------------------------
  const gstReportsData = useMemo(() => {
    // Outward Supplies (Invoices)
    const filteredInvoices = salesInvoices.filter(
      (inv) => inv.invoiceDate >= dateFrom && inv.invoiceDate <= dateTo
    );
    const outwardTaxable = filteredInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
    const outwardCgst = filteredInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((acc, it) => acc + (it.cgstAmount || 0), 0),
      0
    );
    const outwardSgst = filteredInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((acc, it) => acc + (it.sgstAmount || 0), 0),
      0
    );
    const outwardIgst = filteredInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((acc, it) => acc + (it.igstAmount || 0), 0),
      0
    );
    const totalOutwardGst = outwardCgst + outwardSgst + outwardIgst;

    // Inward Supplies (Purchase Bills)
    const filteredBills = purchaseBills.filter(
      (bill) => bill.vendorInvoiceDate >= dateFrom && bill.vendorInvoiceDate <= dateTo
    );
    const inwardTaxable = filteredBills.reduce((sum, b) => sum + (b.taxableAmount || 0), 0);
    const inwardCgst = filteredBills.reduce((sum, b) => sum + (b.cgstTotal || 0), 0);
    const inwardSgst = filteredBills.reduce((sum, b) => sum + (b.sgstTotal || 0), 0);
    const inwardIgst = filteredBills.reduce((sum, b) => sum + (b.igstTotal || 0), 0);
    const totalInwardItc = inwardCgst + inwardSgst + inwardIgst;

    // Net GST Payable / Credit Carry Forward
    const netGstPayable = totalOutwardGst - totalInwardItc;

    return {
      filteredInvoices,
      outwardTaxable,
      outwardCgst,
      outwardSgst,
      outwardIgst,
      totalOutwardGst,
      filteredBills,
      inwardTaxable,
      inwardCgst,
      inwardSgst,
      inwardIgst,
      totalInwardItc,
      netGstPayable,
    };
  }, [salesInvoices, purchaseBills, dateFrom, dateTo]);

  // -------------------------------------------------------------
  // 5. RECEIVABLES AGING
  // -------------------------------------------------------------
  const receivablesAging = useMemo(() => {
    const today = new Date();

    const buckets = {
      current: 0, // 0-30 days
      bucket30_60: 0,
      bucket60_90: 0,
      above90: 0,
    };

    const clientRows = deals
      .filter((d) => !d.isArchived && d.remainingBalance > 0)
      .map((d) => {
        const dueDate = d.expectedPaymentDate ? new Date(d.expectedPaymentDate) : new Date(d.dealDate);
        const diffDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));

        let bucketCategory: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (diffDays > 90) {
          bucketCategory = '90+';
          buckets.above90 += d.remainingBalance;
        } else if (diffDays > 60) {
          bucketCategory = '61-90';
          buckets.bucket60_90 += d.remainingBalance;
        } else if (diffDays > 30) {
          bucketCategory = '31-60';
          buckets.bucket30_60 += d.remainingBalance;
        } else {
          buckets.current += d.remainingBalance;
        }

        return {
          id: d.id,
          companyName: d.companyName,
          dealAmount: d.decidedAmount,
          totalReceived: d.totalReceived,
          pendingAmount: d.remainingBalance,
          dueDate: d.expectedPaymentDate || d.dealDate,
          overdueDays: diffDays,
          bucketCategory,
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays);

    const totalOutstanding = clientRows.reduce((sum, r) => sum + r.pendingAmount, 0);

    return {
      buckets,
      clientRows,
      totalOutstanding,
    };
  }, [deals]);

  // -------------------------------------------------------------
  // 6. PAYABLES AGING
  // -------------------------------------------------------------
  const payablesAging = useMemo(() => {
    const today = new Date();

    const buckets = {
      current: 0, // 0-30
      bucket30_60: 0,
      bucket60_90: 0,
      above90: 0,
    };

    const vendorRows = purchaseBills
      .filter((b) => b.paymentStatus !== 'paid' && b.balancePayable > 0)
      .map((b) => {
        const dueDate = new Date(b.paymentDueDate);
        const diffDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));

        let bucketCategory: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (diffDays > 90) {
          bucketCategory = '90+';
          buckets.above90 += b.balancePayable;
        } else if (diffDays > 60) {
          bucketCategory = '61-90';
          buckets.bucket60_90 += b.balancePayable;
        } else if (diffDays > 30) {
          bucketCategory = '31-60';
          buckets.bucket30_60 += b.balancePayable;
        } else {
          buckets.current += b.balancePayable;
        }

        return {
          id: b.id,
          vendorName: b.vendorName,
          billNumber: b.vendorInvoiceNumber,
          billDate: b.vendorInvoiceDate,
          dueDate: b.paymentDueDate,
          totalAmount: b.totalAmount,
          balancePayable: b.balancePayable,
          overdueDays: diffDays,
          bucketCategory,
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays);

    const totalPayable = vendorRows.reduce((sum, r) => sum + r.balancePayable, 0);

    return {
      buckets,
      vendorRows,
      totalPayable,
    };
  }, [purchaseBills]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let filename = `Report_${activeTab}.csv`;
    let content = '';

    if (activeTab === 'trial-balance') {
      const headers = ['Account Code', 'Account Name', 'Category', 'Opening (INR)', 'Debits (INR)', 'Credits (INR)', 'Closing Dr (INR)', 'Closing Cr (INR)'];
      const rows = trialBalanceData.rows.map((r) => [
        `"${r.code}"`,
        `"${r.name}"`,
        `"${r.category}"`,
        r.openingBalance,
        r.debits,
        r.credits,
        r.closingDr,
        r.closingCr,
      ]);
      content = [
        '"RSB INDUSTRIES - TRIAL BALANCE"',
        `"Period: ${dateFrom} to ${dateTo}"`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `"TOTAL",,,,,,"${trialBalanceData.totalDr}","${trialBalanceData.totalCr}"`,
      ].join('\n');
    } else if (activeTab === 'profit-loss') {
      content = [
        '"RSB INDUSTRIES - PROFIT AND LOSS STATEMENT"',
        `"Period: ${dateFrom} to ${dateTo}"`,
        '',
        '"1. REVENUE FROM OPERATIONS"',
        ...profitLossData.revenueDetails.map((r) => `"${r.name}",${r.amount}`),
        `"TOTAL REVENUE",${profitLossData.salesRevenue}`,
        '',
        '"2. COST OF GOODS SOLD"',
        ...profitLossData.cogsDetails.map((r) => `"${r.name}",${r.amount}`),
        `"TOTAL COGS",${profitLossData.cogsAmount}`,
        `"GROSS PROFIT",${profitLossData.grossProfit}`,
        '',
        '"3. OPERATING & ADMIN EXPENSES"',
        ...profitLossData.opexDetails.map((r) => `"${r.name}",${r.amount}`),
        `"TOTAL EXPENSES",${profitLossData.opexAmount}`,
        '',
        `"NET PROFIT / (LOSS)",${profitLossData.netProfit}`,
      ].join('\n');
    } else if (activeTab === 'gst-reports') {
      content = [
        '"RSB INDUSTRIES - GST TAX SUMMARY REPORT"',
        `"Period: ${dateFrom} to ${dateTo}"`,
        '',
        '"OUTWARD SUPPLIES (SALES)"',
        `"Taxable Value",${gstReportsData.outwardTaxable}`,
        `"CGST",${gstReportsData.outwardCgst}`,
        `"SGST",${gstReportsData.outwardSgst}`,
        `"IGST",${gstReportsData.outwardIgst}`,
        `"Total Output GST",${gstReportsData.totalOutwardGst}`,
        '',
        '"INWARD SUPPLIES (PURCHASES / ITC)"',
        `"Taxable Value",${gstReportsData.inwardTaxable}`,
        `"Input CGST",${gstReportsData.inwardCgst}`,
        `"Input SGST",${gstReportsData.inwardSgst}`,
        `"Input IGST",${gstReportsData.inwardIgst}`,
        `"Total Input Tax Credit (ITC)",${gstReportsData.totalInwardItc}`,
        '',
        `"NET GST PAYABLE / (REFUND)",${gstReportsData.netGstPayable}`,
      ].join('\n');
    } else if (activeTab === 'receivables') {
      const headers = ['Company Name', 'Deal Amount', 'Received', 'Pending Amount', 'Due Date', 'Overdue Days', 'Bucket'];
      const rows = receivablesAging.clientRows.map((r) => [
        `"${r.companyName}"`,
        r.dealAmount,
        r.totalReceived,
        r.pendingAmount,
        `"${r.dueDate}"`,
        r.overdueDays,
        `"${r.bucketCategory}"`,
      ]);
      content = [
        '"RSB INDUSTRIES - RECEIVABLES AGING REPORT"',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `"TOTAL OUTSTANDING",,,${receivablesAging.totalOutstanding},,,`,
      ].join('\n');
    } else {
      const headers = ['Vendor Name', 'Bill No', 'Bill Date', 'Due Date', 'Total Amount', 'Balance Payable', 'Overdue Days', 'Bucket'];
      const rows = payablesAging.vendorRows.map((r) => [
        `"${r.vendorName}"`,
        `"${r.billNumber}"`,
        `"${r.billDate}"`,
        `"${r.dueDate}"`,
        r.totalAmount,
        r.balancePayable,
        r.overdueDays,
        `"${r.bucketCategory}"`,
      ]);
      content = [
        '"RSB INDUSTRIES - PAYABLES AGING REPORT"',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `"TOTAL PAYABLE",,,,,${payablesAging.totalPayable},,`,
      ].join('\n');
    }

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-600" />
            Financial Statements & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trial Balance, Profit & Loss, Balance Sheet, GST Returns, and Receivables/Payables Aging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('trial-balance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trial-balance'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Trial Balance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profit-loss')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profit-loss'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Profit & Loss (P&L)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balance-sheet')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'balance-sheet'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Balance Sheet
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst-reports')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'gst-reports'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          GST Tax Register
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receivables')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'receivables'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Receivables Aging
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payables')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payables'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Payables Aging
        </button>
      </div>

      {/* Date Range Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Report Accounting Period:
          </span>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Entity: <span className="font-bold text-slate-800">{companyProfile.companyName}</span> |
          GSTIN: <span className="font-mono text-slate-700">{companyProfile.gstin}</span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: TRIAL BALANCE */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              trialBalanceData.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              {trialBalanceData.isBalanced ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Trial Balance is in Perfect Balance (Debits == Credits)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>
                    Discrepancy Detected: ₹{trialBalanceData.difference.toLocaleString('en-IN')} difference.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-6 font-mono font-bold text-sm">
              <div>Total Debits: ₹{trialBalanceData.totalDr.toLocaleString('en-IN')}</div>
              <div>Total Credits: ₹{trialBalanceData.totalCr.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Head</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4 text-right">Opening Bal (₹)</th>
                    <th className="py-3 px-4 text-right">Debit (₹)</th>
                    <th className="py-3 px-4 text-right">Credit (₹)</th>
                    <th className="py-3 px-4 text-right">Closing Dr (₹)</th>
                    <th className="py-3 px-4 text-right">Closing Cr (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {trialBalanceData.rows.map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.code}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500">{row.group}</td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        ₹{row.openingBalance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700">
                        {row.debits > 0 ? `₹${row.debits.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700">
                        {row.credits > 0 ? `₹${row.credits.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {row.closingDr > 0 ? `₹${row.closingDr.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {row.closingCr > 0 ? `₹${row.closingCr.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold text-xs">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider">
                      Grand Total Trial Balance:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      ₹{trialBalanceData.totalDr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      ₹{trialBalanceData.totalCr.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: PROFIT & LOSS STATEMENT */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'profit-loss' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 max-w-4xl mx-auto space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              STATEMENT OF PROFIT AND LOSS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              For the period from {dateFrom} to {dateTo}
            </p>
          </div>

          <div className="space-y-4 text-sm">
            {/* Section I: Revenue */}
            <div>
              <div className="font-bold text-slate-900 uppercase text-xs tracking-wider bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span>I. Revenue from Operations</span>
                <span className="font-mono">₹{profitLossData.salesRevenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs px-3 mt-1 font-mono">
                {profitLossData.revenueDetails.map((r, i) => (
                  <div key={i} className="py-1.5 flex justify-between">
                    <span className="font-sans text-slate-700">{r.name}</span>
                    <span>₹{r.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section II: Cost of Goods Sold */}
            <div>
              <div className="font-bold text-slate-900 uppercase text-xs tracking-wider bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span>II. Cost of Goods Sold (Raw Materials & Direct)</span>
                <span className="font-mono text-rose-700">
                  -₹{profitLossData.cogsAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs px-3 mt-1 font-mono">
                {profitLossData.cogsDetails.map((c, i) => (
                  <div key={i} className="py-1.5 flex justify-between">
                    <span className="font-sans text-slate-700">{c.name}</span>
                    <span>₹{c.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gross Profit Bar */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between font-bold text-emerald-950 text-sm">
              <span>GROSS PROFIT (I − II)</span>
              <span className="font-mono">₹{profitLossData.grossProfit.toLocaleString('en-IN')}</span>
            </div>

            {/* Section III: Operating & Admin Expenses */}
            <div>
              <div className="font-bold text-slate-900 uppercase text-xs tracking-wider bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span>III. Operating & Factory Overhead Expenses</span>
                <span className="font-mono text-rose-700">
                  -₹{profitLossData.opexAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs px-3 mt-1 font-mono">
                {profitLossData.opexDetails.map((e, i) => (
                  <div key={i} className="py-1.5 flex justify-between">
                    <span className="font-sans text-slate-700">{e.name}</span>
                    <span>₹{e.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Profit Bar */}
            <div
              className={`p-4 rounded-xl border flex justify-between font-extrabold text-base ${
                profitLossData.netProfit >= 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-rose-100 text-rose-900 border-rose-300'
              }`}
            >
              <span>NET PROFIT / (LOSS) FOR THE PERIOD</span>
              <span className="font-mono text-emerald-400">
                ₹{profitLossData.netProfit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: BALANCE SHEET */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'balance-sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 max-w-4xl mx-auto space-y-6">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">As of {dateTo}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: ASSETS */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b pb-2">
                ASSETS
              </h3>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase bg-slate-50 p-2 rounded">
                  Non-Current Assets
                </div>
                <div className="text-xs font-mono px-2 py-1 space-y-1">
                  {balanceSheetData.fixedAssets.map((a, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-sans text-slate-600">{a.name}</span>
                      <span>₹{a.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase bg-slate-50 p-2 rounded">
                  Current Assets (Bank, Cash, Receivables)
                </div>
                <div className="text-xs font-mono px-2 py-1 space-y-1">
                  {balanceSheetData.currentAssets.map((a, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-sans text-slate-600">{a.name}</span>
                      <span>₹{a.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl font-bold flex justify-between text-sm text-slate-900">
                <span>TOTAL ASSETS</span>
                <span className="font-mono">
                  ₹{balanceSheetData.totalAssets.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Right Column: LIABILITIES & EQUITY */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b pb-2">
                EQUITY & LIABILITIES
              </h3>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase bg-slate-50 p-2 rounded">
                  Equity & Retained Earnings
                </div>
                <div className="text-xs font-mono px-2 py-1 space-y-1">
                  {balanceSheetData.equityAccounts.map((e, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-sans text-slate-600">{e.name}</span>
                      <span>₹{e.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span className="font-sans">Current Period Net Profit</span>
                    <span>₹{balanceSheetData.currentYearProfit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase bg-slate-50 p-2 rounded">
                  Current Liabilities (Payables & GST)
                </div>
                <div className="text-xs font-mono px-2 py-1 space-y-1">
                  {balanceSheetData.currentLiabilities.map((l, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-sans text-slate-600">{l.name}</span>
                      <span>₹{l.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl font-bold flex justify-between text-sm text-slate-900">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono">
                  ₹{balanceSheetData.totalLiabilitiesAndEquity.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 4: GST TAX REPORTS */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'gst-reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">Output GST Collected (Sales)</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                ₹{gstReportsData.totalOutwardGst.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Taxable Sales: ₹{gstReportsData.outwardTaxable.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">
                Input Tax Credit (ITC - Purchases)
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                ₹{gstReportsData.totalInwardItc.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Eligible Input Credit to offset
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xs">
              <div className="text-xs font-medium text-slate-400">Net GST Liability Payable</div>
              <div className="mt-2 text-2xl font-extrabold text-white">
                ₹{Math.max(0, gstReportsData.netGstPayable).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {gstReportsData.netGstPayable <= 0
                  ? 'ITC credit balance carry forward'
                  : 'Payable to Government via PMT-06'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales Register Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">GSTR-1 Outward Supplies (Sales)</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Taxable Outward Supplies:</span>
                  <span className="font-bold">₹{gstReportsData.outwardTaxable.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Central Tax (CGST 9%):</span>
                  <span>₹{gstReportsData.outwardCgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">State Tax (SGST 9%):</span>
                  <span>₹{gstReportsData.outwardSgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Integrated Tax (IGST 18%):</span>
                  <span>₹{gstReportsData.outwardIgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-sm font-mono text-slate-900">
                  <span className="font-sans">Total Output GST:</span>
                  <span>₹{gstReportsData.totalOutwardGst.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Inward Supplies Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">GSTR-2B Inward Supplies (ITC)</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Taxable Inward Purchases:</span>
                  <span className="font-bold">₹{gstReportsData.inwardTaxable.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Input CGST Available:</span>
                  <span>₹{gstReportsData.inwardCgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Input SGST Available:</span>
                  <span>₹{gstReportsData.inwardSgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-slate-600">Input IGST Available:</span>
                  <span>₹{gstReportsData.inwardIgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-sm font-mono text-emerald-700">
                  <span className="font-sans">Total Eligible ITC:</span>
                  <span>₹{gstReportsData.totalInwardItc.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 5: RECEIVABLES AGING */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xs font-bold text-emerald-800">0 - 30 Days</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-900">
                ₹{receivablesAging.buckets.current.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Regular current cycle</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-xs font-bold text-blue-800">31 - 60 Days</div>
              <div className="mt-1 text-xl font-extrabold text-blue-900">
                ₹{receivablesAging.buckets.bucket30_60.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5">Payment follow-up required</div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xs font-bold text-amber-800">61 - 90 Days</div>
              <div className="mt-1 text-xl font-extrabold text-amber-900">
                ₹{receivablesAging.buckets.bucket60_90.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Escalated collection</div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-xs font-bold text-rose-800">&gt; 90 Days (Overdue)</div>
              <div className="mt-1 text-xl font-extrabold text-rose-900">
                ₹{receivablesAging.buckets.above90.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-rose-700 mt-0.5">Critical dispatch lock</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Client Company</th>
                    <th className="py-3 px-4 text-right">Deal Value</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Pending Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Overdue Days</th>
                    <th className="py-3 px-4 text-center">Aging Bracket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivablesAging.clientRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 font-medium">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.companyName}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{r.dealAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ₹{r.totalReceived.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{r.pendingAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(r.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            r.overdueDays > 60
                              ? 'text-rose-700'
                              : r.overdueDays > 30
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {r.overdueDays} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.bucketCategory === '90+'
                              ? 'bg-rose-100 text-rose-800'
                              : r.bucketCategory === '61-90'
                              ? 'bg-amber-100 text-amber-800'
                              : r.bucketCategory === '31-60'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.bucketCategory} Days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase">
                      Total Receivables Outstanding:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      ₹{receivablesAging.totalOutstanding.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 6: PAYABLES AGING */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xs font-bold text-emerald-800">0 - 30 Days</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-900">
                ₹{payablesAging.buckets.current.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Current credit period</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-xs font-bold text-blue-800">31 - 60 Days</div>
              <div className="mt-1 text-xl font-extrabold text-blue-900">
                ₹{payablesAging.buckets.bucket30_60.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5">Standard vendor terms</div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xs font-bold text-amber-800">61 - 90 Days</div>
              <div className="mt-1 text-xl font-extrabold text-amber-900">
                ₹{payablesAging.buckets.bucket60_90.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Approaching due date</div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-xs font-bold text-rose-800">&gt; 90 Days (Overdue)</div>
              <div className="mt-1 text-xl font-extrabold text-rose-900">
                ₹{payablesAging.buckets.above90.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-rose-700 mt-0.5">Urgent settlement needed</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total Bill</th>
                    <th className="py-3 px-4 text-right">Balance Payable</th>
                    <th className="py-3 px-4 text-center">Overdue Days</th>
                    <th className="py-3 px-4 text-center">Aging Bracket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payablesAging.vendorRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 font-medium">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.vendorName}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {r.billNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(r.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{r.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{r.balancePayable.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            r.overdueDays > 60
                              ? 'text-rose-700'
                              : r.overdueDays > 30
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {r.overdueDays} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.bucketCategory === '90+'
                              ? 'bg-rose-100 text-rose-800'
                              : r.bucketCategory === '61-90'
                              ? 'bg-amber-100 text-amber-800'
                              : r.bucketCategory === '31-60'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.bucketCategory} Days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase">
                      Total Payables Outstanding:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      ₹{payablesAging.totalPayable.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

