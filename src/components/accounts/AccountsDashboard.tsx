import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Receipt,
  CreditCard,
  Plus,
  Landmark,
  Wallet,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';

interface AccountsDashboardProps {
  onOpenNewDeal: () => void;
}

export const AccountsDashboard: React.FC<AccountsDashboardProps> = ({ onOpenNewDeal }) => {
  const {
    deals,
    payments,
    purchaseBills,
    vendorPayments,
    businessExpenses,
    salesInvoices,
    bankAccounts,
    financeMetrics,
    setActiveView,
  } = useAccounts();

  const [txFilter, setTxFilter] = useState<'all' | 'receipts' | 'vendor_pay' | 'invoices' | 'bills' | 'expenses'>('all');

  // Customer Receivables (Unpaid or partially paid deals)
  const receivableDeals = deals
    .filter((d) => !d.isArchived && d.remainingBalance > 0)
    .sort((a, b) => b.remainingBalance - a.remainingBalance);

  // Vendor Payables (Unpaid or partially paid bills)
  const payableBills = purchaseBills
    .filter((b) => b.paymentStatus !== 'paid' && b.balancePayable > 0)
    .sort((a, b) => b.balancePayable - a.balancePayable);

  // Unified Recent Transactions Feed
  const recentTransactions = [
    ...payments.map((p) => ({
      id: p.id,
      type: 'receipt' as const,
      title: `Payment Received: ${p.remarks || (p.isAdvance ? 'Advance' : 'Installment')}`,
      party: deals.find((d) => d.id === p.dealId)?.companyName || 'Customer',
      date: p.paymentDate,
      amount: p.amount,
      mode: p.paymentMode,
      ref: p.transactionReference || 'UTR Verified',
    })),
    ...vendorPayments.map((vp) => ({
      id: vp.id,
      type: 'vendor_payment' as const,
      title: `Vendor Payment: ${vp.voucherNumber}`,
      party: vp.vendorName,
      date: vp.paymentDate,
      amount: -vp.amount,
      mode: vp.paymentMode,
      ref: vp.utrNumber || vp.transactionReference || 'Bank Transfer',
    })),
    ...salesInvoices.map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      title: `Sales Invoice: ${inv.invoiceNumber}`,
      party: inv.customerName,
      date: inv.invoiceDate,
      amount: inv.totalAmount,
      mode: inv.invoiceType === 'tax_invoice' ? 'Tax Invoice' : 'Proforma Invoice',
      ref: inv.poNumber ? `PO: ${inv.poNumber}` : 'Billed',
    })),
    ...purchaseBills.map((pb) => ({
      id: pb.id,
      type: 'bill' as const,
      title: `Purchase Bill: ${pb.billNumber}`,
      party: pb.vendorName,
      date: pb.receivedDate,
      amount: -pb.totalAmount,
      mode: 'Vendor Invoice',
      ref: `Inv #${pb.vendorInvoiceNumber}`,
    })),
    ...businessExpenses.map((exp) => ({
      id: exp.id,
      type: 'expense' as const,
      title: `Expense: ${exp.category}`,
      party: exp.payeeName,
      date: exp.expenseDate,
      amount: -exp.amount,
      mode: exp.paymentMode,
      ref: exp.referenceNumber || exp.description,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions =
    txFilter === 'all'
      ? recentTransactions
      : txFilter === 'receipts'
      ? recentTransactions.filter((t) => t.type === 'receipt')
      : txFilter === 'vendor_pay'
      ? recentTransactions.filter((t) => t.type === 'vendor_payment')
      : txFilter === 'invoices'
      ? recentTransactions.filter((t) => t.type === 'invoice')
      : txFilter === 'bills'
      ? recentTransactions.filter((t) => t.type === 'bill')
      : recentTransactions.filter((t) => t.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial Overview & Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cash flow, sales invoices, vendor payables, and general ledger accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('invoices')}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Sales Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('purchase-bills')}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Purchase Bills</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewDeal}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Add Deal</span>
          </button>
        </div>
      </div>

      {/* 10 FINANCIAL KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Sales */}
        <div
          onClick={() => setActiveView('deals')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Sales</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-lg font-black font-mono text-slate-950">
            {formatINR(financeMetrics.totalSales)}
          </p>
          <p className="text-[10px] text-slate-400">{financeMetrics.totalDealsCount} Active Deals</p>
        </div>

        {/* 2. Total Purchases */}
        <div
          onClick={() => setActiveView('purchase-bills')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Purchases</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-lg font-black font-mono text-slate-950">
            {formatINR(financeMetrics.totalPurchases)}
          </p>
          <p className="text-[10px] text-slate-400">{financeMetrics.purchaseBillsCount} Bills Recorded</p>
        </div>

        {/* 3. Customer Received */}
        <div
          onClick={() => setActiveView('payments')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Customer Receipts</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-black font-mono text-emerald-700">
            {formatINR(financeMetrics.customerReceipts)}
          </p>
          <p className="text-[10px] text-slate-400">Advances + Stage Cleared</p>
        </div>

        {/* 4. Vendor Payments Made */}
        <div
          onClick={() => setActiveView('vendor-payments')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium">
            <span>Vendor Payments</span>
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg font-black font-mono text-blue-700">
            {formatINR(financeMetrics.vendorPayments)}
          </p>
          <p className="text-[10px] text-slate-400">Paid to Suppliers</p>
        </div>

        {/* 5. Customer Outstanding */}
        <div
          onClick={() => setActiveView('pending')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Customer Receivables</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg font-black font-mono text-amber-700">
            {formatINR(financeMetrics.customerOutstanding)}
          </p>
          <p className="text-[10px] text-slate-400">Balance to Collect</p>
        </div>

        {/* 6. Vendor Outstanding */}
        <div
          onClick={() => setActiveView('purchase-bills')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-rose-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Vendor Payables</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-lg font-black font-mono text-rose-700">
            {formatINR(financeMetrics.vendorOutstanding)}
          </p>
          <p className="text-[10px] text-slate-400">Balance to Pay</p>
        </div>

        {/* 7. Total Business Expenses */}
        <div
          onClick={() => setActiveView('expenses')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Business Expenses</span>
            <Wallet className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">
            {formatINR(financeMetrics.totalExpenses)}
          </p>
          <p className="text-[10px] text-slate-400">Power, Transport & Spares</p>
        </div>

        {/* 8. Bank Balance */}
        <div
          onClick={() => setActiveView('bank-cash')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-sky-700 text-xs font-medium">
            <span>Bank Balance</span>
            <Landmark className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-lg font-black font-mono text-sky-900">
            {formatINR(financeMetrics.bankBalance)}
          </p>
          <p className="text-[10px] text-slate-400">HDFC + SBI Accounts</p>
        </div>

        {/* 9. Cash Balance */}
        <div
          onClick={() => setActiveView('bank-cash')}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Cash in Hand</span>
            <Wallet className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">
            {formatINR(financeMetrics.cashBalance)}
          </p>
          <p className="text-[10px] text-slate-400">Main Factory Cash</p>
        </div>

        {/* 10. Net Profit / Operating Margin */}
        <div
          onClick={() => setActiveView('profit-loss')}
          className={`p-4 border rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-1 ${
            financeMetrics.netProfitLoss >= 0
              ? 'bg-emerald-50/50 border-emerald-300'
              : 'bg-rose-50/50 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={financeMetrics.netProfitLoss >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
              Net Profit
            </span>
            {financeMetrics.netProfitLoss >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            )}
          </div>
          <p
            className={`text-lg font-black font-mono ${
              financeMetrics.netProfitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatINR(financeMetrics.netProfitLoss)}
          </p>
          <p className="text-[10px] text-slate-500">Sales - Purchases - Expenses</p>
        </div>
      </div>

      {/* 2-COLUMN SECTION: RECEIVABLES vs PAYABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* RECEIVABLES (Customer Balances) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer Receivables ({receivableDeals.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('receivables')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View Aging</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {receivableDeals.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No outstanding customer balances.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {receivableDeals.slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => setActiveView('deal-details', deal.id)}
                  className="py-2.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{deal.companyName}</p>
                    <p className="text-[11px] text-slate-500">
                      Deal: <strong className="font-mono">{deal.dealNumber}</strong> • Due: {formatDateIndian(deal.expectedPaymentDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="text-xs font-mono font-bold text-amber-700 block">
                      {formatINR(deal.remainingBalance)}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      Total: {formatINR(deal.decidedAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAYABLES (Vendor Bills to Pay) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Vendor Payables ({payableBills.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('payables')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View Payables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {payableBills.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No outstanding vendor bills.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {payableBills.slice(0, 5).map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setActiveView('purchase-bills')}
                  className="py-2.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{bill.vendorName}</p>
                    <p className="text-[11px] text-slate-500">
                      Bill: <strong className="font-mono">{bill.billNumber}</strong> • Inv #{bill.vendorInvoiceNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="text-xs font-mono font-bold text-rose-700 block">
                      {formatINR(bill.balancePayable)}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      Due: {formatDateIndian(bill.paymentDueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT FINANCIAL TRANSACTIONS FEED */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Financial Transactions
            </h2>
            <p className="text-[11px] text-slate-400">
              Live audit trail across customer receipts, vendor payments, invoices, and expenses.
            </p>
          </div>

          {/* Transaction Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'receipts', label: 'Receipts' },
                { id: 'vendor_pay', label: 'Vendor Payments' },
                { id: 'invoices', label: 'Invoices' },
                { id: 'bills', label: 'Purchase Bills' },
                { id: 'expenses', label: 'Expenses' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTxFilter(filter.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  txFilter === filter.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No transactions recorded under this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Party / Account</th>
                  <th className="py-2.5 px-3">Mode / Reference</th>
                  <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndian(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {tx.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold truncate max-w-[200px]">
                      {tx.party}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {tx.mode} • {tx.ref}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          tx.amount > 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }
                      >
                        {tx.amount > 0 ? `+${formatINR(tx.amount)}` : `-${formatINR(Math.abs(tx.amount))}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
