-- ExpenseAI access policies. This migration replaces existing policies on the
-- app tables so no older permissive policy can broaden access to user records.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'categories', 'expenses', 'budgets')
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "categories_select_authenticated"
  on public.categories for select to authenticated
  using ((select auth.uid()) is not null);

create policy "expenses_select_own"
  on public.expenses for select to authenticated
  using (user_id = (select auth.uid()));

create policy "expenses_insert_own"
  on public.expenses for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "expenses_update_own"
  on public.expenses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "expenses_delete_own"
  on public.expenses for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "budgets_select_own"
  on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));

create policy "budgets_insert_own"
  on public.budgets for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "budgets_update_own"
  on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "budgets_delete_own"
  on public.budgets for delete to authenticated
  using (user_id = (select auth.uid()));

-- Seed the shared dropdown options without duplicating names already present.
insert into public.categories (name)
select defaults.name
from (values
  ('Food'),
  ('Transport'),
  ('Shopping'),
  ('Bills'),
  ('Entertainment'),
  ('Health'),
  ('Education'),
  ('Other')
) as defaults(name)
where not exists (
  select 1
  from public.categories as category
  where lower(category.name) = lower(defaults.name)
);
