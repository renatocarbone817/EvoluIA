-- Adiciona coluna de logomarca da clínica na tabela professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS clinic_logo_url TEXT;
