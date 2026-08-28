-- ==========================================================
-- EVOLUIA — SUPORTE A EQUIPE & MULTI-USUÁRIO
-- ==========================================================

-- 1. Adicionar colunas de suporte a equipe na tabela professionals
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'master',
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS allow_master_data_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Garantir que profissionais existentes sejam marcados como MASTER
UPDATE public.professionals
SET role = 'master'
WHERE role IS NULL;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_professionals_master_id ON public.professionals(master_id);
CREATE INDEX IF NOT EXISTS idx_children_professional_id ON public.children(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_guardians_professional_id ON public.guardians(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_professional_id ON public.financial_records(professional_id);
