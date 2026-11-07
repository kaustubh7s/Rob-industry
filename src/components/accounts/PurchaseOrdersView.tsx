import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  X,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import {
  PurchaseOrderFinance,
  PurchaseOrderItemFinance,
  PurchaseOrderStatus,
} from '../../types/finance';
import { PrintableDocumentModal, PrintableDocumentData } from './PrintableDocumentModal';

export const PurchaseOrdersView: React.FC = () => {
  const {
    purchaseOrdersFinance,
    financeVendors,
    companyProfile,
    addPurchaseOrderFinance,
    updatePurchaseOrderFinance,
  } = useAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<PrintableDocumentData | null>(null);

  // New PO form state
  const [vendorId, setVendorId] = useState(financeVendors[0]?.id || '');
  const [poNumber, setPoNumber] = useState(
    `PO-${new Date().getFullYear()}-${String(purchaseOrdersFinance.length + 1).padStart(3, '0')}`
  );
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [projectRef, setProjectRef] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30% Advance, Balance on Delivery');
  const [remarks, setRemarks] = useState('');

  const [items, setItems] = useState<
    Array<{
      description: string;
      hsnSac: string;
      quantity: number;
      unit: string;
      rate: number;
      gstRate: number;
    }>
  >([
    {
      description: 'Stainless Steel Sheet SS-316L (2.5mm)',
      hsnSac: '7219',
      quantity: 12,
      unit: 'Sheets',
      rate: 14500,
      gstRate: 18,
    },
  ]);

  // Filtered POs
  const filteredPOs = purchaseOrdersFinance.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.projectReference && po.projectReference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate PO Totals
  const totalPOsCount = purchaseOrdersFinance.length;
  const totalPOValue = purchaseOrdersFinance.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const pendingApprovalPOs = purchaseOrdersFinance.filter((po) => po.status === 'Pending Approval');
  const activeOpenPOs = purchaseOrdersFinance.filter(
    (po) => po.status === 'Sent to Vendor' || po.status === 'Partially Received'
  );

  const selectedVendor = financeVendors.find((v) => v.id === vendorId);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        hsnSac: '8422',
        quantity: 1,
        unit: 'Pcs',
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: string,
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  // Compute calculated amounts for new PO
  const computedItems: PurchaseOrderItemFinance[] = items.map((it, idx) => {
    const taxableAmount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    const taxAmount = (taxableAmount * (Number(it.gstRate) || 0)) / 100;
    const totalAmount = taxableAmount + taxAmount;

    return {
      id: `item-${idx + 1}`,
      description: it.description,
      hsnSac: it.hsnSac,
      quantity: Number(it.quantity) || 0,
      unit: it.unit || 'Nos',
      rate: Number(it.rate) || 0,
      taxableAmount,
      gstRate: Number(it.gstRate) || 0,
      totalAmount,
    };
  });

  const subTotal = computedItems.reduce((acc, it) => acc + it.taxableAmount, 0);
  const totalTax = computedItems.reduce(
    (acc, it) => acc + (it.taxableAmount * it.gstRate) / 100,
    0
  );
  const grandTotal = subTotal + totalTax;

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) {
      alert('Please select a valid vendor.');
      return;
    }
    if (computedItems.length === 0 || computedItems.some((it) => !it.description || it.rate <= 0)) {
      alert('Please provide valid descriptions and positive rates for all line items.');
      return;
    }

    const newPO: Omit<PurchaseOrderFinance, 'id' | 'createdAt'> = {
      poNumber,
      poDate,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.companyName,
      vendorGstin: selectedVendor.gstin || '',
      vendorPhone: selectedVendor.mobile || '',
      deliveryAddress: companyProfile.addressLine1
        ? `${companyProfile.addressLine1}, ${companyProfile.city}, ${companyProfile.state}`
        : 'GIDC Industrial Estate, Vatva, Ahmedabad',
      projectReference: projectRef || undefined,
      requiredDeliveryDate: requiredDate,
      items: computedItems,
      taxableAmount: subTotal,
      gstTotal: totalTax,
      totalAmount: grandTotal,
      status: 'Approved',
      paymentTerms,
      remarks: remarks || undefined,
      orderedBy: 'Accounts Department',
      approvedBy: 'Director',
    };

    await addPurchaseOrderFinance(newPO);
    setIsNewPOModalOpen(false);
    setProjectRef('');
    setRemarks('');
  };

  const handleOpenPrintModal = (po: PurchaseOrderFinance) => {
    setSelectedDocForPrint({
      type: 'purchase_order',
      title: 'PURCHASE ORDER',
      docNumber: po.poNumber,
      date: po.poDate,
      dueDate: po.requiredDeliveryDate,
      partyName: po.vendorName,
      partyGstin: po.vendorGstin,
      partyAddress: po.deliveryAddress,
      partyPhone: po.vendorPhone,
      poNumber: po.poNumber,
      projectName: po.projectReference,
      items: po.items.map((it, idx) => ({
        srNo: idx + 1,
        description: it.description,
        hsnSac: it.hsnSac,
        qty: it.quantity,
        unit: it.unit,
        rate: it.rate,
        taxableAmount: it.taxableAmount,
        gstRate: it.gstRate,
        totalAmount: it.totalAmount,
      })),
      subtotal: po.taxableAmount,
      grandTotal: po.totalAmount,
      terms: po.paymentTerms,
      notes: po.remarks,
    });
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Draft
          </span>
        );
      case 'Pending Approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Pending Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'Sent to Vendor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Send className="w-3 h-3" /> Sent to Vendor
          </span>
        );
      case 'Partially Received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
            Partially Received
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and track vendor purchase orders for raw materials, motors, and fabrication spares
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPoNumber(
              `PO-${new Date().getFullYear()}-${String(purchaseOrdersFinance.length + 1).padStart(3, '0')}`
            );
            setIsNewPOModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Purchase Orders</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalPOsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Issued vendor contracts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Committed Value</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <span className="text-xs font-bold">₹</span>
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹{totalPOValue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Authorized purchase value</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Approval</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {pendingApprovalPOs.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Awaiting management clearance</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active / Open In Delivery</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Send className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{activeOpenPOs.length}</div>
          <div className="text-xs text-slate-500 mt-1">Orders dispatched to suppliers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO number, vendor name, or project..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Status:</span>
          {(['all', 'Approved', 'Sent to Vendor', 'Completed', 'Pending Approval'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* POs Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">PO Number & Date</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Project Ref</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No purchase orders found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? 'Try modifying your search or filter criteria'
                        : 'Click "Create Purchase Order" above to issue a new vendor PO'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{po.poNumber}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(po.poDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {po.vendorName}
                      </div>
                      {po.vendorGstin && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          GSTIN: {po.vendorGstin}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-700 font-medium">
                        {po.projectReference || 'General Inventory'}
                      </span>
                      {po.requiredDeliveryDate && (
                        <div className="text-[11px] text-amber-700 mt-0.5">
                          Req:{' '}
                          {new Date(po.requiredDeliveryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-800 line-clamp-1">
                        {po.items.map((it) => it.description).join(', ')}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {po.items.length} line item{po.items.length > 1 ? 's' : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900">
                        ₹{po.totalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tax: ₹{po.gstTotal.toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">{getStatusBadge(po.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintModal(po)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Print / View Purchase Order"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print</span>
                        </button>

                        {po.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePurchaseOrderFinance(po.id, { status: 'Sent to Vendor' })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Mark Sent to Vendor"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        )}

                        {po.status === 'Sent to Vendor' && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePurchaseOrderFinance(po.id, { status: 'Completed' })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Mark PO as Completed / Received"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Purchase Order */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  Issue New Purchase Order
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prepare official company purchase order for vendor procurement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPOModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Vendor *
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    {financeVendors.map((vnd) => (
                      <option key={vnd.id} value={vnd.id}>
                        {vnd.companyName} {vnd.gstin ? `(${vnd.gstin.slice(0, 2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PO Number *
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PO Date *</label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Reference / Plant
                  </label>
                  <input
                    type="text"
                    value={projectRef}
                    onChange={(e) => setProjectRef(e.target.value)}
                    placeholder="e.g. Apex High-Speed Vial Line"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Delivery Date
                  </label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Materials & Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2.5 items-end text-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Item Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="e.g. SS-316L Sheet 2.5mm"
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          HSN Code
                        </label>
                        <input
                          type="text"
                          value={item.hsnSac}
                          onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Quantity & Unit
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          GST %
                        </label>
                        <select
                          value={item.gstRate}
                          onChange={(e) =>
                            handleItemChange(index, 'gstRate', Number(e.target.value))
                          }
                          className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </div>

                      <div className="col-span-1 flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-6">
                    <div>
                      Taxable: <span className="font-bold">₹{subTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      GST: <span className="font-bold">₹{totalTax.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Grand Total: ₹{grandTotal.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Special Instructions
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Material test certificates required with delivery..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Create & Approve PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Document Viewer */}
      {selectedDocForPrint && (
        <PrintableDocumentModal
          data={selectedDocForPrint}
          onClose={() => setSelectedDocForPrint(null)}
        />
      )}
    </div>
  );
};
