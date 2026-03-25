-- Allow employees to insert deliveries (they create their own)
CREATE POLICY "Employees can insert own deliveries"
ON public.deliveries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

-- Allow employees to insert delivery items for their own deliveries
CREATE POLICY "Employees can insert delivery items"
ON public.delivery_items FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM deliveries d
  WHERE d.id = delivery_items.delivery_id AND d.employee_id = auth.uid()
));