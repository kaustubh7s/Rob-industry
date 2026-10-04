export type CellFormat = 'general' | 'number' | 'currency' | 'percent' | 'date' | 'time' | 'text';

export interface SheetCell {
  v: any; // Raw value: string, number, boolean, null
  f?: string; // Formula string, e.g. "=SUM(G2:G50)"
  calced?: any; // Evaluated formula result
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  textColor?: string;
  bgColor?: string;
  wrap?: boolean;
  format?: CellFormat;
  border?: 'none' | 'thin' | 'thick' | 'all';
}

export interface WorkbookSheet {
  id: string;
  workbook_id: string;
  name: string;
  tab_color?: string;
  order_index: number;
  row_count: number;
  col_count: number;
  col_widths?: Record<string, number>; // e.g. { "A": 120, "B": 240 }
  row_heights?: Record<number, number>;
  custom_col_headers?: Record<string, string>; // e.g. { "A": "Date", "B": "PO Number" }
  is_filter_active?: boolean;
  active_filters?: Record<string, string[]>; // e.g. { "B": ["PO-2026-891", "PO-2026-892"] }
  frozen_rows?: number; // e.g. 1
  frozen_cols?: number; // e.g. 0 or 1
  cells: Record<string, SheetCell>; // Key: "A1", "B5", etc.
}

export interface Workbook {
  id: string;
  directory_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  last_edited_by: string;
  last_edited_by_name: string;
  last_edited_at: string;
  is_pinned?: boolean;
  is_favorite?: boolean;
  tags?: string[];
  sheets: WorkbookSheet[];
}

export interface WorkbookDirectory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_system?: boolean;
  order_index: number;
}

export interface WorkbookTrashItem {
  id: string;
  item_type: 'directory' | 'workbook' | 'sheet';
  title: string;
  directory_name?: string;
  original_data: any;
  deleted_by: string;
  deleted_by_name: string;
  deleted_at: string;
}

export interface WorkbookActivityLog {
  id: string;
  workbook_id: string;
  action: string;
  user_name: string;
  user_role: string;
  details: string;
  timestamp: string;
}

export interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}
