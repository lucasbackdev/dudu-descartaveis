
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for RLS checks
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_name TEXT NOT NULL,
  client TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create delivery_items table
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND approved = true
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee'),
    COALESCE((NEW.raw_user_meta_data->>'approved')::boolean, false)
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own deliveries" ON public.deliveries
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Employees can update own deliveries" ON public.deliveries
  FOR UPDATE USING (auth.uid() = employee_id);

CREATE POLICY "Admins can do everything with deliveries" ON public.deliveries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for delivery_items
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery items for their deliveries" ON public.delivery_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d 
      WHERE d.id = delivery_id AND (d.employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage delivery items" ON public.delivery_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
