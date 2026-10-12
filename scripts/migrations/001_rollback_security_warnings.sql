-- ==============================================================================
-- RSB INDUSTRY ERP — REVERSIBLE ROLLBACK MIGRATION FOR SECURITY POLICIES
-- Migration: 001_rollback_security_warnings.sql
-- Restores previous state if needed
-- ==============================================================================

-- Drop hardened policies
DROP POLICY IF EXISTS "erp_users_select" ON public.erp_users;
DROP POLICY IF EXISTS "erp_users_insert" ON public.erp_users;
DROP POLICY IF EXISTS "erp_users_update" ON public.erp_users;
DROP POLICY IF EXISTS "erp_users_delete" ON public.erp_users;

DROP POLICY IF EXISTS "requirements_select" ON public.project_material_requirements;
DROP POLICY IF EXISTS "requirements_insert" ON public.project_material_requirements;
DROP POLICY IF EXISTS "requirements_update" ON public.project_material_requirements;
DROP POLICY IF EXISTS "requirements_delete" ON public.project_material_requirements;

DROP POLICY IF EXISTS "purchase_orders_select" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete" ON public.purchase_orders;

DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

DROP POLICY IF EXISTS "materials_select" ON public.materials;
DROP POLICY IF EXISTS "materials_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_update" ON public.materials;
DROP POLICY IF EXISTS "materials_delete" ON public.materials;

DROP POLICY IF EXISTS "manufacturing_orders_select" ON public.manufacturing_orders;
DROP POLICY IF EXISTS "manufacturing_orders_insert" ON public.manufacturing_orders;
DROP POLICY IF EXISTS "manufacturing_orders_update" ON public.manufacturing_orders;
DROP POLICY IF EXISTS "manufacturing_orders_delete" ON public.manufacturing_orders;

DROP POLICY IF EXISTS "job_cards_select" ON public.job_cards;
DROP POLICY IF EXISTS "job_cards_insert" ON public.job_cards;
DROP POLICY IF EXISTS "job_cards_update" ON public.job_cards;
DROP POLICY IF EXISTS "job_cards_delete" ON public.job_cards;

DROP POLICY IF EXISTS "qc_inspections_select" ON public.qc_inspections;
DROP POLICY IF EXISTS "qc_inspections_insert" ON public.qc_inspections;
DROP POLICY IF EXISTS "qc_inspections_update" ON public.qc_inspections;
DROP POLICY IF EXISTS "qc_inspections_delete" ON public.qc_inspections;

DROP POLICY IF EXISTS "inward_entries_select" ON public.inward_entries;
DROP POLICY IF EXISTS "inward_entries_insert" ON public.inward_entries;
DROP POLICY IF EXISTS "inward_entries_update" ON public.inward_entries;
DROP POLICY IF EXISTS "inward_entries_delete" ON public.inward_entries;

DROP POLICY IF EXISTS "outward_entries_select" ON public.outward_entries;
DROP POLICY IF EXISTS "outward_entries_insert" ON public.outward_entries;
DROP POLICY IF EXISTS "outward_entries_update" ON public.outward_entries;
DROP POLICY IF EXISTS "outward_entries_delete" ON public.outward_entries;

DROP POLICY IF EXISTS "workbook_directories_select" ON public.workbook_directories;
DROP POLICY IF EXISTS "workbook_directories_insert" ON public.workbook_directories;
DROP POLICY IF EXISTS "workbook_directories_update" ON public.workbook_directories;
DROP POLICY IF EXISTS "workbook_directories_delete" ON public.workbook_directories;

DROP POLICY IF EXISTS "workbooks_select" ON public.workbooks;
DROP POLICY IF EXISTS "workbooks_insert" ON public.workbooks;
DROP POLICY IF EXISTS "workbooks_update" ON public.workbooks;
DROP POLICY IF EXISTS "workbooks_delete" ON public.workbooks;

DROP POLICY IF EXISTS "workbook_activity_logs_select" ON public.workbook_activity_logs;
DROP POLICY IF EXISTS "workbook_activity_logs_insert" ON public.workbook_activity_logs;

DROP POLICY IF EXISTS "deleted_workbook_items_select" ON public.deleted_workbook_items;
DROP POLICY IF EXISTS "deleted_workbook_items_insert" ON public.deleted_workbook_items;
DROP POLICY IF EXISTS "deleted_workbook_items_delete" ON public.deleted_workbook_items;

-- Restore base policies
CREATE POLICY "Allow public full access for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for requirements" ON public.project_material_requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for orders" ON public.manufacturing_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for job_cards" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for inward" ON public.inward_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for outward" ON public.outward_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for users" ON public.erp_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbook_directories" ON public.workbook_directories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbooks" ON public.workbooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbook_activity_logs" ON public.workbook_activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for deleted_workbook_items" ON public.deleted_workbook_items FOR ALL USING (true) WITH CHECK (true);
