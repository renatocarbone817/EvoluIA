-- ==========================================================
-- EVOLUIA — SEED DATA / DADOS DE DEMONSTRAÇÃO (OPCIONAL)
-- ==========================================================
-- Nota: Execute este script APENAS após criar sua conta no sistema
-- e substitua 'SEU_USER_ID_AQUI' pelo ID do seu usuário autenticado.

DO $$
DECLARE
    v_prof_id UUID := 'SEU_USER_ID_AQUI'; -- Substitua pelo ID do auth.users
    v_child1_id UUID := uuid_generate_v4();
    v_child2_id UUID := uuid_generate_v4();
    v_child3_id UUID := uuid_generate_v4();
    v_guardian1_id UUID := uuid_generate_v4();
    v_guardian2_id UUID := uuid_generate_v4();
    v_appt1_id UUID := uuid_generate_v4();
    v_appt2_id UUID := uuid_generate_v4();
BEGIN
    -- 1. Perguntas da Avaliação Inicial Padrão
    INSERT INTO public.assessment_questions (professional_id, question_text, question_type, order_index)
    VALUES
        (v_prof_id, 'Qual a principal queixa ou dificuldade observada na escola e em casa?', 'long_text', 1),
        (v_prof_id, 'Como foi o desenvolvimento motor e da linguagem na primeira infância?', 'long_text', 2),
        (v_prof_id, 'A criança apresenta dificuldades específicas em leitura, escrita ou cálculo?', 'long_text', 3),
        (v_prof_id, 'Como é a rotina de estudos e realização das tarefas de casa?', 'long_text', 4),
        (v_prof_id, 'Como a criança lida com frustrações e limites?', 'long_text', 5);

    -- 2. Crianças
    INSERT INTO public.children (id, professional_id, full_name, birth_date, school, grade, main_complaint, status)
    VALUES
        (v_child1_id, v_prof_id, 'João Silva', '2016-04-12', 'Colégio Santa Maria', '3º Ano Fundamental', 'Dificuldade na interpretação de texto e atenção dispersa nas aulas.', 'in_progress'),
        (v_child2_id, v_prof_id, 'Maria Eduarda Costa', '2017-08-25', 'Escola Municipal Monteiro Lobato', '2º Ano Fundamental', 'Troca de letras na escrita e resistência para fazer deveres.', 'in_progress'),
        (v_child3_id, v_prof_id, 'Pedro Henrique Souza', '2015-11-03', 'Colégio Dom Pedro', '4º Ano Fundamental', 'Dificuldade em raciocínio lógico-matemático e cálculos básicos.', 'initial_assessment');

    -- 3. Responsáveis
    INSERT INTO public.guardians (id, professional_id, full_name, cpf, phone, whatsapp, email, city)
    VALUES
        (v_guardian1_id, v_prof_id, 'Ana Paula Silva', '123.456.789-00', '(11) 98888-1111', '(11) 98888-1111', 'anapaula@email.com', 'São Paulo'),
        (v_guardian2_id, v_prof_id, 'Carlos Eduardo Costa', '234.567.890-11', '(11) 97777-2222', '(11) 97777-2222', 'carlos@email.com', 'São Paulo');

    -- 4. Vínculos Responsável-Criança
    INSERT INTO public.guardian_children (guardian_id, child_id, relationship, is_primary)
    VALUES
        (v_guardian1_id, v_child1_id, 'Mãe', true),
        (v_guardian2_id, v_child2_id, 'Pai', true);

    -- 5. Agendamentos
    INSERT INTO public.appointments (id, professional_id, child_id, start_time, end_time, type, status)
    VALUES
        (v_appt1_id, v_prof_id, v_child1_id, (CURRENT_DATE + TIME '14:00:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '15:00:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled'),
        (v_appt2_id, v_prof_id, v_child2_id, (CURRENT_DATE + TIME '15:30:00')::TIMESTAMPTZ, (CURRENT_DATE + TIME '16:30:00')::TIMESTAMPTZ, 'Sessão Psicopedagógica', 'scheduled');

    -- 6. Sessão anterior (João Silva)
    INSERT INTO public.sessions (professional_id, child_id, session_number, date, start_time, end_time, objective, what_was_worked, activities, professional_notes, next_objectives, status)
    VALUES
        (v_prof_id, v_child1_id, 1, CURRENT_DATE - 7, '14:00', '15:00', 'Avaliar consciência fonológica e leitura de pseudopalavras', 'Leitura e Atenção', 'Jogo de rimas, leitura de fichas e história ilustrada.', 'João mostrou-se muito colaborativo, com leve insegurança inicial em sílabas complexas.', 'Aprofundar leitura de textos curtos com perguntas de interpretação.', 'completed');

    -- 7. Lançamento financeiro
    INSERT INTO public.financial_records (professional_id, child_id, month, year, amount, status, notes)
    VALUES
        (v_prof_id, v_child1_id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 320.00, 'paid', 'Ref. 4 sessões mensais');

END $$;
