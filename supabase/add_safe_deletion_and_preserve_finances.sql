-- =========================================================================
-- EVOLUIA — PRESERVAÇÃO FINANCEIRA E EXCLUSÃO SEGURA DE PACIENTES
-- =========================================================================

-- 1. Tornar child_id opcional na tabela financial_records para permitir preservação
ALTER TABLE public.financial_records ALTER COLUMN child_id DROP NOT NULL;

-- 2. Alterar a chave estrangeira para ON DELETE SET NULL em vez de CASCADE
ALTER TABLE public.financial_records DROP CONSTRAINT IF EXISTS financial_records_child_id_fkey;

ALTER TABLE public.financial_records 
  ADD CONSTRAINT financial_records_child_id_fkey 
  FOREIGN KEY (child_id) 
  REFERENCES public.children(id) 
  ON DELETE SET NULL;
