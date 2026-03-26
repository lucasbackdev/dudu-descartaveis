
-- Add sale_price to delivery_items so employees can set custom prices
ALTER TABLE public.delivery_items ADD COLUMN sale_price numeric NOT NULL DEFAULT 0;

-- Create admin_settings table for notification preferences
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stock_alert_threshold integer NOT NULL DEFAULT 30,
  notify_on_empty boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
