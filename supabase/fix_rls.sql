-- Permitir criação do perfil profissional no cadastro
DROP POLICY IF EXISTS "Profissionais gerenciam seu proprio perfil" ON public.professionals;
DROP POLICY IF EXISTS "Permitir insercao de perfil" ON public.professionals;

CREATE POLICY "Permitir insercao de perfil" 
ON public.professionals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Profissionais gerenciam seu proprio perfil" 
ON public.professionals 
FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);
