-- =========================================================================
-- LIBERAR UPLOAD DE ARQUIVOS (STORAGE) E TABELA PROFESSIONALS NO SUPABASE
-- =========================================================================

-- 1. Garantir que os buckets existem e são públicos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('professionals', 'professionals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('child-documents', 'child-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Liberar permissão total no Storage para usuários autenticados
DROP POLICY IF EXISTS "Permitir upload no storage para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura no storage para todos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update no storage" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete no storage" ON storage.objects;

CREATE POLICY "Permitir tudo no storage para usuarios autenticados" 
ON storage.objects FOR ALL TO authenticated 
USING (bucket_id IN ('professionals', 'child-documents')) 
WITH CHECK (bucket_id IN ('professionals', 'child-documents'));

CREATE POLICY "Permitir leitura publica de fotos e documentos" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id IN ('professionals', 'child-documents'));

-- 3. Liberar permissão total na tabela public.professionals
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em professionals para autenticados" ON public.professionals;
DROP POLICY IF EXISTS "Profissionais gerenciam seu proprio perfil" ON public.professionals;
DROP POLICY IF EXISTS "Permitir insercao de perfil" ON public.professionals;

CREATE POLICY "Permitir tudo em professionals para autenticados" 
ON public.professionals FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);
