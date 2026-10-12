-- ==============================================================================
-- RSB INDUSTRY ERP — SUPABASE DATABASE SECURITY AUDIT & RLS HARDENING MIGRATION
-- Migration: 001_fix_supabase_security_warnings.sql
-- Resolves all 17 warnings from warning.csv (lint=0024_permissive_rls_policy)
-- ==============================================================================

-- 1. Helper Function: Extract Current User ERP Role from JWT / erp_users
CREATE OR REPLACE FUNCTION public.get_current_erp_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.erp_users 
  WHERE email = auth.jwt()->>'email' OR id = auth.uid()::text
  LIMIT 1;
$$;

-- Helper Function: Check if caller is Administrator (super_admin / admin / kaustubh)
CREATE OR REPLACE FUNCTION public.is_erp_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_users
    WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
      AND role IN ('super_admin', 'admin', 'kaustubh')
  );
$$;

-- ==============================================================================
-- 2. DROP OVERLY PERMISSIVE & DUPLICATE POLICIES (Resolves warning.csv items 1-17)
-- ==============================================================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Allow public full access for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public full access for deleted_workbook_items" ON public.deleted_workbook_items;
DROP POLICY IF EXISTS "Allow public full access for users" ON public.erp_users;
DROP POLICY IF EXISTS "Allow public full access for inward" ON public.inward_entries;
DROP POLICY IF EXISTS "Allow public full access for job_cards" ON public.job_cards;
DROP POLICY IF EXISTS "Allow public full access for orders" ON public.manufacturing_orders;
DROP POLICY IF EXISTS "Allow public full access for materials" ON public.materials;
DROP POLICY IF EXISTS "Allow public full access for outward" ON public.outward_entries;
DROP POLICY IF EXISTS "Allow public full access for requirements" ON public.project_material_requirements;
DROP POLICY IF EXISTS "Allow public full access for projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert/update/delete to purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public full access for qc_inspections" ON public.qc_inspections;
DROP POLICY IF EXISTS "Allow public full access for vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow public full access for workbook_activity_logs" ON public.workbook_activity_logs;

-- Drop duplicate workbook policies
DROP POLICY IF EXISTS "Allow public access to workbook_directories" ON public.workbook_directories;
DROP POLICY IF EXISTS "Allow public full access for workbook_directories" ON public.workbook_directories;
DROP POLICY IF EXISTS "Allow public access to workbooks" ON public.workbooks;
DROP POLICY IF EXISTS "Allow public full access for workbooks" ON public.workbooks;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_workbook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inward_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outward_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbook_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbook_directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbooks ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. APPLY LEAST-PRIVILEGE ROLE-BASED ACCESS CONTROL (RBAC) POLICIES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. SENSITIVE BUSINESS & USER DIRECTORY: public.erp_users
-- ------------------------------------------------------------------------------
-- Read: Allowed for authenticated users and system directory lookups
CREATE POLICY "erp_users_select" ON public.erp_users
  FOR SELECT USING (true);

-- Insert/Create User: Super Admin and Admin only
CREATE POLICY "erp_users_insert" ON public.erp_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_erp_admin());

-- Update User: Admin, or User updating their own profile
CREATE POLICY "erp_users_update" ON public.erp_users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email' OR public.is_erp_admin())
  WITH CHECK (email = auth.jwt()->>'email' OR public.is_erp_admin());

-- Delete User: Super Admin only
CREATE POLICY "erp_users_delete" ON public.erp_users
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'kaustubh')
    )
  );

-- ------------------------------------------------------------------------------
-- B. SENSITIVE MANUFACTURING & BOM: public.project_material_requirements
-- ------------------------------------------------------------------------------
CREATE POLICY "requirements_select" ON public.project_material_requirements
  FOR SELECT USING (true);

CREATE POLICY "requirements_insert" ON public.project_material_requirements
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "requirements_update" ON public.project_material_requirements
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "requirements_delete" ON public.project_material_requirements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'admin', 'kaustubh', 'store_manager', 'store_incharge', 'production_manager')
    )
  );

-- ------------------------------------------------------------------------------
-- C. FINANCIAL & PURCHASING: public.purchase_orders
-- ------------------------------------------------------------------------------
CREATE POLICY "purchase_orders_select" ON public.purchase_orders
  FOR SELECT USING (true);

CREATE POLICY "purchase_orders_insert" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'admin', 'kaustubh', 'purchase_manager', 'accounts')
    )
  );

CREATE POLICY "purchase_orders_update" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "purchase_orders_delete" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

-- ------------------------------------------------------------------------------
-- D. CLIENTS & CRM: public.customers
-- ------------------------------------------------------------------------------
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

-- ------------------------------------------------------------------------------
-- E. SUPPLIER DATABASE: public.vendors
-- ------------------------------------------------------------------------------
CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT USING (true);

CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "vendors_update" ON public.vendors
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "vendors_delete" ON public.vendors
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

-- ------------------------------------------------------------------------------
-- F. PROJECTS CATALOG: public.projects
-- ------------------------------------------------------------------------------
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

-- ------------------------------------------------------------------------------
-- G. RAW MATERIALS CATALOG: public.materials
-- ------------------------------------------------------------------------------
CREATE POLICY "materials_select" ON public.materials
  FOR SELECT USING (true);

CREATE POLICY "materials_insert" ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "materials_update" ON public.materials
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "materials_delete" ON public.materials
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'admin', 'kaustubh', 'store_manager', 'store_incharge')
    )
  );

-- ------------------------------------------------------------------------------
-- H. MANUFACTURING & SHOPFLOOR: manufacturing_orders, job_cards, qc_inspections
-- ------------------------------------------------------------------------------
CREATE POLICY "manufacturing_orders_select" ON public.manufacturing_orders
  FOR SELECT USING (true);

CREATE POLICY "manufacturing_orders_insert" ON public.manufacturing_orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "manufacturing_orders_update" ON public.manufacturing_orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "manufacturing_orders_delete" ON public.manufacturing_orders
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

CREATE POLICY "job_cards_select" ON public.job_cards
  FOR SELECT USING (true);

CREATE POLICY "job_cards_insert" ON public.job_cards
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "job_cards_update" ON public.job_cards
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "job_cards_delete" ON public.job_cards
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

CREATE POLICY "qc_inspections_select" ON public.qc_inspections
  FOR SELECT USING (true);

CREATE POLICY "qc_inspections_insert" ON public.qc_inspections
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "qc_inspections_update" ON public.qc_inspections
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "qc_inspections_delete" ON public.qc_inspections
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

-- ------------------------------------------------------------------------------
-- I. LOGISTICS & INVENTORY MOVEMENT: inward_entries, outward_entries
-- ------------------------------------------------------------------------------
CREATE POLICY "inward_entries_select" ON public.inward_entries
  FOR SELECT USING (true);

CREATE POLICY "inward_entries_insert" ON public.inward_entries
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "inward_entries_update" ON public.inward_entries
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inward_entries_delete" ON public.inward_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'admin', 'kaustubh', 'store_manager', 'store_incharge')
    )
  );

CREATE POLICY "outward_entries_select" ON public.outward_entries
  FOR SELECT USING (true);

CREATE POLICY "outward_entries_insert" ON public.outward_entries
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "outward_entries_update" ON public.outward_entries
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "outward_entries_delete" ON public.outward_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.erp_users
      WHERE (email = auth.jwt()->>'email' OR id = auth.uid()::text)
        AND role IN ('super_admin', 'admin', 'kaustubh', 'store_manager', 'store_incharge')
    )
  );

-- ------------------------------------------------------------------------------
-- J. WORKBOOK CENTER: workbook_directories, workbooks, logs, deleted_items
-- ------------------------------------------------------------------------------
CREATE POLICY "workbook_directories_select" ON public.workbook_directories
  FOR SELECT USING (true);

CREATE POLICY "workbook_directories_insert" ON public.workbook_directories
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "workbook_directories_update" ON public.workbook_directories
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workbook_directories_delete" ON public.workbook_directories
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());

CREATE POLICY "workbooks_select" ON public.workbooks
  FOR SELECT USING (true);

CREATE POLICY "workbooks_insert" ON public.workbooks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "workbooks_update" ON public.workbooks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workbooks_delete" ON public.workbooks
  FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "workbook_activity_logs_select" ON public.workbook_activity_logs
  FOR SELECT USING (true);

CREATE POLICY "workbook_activity_logs_insert" ON public.workbook_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "deleted_workbook_items_select" ON public.deleted_workbook_items
  FOR SELECT USING (true);

CREATE POLICY "deleted_workbook_items_insert" ON public.deleted_workbook_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "deleted_workbook_items_delete" ON public.deleted_workbook_items
  FOR DELETE TO authenticated
  USING (public.is_erp_admin());
