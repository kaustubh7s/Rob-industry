import React, { useRef } from 'react';
import { Printer, Download, CheckCircle2, Building2, Phone, Calendar, User, FileText, X } from 'lucide-react';
import { Modal } from './Modal';
import { formatINR } from '../../utils/calculations';

export type SlipType = 'inward' | 'outward' | 'job_card';

interface PrintableSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SlipType;
  data: any;
}

export const PrintableSlipModal: React.FC<PrintableSlipModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTitle = () => {
    switch (type) {
      case 'inward':
        return {
          header: 'MATERIAL INWARD & GRN SLIP',
          sub: 'गेट आवक व सामग्री रसीद (Goods Receipt Note)',
          docNo: data.inwardNumber,
          date: data.date,
        };
      case 'outward':
        return {
          header: 'DELIVERY CHALLAN & GATE PASS',
          sub: 'सामग्री जावक चालान व गेट पास (Dispatch Challan)',
          docNo: data.outwardNumber,
          date: data.dispatchDate,
        };
      case 'job_card':
        return {
          header: 'SHOPFLOOR PRODUCTION JOB CARD',
          sub: 'मशीन शॉप जॉब कार्ड व रूट कार्ड (Machine Routing Slip)',
          docNo: data.jobCardNumber,
          date: data.createdDate || data.targetDate,
        };
    }
  };

  const info = getTitle();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Printable Slip: ${info.header}`}
      subtitle="Standard paper slip format for shopfloor workers, gatekeepers, and drivers"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Action Controls */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ready to print or save as physical record.</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Paper Slip (प्रिंट करें)</span>
          </button>
        </div>

        {/* Paper Printable Slip Body */}
        <div
          ref={printAreaRef}
          className="p-6 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-xl space-y-4 font-sans select-text"
        >
          {/* Company Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-700 text-white font-black text-xs rounded">RSB</span>
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  RSB PRIVATE LIMITED
                </h2>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                Manufacturing Industry
              </p>
              <p className="text-[10px] text-slate-500">
                F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase bg-slate-100 px-2 py-1 rounded border border-slate-300 block font-bold text-slate-700">
                {info.header}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">{info.sub}</p>
              <p className="text-xs font-mono font-bold text-slate-900 mt-1">Doc No: {info.docNo}</p>
            </div>
          </div>

          {/* Key Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Date (दिनांक)</span>
              <span className="font-semibold text-slate-900">{info.date || new Date().toISOString().split('T')[0]}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {type === 'inward' ? 'Supplier (सप्लायर)' : type === 'outward' ? 'Customer (ग्राहक)' : 'Project / Assembly'}
              </span>
              <span className="font-semibold text-slate-900 truncate block">
                {data.vendor || data.customer || data.project || 'RSB Plant'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {type === 'inward' ? 'Vendor Challan / PO' : type === 'outward' ? 'Vehicle & Driver' : 'Machine / Station'}
              </span>
              <span className="font-mono font-semibold text-slate-900 truncate block">
                {type === 'inward'
                  ? `${data.challanNumber || '-'} / ${data.poNumber || '-'}`
                  : type === 'outward'
                  ? `${data.vehicleNumber || '-'} (${data.driverName || '-'})`
                  : data.assignedMachine || 'CNC Lathe 01'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Status (स्थिति)</span>
              <span className="font-bold text-blue-700 uppercase">
                {data.qualityStatus || data.deliveryStatus || data.status || 'Verified'}
              </span>
            </div>
          </div>

          {/* Item Details Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2 border-r border-slate-300">Sr</th>
                  <th className="p-2 border-r border-slate-300">Material Description & Specification</th>
                  <th className="p-2 border-r border-slate-300 text-center">Grade / Type</th>
                  <th className="p-2 border-r border-slate-300 text-right">Quantity</th>
                  <th className="p-2 text-right">Weight (Kg) / Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">1</td>
                  <td className="p-2 border-r border-slate-300">
                    <span className="font-bold text-slate-900 block">
                      {data.sizeSpecs || data.material || data.partName || 'SS Precision Machined Part'}
                    </span>
                    {data.drawingRef && (
                      <span className="text-[10px] font-mono text-slate-500">Dwg: {data.drawingRef}</span>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-semibold">
                    {data.materialType || data.grade || 'SS 304'}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-bold font-mono">
                    {data.quantity || data.totalQuantity || 1} {data.unit || 'Nos'}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">
                    {data.weightKg ? `${data.weightKg} Kg` : data.remarks || 'Standard Spec OK'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks and Signatures */}
          <div className="pt-2 text-[11px] text-slate-600">
            <p>
              <strong className="text-slate-800">Note:</strong> Goods received / dispatched in good condition. All dimensions and weights recorded in digital ERP register.
            </p>
          </div>

          {/* Signature Boxes */}
          <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px] border-t border-slate-300">
            <div>
              <div className="border-b border-dashed border-slate-400 pb-1 mb-1">
                {data.receivedBy || data.dispatchPerson || data.operator || 'Staff Member'}
              </div>
              <span className="font-bold text-slate-600 uppercase">Prepared By (तैयार कर्ता)</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 pb-1 mb-1">QC Passed</div>
              <span className="font-bold text-slate-600 uppercase">QC Inspector (क्वालिटी जांच)</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 pb-1 mb-1">Authorized</div>
              <span className="font-bold text-slate-600 uppercase">Plant Manager / Gatekeeper (गेट पास)</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
