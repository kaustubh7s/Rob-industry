import React, { useState } from 'react';
import {
  ExternalLink,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  FileText,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatINR } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { exportToExcel } from '../../utils/excelIntegration';

interface SubcontractItem {
  id: string;
  challanNo: string;
  date: string;
  vendorName: string;
  processType: 'Electro-Polishing' | 'Hard Chrome Plating' | 'Laser Profile Cutting' | 'Passivation & Pickling' | 'Heat Treatment' | 'Blackening';
  materialSpec: string;
  sentQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  ratePerUnit: number;
  expectedReturnDate: string;
  status: 'Sent' | 'Partially Received' | 'Completed' | 'Delayed';
  vehicleNo: string;
  annexureNo: string;
}

export const SubcontractingManager: React.FC = () => {
  const { vendors } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcess, setFilterProcess] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isNewChallanModalOpen, setIsNewChallanModalOpen] = useState(false);

  const [records, setRecords] = useState<SubcontractItem[]>([
    {
      id: 'sub-01',
      challanNo: 'JW-54-2026-001',
      date: '2026-09-02',
      vendorName: 'Apex Surface Finishers (Vatva)',
      processType: 'Electro-Polishing',
      materialSpec: 'SS 316 Guide Rails & Starwheels',
      sentQuantity: 24,
      receivedQuantity: 24,
      pendingQuantity: 0,
      ratePerUnit: 140,
      expectedReturnDate: '2026-09-06',
      status: 'Completed',
      vehicleNo: 'GJ-01-AX-9910',
      annexureNo: 'ANNEX-IV-9901',
    },
    {
      id: 'sub-02',
      challanNo: 'JW-54-2026-002',
      date: '2026-09-04',
      vendorName: 'Precision Laser Tech',
      processType: 'Laser Profile Cutting',
      materialSpec: 'SS 304 Sheet 6.0mm (Casing Plates)',
      sentQuantity: 12,
      receivedQuantity: 8,
      pendingQuantity: 4,
      ratePerUnit: 450,
      expectedReturnDate: '2026-09-08',
      status: 'Partially Received',
      vehicleNo: 'GJ-27-CZ-4410',
      annexureNo: 'ANNEX-IV-9902',
    },
    {
      id: 'sub-03',
      challanNo: 'JW-54-2026-003',
      date: '2026-09-05',
      vendorName: 'Shreeji Hard Chrome Plating',
      processType: 'Hard Chrome Plating',
      materialSpec: 'EN8 Drive Shaft OD 45mm x 600mm',
      sentQuantity: 6,
      receivedQuantity: 0,
      pendingQuantity: 6,
      ratePerUnit: 650,
      expectedReturnDate: '2026-09-10',
      status: 'Sent',
      vehicleNo: 'GJ-01-BT-1120',
      annexureNo: 'ANNEX-IV-9903',
    },
  ]);

  const [newForm, setNewForm] = useState({
    vendorName: 'Apex Surface Finishers (Vatva)',
    processType: 'Electro-Polishing' as const,
    materialSpec: 'SS 304 Flat 80 x 6 x 485',
    sentQuantity: 20,
    ratePerUnit: 120,
    expectedReturnDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    vehicleNo: 'GJ-01-CZ-8890',
  });

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.materialSpec.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.annexureNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProcess = filterProcess === 'ALL' || r.processType === filterProcess;
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesProcess && matchesStatus;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const challanNo = `JW-54-2026-${Math.floor(100 + Math.random() * 900)}`;
    const annexureNo = `ANNEX-IV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newItem: SubcontractItem = {
      id: `sub-${Date.now()}`,
      challanNo,
      date: new Date().toISOString().split('T')[0],
      vendorName: newForm.vendorName,
      processType: newForm.processType,
      materialSpec: newForm.materialSpec,
      sentQuantity: newForm.sentQuantity,
      receivedQuantity: 0,
      pendingQuantity: newForm.sentQuantity,
      ratePerUnit: newForm.ratePerUnit,
      expectedReturnDate: newForm.expectedReturnDate,
      status: 'Sent',
      vehicleNo: newForm.vehicleNo,
      annexureNo,
    };

    setRecords([newItem, ...records]);
    setIsNewChallanModalOpen(false);
    alert(`Subcontracting Jobwork Challan ${challanNo} generated under GST Rule 54(4)!`);
  };

  const handleReceiveStock = (id: string, qty: number) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newRec = Math.min(r.sentQuantity, r.receivedQuantity + qty);
          const newPend = r.sentQuantity - newRec;
          return {
            ...r,
            receivedQuantity: newRec,
            pendingQuantity: newPend,
            status: newPend === 0 ? 'Completed' : 'Partially Received',
          };
        }
        return r;
      })
    );
  };

  const handleExportExcel = () => {
    const exportData = filtered.map((r) => ({
      'Challan No': r.challanNo,
      'Date': r.date,
      'Jobworker Vendor': r.vendorName,
      'Outsource Process': r.processType,
      'Material Spec': r.materialSpec,
      'Sent Qty': r.sentQuantity,
      'Received Qty': r.receivedQuantity,
      'Pending Qty': r.pendingQuantity,
      'Job Rate (₹)': r.ratePerUnit,
      'Total Value (₹)': r.sentQuantity * r.ratePerUnit,
      'Expected Date': r.expectedReturnDate,
      'Status': r.status,
      'Vehicle': r.vehicleNo,
      'Annexure Ref': r.annexureNo,
    }));
    exportToExcel(exportData, `RSB_Jobwork_Subcontract_Register_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/30 to-slate-900 border border-slate-700 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Subcontracting & Outsource Jobwork (जॉबवर्क चालान 54)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                  GST RULE 54(4)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage external electro-polishing, laser profile cutting, heat treatment & hard chrome plating.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsNewChallanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Jobwork Challan (नया चालान)</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Jobwork Challans</span>
          <div className="text-xl font-black font-mono text-white mt-1">{records.length}</div>
          <span className="text-[10px] text-teal-400">External Processors</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Return (बाहर माल)</span>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {records.reduce((acc, r) => acc + r.pendingQuantity, 0)} Nos
          </div>
          <span className="text-[10px] text-slate-400">Awaiting return to RSB</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Completed Process</span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {records.filter((r) => r.status === 'Completed').length}
          </div>
          <span className="text-[10px] text-emerald-400">100% Reconciled</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Jobwork Cost</span>
          <div className="text-xl font-black font-mono text-teal-300 mt-1">
            {formatINR(records.reduce((acc, r) => acc + r.sentQuantity * r.ratePerUnit, 0))}
          </div>
          <span className="text-[10px] text-slate-400">Costed to Projects</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-850 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Challan No & Date</th>
                <th className="py-3 px-3.5">Outsource Processor (सप्लायर)</th>
                <th className="py-3 px-3">Process Type</th>
                <th className="py-3 px-3.5">Material & Spec</th>
                <th className="py-3 px-3 text-center">Sent Qty</th>
                <th className="py-3 px-3 text-center">Recv Qty</th>
                <th className="py-3 px-3 text-center text-amber-400 font-mono">Pending</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Receive Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold text-teal-400 block">{item.challanNo}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="font-bold text-white block">{item.vendorName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.annexureNo}</span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                      {item.processType}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 font-mono text-slate-200">
                    {item.materialSpec}
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-100">
                    {item.sentQuantity}
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                    {item.receivedQuantity}
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                    {item.pendingQuantity}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 text-right">
                    {item.pendingQuantity > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleReceiveStock(item.id, item.pendingQuantity)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs transition-all active:scale-95"
                      >
                        Receive All ({item.pendingQuantity})
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">100% Inward</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CHALLAN MODAL */}
      <Modal
        isOpen={isNewChallanModalOpen}
        onClose={() => setIsNewChallanModalOpen(false)}
        title="Create Jobwork Delivery Challan (Rule 54/4)"
        subtitle="Outward dispatch of raw materials for subcontracted plating, cutting, or polishing"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Subcontractor / Vendor *
              </label>
              <input
                type="text"
                required
                value={newForm.vendorName}
                onChange={(e) => setNewForm({ ...newForm, vendorName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Process Type *
              </label>
              <select
                value={newForm.processType}
                onChange={(e) => setNewForm({ ...newForm, processType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                <option value="Electro-Polishing">Electro-Polishing (इलेक्ट्रो पॉलिश)</option>
                <option value="Laser Profile Cutting">Laser Profile Cutting (लेजर कटिंग)</option>
                <option value="Hard Chrome Plating">Hard Chrome Plating</option>
                <option value="Passivation & Pickling">Passivation & Pickling (एसिड वॉश)</option>
                <option value="Heat Treatment">Heat Treatment / Annealing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Material Description *
              </label>
              <input
                type="text"
                required
                value={newForm.materialSpec}
                onChange={(e) => setNewForm({ ...newForm, materialSpec: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Sent Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newForm.sentQuantity}
                onChange={(e) => setNewForm({ ...newForm, sentQuantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Job Rate (₹ / Unit)
              </label>
              <input
                type="number"
                min="1"
                value={newForm.ratePerUnit}
                onChange={(e) => setNewForm({ ...newForm, ratePerUnit: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Vehicle No. *
              </label>
              <input
                type="text"
                required
                value={newForm.vehicleNo}
                onChange={(e) => setNewForm({ ...newForm, vehicleNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                value={newForm.expectedReturnDate}
                onChange={(e) => setNewForm({ ...newForm, expectedReturnDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewChallanModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all"
            >
              Issue Jobwork Challan (चालान बनाएं)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
