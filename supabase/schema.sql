-- ==========================================================
-- EVOLUIA — SCHEMA POSTGRESQL + RLS (ROW LEVEL SECURITY)
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFESSIONALS (Perfil de cada psicopedagoga / multi-tenant)
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    crp TEXT,
    specialty TEXT DEFAULT 'Psicopedagogia',
    bio TEXT,
    logo_url TEXT,
    clinic_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GUARDIANS (Responsáveis)
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CHILDREN (Crianças / Pacientes)
CREATE TYPE child_status AS ENUM ('initial_assessment', 'in_progress', 'paused', 'closed', 'archived');

CREATE TABLE IF NOT EXISTS public.children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    birth_date DATE,
    school TEXT,
    grade TEXT,
    main_complaint TEXT,
    status child_status DEFAULT 'initial_assessment',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GUARDIAN_CHILDREN (Relacionamento N:N)
CREATE TABLE IF NOT EXISTS public.guardian_children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'Mãe',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CARE_PLANS (Configuração de Frequência & Acompanhamento)
CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    start_date DATE DEFAULT CURRENT_DATE,
    frequency INT DEFAULT 1,
    day_of_week INT[],
    session_time TIME DEFAULT '14:00',
    duration_minutes INT DEFAULT 60,
    price_per_session NUMERIC DEFAULT 100.00,
    payment_type TEXT DEFAULT 'mensal',
    payment_due_day INT DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APPOINTMENTS (Agenda)
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'missed', 'rescheduled');

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type TEXT DEFAULT 'Sessão Psicopedagógica',
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SESSIONS (Atendimentos Registrados)
CREATE TYPE session_status AS ENUM ('in_progress', 'completed');

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    session_number INT DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    objective TEXT,
    what_was_worked TEXT,
    activities TEXT,
    test_results TEXT,
    professional_notes TEXT,
    next_objectives TEXT,
    status session_status DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SESSION_DOCUMENTS (Anexos da sessão)
CREATE TABLE IF NOT EXISTS public.session_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INITIAL_ASSESSMENTS (Avaliação Inicial)
CREATE TYPE assessment_status AS ENUM ('pending', 'completed');

CREATE TABLE IF NOT EXISTS public.initial_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    referral_source TEXT,
    school_name TEXT,
    teacher_name TEXT,
    reason TEXT,
    notes TEXT,
    status assessment_status DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ASSESSMENT_QUESTIONS (Estrutura flexível para as 13 perguntas da Priscila)
CREATE TYPE question_type AS ENUM ('short_text', 'long_text', 'select', 'multi_select', 'yes_no', 'scale');

CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'long_text',
    options JSONB,
    order_index INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ASSESSMENT_ANSWERS (Respostas da avaliação)
CREATE TABLE IF NOT EXISTS public.assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.initial_assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_options JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TESTS (Testes e Avaliações Específicas)
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT,
    date DATE DEFAULT CURRENT_DATE,
    objective TEXT,
    result TEXT,
    observations TEXT,
    conclusion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. DOCUMENTS (Central de Documentos da Criança)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    assessment_id UUID REFERENCES public.initial_assessments(id) ON DELETE SET NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'atividades',
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. EVOLUTION_NOTES (Observações de Evolução por Área)
CREATE TABLE IF NOT EXISTS public.evolution_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    initial_observation TEXT,
    current_observation TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. FINANCIAL_RECORDS (Controle Financeiro)
CREATE TYPE financial_status AS ENUM ('pending', 'paid', 'cancelled');

CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    month INT NOT NULL,
    year INT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0.00,
    status financial_status DEFAULT 'pending',
    payment_date DATE,
    notes TEXT,
    discount NUMERIC DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. REPORTS (Relatórios & Pareceres)
CREATE TYPE report_status AS ENUM ('draft', 'final');

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    content JSONB,
    status report_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) — SEGURANÇA E ISOLAMENTO TOTAL
-- ==========================================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- POLICIES: Cada profissional só lê, cria e altera seus próprios dados!

-- professionals
CREATE POLICY "Profissionais gerenciam seu proprio perfil"
ON public.professionals FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- guardians
CREATE POLICY "Profissionais gerenciam seus proprios responsaveis"
ON public.guardians FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- children
CREATE POLICY "Profissionais gerenciam suas proprias criancas"
ON public.children FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- guardian_children
CREATE POLICY "Profissionais gerenciam vinculos de responsaveis"
ON public.guardian_children FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = guardian_children.child_id AND c.professional_id = auth.uid()
    )
);

-- care_plans
CREATE POLICY "Profissionais gerenciam planos de cuidado"
ON public.care_plans FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- appointments
CREATE POLICY "Profissionais gerenciam seus agendamentos"
ON public.appointments FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- sessions
CREATE POLICY "Profissionais gerenciam suas sessoes"
ON public.sessions FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- session_documents
CREATE POLICY "Profissionais gerenciam anexos de sessoes"
ON public.session_documents FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- initial_assessments
CREATE POLICY "Profissionais gerenciam avaliacoes iniciais"
ON public.initial_assessments FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- assessment_questions
CREATE POLICY "Profissionais gerenciam perguntas de avaliacao"
ON public.assessment_questions FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- assessment_answers
CREATE POLICY "Profissionais gerenciam respostas de avaliacao"
ON public.assessment_answers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.initial_assessments a
        WHERE a.id = assessment_answers.assessment_id AND a.professional_id = auth.uid()
    )
);

-- tests
CREATE POLICY "Profissionais gerenciam seus testes"
ON public.tests FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- documents
CREATE POLICY "Profissionais gerenciam seus documentos"
ON public.documents FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- evolution_notes
CREATE POLICY "Profissionais gerenciam notas de evolucao"
ON public.evolution_notes FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- financial_records
CREATE POLICY "Profissionais gerenciam seus registros financeiros"
ON public.financial_records FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- reports
CREATE POLICY "Profissionais gerenciam seus relatorios"
ON public.reports FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- ==========================================================
-- STORAGE BUCKETS (Execute no painel Storage do Supabase)
-- ==========================================================
-- 1. Crie o bucket: 'professionals' (público)
-- 2. Crie o bucket: 'child-documents' (público ou autenticado)
