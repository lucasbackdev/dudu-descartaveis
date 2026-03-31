create table if not exists public.app_access_control (
  id boolean primary key default true check (id = true),
  locked boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

insert into public.app_access_control (id, locked)
values (true, true)
on conflict (id) do update
set locked = excluded.locked,
    updated_at = now();

alter table public.app_access_control enable row level security;

grant select on public.app_access_control to authenticated;

drop policy if exists "Authenticated users can read app access control" on public.app_access_control;
create policy "Authenticated users can read app access control"
on public.app_access_control
for select
to authenticated
using (true);

drop policy if exists "Admins can manage app access control" on public.app_access_control;
create policy "Admins can manage app access control"
on public.app_access_control
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.is_app_unlocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select not locked from public.app_access_control where id = true), true)
$$;

drop policy if exists "Admins can do everything with deliveries" on public.deliveries;
create policy "Admins can do everything with deliveries"
on public.deliveries
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Employees can insert own deliveries" on public.deliveries;
create policy "Employees can insert own deliveries"
on public.deliveries
for insert
to authenticated
with check (
  auth.uid() = employee_id
  and public.is_app_unlocked()
);

drop policy if exists "Employees can update own deliveries" on public.deliveries;
create policy "Employees can update own deliveries"
on public.deliveries
for update
to authenticated
using (
  auth.uid() = employee_id
  and public.is_app_unlocked()
)
with check (
  auth.uid() = employee_id
  and public.is_app_unlocked()
);

drop policy if exists "Employees can view own deliveries" on public.deliveries;
create policy "Employees can view own deliveries"
on public.deliveries
for select
to authenticated
using (
  auth.uid() = employee_id
  and public.is_app_unlocked()
);

drop policy if exists "Admins can manage delivery items" on public.delivery_items;
create policy "Admins can manage delivery items"
on public.delivery_items
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Employees can insert delivery items" on public.delivery_items;
create policy "Employees can insert delivery items"
on public.delivery_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.deliveries d
    where d.id = delivery_items.delivery_id
      and d.employee_id = auth.uid()
      and public.is_app_unlocked()
  )
);

drop policy if exists "Users can view delivery items for their deliveries" on public.delivery_items;
create policy "Users can view delivery items for their deliveries"
on public.delivery_items
for select
to authenticated
using (
  public.is_app_unlocked()
  and exists (
    select 1
    from public.deliveries d
    where d.id = delivery_items.delivery_id
      and (d.employee_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  )
);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Authenticated users can view products" on public.products;
create policy "Authenticated users can view products"
on public.products
for select
to authenticated
using (public.is_app_unlocked());

drop policy if exists "Admins can manage settings" on public.admin_settings;
create policy "Admins can manage settings"
on public.admin_settings
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  and public.is_app_unlocked()
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  and public.is_app_unlocked()
)
with check (
  auth.uid() = id
  and public.is_app_unlocked()
);

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles"
on public.user_roles
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
)
with check (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and public.is_app_unlocked()
);

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_app_unlocked()
);