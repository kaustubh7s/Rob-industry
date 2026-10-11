const LOCAL_STORAGE_KEY = 'RSB_ERP_STATE_V6';
export const TOMBSTONES_REQUIREMENTS_KEY = LOCAL_STORAGE_KEY + '_deleted_requirements';
export const TOMBSTONES_PROJECTS_KEY = LOCAL_STORAGE_KEY + '_deleted_projects';

export function getDeletedRequirementTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONES_REQUIREMENTS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addRequirementTombstone(id: string): void {
  if (!id) return;
  try {
    const set = getDeletedRequirementTombstones();
    set.add(id);
    localStorage.setItem(TOMBSTONES_REQUIREMENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function addRequirementTombstones(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const set = getDeletedRequirementTombstones();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(TOMBSTONES_REQUIREMENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getDeletedProjectTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONES_PROJECTS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addProjectTombstone(id: string): void {
  if (!id) return;
  try {
    const set = getDeletedProjectTombstones();
    set.add(id);
    localStorage.setItem(TOMBSTONES_PROJECTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}
