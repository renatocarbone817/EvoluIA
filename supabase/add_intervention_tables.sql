-- ==========================================================
-- EVOLUIA — Melhoria da Aba de Intervenção
-- Criar tabelas: intervention_goals, intervention_orientations, session_goals
-- SEGURO: não apaga nenhuma tabela ou coluna existente
-- ==========================================================

-- 1. INTERVENTION GOALS (Metas do Plano de Intervenção)
-- Substitui o localStorage. Dados persistem no banco por criança/profissional.
CREATE TABLE IF NOT EXISTS public.intervention_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT 'Leitura & Decodificação',
    strategy TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('not_started', 'in_progress', 'achieved')),
    started_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INTERVENTION ORIENTATIONS (Orientações para Família e Escola)
-- Substitui o texto hardcoded. Permite criar/editar/excluir orientações.
CREATE TABLE IF NOT EXISTS public.intervention_orientations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('familia', 'escola')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SESSION GOALS (Relação N:N entre Sessão e Meta — pronto para uso futuro)
-- Permite vincular uma sessão a 0, 1 ou várias metas de intervenção.
CREATE TABLE IF NOT EXISTS public.session_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.intervention_goals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, goal_id)
);

-- ==========================================================
-- RLS — ROW LEVEL SECURITY
-- ==========================================================

ALTER TABLE public.intervention_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_orientations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_goals ENABLE ROW LEVEL SECURITY;

-- INTERVENTION GOALS: profissional acessa apenas suas metas
DROP POLICY IF EXISTS "intervention_goals_select" ON public.intervention_goals;
CREATE POLICY "intervention_goals_select" ON public.intervention_goals
    FOR SELECT USING (
        professional_id = auth.uid()
        OR professional_id IN (
            SELECT id FROM public.professionals WHERE master_id = auth.uid()
        )
        OR (
            SELECT master_id FROM public.professionals WHERE id = auth.uid()
        ) IS NOT NULL
        AND professional_id IN (
            SELECT id FROM public.professionals
            WHERE master_id = (
                SELECT master_id FROM public.professionals WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "intervention_goals_insert" ON public.intervention_goals;
CREATE POLICY "intervention_goals_insert" ON public.intervention_goals
    FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "intervention_goals_update" ON public.intervention_goals;
CREATE POLICY "intervention_goals_update" ON public.intervention_goals
    FOR UPDATE USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "intervention_goals_delete" ON public.intervention_goals;
CREATE POLICY "intervention_goals_delete" ON public.intervention_goals
    FOR DELETE USING (professional_id = auth.uid());

-- INTERVENTION ORIENTATIONS: profissional acessa apenas suas orientações
DROP POLICY IF EXISTS "intervention_orientations_select" ON public.intervention_orientations;
CREATE POLICY "intervention_orientations_select" ON public.intervention_orientations
    FOR SELECT USING (
        professional_id = auth.uid()
        OR professional_id IN (
            SELECT id FROM public.professionals WHERE master_id = auth.uid()
        )
        OR (
            SELECT master_id FROM public.professionals WHERE id = auth.uid()
        ) IS NOT NULL
        AND professional_id IN (
            SELECT id FROM public.professionals
            WHERE master_id = (
                SELECT master_id FROM public.professionals WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "intervention_orientations_insert" ON public.intervention_orientations;
CREATE POLICY "intervention_orientations_insert" ON public.intervention_orientations
    FOR INSERT WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "intervention_orientations_update" ON public.intervention_orientations;
CREATE POLICY "intervention_orientations_update" ON public.intervention_orientations
    FOR UPDATE USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "intervention_orientations_delete" ON public.intervention_orientations;
CREATE POLICY "intervention_orientations_delete" ON public.intervention_orientations
    FOR DELETE USING (professional_id = auth.uid());

-- SESSION GOALS: profissional acessa via sessions (que já tem RLS própria)
DROP POLICY IF EXISTS "session_goals_select" ON public.session_goals;
CREATE POLICY "session_goals_select" ON public.session_goals
    FOR SELECT USING (
        goal_id IN (
            SELECT id FROM public.intervention_goals WHERE professional_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "session_goals_insert" ON public.session_goals;
CREATE POLICY "session_goals_insert" ON public.session_goals
    FOR INSERT WITH CHECK (
        goal_id IN (
            SELECT id FROM public.intervention_goals WHERE professional_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "session_goals_delete" ON public.session_goals;
CREATE POLICY "session_goals_delete" ON public.session_goals
    FOR DELETE USING (
        goal_id IN (
            SELECT id FROM public.intervention_goals WHERE professional_id = auth.uid()
        )
    );

-- ==========================================================
-- ÍNDICES para performance
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_intervention_goals_child ON public.intervention_goals(child_id);
CREATE INDEX IF NOT EXISTS idx_intervention_goals_professional ON public.intervention_goals(professional_id);
CREATE INDEX IF NOT EXISTS idx_intervention_orientations_child ON public.intervention_orientations(child_id);
CREATE INDEX IF NOT EXISTS idx_session_goals_goal ON public.session_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_session_goals_session ON public.session_goals(session_id);
