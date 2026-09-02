-- ==========================================================
-- EVOLUIA — EXPAND CHILD_STATUS ENUM
-- Permite que o Supabase armazene nativamente os novos status
-- 'in_intervention', 'report_completed' e 'report_in_progress'.
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'child_status' AND e.enumlabel = 'in_intervention'
    ) THEN
        ALTER TYPE child_status ADD VALUE 'in_intervention';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'child_status' AND e.enumlabel = 'report_completed'
    ) THEN
        ALTER TYPE child_status ADD VALUE 'report_completed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'child_status' AND e.enumlabel = 'report_in_progress'
    ) THEN
        ALTER TYPE child_status ADD VALUE 'report_in_progress';
    END IF;
END $$;
