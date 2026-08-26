-- =========================================================================
-- EVOLUIA — SUPORTE A DESPESAS E CUSTOS FIXOS / VARIÁVEIS NO FINANCEIRO
-- =========================================================================

-- 1. Permite despesas sem vínculo obrigatório com uma criança
ALTER TABLE public.financial_records ALTER COLUMN child_id DROP NOT NULL;

-- 2. Adiciona colunas para identificar se é Receita ou Despesa, Categoria e Descrição
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'income';
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'mensalidade';
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Atualiza políticas RLS
DROP POLICY IF EXISTS "Permitir tudo em financial_records para autenticados" ON public.financial_records;
CREATE POLICY "Permitir tudo em financial_records para autenticados" 
ON public.financial_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
