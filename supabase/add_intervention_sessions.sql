-- ==========================================================
-- EVOLUIA — Tabelas para Aulas de Intervenção
-- SEGURO: não toca em nenhuma tabela existente
-- ==========================================================

-- 1. INTERVENTION AREAS — áreas selecionadas por criança no plano
CREATE TABLE IF NOT EXISTS public.intervention_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (child_id, area)
);

-- 2. INTERVENTION SESSIONS — aulas de intervenção (separadas das sessões de avaliação)
CREATE TABLE IF NOT EXISTS public.intervention_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    session_number INT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TEXT,
    end_time TEXT,
    behavior TEXT,
    general_notes TEXT,
    family_recommendation TEXT,
    next_session_plan TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INTERVENTION SESSION AREAS — notas por área dentro de cada aula
CREATE TABLE IF NOT EXISTS public.intervention_session_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.intervention_sessions(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    what_was_worked TEXT,
    child_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, area)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_intervention_areas_child ON public.intervention_areas(child_id);
CREATE INDEX IF NOT EXISTS idx_intervention_sessions_child ON public.intervention_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_intervention_sessions_appointment ON public.intervention_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_intervention_session_areas_session ON public.intervention_session_areas(session_id);

-- RLS
ALTER TABLE public.intervention_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_session_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em intervention_areas para autenticados"
ON public.intervention_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo em intervention_sessions para autenticados"
ON public.intervention_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo em intervention_session_areas para autenticados"
ON public.intervention_session_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);
