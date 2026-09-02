-- ==========================================================
-- EVOLUIA — Adicionar coluna attachments para fotos e documentos
-- SEGURO: IF NOT EXISTS em intervention_sessions e sessions
-- ==========================================================

-- 1. Coluna de anexos na tabela de aulas de intervenção
ALTER TABLE public.intervention_sessions 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Coluna de anexos na tabela de sessões de avaliação
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 3. Garantir que o bucket child-documents permite leitura pública e upload
INSERT INTO storage.buckets (id, name, public) 
VALUES ('child-documents', 'child-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Permitir upload para autenticados e para anon (para a captura rápida via QR code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Permitir upload publico em child-documents'
    ) THEN
        CREATE POLICY "Permitir upload publico em child-documents" 
        ON storage.objects FOR INSERT TO public 
        WITH CHECK (bucket_id = 'child-documents');
    END IF;
END $$;
