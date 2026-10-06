import React, { useState, useMemo, useRef } from 'react';
import {
  ShoppingCart,
  Building2,
  FolderKanban,
  Trash2,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Plus,
  Printer,
  Download,
  Check,
  X,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Edit3,
  Calendar,
  ExternalLink,
  Tag,
  Package,
  Cpu,
  Folder,
  MessageSquare,
  Copy,
  UserCheck,
  Boxes,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectMaterialRequirementItem, VendorItem, PurchaseOrder, RFQRecord, ProjectItem } from '../../types/erp';
import { exportToExcel } from '../../utils/excelIntegration';
import { formatINR, formatDate } from '../../utils/calculations';
import {
  formatWhatsAppPOMessage,
  formatShortWhatsAppPOMessage,
  createWhatsAppUrl,
  generatePurchaseOrderPDF,
  shareOrSendWhatsAppPO,
  getVendorMobile,
  cleanVendorName,
  WhatsAppPOMessageOptions,
} from '../../utils/whatsappHelper';

interface ProcurementBasketProps {
  initialProjectFilter?: string;
  initialViewMode?: 'projectFolders' | 'vendorGroups' | 'table' | 'poBasket';
  onNavigateToEntry?: () => void;
  onNavigateToProjects?: () => void;
  onNavigateToMembers?: () => void;
  onOpenTrashBin?: () => void;
}

export const ProcurementBasket: React.FC<ProcurementBasketProps> = ({
  initialProjectFilter,
  initialViewMode,
  onNavigateToEntry,
  onNavigateToProjects,
  onNavigateToMembers,
  onOpenTrashBin,
}) => {
  const {
    projectRequirements,
    projects,
    vendors,
    learnVendor,
    bulkAssignMaterialVendor,
    generateProcurementPO,
    sendProcurementRFQ,
    updateProjectRequirement,
    deleteProjectRequirement,
    trashItems,
    currentUser,
    purchaseOrders,
    addPurchaseOrder,
    updatePOStatus,
    deletePurchaseOrder,
    rfqs,
  } = useERP();

  // Primary View Mode: 'projectFolders' | 'vendorGroups' | 'table' | 'poBasket'
  const [viewMode, setViewMode] = useState<'projectFolders' | 'vendorGroups' | 'table' | 'poBasket'>(() => {
    if (initialViewMode) return initialViewMode;
    if (initialProjectFilter && initialProjectFilter !== 'ALL') return 'projectFolders';
    return 'poBasket';
  });

  // Multi-Selection State (Set of Requirement IDs)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState(
    initialProjectFilter && initialProjectFilter !== 'ALL'
      ? initialProjectFilter
      : ''
  );

  React.useEffect(() => {
    if (initialProjectFilter && initialProjectFilter !== 'ALL') {
      setFilterProject(initialProjectFilter);
    }
  }, [initialProjectFilter]);

  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterVendorStatus, setFilterVendorStatus] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [filterPOStatus, setFilterPOStatus] = useState('ALL');

  // Modals
  const [isAssignVendorModalOpen, setIsAssignVendorModalOpen] = useState(false);
  const [selectedVendorForAssign, setSelectedVendorForAssign] = useState('');
  const [customVendorName, setCustomVendorName] = useState('');
  const [customVendorPhone, setCustomVendorPhone] = useState('');
  const [isAddCustomVendorMode, setIsAddCustomVendorMode] = useState(false);

  // Customizable WhatsApp Dispatch Modal State
  const [whatsAppDispatchTarget, setWhatsAppDispatchTarget] = useState<{
    poPayload: WhatsAppPOMessageOptions;
    phone: string;
  } | null>(null);

  // Single Item Smart Suggestion Modal / Drawer
  const [smartSuggestItem, setSmartSuggestItem] = useState<ProjectMaterialRequirementItem | null>(null);

  // Edit Material Item Modal State
  const [editingItem, setEditingItem] = useState<ProjectMaterialRequirementItem | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editMatType, setEditMatType] = useState('');
  const [editSizeSpecs, setEditSizeSpecs] = useState('');
  const [editQty, setEditQty] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('Nos');
  const [editVendor, setEditVendor] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEditItem = (item: ProjectMaterialRequirementItem) => {
    setEditingItem(item);
    setEditDesc(item.description || '');
    setEditMatType(item.materialType || 'SS Flat');
    setEditSizeSpecs(item.sizeSpecs || '');
    setEditQty(Number(item.quantity) || 1);
    setEditUnit(item.unit || 'Nos');
    setEditVendor(item.vendor || item.vendorName || '');
    setEditNotes(item.notes || '');
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    updateProjectRequirement(editingItem.id, {
      description: editDesc.trim() || editingItem.description,
      materialType: (editMatType as any) || editingItem.materialType,
      sizeSpecs: editSizeSpecs.trim() || editingItem.sizeSpecs,
      quantity: Number(editQty) || 1,
      unit: editUnit || editingItem.unit,
      vendor: editVendor.trim() || editingItem.vendor,
      vendorName: editVendor.trim() || editingItem.vendor,
      notes: editNotes.trim(),
    });
    showToast(`Updated "${editDesc || editingItem.description}" successfully!`);
    setEditingItem(null);
  };

  // Toggle Ordered / Not Ordered Status Only (Without Editing Specs)
  const handleToggleOrderedStatus = (item: ProjectMaterialRequirementItem) => {
    const isCurrentlyOrdered = item.poStatus === 'Issued' || Boolean(item.poNumberAssigned);
    const nextStatus = isCurrentlyOrdered ? 'Draft' : 'Issued';
    const nextPoNumber = isCurrentlyOrdered ? undefined : (item.poNumberAssigned || `PO-MANUAL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);

    updateProjectRequirement(item.id, {
      poStatus: nextStatus,
      poNumberAssigned: nextPoNumber,
    });

    if (isCurrentlyOrdered) {
      showToast(`Marked "${item.description}" as Not Ordered (Draft)`);
    } else {
      showToast(`Marked "${item.description}" as Ordered ✓`);
    }
  };

  // RFQ Modal State
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [rfqTargetVendors, setRfqTargetVendors] = useState<string[]>([]);
  const [rfqCustomVendor, setRfqCustomVendor] = useState('');
  const [rfqNotes, setRfqNotes] = useState('');

  // PO Generation Modal State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poTargetVendor, setPoTargetVendor] = useState('');
  const [poCustomNumber, setPoCustomNumber] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [poNotes, setPoNotes] = useState('Immediate dispatch as per RSB specifications.');
  const [poCandidateItems, setPoCandidateItems] = useState<ProjectMaterialRequirementItem[]>([]);
  const [poItemsToGenerate, setPoItemsToGenerate] = useState<ProjectMaterialRequirementItem[]>([]);
  const [generatedPOPreview, setGeneratedPOPreview] = useState<PurchaseOrder | null>(null);

  // PO Basket View States & Filter Controls
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('ALL');
  const [poVendorFilter, setPoVendorFilter] = useState('ALL');
  const [poOrderedByFilter, setPoOrderedByFilter] = useState('ALL');
  const [selectedPoForSlip, setSelectedPoForSlip] = useState<PurchaseOrder | null>(null);
  const [isDirectPOModalOpen, setIsDirectPOModalOpen] = useState(false);
  const [directPOForm, setDirectPOForm] = useState({
    poNumber: '',
    vendor: '',
    expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentTerms: '30 Days Net',
    notes: '',
    projectName: '',
    machineName: '',
    items: [] as { material: string; sizeSpecs: string; qty: number; unit: string; rate: number; amount: number }[]
  });

  const allPoVendors = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.vendor) set.add(po.vendor);
    });
    return Array.from(set);
  }, [purchaseOrders]);

  const allPoOrderedByUsers = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.orderedBy) set.add(po.orderedBy);
    });
    if (currentUser?.name) set.add(currentUser.name);
    return Array.from(set);
  }, [purchaseOrders, currentUser]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = poSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        po.poNumber.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q) ||
        (po.orderedBy || '').toLowerCase().includes(q) ||
        (po.status || '').toLowerCase().includes(q) ||
        (po.notes || '').toLowerCase().includes(q) ||
        (po.projectNames || []).some((p) => p.toLowerCase().includes(q)) ||
        (po.machineNames || []).some((m) => m.toLowerCase().includes(q)) ||
        po.items.some(
          (i) =>
            i.material.toLowerCase().includes(q) ||
            i.sizeSpecs.toLowerCase().includes(q)
        );

      const matchStatus = poStatusFilter === 'ALL' || po.status === poStatusFilter;
      const matchVendor = poVendorFilter === 'ALL' || po.vendor === poVendorFilter;
      const matchOrderedBy =
        poOrderedByFilter === 'ALL' ||
        (po.orderedBy || 'Amit').toLowerCase().includes(poOrderedByFilter.toLowerCase());

      return matchSearch && matchStatus && matchVendor && matchOrderedBy;
    });
  }, [purchaseOrders, poSearchQuery, poStatusFilter, poVendorFilter, poOrderedByFilter]);

  const poBasketMetrics = useMemo(() => {
    const total = purchaseOrders.length;
    const totalParts = purchaseOrders.reduce((sum, po) => sum + (po.items?.length || 0), 0);
    const sentCount = purchaseOrders.filter((po) => po.status === 'Sent' || po.status === 'Draft' || po.status === 'Partially Received').length;
    const receivedCount = purchaseOrders.filter((po) => po.status === 'Received').length;
    const activeAdmin = currentUser?.name || 'Amit';
    return {
      total,
      totalParts,
      sentCount,
      receivedCount,
      activeAdmin,
    };
  }, [purchaseOrders, currentUser]);

  // Available Vendors in PO Candidate Selection
  const availableVendorsInPO = useMemo(() => {
    const vSet = new Set<string>();
    poCandidateItems.forEach((i) => {
      const v = (i.vendor || i.vendorName || '').trim();
      if (v && v !== 'Unassigned' && v !== 'Standard Vendor') {
        vSet.add(v);
      }
    });
    return Array.from(vSet);
  }, [poCandidateItems]);

  // Group candidate PO items by vendor with subtotals for clean enterprise hierarchy
  const vendorGroupsInPO = useMemo(() => {
    const map = new Map<string, { vendorName: string; items: ProjectMaterialRequirementItem[]; totalQty: number }>();
    poItemsToGenerate.forEach((item) => {
      const vName = cleanVendorName(item.vendor || item.vendorName);
      if (!map.has(vName)) {
        map.set(vName, { vendorName: vName, items: [], totalQty: 0 });
      }
      const entry = map.get(vName)!;
      entry.items.push(item);
      entry.totalQty += (Number(item.quantity) || 0);
    });
    return Array.from(map.values());
  }, [poItemsToGenerate]);

  // Robust Multi-Page A4 Chunking Engine (Pins 3-tier signatures strictly to footer of the last page)
  interface POPageChunk {
    pageIndex: number;
    totalPages: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    items: { item: ProjectMaterialRequirementItem; globalIndex: number }[];
  }

  const chunkPOItems = (items: ProjectMaterialRequirementItem[]): POPageChunk[] => {
    const sorted = [...items].sort((a, b) => (Number(a.srNo) || 0) - (Number(b.srNo) || 0));
    const indexed = sorted.map((item, idx) => ({
      item,
      globalIndex: (item.srNo !== undefined && item.srNo !== null && !isNaN(Number(item.srNo)) && Number(item.srNo) > 0)
        ? Number(item.srNo)
        : idx + 1,
    }));
    const SINGLE_PAGE_MAX = 24;
    const FIRST_PAGE_MAX = 27;
    const MIDDLE_PAGE_MAX = 33;
    const LAST_PAGE_MAX = 26;

    if (indexed.length <= SINGLE_PAGE_MAX) {
      return [
        {
          pageIndex: 1,
          totalPages: 1,
          isFirstPage: true,
          isLastPage: true,
          items: indexed,
        },
      ];
    }

    const rawPages: { isFirstPage: boolean; isLastPage: boolean; items: typeof indexed }[] = [];
    let remaining = [...indexed];

    // First page: if remaining is between 15 and 20, split between page 1 and page 2 so page 2 has the signatures
    let p1Count = FIRST_PAGE_MAX;
    if (remaining.length <= FIRST_PAGE_MAX) {
      p1Count = Math.ceil(remaining.length / 2);
    } else {
      p1Count = Math.min(remaining.length, FIRST_PAGE_MAX);
    }

    rawPages.push({
      isFirstPage: true,
      isLastPage: false,
      items: remaining.slice(0, p1Count),
    });
    remaining = remaining.slice(p1Count);

    // Subsequent pages
    while (remaining.length > 0) {
      if (remaining.length <= LAST_PAGE_MAX) {
        rawPages.push({
          isFirstPage: false,
          isLastPage: true,
          items: remaining,
        });
        break;
      }

      let takeCount = MIDDLE_PAGE_MAX;
      if (remaining.length <= MIDDLE_PAGE_MAX) {
        takeCount = Math.ceil(remaining.length / 2);
      }

      const chunk = remaining.slice(0, takeCount);
      remaining = remaining.slice(takeCount);
      rawPages.push({
        isFirstPage: false,
        isLastPage: remaining.length === 0,
        items: chunk,
      });
    }

    const totalPages = rawPages.length;
    return rawPages.map((p, idx) => ({
      pageIndex: idx + 1,
      totalPages,
      isFirstPage: p.isFirstPage,
      isLastPage: idx === totalPages - 1,
      items: p.items,
    }));
  };

  const paginatedPOPages = useMemo(() => {
    return chunkPOItems(poItemsToGenerate);
  }, [poItemsToGenerate]);

  const paginatedSavedPOPages = useMemo(() => {
    if (!selectedPoForSlip) return [];
    const defaultProject = (selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'Mahalaxmi 3';
    const defaultMachine = (selectedPoForSlip.machineNames && selectedPoForSlip.machineNames[0]) || 'Machine';
    const itemsAsReq = selectedPoForSlip.items.map((i, idx) => ({
      id: `saved-item-${idx}`,
      projectId: '',
      projectName: i.projectName || defaultProject,
      machineId: '',
      machineName: i.machineName || defaultMachine,
      machineType: i.machineName || defaultMachine,
      materialType: (i.materialType as any) || 'SS Flat',
      description: i.description || i.material,
      sizeSpecs: i.sizeSpecs,
      quantity: i.qty,
      unit: i.unit || 'Nos',
      vendor: i.vendor || selectedPoForSlip.vendor,
      vendorName: i.vendor || selectedPoForSlip.vendor,
      poStatus: (selectedPoForSlip.status === 'Sent' ? 'Issued' : 'Pending') as any,
      vendorStatus: 'Assigned' as any,
      createdAt: selectedPoForSlip.date,
      updatedAt: selectedPoForSlip.date,
    })) as unknown as ProjectMaterialRequirementItem[];
    return chunkPOItems(itemsAsReq);
  }, [selectedPoForSlip]);

  // Selectable PO Columns Configuration
  const [poColumnConfig, setPoColumnConfig] = useState({
    srNo: true,
    projectName: true,
    machineName: true,
    description: true,
    materialType: true,
    sizeSpecs: true,
    quantity: true,
    unit: true,
    vendor: true,
    requiredDate: false,
    notes: false,
  });

  const togglePOColumn = (key: keyof typeof poColumnConfig) => {
    setPoColumnConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. ACTIVE BASKET REQUIREMENTS: Display materials belonging to active projects that are PENDING ORDER (not yet ordered / PO issued)
  const activeRequirements = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    const activeProjectNames = new Set(projects.map((p) => (p.name || '').trim().toLowerCase()));
    const activeProjectNumbers = new Set(projects.map((p) => (p.projectNumber || '').trim().toLowerCase()));

    return projectRequirements.filter((r) => {
      // Once an item is already ordered / PO issued, it does not need to be ordered again
      const isAlreadyOrdered = r.poStatus === 'Issued' || Boolean(r.poNumberAssigned);
      if (isAlreadyOrdered) return false;

      const rName = (r.projectName || '').trim().toLowerCase();
      return activeProjectNames.has(rName) || activeProjectNumbers.has(rName);
    }).sort((a, b) => (Number(a.srNo) || 0) - (Number(b.srNo) || 0));
  }, [projectRequirements, projects]);

  // Extract all unique project names from active list
  const allProjectNames = useMemo(() => {
    const fromProjects = projects.map((p) => p.name);
    const fromReqs = activeRequirements.map((r) => r.projectName);
    return Array.from(new Set([...fromProjects, ...fromReqs].filter(Boolean)));
  }, [projects, activeRequirements]);

  // Extract all unique material types
  const allMaterialTypes = useMemo(() => {
    return Array.from(new Set(activeRequirements.map((r) => r.materialType).filter(Boolean)));
  }, [activeRequirements]);

  // Extract all unique vendors
  const allVendorsList = useMemo<string[]>(() => {
    const registered = vendors.map((v) => v.name);
    const fromReqs = activeRequirements.map((r) => r.vendor || r.vendorName).filter((v): v is string => Boolean(v && v !== 'Unassigned' && v !== 'Standard Vendor'));
    return Array.from(new Set([...registered, ...fromReqs].filter((v): v is string => Boolean(v))));
  }, [vendors, activeRequirements]);

  // Filtered Requirements List
  const filteredItems = useMemo(() => {
    return activeRequirements.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.description?.toLowerCase().includes(q) ||
          item.sizeSpecs?.toLowerCase().includes(q) ||
          item.projectName?.toLowerCase().includes(q) ||
          item.materialType?.toLowerCase().includes(q) ||
          (item.vendor || item.vendorName || '').toLowerCase().includes(q) ||
          (item.machineName || item.machineType || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filter Project
      if (filterProject !== 'ALL' && item.projectName !== filterProject) {
        return false;
      }

      // Filter Material Type
      if (filterMaterialType !== 'ALL' && item.materialType !== filterMaterialType) {
        return false;
      }

      // Filter Vendor Status
      const isAssigned = item.vendor && item.vendor !== 'Unassigned' && item.vendor !== 'Standard Vendor' && item.vendor.trim() !== '';
      if (filterVendorStatus === 'UNASSIGNED' && isAssigned) return false;
      if (filterVendorStatus === 'ASSIGNED' && !isAssigned) return false;

      // Filter PO Status
      if (filterPOStatus !== 'ALL') {
        const pStat = item.poStatus || (item.poNumberAssigned ? 'Issued' : 'Draft');
        if (pStat !== filterPOStatus) return false;
      }

      return true;
    });
  }, [activeRequirements, searchQuery, filterProject, filterMaterialType, filterVendorStatus, filterPOStatus]);

  // Unassigned vs Assigned Counts
  const metrics = useMemo(() => {
    let unassigned = 0;
    let assigned = 0;
    let poGenerated = 0;
    let totalQty = 0;

    activeRequirements.forEach((r) => {
      const isAssigned = r.vendor && r.vendor !== 'Unassigned' && r.vendor !== 'Standard Vendor' && r.vendor.trim() !== '';
      if (isAssigned) assigned++;
      else unassigned++;

      if (r.poStatus === 'Issued' || r.poNumberAssigned) poGenerated++;
      totalQty += Number(r.quantity) || 0;
    });

    return {
      total: activeRequirements.length,
      unassigned,
      assigned,
      poGenerated,
      totalQty,
    };
  }, [activeRequirements]);

  // Smart Vendor Suggestions Generator (Dynamically matches against real registered vendors and purchase history)
  const getSmartVendorSuggestions = (materialType: string, _sizeSpecs?: string) => {
    const matUpper = (materialType || '').toUpperCase();
    const suggestions: {
      vendorName: string;
      lastRate: number;
      lastPurchaseDate: string;
      orderCount: number;
      matchReason: string;
    }[] = [];

    if (!vendors || vendors.length === 0) {
      return suggestions;
    }

    vendors.forEach((v) => {
      const vMat = (v.materialSupplied || '').toUpperCase();
      const isMatch = matUpper && (vMat.includes(matUpper) || matUpper.includes(vMat));
      if (isMatch || suggestions.length < 3) {
        suggestions.push({
          vendorName: v.name,
          lastRate: 0,
          lastPurchaseDate: '-',
          orderCount: v.totalOrders || 0,
          matchReason: isMatch ? `Matched Category (${v.materialSupplied})` : 'Registered Supplier Directory',
        });
      }
    });

    return suggestions;
  };

  // Grouping by Project and then by Machine (Project Folders Structure)
  const projectMachineFolders = useMemo(() => {
    const projectMap = new Map<string, {
      project: ProjectItem | undefined;
      projectName: string;
      machineGroups: Map<string, ProjectMaterialRequirementItem[]>;
      totalItems: number;
      assignedCount: number;
      unassignedCount: number;
    }>();

    filteredItems.forEach((item) => {
      const pName = item.projectName || 'General Project';
      if (!projectMap.has(pName)) {
        const foundProj = projects.find(
          (p) =>
            p.name.trim().toLowerCase() === pName.trim().toLowerCase() ||
            p.projectNumber.trim().toLowerCase() === pName.trim().toLowerCase()
        );
        projectMap.set(pName, {
          project: foundProj,
          projectName: pName,
          machineGroups: new Map(),
          totalItems: 0,
          assignedCount: 0,
          unassignedCount: 0,
        });
      }

      const pEntry = projectMap.get(pName)!;
      const mName = item.machineName || item.machineType || 'Machine Assembly';

      if (!pEntry.machineGroups.has(mName)) {
        pEntry.machineGroups.set(mName, []);
      }
      pEntry.machineGroups.get(mName)!.push(item);
      pEntry.totalItems++;

      const isAssigned = item.vendor && item.vendor !== 'Unassigned' && item.vendor !== 'Standard Vendor' && item.vendor.trim() !== '';
      if (isAssigned) pEntry.assignedCount++;
      else pEntry.unassignedCount++;
    });

    return Array.from(projectMap.values());
  }, [filteredItems, projects]);

  // Grouping by Vendor
  const vendorGroups = useMemo(() => {
    const groups: {
      vendorName: string;
      items: ProjectMaterialRequirementItem[];
      totalQty: number;
      projectCount: number;
      isUnassigned: boolean;
    }[] = [];

    const map = new Map<string, ProjectMaterialRequirementItem[]>();

    filteredItems.forEach((item) => {
      const v = item.vendor && item.vendor !== 'Standard Vendor' && item.vendor.trim() !== '' ? item.vendor : 'Unassigned';
      if (!map.has(v)) {
        map.set(v, []);
      }
      map.get(v)!.push(item);
    });

    map.forEach((items, vName) => {
      const uniqueProjects = new Set(items.map((i) => i.projectName)).size;
      const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      groups.push({
        vendorName: vName,
        items,
        totalQty,
        projectCount: uniqueProjects,
        isUnassigned: vName === 'Unassigned',
      });
    });

    // Sort: Unassigned first, then by item count
    return groups.sort((a, b) => {
      if (a.isUnassigned) return -1;
      if (b.isUnassigned) return 1;
      return b.items.length - a.items.length;
    });
  }, [filteredItems]);

  // Selection Handlers
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length > 0) {
        window.dispatchEvent(new CustomEvent('rsb:tour:item-selected', { detail: { id, count: next.length } }));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
      window.dispatchEvent(new CustomEvent('rsb:tour:item-selected', { detail: { count: filteredItems.length } }));
    }
  };

  const handleSelectProjectItems = (projectItems: ProjectMaterialRequirementItem[]) => {
    const pIds = projectItems.map((i) => i.id);
    const allSelected = pIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = Array.from(new Set([...prev, ...pIds]));
        window.dispatchEvent(new CustomEvent('rsb:tour:item-selected', { detail: { count: next.length } }));
        return next;
      });
    }
  };

  // Bulk Vendor Assignment Action
  const handleOpenBulkAssign = () => {
    if (selectedIds.length === 0) {
      alert('Please select at least 1 material row to assign a vendor.');
      return;
    }
    setSelectedVendorForAssign(allVendorsList[0] || '');
    setIsAssignVendorModalOpen(true);
  };

  const handleConfirmBulkAssign = (openWhatsAppPO: boolean = false) => {
    const finalVendor = isAddCustomVendorMode ? customVendorName.trim() : selectedVendorForAssign;
    if (!finalVendor) {
      alert('Please specify or select a vendor name.');
      return;
    }

    if (isAddCustomVendorMode) {
      learnVendor(finalVendor);
    }

    const assignedVendorMobile = isAddCustomVendorMode && customVendorPhone.trim()
      ? customVendorPhone.trim()
      : getVendorMobile(finalVendor, vendors);

    const targetMaterialItems = filteredItems.filter((i) => selectedIds.includes(i.id));

    bulkAssignMaterialVendor(selectedIds, finalVendor);
    showToast(`✓ Assigned "${finalVendor}" (${assignedVendorMobile}) to ${selectedIds.length} materials! PO is ready to send.`);
    window.dispatchEvent(new CustomEvent('rsb:tour:vendor-assigned', { detail: { vendor: finalVendor } }));
    setIsAssignVendorModalOpen(false);
    setSelectedIds([]);
    setCustomVendorName('');
    setCustomVendorPhone('');
    setIsAddCustomVendorMode(false);

    if (openWhatsAppPO) {
      const generatedPONum = `PO-RSB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const poPayload: WhatsAppPOMessageOptions = {
        poNumber: generatedPONum,
        vendorName: finalVendor,
        vendorMobile: assignedVendorMobile,
        paymentTerms: '30 Days Net',
        status: 'Sent',
        projectName: targetMaterialItems[0]?.projectName || 'RSB Manufacturing',
        machineName: targetMaterialItems[0]?.machineName || targetMaterialItems[0]?.machineType || 'Standard Machine',
        dateOfIssue: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        orderedBy: currentUser?.name || 'Amit',
        items: targetMaterialItems.map((i, iIdx) => ({
          id: `po-item-${iIdx}`,
          projectName: i.projectName || 'RSB',
          machineName: i.machineName || i.machineType || 'Machine',
          description: i.description,
          materialType: i.materialType || 'SS Part',
          materialGrade: 'SS 304',
          sizeSpecs: i.sizeSpecs,
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'Nos',
          vendor: finalVendor,
          orderedBy: currentUser?.name || 'Amit',
        })),
      };
      setWhatsAppDispatchTarget({
        poPayload,
        phone: assignedVendorMobile || '',
      });
    }
  };

  // Quick 1-Click Suggestion Apply
  const handleApplySuggestion = (reqId: string, vendorName: string) => {
    bulkAssignMaterialVendor([reqId], vendorName);
    showToast(`Assigned ${vendorName} to material requirement!`);
    setSmartSuggestItem(null);
  };

  // Open RFQ Modal for Selected Items or a Specific Vendor Group
  const handleOpenRFQModal = (vendorName?: string, presetItems?: ProjectMaterialRequirementItem[]) => {
    const items = presetItems || filteredItems.filter((i) => selectedIds.includes(i.id));
    if (items.length === 0) {
      alert('Please select at least 1 material item to generate RFQ.');
      return;
    }
    setRfqTargetVendors(vendorName && vendorName !== 'Unassigned' ? [vendorName] : (allVendorsList[0] ? [allVendorsList[0]] : []));
    setRfqNotes('Please submit competitive rate and delivery timeline for raw material fabrication.');
    setIsRFQModalOpen(true);
  };

  const handleConfirmSendRFQ = () => {
    if (rfqTargetVendors.length === 0 && !rfqCustomVendor.trim()) {
      alert('Please select at least one vendor to receive RFQ.');
      return;
    }

    const finalVendors = [...rfqTargetVendors];
    if (rfqCustomVendor.trim() && !finalVendors.includes(rfqCustomVendor.trim())) {
      finalVendors.push(rfqCustomVendor.trim());
      learnVendor(rfqCustomVendor.trim());
    }

    const items = filteredItems.filter((i) => selectedIds.includes(i.id));
    const targetItems = items.length > 0 ? items : filteredItems.slice(0, 5);
    const rfqItems = targetItems.map((i) => ({
      requirementId: i.id,
      description: i.description,
      materialType: i.materialType,
      sizeSpecs: i.sizeSpecs,
      quantity: Number(i.quantity) || 1,
      unit: i.unit || 'Nos',
      projectName: i.projectName,
      machineName: i.machineName || i.machineType || 'Machine',
    }));
    sendProcurementRFQ(finalVendors, rfqItems, rfqNotes);

    showToast(`RFQ successfully dispatched to ${finalVendors.join(', ')}!`);
    setIsRFQModalOpen(false);
    setSelectedIds([]);
  };

  // Open Master PO Generation Modal with All Items Categorized Sequentially by Vendor
  const handleOpenPOModal = (vendorName?: string, presetItems?: ProjectMaterialRequirementItem[]) => {
    const items = presetItems || (selectedIds.length > 0 ? filteredItems.filter((i) => selectedIds.includes(i.id)) : filteredItems);
    if (items.length === 0) {
      alert('Please select at least 1 material item to generate Purchase Order.');
      return;
    }

    // Strict sequential grouping by vendor (Vendor A all items first, then Vendor B all items, then Vendor C, etc.)
    const sortedByVendor = [...items].sort((a, b) => {
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

    setPoCandidateItems(sortedByVendor);
    setPoItemsToGenerate(sortedByVendor);

    const distinctItemVendors: string[] = Array.from(
      new Set(
        sortedByVendor
          .map((i) => i.vendor || i.vendorName)
          .filter((v): v is string => Boolean(v && v !== 'Unassigned' && v.trim() !== ''))
      )
    );

    const targetV: string =
      (vendorName && vendorName !== 'Unassigned'
        ? vendorName
        : distinctItemVendors.length > 0
        ? distinctItemVendors[0]
        : allVendorsList[0] || '') || '';

    setPoTargetVendor(targetV);
    setPoCustomNumber(`PO-RSB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setGeneratedPOPreview(null);
    setIsPOModalOpen(true);
    window.dispatchEvent(new CustomEvent('rsb:tour:po-generated', { detail: { itemsCount: items.length } }));
  };

  const handleConfirmGeneratePO = () => {
    if (!poTargetVendor) {
      alert('Please select or specify a recipient vendor for this PO.');
      return;
    }

    const poItems = poItemsToGenerate.map((i) => ({
      material: i.description,
      description: i.description,
      sizeSpecs: i.sizeSpecs,
      qty: Number(i.quantity) || 1,
      unit: i.unit || 'Nos',
      requirementId: i.id,
      projectName: i.projectName,
      machineName: i.machineName || i.machineType || 'Machine',
      materialType: i.materialType,
      vendor: i.vendor || i.vendorName,
    }));

    const currentAdminName = currentUser?.name || 'Amit';
    const newPO = generateProcurementPO(poTargetVendor, poItems, poExpectedDate, poNotes, poCustomNumber, currentAdminName);

    if (newPO) {
      setGeneratedPOPreview(newPO);
      showToast(`Master Purchase Order ${newPO.poNumber} generated successfully and auto-saved to PO Basket! (Ordered by: ${currentAdminName})`);
      setSelectedIds([]);
    }
  };

  // 1-Click Direct WhatsApp Master Purchase Order & PDF Dispatch (Direct PDF Download & WhatsApp Web/App Link to Kaustubh: 7276939301)
  const handleOpenWhatsAppForItems = (
    vendorName?: string,
    items?: ProjectMaterialRequirementItem[],
    poNum?: string,
    pName?: string
  ) => {
    const targetItems = items || (selectedIds.length > 0 ? filteredItems.filter((i) => selectedIds.includes(i.id)) : filteredItems);
    if (targetItems.length === 0) {
      alert('Please select at least 1 material item to share on WhatsApp.');
      return;
    }

    const distinctItemVendors: string[] = Array.from(
      new Set(
        targetItems
          .map((i) => i.vendor || i.vendorName)
          .filter((v): v is string => Boolean(v && v !== 'Unassigned' && v.trim() !== ''))
      )
    );

    const targetV: string =
      (vendorName && vendorName !== 'Unassigned'
        ? vendorName
        : distinctItemVendors.length > 0
        ? distinctItemVendors[0]
        : allVendorsList[0] || '') || '';

    const phone = getVendorMobile(targetV, vendors);
    const finalPONum = poNum || `PO-RSB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const targetDelDate = poExpectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const currentAdminName = currentUser?.name || 'Amit';

    const poPayload: WhatsAppPOMessageOptions = {
      poNumber: finalPONum,
      vendorName: targetV,
      vendorMobile: phone,
      paymentTerms: 'Immediate / 30 Days',
      status: 'Sent',
      projectName: pName || targetItems[0]?.projectName || filterProject || 'jkjdsasds',
      machineName: targetItems[0]?.machineName || targetItems[0]?.machineType || 'Standard Machine',
      dateOfIssue: dateStr,
      expectedDeliveryDate: targetDelDate,
      orderedBy: currentAdminName,
      notes: poNotes || 'Supply with Material Test Certificate (MTC SS 304). High precision cutting required.',
      items: targetItems.map((i, idx) => ({
        id: i.id,
        srNo: (i.srNo !== undefined && i.srNo !== null && !isNaN(Number(i.srNo)) && Number(i.srNo) > 0) ? Number(i.srNo) : idx + 1,
        projectName: i.projectName || pName || filterProject || 'jkjdsasds',
        machineName: i.machineName || i.machineType || 'Standard Machine',
        description: i.description,
        materialType: i.materialType,
        materialGrade: i.materialGrade || 'SS 304',
        sizeSpecs: i.sizeSpecs,
        quantity: Number(i.quantity) || 1,
        unit: i.unit || 'Nos',
        vendor: i.vendor || i.vendorName || 'Unassigned',
        vendorName: i.vendor || i.vendorName || 'Unassigned',
        orderedBy: currentAdminName,
        notes: i.notes,
      })),
    };

    // Auto-save generated PO directly into the PO Basket so all POs appear in table view
    const alreadySaved = purchaseOrders.some((p) => p.poNumber === finalPONum);
    if (!alreadySaved) {
      addPurchaseOrder({
        poNumber: finalPONum,
        date: dateStr,
        vendor: targetV,
        expectedDate: targetDelDate,
        paymentTerms: 'Immediate / 30 Days',
        status: 'Sent',
        orderedBy: currentAdminName,
        issuedBy: currentAdminName,
        notes: poNotes || 'Supply with Material Test Certificate (MTC SS 304). High precision cutting required.',
        projectNames: Array.from(new Set(targetItems.map((i) => i.projectName).filter(Boolean))) as string[],
        machineNames: Array.from(new Set(targetItems.map((i) => i.machineName || i.machineType).filter(Boolean))) as string[],
        totalAmount: targetItems.reduce((acc, i) => acc + ((Number(i.quantity) || 1) * 500), 0),
        items: targetItems.map((i, idx) => ({
          srNo: (i.srNo !== undefined && i.srNo !== null && !isNaN(Number(i.srNo)) && Number(i.srNo) > 0) ? Number(i.srNo) : idx + 1,
          material: i.description,
          description: i.description,
          sizeSpecs: i.sizeSpecs,
          qty: Number(i.quantity) || 1,
          unit: i.unit || 'Nos',
          rate: 500,
          amount: (Number(i.quantity) || 1) * 500,
          projectName: i.projectName,
          machineName: i.machineName || i.machineType || 'Machine',
          materialType: i.materialType,
          vendor: i.vendor || i.vendorName,
        })),
      });
    }

    // 1. Generate & auto-download official RSB Purchase Order PDF directly
    const pdfName = generatePurchaseOrderPDF(poPayload);

    // 2. Format concise message
    const msg = formatWhatsAppPOMessage(poPayload);

    // 3. Copy message to clipboard
    try {
      navigator.clipboard.writeText(msg);
    } catch (e) {
      const textArea = document.createElement('textarea');
      textArea.value = msg;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    // 4. Directly open WhatsApp Web / App to 7276939301
    const url = createWhatsAppUrl(phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');

    showToast(`✓ Master PO "${finalPONum}" auto-saved in PO Basket, PDF downloaded & WhatsApp opened for ${phone}!`);
  };

  // Export All Saved POs to Excel Workbook
  const handleExportAllPOsToExcel = () => {
    if (filteredPurchaseOrders.length === 0) {
      alert('No Purchase Orders to export.');
      return;
    }

    const dataToExport = filteredPurchaseOrders.map((po, idx) => ({
      'Sr No': idx + 1,
      'PO Number': po.poNumber,
      'Date of Issue': po.date,
      'Expected Delivery': po.expectedDate,
      'Vendor': po.vendor,
      'ORDERED BY': po.orderedBy || currentUser?.name || 'Amit',
      'Projects': (po.projectNames || []).join(', ') || 'General',
      'Machines': (po.machineNames || []).join(', ') || 'General',
      'Total Items': po.items.length,
      'Total Amount (₹)': po.totalAmount || 0,
      'Payment Terms': po.paymentTerms || '30 Days Net',
      'Status': po.status,
      'Notes': po.notes || '',
    }));

    exportToExcel(
      dataToExport,
      `RSB_PO_Basket_${new Date().toISOString().split('T')[0]}`,
      'RSB Purchase Orders Basket'
    );
    showToast(`✓ Exported ${filteredPurchaseOrders.length} Purchase Orders to Excel!`);
  };

  // Manual Basket Item Removals (Marks as Ordered / Fulfilled so it leaves the basket without deleting the project or BOM)
  const handleRemoveSelectedItems = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Remove ${selectedIds.length} selected material(s) from the order basket? (Marks as fulfilled, project remains intact)`)) {
      selectedIds.forEach((id) => {
        updateProjectRequirement(id, { poStatus: 'Issued', poNumberAssigned: 'MANUAL-ORDERED' });
      });
      showToast(`Removed ${selectedIds.length} item(s) from order basket.`);
      setSelectedIds([]);
    }
  };

  const handleRemoveMachineItems = (items: ProjectMaterialRequirementItem[], machineName: string) => {
    if (items.length === 0) return;
    if (window.confirm(`Remove all ${items.length} materials in machine "${machineName}" from order basket? (Project and machine remain intact)`)) {
      items.forEach((i) => {
        updateProjectRequirement(i.id, { poStatus: 'Issued', poNumberAssigned: 'MANUAL-ORDERED' });
      });
      setSelectedIds((prev) => prev.filter((id) => !items.some((i) => i.id === id)));
      showToast(`Removed machine "${machineName}" (${items.length} items) from order basket.`);
    }
  };

  const handleRemoveProjectItems = (items: ProjectMaterialRequirementItem[], projectName: string) => {
    if (items.length === 0) return;
    if (window.confirm(`Remove all ${items.length} materials in project "${projectName}" from order basket? (Project remains intact)`)) {
      items.forEach((i) => {
        updateProjectRequirement(i.id, { poStatus: 'Issued', poNumberAssigned: 'MANUAL-ORDERED' });
      });
      setSelectedIds((prev) => prev.filter((id) => !items.some((i) => i.id === id)));
      showToast(`Removed project "${projectName}" (${items.length} items) from order basket.`);
    }
  };

  // Export Order Basket Excel
  const handleExportBasketExcel = () => {
    const dataToExport = filteredItems.map((item, idx) => ({
      'Sr No': (item.srNo !== undefined && item.srNo !== null && !isNaN(Number(item.srNo)) && Number(item.srNo) > 0) ? Number(item.srNo) : idx + 1,
      'Project Name': item.projectName,
      'Machine': item.machineName || item.machineType || 'Machine',
      'Material Description': item.description,
      'Material Type': item.materialType,
      'Size Specification': item.sizeSpecs,
      'Quantity': Number(item.quantity) || 1,
      'Unit': item.unit || 'Nos',
      'Assigned Vendor': item.vendor || 'Unassigned',
      'Vendor Status': item.vendor && item.vendor !== 'Unassigned' ? 'Assigned' : 'Unassigned',
      'PO Status': item.poStatus || 'Draft',
    }));

    exportToExcel(
      dataToExport,
      `RSB_Order_Basket_${new Date().toISOString().split('T')[0]}`,
      'RSB Order Basket & Material Indent'
    );
  };

  // Export Specific PO to Excel without Rates
  const handleExportPOToExcel = () => {
    if (!generatedPOPreview) return;

    const dataToExport = poItemsToGenerate.map((item, idx) => {
      const rowData: Record<string, any> = {};
      if (poColumnConfig.srNo) rowData['Sr No'] = (item.srNo !== undefined && item.srNo !== null && !isNaN(Number(item.srNo)) && Number(item.srNo) > 0) ? Number(item.srNo) : idx + 1;
      if (poColumnConfig.projectName) rowData['Project Name'] = item.projectName;
      if (poColumnConfig.machineName) rowData['Machine Name'] = item.machineName || item.machineType || 'Machine';
      if (poColumnConfig.description) rowData['Material Description'] = item.description;
      if (poColumnConfig.materialType) rowData['Material Type'] = item.materialType;
      if (poColumnConfig.sizeSpecs) rowData['Size Specification'] = item.sizeSpecs;
      if (poColumnConfig.quantity) rowData['Quantity'] = Number(item.quantity) || 1;
      if (poColumnConfig.unit) rowData['Unit'] = item.unit || 'Nos';
      if (poColumnConfig.vendor) rowData['Assigned Vendor'] = item.vendor || item.vendorName || 'Unassigned';
      if (poColumnConfig.requiredDate) rowData['Required Date'] = formatDate(poExpectedDate);
      if (poColumnConfig.notes) rowData['Notes / Remarks'] = item.notes || poNotes;
      return rowData;
    });

    exportToExcel(
      dataToExport,
      `PO_${generatedPOPreview.poNumber}_${generatedPOPreview.vendor.replace(/\s+/g, '_')}`,
      `PURCHASE ORDER: ${generatedPOPreview.poNumber}`
    );
  };

  // Dedicated Isolated Print Engine (Guarantees crisp, non-blank A4 print output across all browsers)
  const handlePrintPOSlip = () => {
    const printContent = document.querySelector('.printable-po-document');
    if (!printContent) {
      window.print();
      return;
    }

    let iframe = document.getElementById('po-print-frame') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'po-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RSB Material Purchase Order - ${generatedPOPreview?.poNumber || 'PO'}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 8mm 8mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-po-document {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .po-page-sheet {
              width: 100% !important;
              height: 279mm !important;
              min-height: 279mm !important;
              max-height: 279mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              padding: 5mm 5mm 5mm 5mm !important;
              margin: 0 auto !important;
              border: 1.5px solid #0f172a !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }
            .po-page-sheet:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .po-page-sheet table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1px solid #1e293b !important;
              font-size: 8.5pt !important;
              line-height: 1.2 !important;
            }
            .po-page-sheet th,
            .po-page-sheet td {
              border: 1px solid #cbd5e1 !important;
              color: #000000 !important;
              padding: 2.5px 4.5px !important;
            }
            .po-page-sheet thead tr {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .po-signatures-footer {
              margin-top: auto !important;
              padding-top: 6px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="w-full">
      {/* ======================================================================= */}
      {/* MAIN SCREEN BACKGROUND UI (Hidden automatically during print) */}
      {/* ======================================================================= */}
      <div className="space-y-5 select-text text-slate-900 w-full animate-fadeIn no-print">
        {/* ======================================================================= */}
        {/* 1. HEADER SECTION (CLEAN FULL-SCREEN ORDER BASKET) */}
        {/* ======================================================================= */}
      <div data-tour="tour-po-basket-nav" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-black shadow-sm">
            {viewMode === 'poBasket' ? (
              <FileText className="w-5 h-5 text-amber-300" />
            ) : (
              <ShoppingCart className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {viewMode === 'poBasket' ? 'PO Basket & Purchase Orders Register' : 'Order Basket'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                viewMode === 'poBasket'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-indigo-100 text-indigo-800 border-indigo-200'
              }`}>
                {viewMode === 'poBasket' ? `Auto-Saved POs (${purchaseOrders.length})` : 'Multi-Vendor Allocation Hub'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span>ORDERED BY: <strong className="text-slate-900">{currentUser?.name || 'Amit'}</strong></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {viewMode === 'poBasket'
                ? 'All generated & dispatched Purchase Orders are auto-saved here in table view with live search, PDF & WhatsApp controls'
                : 'Material Planning → Project & Machine Folders → Bulk Vendor Allocation → RFQ & Purchase Orders'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'poBasket' ? (
            <>
              <button
                type="button"
                data-tour="tour-issue-direct-po"
                onClick={() => {
                  setDirectPOForm({
                    poNumber: `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
                    vendor: vendors[0]?.name || 'Manav Metal',
                    expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                    paymentTerms: '30 Days Net',
                    notes: 'Material test certificate SS 304 required with delivery.',
                    projectName: projects[0]?.name || '',
                    machineName: '',
                    items: [
                      { material: 'SS Flat 80 x 6 x 485', sizeSpecs: '80 x 6 x 485', qty: 2, unit: 'Nos', rate: 450, amount: 900 }
                    ]
                  });
                  setIsDirectPOModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Direct PO</span>
              </button>
              <button
                type="button"
                onClick={handleExportAllPOsToExcel}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download all Purchase Orders as Excel workbook"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export POs Excel</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('poBasket')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="View All Auto-Saved Purchase Orders in Table Register"
              >
                <FileText className="w-3.5 h-3.5 text-amber-200" />
                <span>📑 PO Basket ({purchaseOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={handleExportBasketExcel}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download full order basket as Excel workbook"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 2. STATS & WORKFLOW METRIC TILES */}
      {/* ======================================================================= */}
      {viewMode === 'poBasket' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total POs Saved
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {poBasketMetrics.total} Orders
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                Filtered: {filteredPurchaseOrders.length}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                Total Material Items
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {poBasketMetrics.totalParts} Parts
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Across {allPoVendors.length} Suppliers
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                Pending / In Transit
              </span>
              <span className="text-xl font-black text-amber-700 mt-0.5 block">
                {poBasketMetrics.sentCount} POs
              </span>
              <span className="text-[11px] font-semibold text-amber-800">
                {poBasketMetrics.receivedCount} Fulfilled & Received
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                ORDERED BY (Admin)
              </span>
              <span className="text-lg font-black text-purple-950 mt-0.5 block truncate max-w-[140px]">
                {poBasketMetrics.activeAdmin}
              </span>
              <span className="text-[11px] font-semibold text-purple-700">
                Auto-Synced from Admin
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
              {poBasketMetrics.activeAdmin[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total In Basket
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {metrics.total} Items
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                Total Qty: {metrics.totalQty}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                Needs Vendor Assignment
              </span>
              <span className="text-xl font-black text-amber-700 mt-0.5 block">
                {metrics.unassigned} Items
              </span>
              <span className="text-[11px] font-semibold text-amber-800">
                {metrics.unassigned > 0 ? 'Action required' : 'All materials assigned'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Vendor Allocated
              </span>
              <span className="text-xl font-black text-emerald-900 mt-0.5 block">
                {metrics.assigned} Items
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                Across {allVendorsList.length} Vendors
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 3. CONTROL BAR: VIEW SWITCHER, FILTERS, SEARCH & BULK ACTIONS */}
      {/* ======================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {viewMode !== 'poBasket' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Toggle: Project Folders | Vendor Groups | Table View | PO Basket */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setViewMode('projectFolders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'projectFolders'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-blue-600" />
                <span>📁 Project & Machine Folders ({projectMachineFolders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('vendorGroups')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'vendorGroups'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>🏢 Group By Vendor ({vendorGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>📋 All Materials ({filteredItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('poBasket')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-800 bg-amber-50 hover:bg-amber-100 hover:text-amber-950 border border-amber-200/80"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📑 PO Basket &amp; Saved POs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                  {purchaseOrders.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        {viewMode === 'poBasket' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* PO Universal Search Bar */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={poSearchQuery}
                onChange={(e) => setPoSearchQuery(e.target.value)}
                placeholder="Search by PO #, Vendor, ORDERED BY (Amit), Project, Material specs..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
              />
              {poSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPoSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* PO Status Filter */}
            <div>
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">🏷️ All PO Statuses</option>
                <option value="Sent">Sent / Issued</option>
                <option value="Draft">Draft</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Received">Received / Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* PO Vendor Filter */}
            <div>
              <select
                value={poVendorFilter}
                onChange={(e) => setPoVendorFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">🏢 All Suppliers ({allPoVendors.length})</option>
                {allPoVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by part description, size (80 x 6 x 485), project, machine..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Project Filter */}
            <div>
              <select
                data-tour="tour-basket-project-select"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">📁 All Projects ({allProjectNames.length})</option>
                {allProjectNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

          {/* Material Type Filter */}
          <div>
            <select
              value={filterMaterialType}
              onChange={(e) => setFilterMaterialType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">🔩 All Material Types</option>
              {allMaterialTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Status Filter */}
          <div>
            <select
              value={filterVendorStatus}
              onChange={(e) => setFilterVendorStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">🏢 All Vendor Statuses</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only ({metrics.unassigned})</option>
              <option value="ASSIGNED">✓ Allocated Only ({metrics.assigned})</option>
            </select>
          </div>
        </div>
      )}
      </div>

      {/* ======================================================================= */}
      {/* 4. MAIN VIEW CONTENTS (FOLDERS | VENDOR GROUPS | TABLE) */}
      {/* ======================================================================= */}

      {/* ======================== 4A. PROJECT & MACHINE FOLDERS VIEW ============================ */}
      {viewMode === 'projectFolders' && (
        <div className="space-y-4">
          {(() => {
            // When no project is selected yet, render a clean project selection grid (Don't auto-open any project)
            if (!filterProject) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-indigo-600" />
                        <span>Select a Project to View in Order Basket</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose a project below to manage materials, assign vendors, and generate purchase orders.
                      </p>
                    </div>
                    {onNavigateToProjects && (
                      <button
                        type="button"
                        onClick={onNavigateToProjects}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
                        <span>← Go to Projects Directory</span>
                      </button>
                    )}
                  </div>

                  {projectMachineFolders.length === 0 ? (
                    <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">No project materials awaiting procurement in Order Basket</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {projectMachineFolders.map((p) => {
                        const allItems: ProjectMaterialRequirementItem[] = [];
                        p.machineGroups.forEach((items) => allItems.push(...items));
                        const assignedCount = allItems.filter((i) => i.vendor && i.vendor !== 'Unassigned').length;
                        const unassignedCount = allItems.length - assignedCount;

                        return (
                          <div
                            key={p.projectName}
                            onClick={() => setFilterProject(p.projectName)}
                            className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 hover:to-white hover:border-indigo-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                                  {p.project?.projectNumber || 'PRJ'}
                                </span>
                                <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {allItems.length} Items
                                </span>
                              </div>

                              <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {p.projectName}
                              </h4>

                              <div className="text-[11px] text-slate-500">
                                Machines:{' '}
                                <span className="font-semibold text-slate-700">
                                  {Array.from(p.machineGroups.keys()).join(', ') || 'General'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  unassignedCount === 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {unassignedCount === 0 ? `✓ All Assigned (${assignedCount})` : `⚠️ ${unassignedCount} Needs Vendor`}
                              </span>

                              <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                <span>Open Order Basket</span>
                                <span>→</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const currentPFolder = projectMachineFolders.find((p) => p.projectName === filterProject);

            if (!currentPFolder) {
              return (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Project "{filterProject}" has no pending materials</h3>
                  <button
                    type="button"
                    onClick={() => setFilterProject('')}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>← Back to Project List</span>
                  </button>
                </div>
              );
            }

            const pFolder = currentPFolder;
            const allPItems: ProjectMaterialRequirementItem[] = [];
            pFolder.machineGroups.forEach((items) => allPItems.push(...items));
            const isAllPSelected = allPItems.length > 0 && allPItems.every((i) => selectedIds.includes(i.id));

            return (
              <div className="space-y-4">
                {/* Project Navigation Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilterProject('')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Back to all projects list in basket"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
                      <span>← Back to Projects List</span>
                    </button>

                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      <span>Project: {pFolder.projectName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">Switch Project:</label>
                    <select
                      data-tour="tour-basket-project-select"
                      value={pFolder.projectName}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Choose a Project --</option>
                      {allProjectNames.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project Folder Card */}
                <div
                  key={pFolder.projectName}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Project Folder Header Bar */}
                        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20 shrink-0" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-black text-white tracking-wide">
                                    {pFolder.projectName}
                                  </h3>
                                  {pFolder.project?.projectNumber && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-mono font-bold">
                                      {pFolder.project.projectNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-300 font-medium">
                                  📁 {pFolder.totalItems} Total Materials • ✓ {pFolder.assignedCount} Allocated •{' '}
                                  {pFolder.unassignedCount > 0 ? (
                                    <span className="text-amber-300 font-bold">⚠️ {pFolder.unassignedCount} Needs Vendor</span>
                                  ) : (
                                    <span className="text-emerald-300 font-bold">All Assigned</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Project Level Quick Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectProjectItems(allPItems)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isAllPSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isAllPSelected ? 'Deselect Project' : 'Select All In Project'}</span>
                            </button>

                            <button
                              type="button"
                              data-tour="tour-basket-generate-po"
                              onClick={() => handleOpenPOModal(undefined, allPItems)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Generate PO</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveProjectItems(allPItems, pFolder.projectName)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={`Remove all materials in project ${pFolder.projectName} from basket`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Project</span>
                            </button>
                          </div>
                        </div>

                        {/* Machine Sections Inside Project */}
                        <div className="p-3 sm:p-4 space-y-4 bg-slate-50/50">
                          {Array.from(pFolder.machineGroups.entries()).map(([machineName, mItems]) => {
                            const allMachineSelected = mItems.length > 0 && mItems.every((i) => selectedIds.includes(i.id));

                            return (
                              <div
                                key={machineName}
                                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                              >
                                {/* Machine Sub-Header */}
                                <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={allMachineSelected}
                                        onChange={() => handleSelectProjectItems(mItems)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                                      />
                                      <Cpu className="w-4 h-4 text-indigo-600" />
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                        MACHINE: {machineName}
                                      </span>
                                    </label>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {mItems.length} Parts
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMachineItems(mItems, machineName)}
                                      className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      title={`Remove machine ${machineName} materials from basket`}
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-500" />
                                      <span>Remove Machine</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Machine Materials Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                                        <th className="py-2.5 px-3">Material Description</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3 font-mono">Size Specification</th>
                                        <th className="py-2.5 px-3 text-center">Qty</th>
                                        <th className="py-2.5 px-3">Assigned Vendor</th>
                                        <th className="py-2.5 px-3 text-center w-14">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {mItems.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        const isAssigned =
                                          item.vendor &&
                                          item.vendor !== 'Unassigned' &&
                                          item.vendor !== 'Standard Vendor' &&
                                          item.vendor.trim() !== '';

                                        return (
                                          <tr
                                            key={item.id}
                                            className={`transition-all hover:bg-indigo-50/40 ${
                                              isSelected ? 'bg-indigo-50/80' : 'bg-white'
                                            }`}
                                          >
                                            {/* Checkbox */}
                                            <td className="py-2 px-3 text-center">
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectRow(item.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                              />
                                            </td>

                                            {/* Description */}
                                            <td className="py-2 px-3 font-bold text-slate-800">
                                              {item.description}
                                            </td>

                                            {/* Material Type */}
                                            <td className="py-2 px-3">
                                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                                                {item.materialType}
                                              </span>
                                            </td>

                                            {/* Size Specs */}
                                            <td className="py-2 px-3 font-mono font-bold text-blue-700">
                                              {item.sizeSpecs}
                                            </td>

                                            {/* Qty & Unit */}
                                            <td className="py-2 px-3 text-center">
                                              <span className="font-black text-slate-900">{item.quantity}</span>{' '}
                                              <span className="text-[10px] text-slate-500 font-semibold">{item.unit || 'Nos'}</span>
                                            </td>

                                            {/* Assigned Vendor */}
                                            <td className="py-2 px-3">
                                              {isAssigned ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-bold text-slate-900">{item.vendor}</span>
                                                </div>
                                              ) : (
                                                <span className="text-amber-600 font-bold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                                  ⚠️ Unassigned
                                                </span>
                                              )}
                                            </td>

                                            {/* Row Action */}
                                            <td className="py-2 px-3 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  updateProjectRequirement(item.id, { poStatus: 'Issued', poNumberAssigned: 'MANUAL-ORDERED' });
                                                  showToast(`"${item.description}" removed from basket.`);
                                                }}
                                                className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                title="Remove from Order Basket (Marks as ordered/fulfilled, project remains intact)"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

      {/* ======================== 4B. GROUP BY VENDOR VIEW ============================ */}
      {viewMode === 'vendorGroups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorGroups.map((group) => (
            <div
              key={group.vendorName}
              className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between space-y-3 ${
                group.isUnassigned ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        group.isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{group.vendorName}</h4>
                      <p className="text-[10px] text-slate-500">
                        {group.items.length} items • {group.projectCount} project(s)
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {group.isUnassigned ? 'Action Needed' : 'Allocated'}
                  </span>
                </div>

                {/* Items preview */}
                <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold text-slate-800 block truncate">{item.description}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Project: {item.projectName} • Machine: {item.machineName || item.machineType || 'Standard'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900">{item.quantity}</span>{' '}
                        <span className="text-[10px] text-slate-500">{item.unit || 'Nos'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {group.isUnassigned ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(group.items.map((i) => i.id));
                      handleOpenBulkAssign();
                    }}
                    className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Allocate All {group.items.length} Materials
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppForItems(group.vendorName, group.items)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      title={`Send WhatsApp PO to ${group.vendorName}`}
                    >
                      <Send className="w-3 h-3 fill-slate-950" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRFQModal(group.vendorName, group.items)}
                      className="flex-1 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all border border-amber-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>RFQ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPOModal(group.vendorName, group.items)}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PO Sheet</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================== 4C. FLAT TABLE VIEW ============================ */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Project Name</th>
                  <th className="py-3 px-3">Machine</th>
                  <th className="py-3 px-3">Material Description</th>
                  <th className="py-3 px-3">Material Type</th>
                  <th className="py-3 px-3 font-mono">Size Specification</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3">Assigned Vendor</th>
                  <th className="py-3 px-3 text-center w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No materials found in basket</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isAssigned =
                      item.vendor &&
                      item.vendor !== 'Unassigned' &&
                      item.vendor !== 'Standard Vendor' &&
                      item.vendor.trim() !== '';

                    return (
                      <tr
                        key={item.id || idx}
                        className={`transition-all hover:bg-indigo-50/40 ${
                          isSelected ? 'bg-indigo-50/80' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            data-tour={idx === 0 ? 'tour-basket-first-checkbox' : undefined}
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.projectName}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-indigo-900">
                          {item.machineName || item.machineType || 'Machine'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3">{item.materialType}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {item.sizeSpecs}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-black text-slate-900">{item.quantity}</span>{' '}
                          <span className="text-[10px] text-slate-500">{item.unit || 'Nos'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {isAssigned ? (
                            <span className="font-bold text-slate-900">{item.vendor}</span>
                          ) : (
                            <span className="text-amber-600 font-bold text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              updateProjectRequirement(item.id, { poStatus: 'Issued', poNumberAssigned: 'MANUAL-ORDERED' });
                              showToast(`"${item.description}" removed from basket.`);
                            }}
                            className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove from Order Basket (Marks as ordered/fulfilled, project remains intact)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================== 4D. PO BASKET & AUTO-SAVED PURCHASE ORDERS TABLE ============================ */}
      {viewMode === 'poBasket' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Table Context Banner */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black tracking-wide uppercase">
                  Official Purchase Orders Register
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                  {filteredPurchaseOrders.length} of {purchaseOrders.length} POs
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ORDERED BY: {currentUser?.name || 'Amit'}</span>
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">PO Number</th>
                    <th className="py-3 px-3">Date & ETA</th>
                    <th className="py-3 px-3">Vendor / Supplier</th>
                    <th className="py-3 px-3">Project & Scope</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPurchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-pulse" />
                        <h4 className="text-sm font-black text-slate-800">
                          {poSearchQuery || poStatusFilter !== 'ALL' || poVendorFilter !== 'ALL'
                            ? 'No Purchase Orders match your filter criteria'
                            : 'No Purchase Orders have been generated yet'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          {poSearchQuery || poStatusFilter !== 'ALL'
                            ? 'Try clearing your search query or selecting "All PO Statuses" above.'
                            : 'Select materials from the Order Basket and click "WhatsApp PO" or "PO Sheet" to generate and auto-save them here.'}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          {(poSearchQuery || poStatusFilter !== 'ALL' || poVendorFilter !== 'ALL') && (
                            <button
                              type="button"
                              onClick={() => {
                                setPoSearchQuery('');
                                setPoStatusFilter('ALL');
                                setPoVendorFilter('ALL');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              Reset Filters
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewMode('projectFolders')}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            Browse Order Basket Materials →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchaseOrders.map((po, idx) => {
                      const orderedByName = po.orderedBy || currentUser?.name || 'Amit';
                      const isEven = idx % 2 === 0;
                      const vendorPhone = getVendorMobile(po.vendor, vendors);

                      return (
                        <tr
                          key={po.id || idx}
                          className={`transition-all hover:bg-slate-50/80 group ${
                            isEven ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          {/* PO Number */}
                          <td className="py-3 px-3 font-mono font-bold text-xs text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{po.poNumber}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    navigator.clipboard.writeText(po.poNumber);
                                    showToast(`Copied "${po.poNumber}" to clipboard!`);
                                  } catch (e) {}
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 transition-opacity cursor-pointer"
                                title="Copy PO Number"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Date & Delivery */}
                          <td className="py-3 px-3 text-xs text-slate-800">
                            <div>{po.date}</div>
                            {po.expectedDate && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                ETA: {po.expectedDate}
                              </div>
                            )}
                          </td>

                          {/* Vendor */}
                          <td className="py-3 px-3 text-xs text-slate-900">
                            <div className="font-semibold">{po.vendor}</div>
                            {vendorPhone && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {vendorPhone}
                              </div>
                            )}
                          </td>

                          {/* Project Names & Machines */}
                          <td className="py-3 px-3 text-xs text-slate-800 max-w-[220px]">
                            <div className="font-semibold truncate">
                              {(po.projectNames && po.projectNames.length > 0 ? po.projectNames.join(', ') : 'General Project')}
                            </div>
                            {po.machineNames && po.machineNames.length > 0 && (
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {po.machineNames.join(', ')}
                              </div>
                            )}
                          </td>

                          {/* Items (Simple Text) */}
                          <td className="py-3 px-3 text-xs font-semibold text-slate-900">
                            {po.items.length} {po.items.length === 1 ? 'Item' : 'Items'}
                          </td>

                          {/* Quick Actions Toolbar */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Slip Modal */}
                              <button
                                type="button"
                                onClick={() => setSelectedPoForSlip(po)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="View Purchase Order Slip & Specifications"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              </button>

                              {/* Instant PDF Download */}
                              <button
                                type="button"
                                onClick={() => {
                                  const poPayload: WhatsAppPOMessageOptions = {
                                    poNumber: po.poNumber,
                                    vendorName: po.vendor,
                                    vendorMobile: vendorPhone,
                                    paymentTerms: po.paymentTerms || '30 Days Net',
                                    status: po.status,
                                    projectName: (po.projectNames && po.projectNames[0]) || 'RSB Manufacturing',
                                    machineName: (po.machineNames && po.machineNames[0]) || 'Standard Machine',
                                    dateOfIssue: po.date,
                                    expectedDeliveryDate: po.expectedDate,
                                    orderedBy: orderedByName,
                                    notes: po.notes,
                                    items: po.items.map((i, iIdx) => ({
                                      id: `po-item-${iIdx}`,
                                      projectName: (po.projectNames && po.projectNames[0]) || 'RSB',
                                      machineName: (po.machineNames && po.machineNames[0]) || 'Machine',
                                      description: i.material,
                                      materialType: 'SS Part',
                                      materialGrade: 'SS 304',
                                      sizeSpecs: i.sizeSpecs,
                                      quantity: i.qty,
                                      unit: i.unit,
                                      vendor: po.vendor,
                                      orderedBy: orderedByName,
                                    })),
                                  };
                                  const pdf = generatePurchaseOrderPDF(poPayload);
                                  showToast(`Downloaded "${pdf}" successfully!`);
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                                title="Download Official PO PDF"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-700" />
                              </button>

                              {/* WhatsApp Direct Dispatch (Customizable Number & Short Message) */}
                              <button
                                type="button"
                                onClick={() => {
                                  const poPayload: WhatsAppPOMessageOptions = {
                                    poNumber: po.poNumber,
                                    vendorName: po.vendor,
                                    vendorMobile: vendorPhone,
                                    paymentTerms: po.paymentTerms || '30 Days Net',
                                    status: po.status,
                                    projectName: (po.projectNames && po.projectNames[0]) || 'RSB Manufacturing',
                                    machineName: (po.machineNames && po.machineNames[0]) || 'Standard Machine',
                                    dateOfIssue: po.date,
                                    expectedDeliveryDate: po.expectedDate,
                                    orderedBy: orderedByName,
                                    notes: po.notes,
                                    items: po.items.map((i, iIdx) => ({
                                      id: `po-item-${iIdx}`,
                                      projectName: (po.projectNames && po.projectNames[0]) || 'RSB',
                                      machineName: (po.machineNames && po.machineNames[0]) || 'Machine',
                                      description: i.material,
                                      materialType: 'SS Part',
                                      materialGrade: 'SS 304',
                                      sizeSpecs: i.sizeSpecs,
                                      quantity: i.qty,
                                      unit: i.unit,
                                      vendor: po.vendor,
                                      orderedBy: orderedByName,
                                    })),
                                  };
                                  setWhatsAppDispatchTarget({
                                    poPayload,
                                    phone: vendorPhone || '',
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-emerald-950 border border-[#25D366]/40 transition-colors cursor-pointer"
                                title="Send on WhatsApp & Download PDF"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-800 fill-emerald-800" />
                              </button>

                              {/* Print */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPoForSlip(po);
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer hidden sm:inline-flex"
                                title="Print PO Slip"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </button>

                              {/* Delete PO */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete Purchase Order "${po.poNumber}" for ${po.vendor}?`)) {
                                    deletePurchaseOrder(po.id);
                                    showToast(`Deleted Purchase Order ${po.poNumber}`);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Purchase Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom PO Summary Footer */}
            {filteredPurchaseOrders.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    Showing {filteredPurchaseOrders.length} of {purchaseOrders.length} Purchase Orders
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>All POs auto-saved with complete item specifications</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    Total Value: <strong className="text-emerald-700 font-black">{formatINR(filteredPurchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 5. MODALS: BULK ASSIGN, SMART SUGGESTIONS, RFQ, EDIT ITEM, AND ZERO-RATE PO */}
      {/* ======================================================================= */}

      {/* 5. CUSTOMIZABLE WHATSAPP PO DISPATCH MODAL */}
      {whatsAppDispatchTarget && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3.5 shadow-2xl border border-slate-200 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/20 text-emerald-800 border border-[#25D366]/40 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4 fill-emerald-700 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Send Purchase Order on WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {whatsAppDispatchTarget.poPayload.poNumber} • {whatsAppDispatchTarget.poPayload.items.length} {whatsAppDispatchTarget.poPayload.items.length === 1 ? 'Part' : 'Parts'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppDispatchTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. VENDOR SELECTION & FAST SEND TO ASSIGNED VENDOR */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select Recipient Vendor:</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {vendors.length} Vendors Registered
                </span>
              </label>

              <select
                value={whatsAppDispatchTarget.poPayload.vendorName}
                onChange={(e) => {
                  const newVendorName = e.target.value;
                  const newPhone = getVendorMobile(newVendorName, vendors);
                  setWhatsAppDispatchTarget({
                    ...whatsAppDispatchTarget,
                    phone: newPhone,
                    poPayload: {
                      ...whatsAppDispatchTarget.poPayload,
                      vendorName: newVendorName,
                      vendorMobile: newPhone,
                    },
                  });
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                {allVendorsList.map((v) => {
                  const mob = getVendorMobile(v, vendors);
                  return (
                    <option key={v} value={v}>
                      {v} (📞 {mob})
                    </option>
                  );
                })}
              </select>

              {/* Quick Assigned Vendor Send Button */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-600 truncate">
                  Assigned: <strong className="text-slate-900 font-bold">{whatsAppDispatchTarget.poPayload.vendorName}</strong>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="font-mono text-emerald-800 font-bold">{getVendorMobile(whatsAppDispatchTarget.poPayload.vendorName, vendors)}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const vendorPhone = getVendorMobile(whatsAppDispatchTarget.poPayload.vendorName, vendors);
                    const target = whatsAppDispatchTarget;
                    setWhatsAppDispatchTarget(null);
                    const res = await shareOrSendWhatsAppPO(vendorPhone, target.poPayload);
                    if (res.method === 'share') {
                      showToast(`Opened share dialog with ${res.fileName} attached!`);
                    } else {
                      showToast(`Downloaded "${res.fileName}" & opened WhatsApp for ${vendorPhone}!`);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Send to Vendor</span>
                </button>
              </div>
            </div>

            {/* 2. CUSTOM NUMBER OPTION & CUSTOM SEND BUTTON */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Or Enter Custom WhatsApp Number:</span>
                <span className="text-[10px] text-slate-400 font-normal">Type any number to override</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 font-bold font-mono text-xs text-slate-700 shrink-0">
                  🇮🇳 +91
                </div>
                <input
                  type="text"
                  value={whatsAppDispatchTarget.phone}
                  onChange={(e) =>
                    setWhatsAppDispatchTarget({
                      ...whatsAppDispatchTarget,
                      phone: e.target.value,
                    })
                  }
                  placeholder="e.g. 7276939301"
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const phone = whatsAppDispatchTarget.phone.trim();
                    const target = whatsAppDispatchTarget;
                    setWhatsAppDispatchTarget(null);
                    const res = await shareOrSendWhatsAppPO(phone, target.poPayload);
                    if (res.method === 'share') {
                      showToast(`Opened share dialog with ${res.fileName} attached!`);
                    } else {
                      showToast(`Downloaded "${res.fileName}" & opened WhatsApp for ${phone}!`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Send className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  <span>Send to Custom</span>
                </button>
              </div>
            </div>

            {/* Short Message Preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600">
                  Short Message Preview:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const msg = formatShortWhatsAppPOMessage(whatsAppDispatchTarget.poPayload);
                    try {
                      navigator.clipboard.writeText(msg);
                      showToast('Message text copied to clipboard!');
                    } catch (e) {}
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Text</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-800">
                {formatShortWhatsAppPOMessage(whatsAppDispatchTarget.poPayload)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const pdf = generatePurchaseOrderPDF(whatsAppDispatchTarget.poPayload);
                  showToast(`Downloaded "${pdf}"!`);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download PDF Only</span>
              </button>

              <button
                type="button"
                onClick={() => setWhatsAppDispatchTarget(null)}
                className="px-4 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5A. BULK VENDOR ASSIGNMENT MODAL */}
      {isAssignVendorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Bulk Assign Vendor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assigning vendor to {selectedIds.length} selected materials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignVendorModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!isAddCustomVendorMode ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Existing Vendor:
                  </label>
                  <select
                    value={selectedVendorForAssign}
                    onChange={(e) => setSelectedVendorForAssign(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {allVendorsList.map((v) => {
                      const mob = getVendorMobile(v, vendors);
                      return (
                        <option key={v} value={v}>
                          {v} (📞 {mob})
                        </option>
                      );
                    })}
                  </select>
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 mt-2 flex items-center justify-between text-xs">
                    <span className="text-indigo-900 font-bold">{selectedVendorForAssign}</span>
                    <span className="text-indigo-700 font-mono font-medium">📞 {getVendorMobile(selectedVendorForAssign, vendors)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomVendorMode(true)}
                    className="text-xs font-bold text-indigo-600 hover:underline mt-2 inline-block cursor-pointer"
                  >
                    + Add & Learn New Vendor
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Vendor Name:
                    </label>
                    <input
                      type="text"
                      value={customVendorName}
                      onChange={(e) => setCustomVendorName(e.target.value)}
                      placeholder="e.g. Shree Ram Steels & Forgings"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vendor WhatsApp Mobile Number:
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-700">
                        🇮🇳 +91
                      </span>
                      <input
                        type="text"
                        value={customVendorPhone}
                        onChange={(e) => setCustomVendorPhone(e.target.value)}
                        placeholder="e.g. 98250 12345"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomVendorMode(false)}
                    className="text-xs font-bold text-slate-500 hover:underline inline-block cursor-pointer"
                  >
                    ← Back to Existing Vendors
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignVendorModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmBulkAssign(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Confirm Allocation
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmBulkAssign(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Assign & Send PO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5B. SMART VENDOR SUGGESTIONS MODAL */}
      {smartSuggestItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Smart Vendor Suggestions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Item: {smartSuggestItem.description} ({smartSuggestItem.sizeSpecs})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmartSuggestItem(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {getSmartVendorSuggestions(smartSuggestItem.materialType, smartSuggestItem.sizeSpecs).map((sug) => (
                <div
                  key={sug.vendorName}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-black text-slate-900">
                        {sug.vendorName}
                      </strong>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono text-[10px] rounded font-bold">
                        ₹{sug.lastRate}/kg
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600">{sug.matchReason}</p>
                    <span className="text-[9px] text-slate-400 block">
                      Last purchased on {sug.lastPurchaseDate} • {sug.orderCount} POs processed
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplySuggestion(smartSuggestItem.id, sug.vendorName)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer shrink-0 active:scale-95"
                  >
                    Select Vendor
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSmartSuggestItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5C. RFQ CREATION MODAL */}
      {isRFQModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Dispatch Request For Quotation (RFQ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Selected {selectedIds.length > 0 ? selectedIds.length : filteredItems.length} material items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRFQModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Vendors to Quote:
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {allVendorsList.map((v) => {
                    const isChecked = rfqTargetVendors.includes(v);
                    return (
                      <label key={v} className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setRfqTargetVendors(rfqTargetVendors.filter((name) => name !== v));
                            } else {
                              setRfqTargetVendors([...rfqTargetVendors, v]);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{v}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Instructions / RFQ Terms:
                </label>
                <textarea
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRFQModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendRFQ}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Dispatch RFQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5D. EDIT MATERIAL ITEM SPECIFICATION MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Edit Material Specification
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Project: {editingItem.projectName} • Machine: {editingItem.machineName || editingItem.machineType || 'Standard'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Material Description / Part Name:
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material Type:
                  </label>
                  <select
                    value={editMatType}
                    onChange={(e) => setEditMatType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SS Flat">SS Flat</option>
                    <option value="SS Bar">SS Bar</option>
                    <option value="SS Pipe">SS Pipe</option>
                    <option value="SS Plate">SS Plate</option>
                    <option value="SS Sheet">SS Sheet</option>
                    <option value="Fasteners">Fasteners</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Bought Out">Bought Out</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Size Specification:
                  </label>
                  <input
                    type="text"
                    value={editSizeSpecs}
                    onChange={(e) => setEditSizeSpecs(e.target.value)}
                    placeholder="e.g. 80 x 6 x 485 mm"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit:
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Nos">Nos</option>
                    <option value="Kg">Kg</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Set">Set</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Vendor:
                </label>
                <select
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- None (Unassigned) --</option>
                  {allVendorsList.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Remarks:
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional fabrication notes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditItem}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-md active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5E. ZERO-RATE PURCHASE ORDER / PURCHASE SLIP MODAL */}
      {isPOModalOpen && (
        <div className="printable-po-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="printable-po-modal-wrapper bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-300 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Generate Material Purchase Order / Slip
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Engineering Material Order Sheet (Rates/Amount Excluded)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPOModalOpen(false);
                  setGeneratedPOPreview(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Material PO Summary Ribbon */}
            <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-black tracking-wide block">
                    Master Material Purchase Order • All {poItemsToGenerate.length} Parts Included
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Categorized by assigned vendors • Direct vendor dispatch
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {availableVendorsInPO.map((v) => {
                  const count = poItemsToGenerate.filter(
                    (i) => (i.vendor || i.vendorName || '').trim().toLowerCase() === v.trim().toLowerCase()
                  ).length;
                  return (
                    <span
                      key={v}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="text-amber-400 font-bold">{cleanVendorName(v)}:</span>
                      <span className="text-emerald-300 font-mono font-black">{count} {count === 1 ? 'Part' : 'Parts'}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* PO Parameter Controls */}
            {!generatedPOPreview && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-bold no-print">
                <div>
                  <label className="block text-slate-700 mb-1">Target Recipient / Vendor:</label>
                  <input
                    type="text"
                    value={poTargetVendor}
                    onChange={(e) => setPoTargetVendor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Manav Metal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Target Delivery Date:</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={(e) => setPoExpectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Custom PO Number:</label>
                  <input
                    type="text"
                    value={poCustomNumber}
                    onChange={(e) => setPoCustomNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Column Customizer Toggle Section */}
            <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl space-y-2 no-print">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Customize PO Table Columns (प्रिंट कॉलम चुनें)
                </span>
                <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600">
                  <button
                    type="button"
                    onClick={() =>
                      setPoColumnConfig({
                        srNo: true,
                        projectName: true,
                        machineName: true,
                        description: true,
                        materialType: true,
                        sizeSpecs: true,
                        quantity: true,
                        unit: true,
                        vendor: true,
                        requiredDate: true,
                        notes: true,
                      })
                    }
                    className="hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPoColumnConfig({
                        srNo: true,
                        projectName: false,
                        machineName: true,
                        description: true,
                        materialType: true,
                        sizeSpecs: true,
                        quantity: true,
                        unit: true,
                        vendor: true,
                        requiredDate: false,
                        notes: false,
                      })
                    }
                    className="hover:underline cursor-pointer"
                  >
                    Minimal
                  </button>
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'srNo' as const, label: 'Sr No' },
                  { key: 'projectName' as const, label: 'Project Name' },
                  { key: 'machineName' as const, label: 'Machine Name' },
                  { key: 'description' as const, label: 'Description' },
                  { key: 'materialType' as const, label: 'Material Type' },
                  { key: 'sizeSpecs' as const, label: 'Size Spec' },
                  { key: 'quantity' as const, label: 'Quantity' },
                  { key: 'unit' as const, label: 'Unit' },
                  { key: 'vendor' as const, label: 'Assigned Vendor' },
                  { key: 'requiredDate' as const, label: 'Required Date' },
                  { key: 'notes' as const, label: 'Notes' },
                ].map(({ key, label }) => {
                  const isChecked = poColumnConfig[key];
                  return (
                    <label
                      key={key}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border select-none ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePOColumn(key)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Generated PO Document Slip Preview */}
            {generatedPOPreview ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-950 text-xs font-bold flex items-center justify-between no-print">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Purchase Order {generatedPOPreview.poNumber} successfully registered!</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700">
                    Vendor: {generatedPOPreview.vendor}
                  </span>
                </div>

                {/* Professional Printable PO Sheets (Paginated & Pinned Bottom Signatures) */}
                <div className="printable-po-document space-y-6">
                  {paginatedPOPages.map((pageChunk) => (
                    <div
                      key={pageChunk.pageIndex}
                      className="po-page-sheet bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-800 shadow-sm text-slate-900 font-sans flex flex-col justify-between min-h-[275mm] space-y-4"
                    >
                      {/* Top Header & Table Area */}
                      <div className="space-y-4 flex-1">
                        {pageChunk.isFirstPage ? (
                          <>
                            {/* Company Header Block */}
                            <div className="border-b-2 border-slate-900 pb-3 text-left flex flex-row items-start justify-between gap-2">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-slate-950 text-amber-400 font-black text-sm rounded-lg flex items-center justify-center tracking-tight border border-amber-400/30 shrink-0">
                                  RSB
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xl font-black text-slate-950 tracking-tight uppercase">
                                      RSB PRIVATE LIMITED
                                    </h4>
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                                    Manufacturing Industry
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
                                  </p>
                                </div>
                              </div>
                              <div className="text-right bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-300 shrink-0">
                                <span className="text-[9.5px] uppercase font-black text-slate-600 block">
                                  DOCUMENT TYPE
                                </span>
                                <strong className="text-xs font-black text-slate-950 block tracking-wide">
                                  MATERIAL PURCHASE ORDER
                                </strong>
                                <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                  STATUS: {generatedPOPreview.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Metadata 2-Column Excel Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-1">
                                <span className="text-[9.5px] font-black uppercase text-slate-600 tracking-wider block border-b border-slate-200 pb-1">
                                  PROJECT & PROCUREMENT DETAILS:
                                </span>
                                <div className="pt-0.5 space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500">Project:</span>
                                    <strong className="text-sm font-black text-slate-900 block">
                                      {poItemsToGenerate[0]?.projectName || filterProject || 'jkjdsasds'}
                                    </strong>
                                  </div>
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-500 text-[10px]">Assigned Vendors: </span>
                                    <span className="font-bold text-indigo-900">
                                      {Array.from(new Set(poItemsToGenerate.map((i) => cleanVendorName(i.vendor || i.vendorName)).filter((v) => v !== 'Unassigned'))).join(', ') || 'All Assigned Vendors'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-500 text-[10px]">ORDERED BY: </span>
                                    <span className="font-bold text-slate-900">{currentUser?.name || 'Amit'}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Scope: All {poItemsToGenerate.length} Materials (Sequential Vendor Grouping)
                                  </div>
                                </div>
                              </div>

                              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-1">
                                <span className="text-[9.5px] font-black uppercase text-slate-600 tracking-wider block border-b border-slate-200 pb-1">
                                  ORDER REFERENCES:
                                </span>
                                <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">PO Number:</span>
                                    <strong className="font-mono font-black text-slate-900">
                                      {generatedPOPreview.poNumber}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Date of Issue:</span>
                                    <strong className="text-slate-900">
                                      {generatedPOPreview.date}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">Target Delivery:</span>
                                    <strong className="text-emerald-800 font-bold">
                                      {poExpectedDate}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Continuation Header on Page 2+ */
                          <div className="border-b-2 border-slate-900 pb-2.5 text-left flex flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-slate-950 text-amber-400 font-black text-xs rounded-lg flex items-center justify-center border border-amber-400/30 shrink-0">
                                RSB
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                                  RSB PRIVATE LIMITED — PURCHASE ORDER CONTINUATION
                                </h4>
                                <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                                  Project: <span className="text-slate-900">{poItemsToGenerate[0]?.projectName || filterProject || 'Project'}</span> | PO No: <span className="font-mono text-slate-950">{generatedPOPreview.poNumber}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 shrink-0">
                              <span className="text-[9.5px] font-black text-slate-800 uppercase block">
                                PAGE {pageChunk.pageIndex} OF {pageChunk.totalPages}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Professional Excel-Style Grid Table */}
                        <div className="border border-slate-400 overflow-x-auto rounded-lg">
                          <table className="w-full text-left text-[11px] border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-200 text-slate-950 font-black border-b border-slate-400 uppercase text-[9.5px]">
                                {poColumnConfig.srNo && <th className="px-1.5 py-1 w-8 text-center border-r border-slate-300">#</th>}
                                {poColumnConfig.projectName && <th className="px-2 py-1 border-r border-slate-300">Project Name</th>}
                                {poColumnConfig.machineName && <th className="px-2 py-1 border-r border-slate-300">Machine Name</th>}
                                {poColumnConfig.description && <th className="px-2 py-1 border-r border-slate-300">Material Description</th>}
                                {poColumnConfig.materialType && <th className="px-2 py-1 border-r border-slate-300">Material Type</th>}
                                {poColumnConfig.sizeSpecs && <th className="px-2 py-1 border-r border-slate-300 font-mono">Size Specification</th>}
                                {poColumnConfig.quantity && <th className="px-1.5 py-1 text-center border-r border-slate-300">Qty</th>}
                                {poColumnConfig.unit && <th className="px-1.5 py-1 text-center border-r border-slate-300">Unit</th>}
                                {poColumnConfig.vendor && <th className="px-2 py-1 border-r border-slate-300">Assigned Vendor</th>}
                                {poColumnConfig.requiredDate && <th className="px-1.5 py-1 text-center border-r border-slate-300">Target Date</th>}
                                {poColumnConfig.notes && <th className="px-2 py-1">Notes / Remarks</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 bg-white text-[10.5px]">
                              {pageChunk.items.map(({ item, globalIndex }, rIdx) => (
                                <tr
                                  key={item.id || globalIndex}
                                  className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                                >
                                  {poColumnConfig.srNo && (
                                    <td className="px-1.5 py-1 text-center font-bold text-slate-700 border-r border-slate-300">
                                      {globalIndex}
                                    </td>
                                  )}
                                  {poColumnConfig.projectName && (
                                    <td className="px-2 py-1 font-bold text-slate-900 border-r border-slate-300">
                                      {item.projectName}
                                    </td>
                                  )}
                                  {poColumnConfig.machineName && (
                                    <td className="px-2 py-1 font-bold text-indigo-950 border-r border-slate-300">
                                      {item.machineName || item.machineType || 'Machine'}
                                    </td>
                                  )}
                                  {poColumnConfig.description && (
                                    <td className="px-2 py-1 font-bold text-slate-900 border-r border-slate-300">
                                      {item.description}
                                    </td>
                                  )}
                                  {poColumnConfig.materialType && (
                                    <td className="px-2 py-1 font-semibold text-slate-800 border-r border-slate-300">
                                      {item.materialType}
                                    </td>
                                  )}
                                  {poColumnConfig.sizeSpecs && (
                                    <td className="px-2 py-1 font-mono font-bold text-blue-900 border-r border-slate-300">
                                      {item.sizeSpecs}
                                    </td>
                                  )}
                                  {poColumnConfig.quantity && (
                                    <td className="px-1.5 py-1 text-center font-black text-slate-950 border-r border-slate-300">
                                      {item.quantity}
                                    </td>
                                  )}
                                  {poColumnConfig.unit && (
                                    <td className="px-1.5 py-1 text-center font-semibold text-slate-700 border-r border-slate-300">
                                      {item.unit || 'Nos'}
                                    </td>
                                  )}
                                  {poColumnConfig.vendor && (
                                    <td className="px-2 py-1 font-black text-slate-900 border-r border-slate-300">
                                      {cleanVendorName(item.vendor || item.vendorName)}
                                    </td>
                                  )}
                                  {poColumnConfig.requiredDate && (
                                    <td className="px-1.5 py-1 text-center font-mono text-slate-800 border-r border-slate-300">
                                      {poExpectedDate}
                                    </td>
                                  )}
                                  {poColumnConfig.notes && (
                                    <td className="px-2 py-1 text-slate-700 italic">
                                      {item.notes || poNotes}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer Area: If not last page, show continuation bar. If last page, show 3-Tier Signatures Block pinned to bottom */}
                      {!pageChunk.isLastPage ? (
                        <div className="border-t border-slate-300 pt-1.5 text-center text-[9.5px] text-slate-500 font-semibold flex items-center justify-between mt-auto shrink-0">
                          <span>RSB Private Limited • Purchase Order: {generatedPOPreview.poNumber}</span>
                          <span className="font-black text-indigo-700 uppercase tracking-wide">
                            Page {pageChunk.pageIndex} of {pageChunk.totalPages} — Continued on Next Page →
                          </span>
                        </div>
                      ) : (
                        <div className="po-signatures-footer space-y-2 mt-auto shrink-0 break-inside-avoid">
                          <div className="grid grid-cols-2 gap-8 pt-2 text-center text-xs text-slate-700 border-t-2 border-slate-900">
                            <div className="border-t border-dashed border-slate-600 pt-1.5">
                              <span className="block font-black text-slate-950 text-[11px] leading-tight">Prepared &amp; Ordered By</span>
                              <span className="text-[9.5px] text-slate-600 font-semibold leading-tight block mt-0.5">
                                ORDERED BY: {currentUser?.name || 'Amit'}
                              </span>
                            </div>
                            <div className="border-t border-dashed border-slate-600 pt-1.5">
                              <span className="block font-black text-slate-950 text-[11px] leading-tight">Authorized Signatory</span>
                              <span className="text-[9.5px] text-slate-600 font-semibold leading-tight block mt-0.5">Director / Plant Operations</span>
                            </div>
                          </div>
                          <div className="border-t border-slate-200 pt-1 text-center text-[9px] text-slate-400 font-medium flex items-center justify-between">
                            <span>RSB ERP System • Ref: {generatedPOPreview.poNumber}</span>
                            <span>Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="font-bold text-slate-600">Page {pageChunk.pageIndex} of {pageChunk.totalPages} (End of Order)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Print, Download & Close Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200 no-print">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPOModalOpen(false);
                      setGeneratedPOPreview(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-slate-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back to Basket / Close (वापस जाएं)</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenWhatsAppForItems(
                          poTargetVendor,
                          poItemsToGenerate,
                          generatedPOPreview?.poNumber,
                          poItemsToGenerate[0]?.projectName
                        );
                      }}
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
                      title="Send formatted Purchase Order directly to Vendor via WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Share on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPOToExcel}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintPOSlip}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Order Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 no-print">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGeneratePO}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Order Slip</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5F. INTERACTIVE PO SLIP & DETAILS MODAL (IDENTICAL TO ORDER BASKET PO LAYOUT) */}
      {selectedPoForSlip && (
        <div className="printable-po-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="printable-po-modal-wrapper bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-300 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Purchase Order Slip: {selectedPoForSlip.poNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official RSB Material Purchase Order • Supplier: {selectedPoForSlip.vendor}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoForSlip(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Sheet (Exact Original Order Basket Design) */}
            <div className="printable-po-document space-y-6">
              {paginatedSavedPOPages.map((pageChunk) => (
                <div
                  key={pageChunk.pageIndex}
                  className="po-page-sheet bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-800 shadow-sm text-slate-900 font-sans flex flex-col justify-between min-h-[275mm] space-y-4"
                >
                  {/* Top Header & Table Area */}
                  <div className="space-y-4 flex-1">
                    {pageChunk.isFirstPage ? (
                      <>
                        {/* Company Header Block */}
                        <div className="border-b-2 border-slate-900 pb-3 text-left flex flex-row items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-950 text-amber-400 font-black text-sm rounded-lg flex items-center justify-center tracking-tight border border-amber-400/30 shrink-0">
                              RSB
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xl font-black text-slate-950 tracking-tight uppercase">
                                  RSB PRIVATE LIMITED
                                </h4>
                              </div>
                              <p className="text-xs font-bold text-slate-700 mt-0.5">
                                Manufacturing Industry
                              </p>
                              <p className="text-[10px] text-slate-500">
                                F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
                              </p>
                            </div>
                          </div>
                          <div className="text-right bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-300 shrink-0">
                            <span className="text-[9.5px] uppercase font-black text-slate-600 block">
                              DOCUMENT TYPE
                            </span>
                            <strong className="text-xs font-black text-slate-950 block tracking-wide">
                              MATERIAL PURCHASE ORDER
                            </strong>
                            <span className="text-[10px] font-bold text-emerald-800 font-mono">
                              STATUS: {selectedPoForSlip.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Metadata 2-Column Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-1">
                            <span className="text-[9.5px] font-black uppercase text-slate-600 tracking-wider block border-b border-slate-200 pb-1">
                              PROJECT &amp; PROCUREMENT DETAILS:
                            </span>
                            <div className="pt-0.5 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500">Project:</span>
                                <strong className="text-sm font-black text-slate-900 block">
                                  {(selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || selectedPoForSlip.items[0]?.projectName || 'Mahalaxmi 3'}
                                </strong>
                              </div>
                              <div className="text-[11px] text-slate-700">
                                <span className="font-bold text-slate-500 text-[10px]">Assigned Vendors: </span>
                                <span className="font-bold text-indigo-900">
                                  {Array.from(new Set(selectedPoForSlip.items.map((i) => cleanVendorName(i.vendor || selectedPoForSlip.vendor)).filter(Boolean))).join(', ') || cleanVendorName(selectedPoForSlip.vendor)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-700">
                                <span className="font-bold text-slate-500 text-[10px]">ORDERED BY: </span>
                                <span className="font-bold text-slate-900">{selectedPoForSlip.orderedBy || currentUser?.name || 'Amit'}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Scope: All {selectedPoForSlip.items.length} Materials (Sequential Vendor Grouping)
                              </div>
                            </div>
                          </div>

                          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-1">
                            <span className="text-[9.5px] font-black uppercase text-slate-600 tracking-wider block border-b border-slate-200 pb-1">
                              ORDER REFERENCES:
                            </span>
                            <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                              <div>
                                <span className="text-slate-500 text-[10px] block">PO Number:</span>
                                <strong className="font-mono font-black text-slate-900">
                                  {selectedPoForSlip.poNumber}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] block">Date of Issue:</span>
                                <strong className="text-slate-900">
                                  {selectedPoForSlip.date}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] block">Target Delivery:</span>
                                <strong className="text-emerald-800 font-bold">
                                  {selectedPoForSlip.expectedDate}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Continuation Header on Page 2+ */
                      <div className="border-b-2 border-slate-900 pb-2.5 text-left flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-950 text-amber-400 font-black text-xs rounded-lg flex items-center justify-center border border-amber-400/30 shrink-0">
                            RSB
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                              RSB PRIVATE LIMITED — PURCHASE ORDER CONTINUATION
                            </h4>
                            <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                              Project: <span className="text-slate-900">{(selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'Project'}</span> | PO No: <span className="font-mono text-slate-950">{selectedPoForSlip.poNumber}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 shrink-0">
                          <span className="text-[9.5px] font-black text-slate-800 uppercase block">
                            PAGE {pageChunk.pageIndex} OF {pageChunk.totalPages}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Professional Excel-Style Grid Table (9 Exact Columns) */}
                    <div className="border border-slate-400 overflow-x-auto rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-200 text-slate-950 font-black border-b border-slate-400 uppercase text-[9.5px]">
                            <th className="px-1.5 py-1 w-8 text-center border-r border-slate-300">#</th>
                            <th className="px-2 py-1 border-r border-slate-300">Project Name</th>
                            <th className="px-2 py-1 border-r border-slate-300">Machine Name</th>
                            <th className="px-2 py-1 border-r border-slate-300">Material Description</th>
                            <th className="px-2 py-1 border-r border-slate-300">Material Type</th>
                            <th className="px-2 py-1 border-r border-slate-300 font-mono">Size Specification</th>
                            <th className="px-1.5 py-1 text-center border-r border-slate-300">Qty</th>
                            <th className="px-1.5 py-1 text-center border-r border-slate-300">Unit</th>
                            <th className="px-2 py-1 border-r border-slate-300">Assigned Vendor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 bg-white text-[10.5px]">
                          {pageChunk.items.map(({ item, globalIndex }, rIdx) => (
                            <tr
                              key={item.id || globalIndex}
                              className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                            >
                              <td className="px-1.5 py-1 text-center font-bold text-slate-700 border-r border-slate-300">
                                {globalIndex}
                              </td>
                              <td className="px-2 py-1 font-bold text-slate-900 border-r border-slate-300">
                                {item.projectName}
                              </td>
                              <td className="px-2 py-1 font-bold text-indigo-950 border-r border-slate-300">
                                {item.machineName || item.machineType || 'Machine'}
                              </td>
                              <td className="px-2 py-1 font-bold text-slate-900 border-r border-slate-300">
                                {item.description}
                              </td>
                              <td className="px-2 py-1 font-semibold text-slate-800 border-r border-slate-300">
                                {item.materialType}
                              </td>
                              <td className="px-2 py-1 font-mono font-bold text-blue-900 border-r border-slate-300">
                                {item.sizeSpecs}
                              </td>
                              <td className="px-1.5 py-1 text-center font-black text-slate-950 border-r border-slate-300">
                                {item.quantity}
                              </td>
                              <td className="px-1.5 py-1 text-center font-semibold text-slate-700 border-r border-slate-300">
                                {item.unit || 'Nos'}
                              </td>
                              <td className="px-2 py-1 font-black text-slate-900 border-r border-slate-300">
                                {cleanVendorName(item.vendor || item.vendorName || selectedPoForSlip.vendor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes / Remarks */}
                    {pageChunk.isLastPage && selectedPoForSlip.notes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-bold text-slate-600 block text-[10px] uppercase">Notes:</span>
                        <p>{selectedPoForSlip.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Signatures Footer (Exact 2-tier: Prepared & Ordered By | Authorized Signatory) */}
                  {!pageChunk.isLastPage ? (
                    <div className="border-t border-slate-300 pt-1.5 text-center text-[9.5px] text-slate-500 font-semibold flex items-center justify-between mt-auto shrink-0">
                      <span>RSB Private Limited • Purchase Order: {selectedPoForSlip.poNumber}</span>
                      <span className="font-black text-indigo-700 uppercase tracking-wide">
                        Page {pageChunk.pageIndex} of {pageChunk.totalPages} — Continued on Next Page →
                      </span>
                    </div>
                  ) : (
                    <div className="po-signatures-footer space-y-2 mt-auto shrink-0 break-inside-avoid">
                      <div className="grid grid-cols-2 gap-8 pt-2 text-center text-xs text-slate-700 border-t-2 border-slate-900">
                        <div className="border-t border-dashed border-slate-600 pt-1.5">
                          <span className="block font-black text-slate-950 text-[11px] leading-tight">Prepared &amp; Ordered By</span>
                          <span className="text-[9.5px] text-slate-600 font-semibold leading-tight block mt-0.5">
                            ORDERED BY: {selectedPoForSlip.orderedBy || currentUser?.name || 'Amit'}
                          </span>
                        </div>
                        <div className="border-t border-dashed border-slate-600 pt-1.5">
                          <span className="block font-black text-slate-950 text-[11px] leading-tight">Authorized Signatory</span>
                          <span className="text-[9.5px] text-slate-600 font-semibold leading-tight block mt-0.5">Director / Plant Operations</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-1 text-center text-[9px] text-slate-400 font-medium flex items-center justify-between">
                        <span>RSB ERP System • Ref: {selectedPoForSlip.poNumber}</span>
                        <span>Generated: {selectedPoForSlip.date}</span>
                        <span className="font-bold text-slate-600">Page {pageChunk.pageIndex} of {pageChunk.totalPages} (End of Order)</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Print, Download & Close Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => setSelectedPoForSlip(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Back to PO Register</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const vendorPhone = getVendorMobile(selectedPoForSlip.vendor, vendors);
                    const poPayload: WhatsAppPOMessageOptions = {
                      poNumber: selectedPoForSlip.poNumber,
                      vendorName: selectedPoForSlip.vendor,
                      vendorMobile: vendorPhone,
                      paymentTerms: selectedPoForSlip.paymentTerms || '30 Days Net',
                      status: selectedPoForSlip.status,
                      projectName: (selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'RSB Manufacturing',
                      machineName: (selectedPoForSlip.machineNames && selectedPoForSlip.machineNames[0]) || 'Standard Machine',
                      dateOfIssue: selectedPoForSlip.date,
                      expectedDeliveryDate: selectedPoForSlip.expectedDate,
                      orderedBy: selectedPoForSlip.orderedBy || currentUser?.name || 'Amit',
                      notes: selectedPoForSlip.notes,
                      items: selectedPoForSlip.items.map((i, iIdx) => ({
                        id: `po-item-${iIdx}`,
                        projectName: (selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'RSB',
                        machineName: (selectedPoForSlip.machineNames && selectedPoForSlip.machineNames[0]) || 'Machine',
                        description: i.material,
                        materialType: 'SS Part',
                        materialGrade: 'SS 304',
                        sizeSpecs: i.sizeSpecs,
                        quantity: i.qty,
                        unit: i.unit,
                        vendor: selectedPoForSlip.vendor,
                        orderedBy: selectedPoForSlip.orderedBy || currentUser?.name || 'Amit',
                      })),
                    };
                    setWhatsAppDispatchTarget({
                      poPayload,
                      phone: vendorPhone || '',
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const vendorPhone = getVendorMobile(selectedPoForSlip.vendor, vendors);
                    const poPayload: WhatsAppPOMessageOptions = {
                      poNumber: selectedPoForSlip.poNumber,
                      vendorName: selectedPoForSlip.vendor,
                      vendorMobile: vendorPhone,
                      paymentTerms: selectedPoForSlip.paymentTerms || '30 Days Net',
                      status: selectedPoForSlip.status,
                      projectName: (selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'RSB Manufacturing',
                      machineName: (selectedPoForSlip.machineNames && selectedPoForSlip.machineNames[0]) || 'Standard Machine',
                      dateOfIssue: selectedPoForSlip.date,
                      expectedDeliveryDate: selectedPoForSlip.expectedDate,
                      orderedBy: selectedPoForSlip.orderedBy || currentUser?.name || 'Amit',
                      notes: selectedPoForSlip.notes,
                      items: selectedPoForSlip.items.map((i, iIdx) => ({
                        id: `po-item-${iIdx}`,
                        projectName: (selectedPoForSlip.projectNames && selectedPoForSlip.projectNames[0]) || 'RSB',
                        machineName: (selectedPoForSlip.machineNames && selectedPoForSlip.machineNames[0]) || 'Machine',
                        description: i.material,
                        materialType: 'SS Part',
                        materialGrade: 'SS 304',
                        sizeSpecs: i.sizeSpecs,
                        quantity: i.qty,
                        unit: i.unit,
                        vendor: selectedPoForSlip.vendor,
                        orderedBy: selectedPoForSlip.orderedBy || currentUser?.name || 'Amit',
                      })),
                    };
                    const pdf = generatePurchaseOrderPDF(poPayload);
                    showToast(`Downloaded "${pdf}" successfully!`);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5G. CREATE DIRECT PURCHASE ORDER MODAL */}
      {isDirectPOModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-fadeIn my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Issue Direct Purchase Order
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create and auto-save a new PO into the PO Basket register
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectPOModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PO Number</label>
                  <input
                    type="text"
                    value={directPOForm.poNumber}
                    onChange={(e) => setDirectPOForm({ ...directPOForm, poNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                    placeholder="PO-2026-001"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Vendor</label>
                  <input
                    type="text"
                    list="vendor-suggestions"
                    value={directPOForm.vendor}
                    onChange={(e) => setDirectPOForm({ ...directPOForm, vendor: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                    placeholder="e.g. Manav Metal"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ORDERED BY (Admin)</label>
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 font-black text-indigo-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{currentUser?.name || 'Amit'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={directPOForm.expectedDate}
                    onChange={(e) => setDirectPOForm({ ...directPOForm, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project Name (Optional)</label>
                  <input
                    type="text"
                    value={directPOForm.projectName}
                    onChange={(e) => setDirectPOForm({ ...directPOForm, projectName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                    placeholder="e.g. jkjdsasds"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={directPOForm.paymentTerms}
                    onChange={(e) => setDirectPOForm({ ...directPOForm, paymentTerms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Purchase Order Items</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectPOForm({
                        ...directPOForm,
                        items: [
                          ...directPOForm.items,
                          { material: 'SS Flat', sizeSpecs: '50 x 6 x 300', qty: 1, unit: 'Nos', rate: 450, amount: 450 }
                        ]
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 font-mono">Size Specs</th>
                        <th className="p-2 text-center w-20">Qty</th>
                        <th className="p-2 text-center w-20">Unit</th>
                        <th className="p-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {directPOForm.items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.material}
                              onChange={(e) => {
                                const newItems = [...directPOForm.items];
                                newItems[idx].material = e.target.value;
                                setDirectPOForm({ ...directPOForm, items: newItems });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.sizeSpecs}
                              onChange={(e) => {
                                const newItems = [...directPOForm.items];
                                newItems[idx].sizeSpecs = e.target.value;
                                setDirectPOForm({ ...directPOForm, items: newItems });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-blue-700 font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => {
                                const newItems = [...directPOForm.items];
                                newItems[idx].qty = Number(e.target.value) || 1;
                                setDirectPOForm({ ...directPOForm, items: newItems });
                              }}
                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={item.unit || 'Nos'}
                              onChange={(e) => {
                                const newItems = [...directPOForm.items];
                                newItems[idx].unit = e.target.value;
                                setDirectPOForm({ ...directPOForm, items: newItems });
                              }}
                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {directPOForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDirectPOForm({
                                    ...directPOForm,
                                    items: directPOForm.items.filter((_, i) => i !== idx)
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes & Instructions</label>
                <textarea
                  rows={2}
                  value={directPOForm.notes}
                  onChange={(e) => setDirectPOForm({ ...directPOForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-800">
                Total Material Items:{' '}
                <strong className="text-indigo-700 font-mono font-black text-sm">
                  {directPOForm.items.length} Parts ({directPOForm.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)} Qty)
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDirectPOModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!directPOForm.vendor.trim()) {
                      alert('Please specify a vendor.');
                      return;
                    }
                    const finalOrderedBy = currentUser?.name || 'Amit';
                    const totalAmt = directPOForm.items.reduce((sum, i) => sum + i.amount, 0);
                    addPurchaseOrder({
                      poNumber: directPOForm.poNumber || `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
                      date: new Date().toISOString().split('T')[0],
                      vendor: directPOForm.vendor,
                      expectedDate: directPOForm.expectedDate,
                      paymentTerms: directPOForm.paymentTerms,
                      status: 'Sent',
                      orderedBy: finalOrderedBy,
                      issuedBy: finalOrderedBy,
                      totalAmount: totalAmt,
                      notes: directPOForm.notes,
                      projectNames: directPOForm.projectName ? [directPOForm.projectName] : ['General Fabrication'],
                      items: directPOForm.items.map((i) => ({
                        material: i.material,
                        sizeSpecs: i.sizeSpecs,
                        qty: i.qty,
                        unit: i.unit,
                        rate: i.rate,
                        amount: i.amount,
                      })),
                    });
                    setIsDirectPOModalOpen(false);
                    showToast(`✓ Purchase Order ${directPOForm.poNumber} issued and saved to PO Basket! (Ordered by: ${finalOrderedBy})`);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save & Issue PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ======================================================================= */}
      {/* 6. STICKY FLOATING BOTTOM SELECTION ACTION BAR (HIGH VISIBILITY & ACCESSIBILITY) */}
      {/* ======================================================================= */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-short shadow-2xl no-print">
          <div className="bg-slate-950/95 backdrop-blur-md border-2 border-indigo-500 text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl ring-4 ring-indigo-500/20">
            {/* Counter Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-indigo-900/80 rounded-xl border border-indigo-400/40">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="text-xs font-black text-amber-300 font-mono tracking-wider">
                {selectedIds.length} Selected
              </span>
            </div>

            <div className="h-5 w-px bg-slate-700" />

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-tour="tour-basket-assign-vendor"
                onClick={handleOpenBulkAssign}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:shadow-indigo-500/30"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-200" />
                <span>Assign Vendor</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRFQModal()}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:shadow-amber-500/30"
              >
                <Send className="w-3.5 h-3.5 text-amber-200" />
                <span>Send RFQ</span>
              </button>

              <button
                type="button"
                data-tour="tour-basket-generate-po"
                onClick={() => handleOpenPOModal()}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:shadow-emerald-500/30"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-200" />
                <span>Generate PO</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveSelectedItems}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:shadow-rose-500/30"
                title="Remove selected items from basket and database"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-200" />
                <span>Remove</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
