-- =========================================================================
-- EVOLUIA — LIBERAR LEITURA DE AGENDAMENTOS PARA O FEED DO GOOGLE CALENDAR
-- =========================================================================

DROP POLICY IF EXISTS "Permitir leitura de appointments para calendar feed" ON public.appointments;

CREATE POLICY "Permitir leitura de appointments para calendar feed" 
ON public.appointments FOR SELECT TO anon USING (true);
