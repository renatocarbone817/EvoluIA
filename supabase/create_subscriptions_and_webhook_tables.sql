-- ==========================================================
-- EVOLUIA — SISTEMA DE ASSINATURAS & WEBHOOK HOTMART
-- ==========================================================

-- 1. TABELA DE ASSINATURAS (subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_user_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'individual',
  max_professionals INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'trial', 'pending', 'cancelled', 'expired'
  hotmart_product_id TEXT,
  hotmart_offer_id TEXT,
  hotmart_subscription_id TEXT,
  hotmart_transaction_id TEXT,
  customer_email TEXT,
  subscription_started_at TIMESTAMPTZ DEFAULT now(),
  subscription_expires_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_master_subscription UNIQUE (master_user_id)
);

-- 2. TABELA DE EVENTOS DE WEBHOOK (subscription_events) - Auditoria & Idempotência
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'hotmart',
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subscriptions_master_user_id ON public.subscriptions(master_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON public.subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_hotmart_subscription_id ON public.subscriptions(hotmart_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_id ON public.subscription_events(event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- O usuário MASTER pode apenas visualizar a sua própria assinatura
DROP POLICY IF EXISTS "Master pode visualizar sua assinatura" ON public.subscriptions;
CREATE POLICY "Master pode visualizar sua assinatura"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = master_user_id);

-- Somente via Service Role / Webhook pode inserir ou atualizar a assinatura diretamente
-- Ninguém pelo frontend autenticado comum pode dar UPDATE/INSERT no plano
DROP POLICY IF EXISTS "Apenas service_role pode modificar assinaturas" ON public.subscriptions;
CREATE POLICY "Apenas service_role pode modificar assinaturas"
ON public.subscriptions
FOR ALL
USING (auth.role() = 'service_role');

-- Eventos de webhook são acessíveis apenas pelo service_role
DROP POLICY IF EXISTS "Apenas service_role pode gerenciar eventos de webhook" ON public.subscription_events;
CREATE POLICY "Apenas service_role pode gerenciar eventos de webhook"
ON public.subscription_events
FOR ALL
USING (auth.role() = 'service_role');

-- 5. TRIGGER DE UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. CRIAR ASSINATURA INICIAL PARA PROFISSIONAIS MASTER JÁ EXISTENTES
INSERT INTO public.subscriptions (master_user_id, plan_id, max_professionals, status, customer_email)
SELECT 
  id, 
  'individual', 
  1, 
  'active', 
  email 
FROM public.professionals
WHERE (role = 'master' OR master_id IS NULL)
ON CONFLICT (master_user_id) DO NOTHING;
