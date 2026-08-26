-- =========================================================================
-- EVOLUIA — SCRIPT MESTRE COMPLETO (TABELAS + POLÍTICAS RLS + USUÁRIO PRISCILA)
-- =========================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criar Tipos ENUM com proteção contra duplicidade
DO $$ BEGIN
    CREATE TYPE child_status AS ENUM ('initial_assessment', 'in_progress', 'paused', 'closed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'missed', 'rescheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_status AS ENUM ('pending', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('short_text', 'long_text', 'select', 'multi_select', 'yes_no', 'scale');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE financial_status AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('draft', 'final');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Criar todas as Tabelas
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

CREATE TABLE IF NOT EXISTS public.guardian_children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'Mãe',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.initial_assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_options JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 4. Habilitar RLS em todas as tabelas
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

-- 5. Criar Políticas de Segurança RLS (com DROP prévio para não duplicar)
DROP POLICY IF EXISTS "Profissionais gerenciam seu proprio perfil" ON public.professionals;
CREATE POLICY "Profissionais gerenciam seu proprio perfil" ON public.professionals FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profissionais gerenciam seus proprios responsaveis" ON public.guardians;
CREATE POLICY "Profissionais gerenciam seus proprios responsaveis" ON public.guardians FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam suas proprias criancas" ON public.children;
CREATE POLICY "Profissionais gerenciam suas proprias criancas" ON public.children FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam vinculos de responsaveis" ON public.guardian_children;
CREATE POLICY "Profissionais gerenciam vinculos de responsaveis" ON public.guardian_children FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = guardian_children.child_id AND c.professional_id = auth.uid())
);

DROP POLICY IF EXISTS "Profissionais gerenciam planos de cuidado" ON public.care_plans;
CREATE POLICY "Profissionais gerenciam planos de cuidado" ON public.care_plans FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam seus agendamentos" ON public.appointments;
CREATE POLICY "Profissionais gerenciam seus agendamentos" ON public.appointments FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam suas sessoes" ON public.sessions;
CREATE POLICY "Profissionais gerenciam suas sessoes" ON public.sessions FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam anexos de sessoes" ON public.session_documents;
CREATE POLICY "Profissionais gerenciam anexos de sessoes" ON public.session_documents FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam avaliacoes iniciais" ON public.initial_assessments;
CREATE POLICY "Profissionais gerenciam avaliacoes iniciais" ON public.initial_assessments FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam perguntas de avaliacao" ON public.assessment_questions;
CREATE POLICY "Profissionais gerenciam perguntas de avaliacao" ON public.assessment_questions FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam respostas de avaliacao" ON public.assessment_answers;
CREATE POLICY "Profissionais gerenciam respostas de avaliacao" ON public.assessment_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.initial_assessments a WHERE a.id = assessment_answers.assessment_id AND a.professional_id = auth.uid())
);

DROP POLICY IF EXISTS "Profissionais gerenciam seus testes" ON public.tests;
CREATE POLICY "Profissionais gerenciam seus testes" ON public.tests FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam seus documentos" ON public.documents;
CREATE POLICY "Profissionais gerenciam seus documentos" ON public.documents FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam notas de evolucao" ON public.evolution_notes;
CREATE POLICY "Profissionais gerenciam notas de evolucao" ON public.evolution_notes FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam seus registros financeiros" ON public.financial_records;
CREATE POLICY "Profissionais gerenciam seus registros financeiros" ON public.financial_records FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais gerenciam seus relatorios" ON public.reports;
CREATE POLICY "Profissionais gerenciam seus relatorios" ON public.reports FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

-- 6. CRIAR USUÁRIO DA PRISCILA CARBONE & DADOS DE DEMONSTRAÇÃO
DO $$
DECLARE
    v_user_id UUID := uuid_generate_v4();
    v_child1_id UUID := uuid_generate_v4();
    v_child2_id UUID := uuid_generate_v4();
    v_child3_id UUID := uuid_generate_v4();
    v_guardian1_id UUID := uuid_generate_v4();
    v_guardian2_id UUID := uuid_generate_v4();
    v_appt1_id UUID := uuid_generate_v4();
    v_appt2_id UUID := uuid_generate_v4();
    v_appt3_id UUID := uuid_generate_v4();
    v_session1_id UUID := uuid_generate_v4();
    v_session2_id UUID := uuid_generate_v4();
    v_assess_id UUID := uuid_generate_v4();
BEGIN
    -- Se o usuário já existir, limpar dados anteriores para recriar limpo
    DELETE FROM auth.users WHERE email = 'priscila@evolui.com.br';

    -- Inserir usuário no auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        last_sign_in_at
    )
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'priscila@evolui.com.br',
        crypt('senha123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Priscila Carbone"}'::jsonb,
        'authenticated',
        'authenticated',
        NOW(),
        NOW(),
        NOW()
    );

    -- Identidade auth
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        v_user_id,
        json_build_object('sub', v_user_id, 'email', 'priscila@evolui.com.br')::jsonb,
        'email',
        v_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- Perfil profissional da Priscila
    INSERT INTO public.professionals (
        id,
        full_name,
        email,
        phone,
        crp,
        specialty,
        clinic_name,
        city,
        state,
        bio
    )
    VALUES (
        v_user_id,
        'Priscila Carbone',
        'priscila@evolui.com.br',
        '(11) 98765-4321',
        '06/98765-SP',
        'Psicopedagogia Clínica & Neuroaprendizagem',
        'Espaço Psicopedagógico Priscila Carbone',
        'São Paulo',
        'SP',
        'Especialista em dificuldades e transtornos de aprendizagem, avaliação e intervenção psicopedagógica na infância.'
    );

    -- Perguntas da Avaliação Inicial Padrão
    INSERT INTO public.assessment_questions (professional_id, question_text, question_type, order_index)
    VALUES
        (v_user_id, 'Qual a queixa principal ou motivo relatado pelos pais/escola?', 'long_text', 1),
        (v_user_id, 'Histórico do desenvolvimento da fala e coordenação motora:', 'long_text', 2),
        (v_user_id, 'Desempenho atual em Leitura e Escrita (troca letras, ritmo):', 'long_text', 3),
        (v_user_id, 'Desempenho atual em Raciocínio Lógico e Matemática:', 'long_text', 4),
        (v_user_id, 'Rotina diária de sono, telas e tarefas de casa:', 'long_text', 5);

    -- Crianças de Demonstração
    INSERT INTO public.children (id, professional_id, full_name, birth_date, school, grade, main_complaint, status)
    VALUES
        (v_child1_id, v_user_id, 'João Silva', '2016-05-14', 'Colégio Santa Maria', '3º Ano Fundamental', 'Dificuldade na interpretação de textos longos e foco disperso nas tarefas.', 'in_progress'),
        (v_child2_id, v_user_id, 'Maria Eduarda Costa', '2017-09-20', 'Escola Municipal Monteiro Lobato', '2º Ano Fundamental', 'Insegurança na escrita de palavras complexas e resistência com deveres.', 'in_progress'),
        (v_child3_id, v_user_id, 'Pedro Henrique Souza', '2015-11-10', 'Colégio Dom Pedro', '4º Ano Fundamental', 'Dificuldades em operações matemáticas e cálculo mental.', 'initial_assessment');

    -- Responsáveis
    INSERT INTO public.guardians (id, professional_id, full_name, cpf, phone, whatsapp, email, city)
    VALUES
        (v_guardian1_id, v_user_id, 'Ana Paula Silva', '123.456.789-00', '(11) 98888-1111', '(11) 98888-1111', 'anapaula.silva@email.com', 'São Paulo'),
        (v_guardian2_id, v_user_id, 'Carlos Eduardo Costa', '234.567.890-11', '(11) 97777-2222', '(11) 97777-2222', 'carlos.costa@email.com', 'São Paulo');

    -- Vínculos Responsável -> Criança
    INSERT INTO public.guardian_children (guardian_id, child_id, relationship, is_primary)
    VALUES
        (v_guardian1_id, v_child1_id, 'Mãe', true),
        (v_guardian2_id, v_child2_id, 'Pai', true);

    -- Plano de Cuidado do João
    INSERT INTO public.care_plans (professional_id, child_id, start_date, frequency, session_time, duration_minutes, price_per_session, payment_type, payment_due_day)
    VALUES
        (v_user_id, v_child1_id, CURRENT_DATE - 30, 1, '14:00', 60, 80.00, 'mensal', 5);

    -- Agendamentos de Hoje e da Semana
    INSERT INTO public.appointments (id, professional_id, child_id, start_time, end_time, type, status, notes)
    VALUES
        (v_appt1_id, v_user_id, v_child1_id, (CURRENT_DATE + TIME '14:00:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '15:00:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled', 'Trabalhar decodificação e leitura'),
        (v_appt2_id, v_user_id, v_child2_id, (CURRENT_DATE + TIME '15:30:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '16:30:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled', 'Atividades lúdicas de consciência fonológica'),
        (v_appt3_id, v_user_id, v_child3_id, (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00:00')::TIMESTAMPTZ, (CURRENT_DATE + INTERVAL '2 days' + TIME '11:00:00')::TIMESTAMPTZ, 'Avaliação Inicial', 'confirmed', 'Primeira entrevista com os pais');

    -- Sessões Realizadas no Histórico do João Silva
    INSERT INTO public.sessions (id, professional_id, child_id, session_number, date, start_time, end_time, objective, what_was_worked, activities, test_results, professional_notes, next_objectives, status)
    VALUES
        (v_session1_id, v_user_id, v_child1_id, 1, CURRENT_DATE - 14, '14:00', '15:00', 'Avaliar consciência fonológica e nível de decodificação', 'Áreas: Leitura, Atenção & Foco', 'Jogo das rimas sonoras, leitura compartilhada de gibi infantil e caça-palavras.', 'Escore positivo em consciência fonológica; lentidão observada em dígrafos (ch, lh, nh).', 'João demonstrou excelente disposição e empatia com as dinâmicas.', 'Trabalhar textos curtos com perguntas de interpretação direta.', 'completed'),
        (v_session2_id, v_user_id, v_child1_id, 2, CURRENT_DATE - 7, '14:00', '15:00', 'Desenvolver estratégias de interpretação de texto e segmentação', 'Áreas: Leitura, Escrita, Memória', 'Leitura guiada, mapa mental da história e jogo de memória de palavras.', 'Avanço na identificação dos personagens e ordem dos acontecimentos.', 'Maior autonomia na leitura em voz alta.', 'Iniciar atividades com sílabas complexas.', 'completed');

    -- Avaliação Inicial do João
    INSERT INTO public.initial_assessments (id, professional_id, child_id, date, referral_source, school_name, teacher_name, reason, notes, status)
    VALUES
        (v_assess_id, v_user_id, v_child1_id, CURRENT_DATE - 30, 'Professora Carla (Colégio Santa Maria)', 'Colégio Santa Maria', 'Carla Mendes', 'Dificuldades de atenção e desânimo na realização das tarefas de leitura.', 'Família muito participativa e atenta. A criança não apresenta queixas sensoriais ou motoras.', 'completed');

    -- Financeiro do Mês
    INSERT INTO public.financial_records (professional_id, child_id, month, year, amount, status, payment_date, notes)
    VALUES
        (v_user_id, v_child1_id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 320.00, 'paid', CURRENT_DATE - 5, 'Mensalidade 4 sessões (Pago via Pix)'),
        (v_user_id, v_child2_id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 320.00, 'pending', NULL, 'Mensalidade prevista (Vencimento dia 10)');

END $$;
