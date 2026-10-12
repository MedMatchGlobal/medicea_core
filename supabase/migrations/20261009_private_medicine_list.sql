-- Private fictional-data beta. Apply after the private vault migration.
begin;
create table public.vault_beta_medicines (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  strength text not null default '' check (char_length(strength) <= 80),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index vault_beta_medicines_owner_date on public.vault_beta_medicines(user_id, created_at desc);
alter table public.vault_beta_medicines enable row level security;
alter table public.vault_beta_medicines force row level security;
revoke all on public.vault_beta_medicines from public, anon, authenticated;
grant select, insert, delete on public.vault_beta_medicines to authenticated;
create policy vault_beta_medicines_owner on public.vault_beta_medicines for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy vault_beta_medicines_mfa on public.vault_beta_medicines as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2')
  with check ((select auth.jwt()->>'aal') = 'aal2');
commit;
