-- =========================================================================
-- EVOLUIA — LIBERAR POLÍTICAS RLS PARA USUÁRIOS AUTENTICADOS
-- =========================================================================

-- Desabilitar e recriar as políticas com permissão total para usuários autenticados

-- 1. PROFESSIONALS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seu proprio perfil" ON public.professionals;
DROP POLICY IF EXISTS "Permitir insercao de perfil" ON public.professionals;
CREATE POLICY "Permitir tudo em professionals para autenticados" 
ON public.professionals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. CHILDREN
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam suas proprias criancas" ON public.children;
CREATE POLICY "Permitir tudo em children para autenticados" 
ON public.children FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. GUARDIANS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus proprios responsaveis" ON public.guardians;
CREATE POLICY "Permitir tudo em guardians para autenticados" 
ON public.guardians FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. GUARDIAN_CHILDREN
ALTER TABLE public.guardian_children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam vinculos de responsaveis" ON public.guardian_children;
CREATE POLICY "Permitir tudo em guardian_children para autenticados" 
ON public.guardian_children FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. CARE_PLANS
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam planos de cuidado" ON public.care_plans;
CREATE POLICY "Permitir tudo em care_plans para autenticados" 
ON public.care_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. APPOINTMENTS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus agendamentos" ON public.appointments;
CREATE POLICY "Permitir tudo em appointments para autenticados" 
ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. SESSIONS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam suas sessoes" ON public.sessions;
CREATE POLICY "Permitir tudo em sessions para autenticados" 
ON public.sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. SESSION_DOCUMENTS
ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam anexos de sessoes" ON public.session_documents;
CREATE POLICY "Permitir tudo em session_documents para autenticados" 
ON public.session_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. INITIAL_ASSESSMENTS
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam avaliacoes iniciais" ON public.initial_assessments;
CREATE POLICY "Permitir tudo em initial_assessments para autenticados" 
ON public.initial_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. ASSESSMENT_QUESTIONS
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam perguntas de avaliacao" ON public.assessment_questions;
CREATE POLICY "Permitir tudo em assessment_questions para autenticados" 
ON public.assessment_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. ASSESSMENT_ANSWERS
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam respostas de avaliacao" ON public.assessment_answers;
CREATE POLICY "Permitir tudo em assessment_answers para autenticados" 
ON public.assessment_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. TESTS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus testes" ON public.tests;
CREATE POLICY "Permitir tudo em tests para autenticados" 
ON public.tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. DOCUMENTS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus documentos" ON public.documents;
CREATE POLICY "Permitir tudo em documents para autenticados" 
ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. FINANCIAL_RECORDS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus registros financeiros" ON public.financial_records;
CREATE POLICY "Permitir tudo em financial_records para autenticados" 
ON public.financial_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. REPORTS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais gerenciam seus relatorios" ON public.reports;
CREATE POLICY "Permitir tudo em reports para autenticados" 
ON public.reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
