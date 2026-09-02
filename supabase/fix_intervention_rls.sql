-- ==========================================================
-- EVOLUIA — CORRIGIR RLS das novas tabelas de intervencao
-- Seguindo o mesmo padrao de todas as outras tabelas do sistema
-- ==========================================================

-- intervention_goals
DROP POLICY IF EXISTS "intervention_goals_select" ON public.intervention_goals;
DROP POLICY IF EXISTS "intervention_goals_insert" ON public.intervention_goals;
DROP POLICY IF EXISTS "intervention_goals_update" ON public.intervention_goals;
DROP POLICY IF EXISTS "intervention_goals_delete" ON public.intervention_goals;

CREATE POLICY "Permitir tudo em intervention_goals para autenticados"
ON public.intervention_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- intervention_orientations
DROP POLICY IF EXISTS "intervention_orientations_select" ON public.intervention_orientations;
DROP POLICY IF EXISTS "intervention_orientations_insert" ON public.intervention_orientations;
DROP POLICY IF EXISTS "intervention_orientations_update" ON public.intervention_orientations;
DROP POLICY IF EXISTS "intervention_orientations_delete" ON public.intervention_orientations;

CREATE POLICY "Permitir tudo em intervention_orientations para autenticados"
ON public.intervention_orientations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- session_goals
DROP POLICY IF EXISTS "session_goals_select" ON public.session_goals;
DROP POLICY IF EXISTS "session_goals_insert" ON public.session_goals;
DROP POLICY IF EXISTS "session_goals_delete" ON public.session_goals;

CREATE POLICY "Permitir tudo em session_goals para autenticados"
ON public.session_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
