-- ==========================================================
-- CRIAR USUÁRIO DA PRISCILA CARBONE DIRETAMENTE NO SUPABASE
-- Email: priscila@evolui.com.br
-- Senha: senha123
-- ==========================================================

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
    -- 1. Inserir no auth.users (com senha encriptada e email já confirmado)
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

    -- 2. Inserir identidade auth
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

    -- 3. Inserir perfil profissional da Priscila
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

    -- 4. Perguntas da Avaliação Inicial Padrão
    INSERT INTO public.assessment_questions (professional_id, question_text, question_type, order_index)
    VALUES
        (v_user_id, 'Qual a queixa principal ou motivo relatado pelos pais/escola?', 'long_text', 1),
        (v_user_id, 'Histórico do desenvolvimento da fala e coordenação motora:', 'long_text', 2),
        (v_user_id, 'Desempenho atual em Leitura e Escrita (troca letras, ritmo):', 'long_text', 3),
        (v_user_id, 'Desempenho atual em Raciocínio Lógico e Matemática:', 'long_text', 4),
        (v_user_id, 'Rotina diária de sono, telas e tarefas de casa:', 'long_text', 5);

    -- 5. Crianças de Demonstração
    INSERT INTO public.children (id, professional_id, full_name, birth_date, school, grade, main_complaint, status)
    VALUES
        (v_child1_id, v_user_id, 'João Silva', '2016-05-14', 'Colégio Santa Maria', '3º Ano Fundamental', 'Dificuldade na interpretação de textos longos e foco disperso nas tarefas.', 'in_progress'),
        (v_child2_id, v_user_id, 'Maria Eduarda Costa', '2017-09-20', 'Escola Municipal Monteiro Lobato', '2º Ano Fundamental', 'Insegurança na escrita de palavras complexas e resistência com deveres.', 'in_progress'),
        (v_child3_id, v_user_id, 'Pedro Henrique Souza', '2015-11-10', 'Colégio Dom Pedro', '4º Ano Fundamental', 'Dificuldades em operações matemáticas e cálculo mental.', 'initial_assessment');

    -- 6. Responsáveis
    INSERT INTO public.guardians (id, professional_id, full_name, cpf, phone, whatsapp, email, city)
    VALUES
        (v_guardian1_id, v_user_id, 'Ana Paula Silva', '123.456.789-00', '(11) 98888-1111', '(11) 98888-1111', 'anapaula.silva@email.com', 'São Paulo'),
        (v_guardian2_id, v_user_id, 'Carlos Eduardo Costa', '234.567.890-11', '(11) 97777-2222', '(11) 97777-2222', 'carlos.costa@email.com', 'São Paulo');

    -- 7. Vínculos Responsável -> Criança
    INSERT INTO public.guardian_children (guardian_id, child_id, relationship, is_primary)
    VALUES
        (v_guardian1_id, v_child1_id, 'Mãe', true),
        (v_guardian2_id, v_child2_id, 'Pai', true);

    -- 8. Plano de Cuidado do João (1x semana, 60min, R$ 80)
    INSERT INTO public.care_plans (professional_id, child_id, start_date, frequency, session_time, duration_minutes, price_per_session, payment_type, payment_due_day)
    VALUES
        (v_user_id, v_child1_id, CURRENT_DATE - 30, 1, '14:00', 60, 80.00, 'mensal', 5);

    -- 9. Agendamentos de Hoje e da Semana
    INSERT INTO public.appointments (id, professional_id, child_id, start_time, end_time, type, status, notes)
    VALUES
        (v_appt1_id, v_user_id, v_child1_id, (CURRENT_DATE + TIME '14:00:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '15:00:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled', 'Trabalhar decodificação e leitura'),
        (v_appt2_id, v_user_id, v_child2_id, (CURRENT_DATE + TIME '15:30:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '16:30:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled', 'Atividades lúdicas de consciência fonológica'),
        (v_appt3_id, v_user_id, v_child3_id, (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00:00')::TIMESTAMPTZ, (CURRENT_DATE + INTERVAL '2 days' + TIME '11:00:00')::TIMESTAMPTZ, 'Avaliação Inicial', 'confirmed', 'Primeira entrevista com os pais');

    -- 10. Sessões Realizadas no Histórico do João Silva
    INSERT INTO public.sessions (id, professional_id, child_id, session_number, date, start_time, end_time, objective, what_was_worked, activities, test_results, professional_notes, next_objectives, status)
    VALUES
        (v_session1_id, v_user_id, v_child1_id, 1, CURRENT_DATE - 14, '14:00', '15:00', 'Avaliar consciência fonológica e nível de decodificação', 'Áreas: Leitura, Atenção & Foco', 'Jogo das rimas sonoras, leitura compartilhada de gibi infantil e caça-palavras.', 'Escore positivo em consciência fonológica; lentidão observada em dígrafos (ch, lh, nh).', 'João demonstrou excelente disposição e empatia com as dinâmicas.', 'Trabalhar textos curtos com perguntas de interpretação direta.', 'completed'),
        (v_session2_id, v_user_id, v_child1_id, 2, CURRENT_DATE - 7, '14:00', '15:00', 'Desenvolver estratégias de interpretação de texto e segmentação', 'Áreas: Leitura, Escrita, Memória', 'Leitura guiada, mapa mental da história e jogo de memória de palavras.', 'Avanço na identificação dos personagens e ordem dos acontecimentos.', 'Maior autonomia na leitura em voz alta.', 'Iniciar atividades com sílabas complexas.', 'completed');

    -- 11. Avaliação Inicial do João
    INSERT INTO public.initial_assessments (id, professional_id, child_id, date, referral_source, school_name, teacher_name, reason, notes, status)
    VALUES
        (v_assess_id, v_user_id, v_child1_id, CURRENT_DATE - 30, 'Professora Carla (Colégio Santa Maria)', 'Colégio Santa Maria', 'Carla Mendes', 'Dificuldades de atenção e desânimo na realização das tarefas de leitura.', 'Família muito participativa e atenta. A criança não apresenta queixas sensoriais ou motoras.', 'completed');

    -- 12. Financeiro do Mês
    INSERT INTO public.financial_records (professional_id, child_id, month, year, amount, status, payment_date, notes)
    VALUES
        (v_user_id, v_child1_id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 320.00, 'paid', CURRENT_DATE - 5, 'Mensalidade 4 sessões (Pago via Pix)'),
        (v_user_id, v_child2_id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 320.00, 'pending', NULL, 'Mensalidade prevista (Vencimento dia 10)');

END $$;
