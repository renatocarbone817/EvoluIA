-- ================================================================
-- BIBLIOTECA DE MATERIAIS DA PRISCILA
-- Pastas com subpastas infinitas + arquivos de qualquer tipo
-- ================================================================

-- 1. Tabela de pastas (hierarquia infinita via parent_id)
CREATE TABLE IF NOT EXISTS public.library_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.library_folders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de arquivos
CREATE TABLE IF NOT EXISTS public.library_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  folder_id   UUID REFERENCES public.library_folders(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT,
  file_size   BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_files   ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Profissional gerencia suas pastas""
  ON public.library_folders FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY ""Profissional gerencia seus arquivos""
  ON public.library_files FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_library_folders_professional ON public.library_folders(professional_id);
CREATE INDEX IF NOT EXISTS idx_library_folders_parent ON public.library_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_library_files_professional ON public.library_files(professional_id);
CREATE INDEX IF NOT EXISTS idx_library_files_folder ON public.library_files(folder_id);
