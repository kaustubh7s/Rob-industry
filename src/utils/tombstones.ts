// Durable Deletion Tracking (Tombstones)
// Prevents deleted records from being resurrected across page refresh,
// navigation, project switching, or background Supabase synchronization.

const REQUIREMENT_TOMBSTONES_KEY = 'RSB_ERP_STATE_V6_deleted_requirements';
const PROJECT_TOMBSTONES_KEY = 'RSB_ERP_STATE_V6_deleted_projects';

export function getDeletedRequirementTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(REQUIREMENT_TOMBSTONES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addRequirementTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedRequirementTombstones();
    current.add(id);
    localStorage.setItem(REQUIREMENT_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save requirement tombstone:', e);
  }
}

export function addRequirementTombstones(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const current = getDeletedRequirementTombstones();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(REQUIREMENT_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save requirement tombstones:', e);
  }
}

export function removeRequirementTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedRequirementTombstones();
    if (current.delete(id)) {
      localStorage.setItem(REQUIREMENT_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('Failed to remove requirement tombstone:', e);
  }
}

export function getDeletedProjectTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(PROJECT_TOMBSTONES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addProjectTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedProjectTombstones();
    current.add(id);
    current.add(id.trim().toLowerCase());
    localStorage.setItem(PROJECT_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save project tombstone:', e);
  }
}

export function removeProjectTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedProjectTombstones();
    let changed = current.delete(id);
    if (current.delete(id.trim().toLowerCase())) changed = true;
    if (changed) {
      localStorage.setItem(PROJECT_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('Failed to remove project tombstone:', e);
  }
}

const MATERIAL_TOMBSTONES_KEY = 'RSB_ERP_STATE_V6_deleted_materials';

export function getDeletedMaterialTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(MATERIAL_TOMBSTONES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addMaterialTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedMaterialTombstones();
    current.add(id);
    localStorage.setItem(MATERIAL_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save material tombstone:', e);
  }
}

export function addMaterialTombstones(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const current = getDeletedMaterialTombstones();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(MATERIAL_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save material tombstones:', e);
  }
}

const VENDOR_TOMBSTONES_KEY = 'RSB_ERP_STATE_V6_deleted_vendors';

export function getDeletedVendorTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(VENDOR_TOMBSTONES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addVendorTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedVendorTombstones();
    current.add(id);
    localStorage.setItem(VENDOR_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save vendor tombstone:', e);
  }
}

export function addVendorTombstones(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const current = getDeletedVendorTombstones();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(VENDOR_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to save vendor tombstones:', e);
  }
}

export function removeVendorTombstone(id: string): void {
  if (!id) return;
  try {
    const current = getDeletedVendorTombstones();
    if (current.delete(id)) {
      localStorage.setItem(VENDOR_TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('Failed to remove vendor tombstone:', e);
  }
}

