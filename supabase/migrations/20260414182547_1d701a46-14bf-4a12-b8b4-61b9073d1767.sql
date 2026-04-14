
-- Create clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  razao_social text NOT NULL DEFAULT '',
  cnpj_cpf text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated
USING (is_app_unlocked());

CREATE POLICY "Employees can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (is_app_unlocked());

CREATE POLICY "Admins can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_app_unlocked())
WITH CHECK (has_role(auth.uid(), 'admin') AND is_app_unlocked());

CREATE POLICY "Admins can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_app_unlocked());

-- Make address optional in deliveries
ALTER TABLE public.deliveries ALTER COLUMN address SET DEFAULT '';

-- Add paid field for invoice tracking (baixa de notas)
ALTER TABLE public.deliveries ADD COLUMN paid boolean NOT NULL DEFAULT false;

-- Index for client name search
CREATE INDEX idx_clients_name ON public.clients USING btree (name);
