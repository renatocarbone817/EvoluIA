-- =========================================================================
-- EVOLUIA — PERMITIR ACESSO PÚBLICO À PÁGINA DO RECIBO / COMPROVANTE
-- =========================================================================

-- Permite que pais e responsáveis vejam o comprovante online pelo link sem precisar de login
CREATE POLICY "Permitir leitura anonima de recibos" 
ON public.financial_records FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir leitura anonima de criancas no recibo" 
ON public.children FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir leitura anonima de profissionais no recibo" 
ON public.professionals FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir leitura anonima de responsaveis no recibo" 
ON public.guardians FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir leitura anonima de vinculos no recibo" 
ON public.guardian_children FOR SELECT TO anon USING (true);
