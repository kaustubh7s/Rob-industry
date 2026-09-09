import React, { useState, useEffect } from 'react';
import { Search, X, FolderKanban, Layers, Truck, Factory, Users, HardHat, FileText, ArrowRight } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    projects,
    orders,
    materials,
    vendors,
    customers,
    jobCards,
    inwardEntries,
    outwardEntries,
    setActiveTab,
  } = useERP();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const query = searchTerm.toLowerCase().trim();

  // Search aggregations
  const matchedProjects = query
    ? projects.filter(p => p.name.toLowerCase().includes(query) || p.projectNumber.toLowerCase().includes(query) || p.customer.toLowerCase().includes(query))
    : [];

  const matchedOrders = query
    ? orders.filter(o => o.orderNumber.toLowerCase().includes(query) || o.poNumber.toLowerCase().includes(query) || o.sizeSpecs.toLowerCase().includes(query) || o.materialType.toLowerCase().includes(query))
    : [];

  const matchedMaterials = query
    ? materials.filter(m => m.name.toLowerCase().includes(query) || m.code.toLowerCase().includes(query) || m.sizeSpecs.toLowerCase().includes(query))
    : [];

  const matchedVendors = query
    ? vendors.filter(v => v.name.toLowerCase().includes(query) || v.materialSupplied.toLowerCase().includes(query))
    : [];

  const matchedCustomers = query
    ? customers.filter(c => c.name.toLowerCase().includes(query) || c.contactPerson.toLowerCase().includes(query))
    : [];

  const matchedJobs = query
    ? jobCards.filter(j => j.jobCardNo.toLowerCase().includes(query) || j.project.toLowerCase().includes(query) || j.drawingRef.toLowerCase().includes(query))
    : [];

  const matchedInward = query
    ? inwardEntries.filter(i => i.inwardNumber.toLowerCase().includes(query) || i.vendor.toLowerCase().includes(query) || i.invoiceNumber.toLowerCase().includes(query))
    : [];

  const matchedOutward = query
    ? outwardEntries.filter(o => o.outwardNumber.toLowerCase().includes(query) || o.customer.toLowerCase().includes(query) || o.vehicleNumber.toLowerCase().includes(query))
    : [];

  const totalResults =
    matchedProjects.length +
    matchedOrders.length +
    matchedMaterials.length +
    matchedVendors.length +
    matchedCustomers.length +
    matchedJobs.length +
    matchedInward.length +
    matchedOutward.length;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder="Search across Projects, POs, Materials, Drawings, Inward, Outward, Vendors... (e.g. FOHA, 80x6, Manav Metal)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-hidden"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm bg-slate-800 text-slate-400 border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="py-8 text-center text-slate-500">
              <p className="text-sm font-medium">Type to search anything in RSB ERP system</p>
              <p className="text-xs mt-1 text-slate-600">Supports Project Code, Drawing Ref, Material Spec, Vendor Name, PO Number</p>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm font-semibold">No matches found for &ldquo;{searchTerm}&rdquo;</p>
              <p className="text-xs mt-1 text-slate-500">Try searching for &quot;FOHA&quot;, &quot;SS Flat&quot;, &quot;Manav Metal&quot;, or &quot;36&quot;</p>
            </div>
          )}

          {/* Projects Results */}
          {matchedProjects.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> Projects ({matchedProjects.length})
              </h4>
              <div className="space-y-1.5">
                {matchedProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleNavigate('projects')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-cyan-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-400 font-bold">{p.projectNumber}</span>
                        <span className="text-xs font-medium text-slate-200">{p.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{p.customer} &bull; {p.machineType}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders / Main Production Results */}
          {matchedOrders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Manufacturing Orders ({matchedOrders.length})
              </h4>
              <div className="space-y-1.5">
                {matchedOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => handleNavigate('orders')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-cyan-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-400 font-bold">{o.orderNumber} (PO: {o.poNumber})</span>
                        <span className="text-xs font-semibold text-slate-200">{o.materialType} - {o.sizeSpecs}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{o.project} &bull; {o.vendor} &bull; Qty: {o.quantity} {o.unit}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-sm">{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials Results */}
          {matchedMaterials.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Factory className="w-3.5 h-3.5 text-emerald-400" /> Material Master ({matchedMaterials.length})
              </h4>
              <div className="space-y-1.5">
                {matchedMaterials.map(m => (
                  <div
                    key={m.id}
                    onClick={() => handleNavigate('materials')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-emerald-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-emerald-400 font-bold">{m.code}</span>
                        <span className="text-xs font-medium text-slate-200">{m.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{m.sizeSpecs} &bull; Grade: {m.grade} &bull; Stock: {m.currentStock} {m.unit}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Cards */}
          {matchedJobs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <HardHat className="w-3.5 h-3.5 text-amber-400" /> Job Cards ({matchedJobs.length})
              </h4>
              <div className="space-y-1.5">
                {matchedJobs.map(j => (
                  <div
                    key={j.id}
                    onClick={() => handleNavigate('production')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-amber-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-400 font-bold">{j.jobCardNo}</span>
                        <span className="text-xs font-medium text-slate-200">{j.project}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{j.material} &bull; Operator: {j.assignedOperator} &bull; Progress: {j.completionPct}%</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-sm">{j.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inward & Outward */}
          {(matchedInward.length > 0 || matchedOutward.length > 0) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Truck className="w-3.5 h-3.5 text-purple-400" /> Inward / Outward Movement
              </h4>
              <div className="space-y-1.5">
                {matchedInward.map(i => (
                  <div
                    key={i.id}
                    onClick={() => handleNavigate('inward')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-purple-500/50 transition-all"
                  >
                    <div>
                      <span className="font-mono text-xs text-emerald-400 font-bold">{i.inwardNumber} (Inward)</span>
                      <p className="text-[11px] text-slate-400">Vendor: {i.vendor} &bull; {i.sizeSpecs} &bull; Qty: {i.quantity} {i.unit}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/30">{i.qualityStatus}</span>
                  </div>
                ))}
                {matchedOutward.map(o => (
                  <div
                    key={o.id}
                    onClick={() => handleNavigate('outward')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 hover:border-purple-500/50 transition-all"
                  >
                    <div>
                      <span className="font-mono text-xs text-cyan-400 font-bold">{o.outwardNumber} (Outward)</span>
                      <p className="text-[11px] text-slate-400">Customer: {o.customer} &bull; Veh: {o.vehicleNumber} &bull; Inv: {o.invoiceNumber}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/30">{o.deliveryStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendors & Customers */}
          {(matchedVendors.length > 0 || matchedCustomers.length > 0) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> Stakeholders
              </h4>
              <div className="space-y-1.5">
                {matchedVendors.map(v => (
                  <div
                    key={v.id}
                    onClick={() => handleNavigate('vendors')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50"
                  >
                    <div>
                      <span className="text-xs font-bold text-amber-300">{v.name} (Vendor)</span>
                      <p className="text-[11px] text-slate-400">{v.contactPerson} &bull; {v.materialSupplied}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
                {matchedCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleNavigate('customers')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50"
                  >
                    <div>
                      <span className="text-xs font-bold text-blue-300">{c.name} (Customer)</span>
                      <p className="text-[11px] text-slate-400">{c.contactPerson} &bull; {c.segment}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
