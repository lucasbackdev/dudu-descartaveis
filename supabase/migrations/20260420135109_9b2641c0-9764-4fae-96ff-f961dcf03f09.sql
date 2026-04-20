
CREATE POLICY "Employees can delete own delivery items"
ON public.delivery_items
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.deliveries d
  WHERE d.id = delivery_items.delivery_id
    AND d.employee_id = auth.uid()
    AND public.is_app_unlocked()
));

CREATE POLICY "Employees can update own delivery items"
ON public.delivery_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.deliveries d
  WHERE d.id = delivery_items.delivery_id
    AND d.employee_id = auth.uid()
    AND public.is_app_unlocked()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.deliveries d
  WHERE d.id = delivery_items.delivery_id
    AND d.employee_id = auth.uid()
    AND public.is_app_unlocked()
));
