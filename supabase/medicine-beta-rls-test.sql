-- Database RLS behaviour test, using simulated user claims (not real sessions).
-- Run the WHOLE file as a new SQL Editor query, including ROLLBACK.
-- Dummy metadata only: no file upload, no real document contents.
begin;
create temporary table vault_test_results(check_name text, result text) on commit drop;
grant select, insert on vault_test_results to authenticated, anon;

do $$
declare users uuid[]; doc uuid := gen_random_uuid();
begin
  select array_agg(id) into users from (select id from auth.users order by created_at limit 2) u;
  if coalesce(array_length(users,1),0) < 2 then
    raise exception 'Two accounts are required for this test.';
  end if;
  perform set_config('vault_test.owner',users[1]::text,true);
  perform set_config('vault_test.other',users[2]::text,true);
  perform set_config('vault_test.document',doc::text,true);
  insert into public.vault_beta_medicines(id,user_id,name)
  values(doc,users[1],'Fictional temporary security test');
end $$;

-- These statements must execute as authenticated, so admin RLS bypass cannot mask failures.
set local role authenticated;
do $$
declare owner_uid uuid := current_setting('vault_test.owner')::uuid;
  other_uid uuid := current_setting('vault_test.other')::uuid;
  doc uuid := current_setting('vault_test.document')::uuid;
  candidate uuid;
  affected integer;
  denied boolean;
begin
  if current_user <> 'authenticated' then raise exception 'Incorrect test role'; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',owner_uid,'role','authenticated','aal','aal2')::text,true);
  insert into vault_test_results select 'Owner with MFA can read own dummy record',
    case when count(*)=1 then 'PASS' else 'FAIL' end from public.vault_beta_medicines where id=doc;
  candidate := gen_random_uuid();
  insert into public.vault_beta_medicines(id,user_id,name)
    values(candidate,owner_uid,'Fictional insert test');
  insert into vault_test_results values('Owner with MFA can insert own record','PASS');
  delete from public.vault_beta_medicines where id=candidate;
  get diagnostics affected = row_count;
  insert into vault_test_results values('Owner with MFA can delete own record',case when affected=1 then 'PASS' else 'FAIL' end);

  perform set_config('request.jwt.claims',json_build_object('sub',other_uid,'role','authenticated','aal','aal2')::text,true);
  insert into vault_test_results select 'Other user with MFA cannot read owner record',
    case when count(*)=0 then 'PASS' else 'FAIL' end from public.vault_beta_medicines where id=doc;
  delete from public.vault_beta_medicines where id=doc;
  get diagnostics affected = row_count;
  insert into vault_test_results values('Other user with MFA cannot delete owner record',case when affected=0 then 'PASS' else 'FAIL' end);
  candidate := gen_random_uuid(); denied := false;
  begin
    insert into public.vault_beta_medicines(id,user_id,name)
      values(candidate,owner_uid,'Fictional forbidden insert');
  exception when insufficient_privilege then denied := true;
  end;
  insert into vault_test_results values('Other user cannot insert a record owned by the owner',case when denied then 'PASS' else 'FAIL' end);

  perform set_config('request.jwt.claims',json_build_object('sub',owner_uid,'role','authenticated','aal','aal1')::text,true);
  insert into vault_test_results select 'Owner without MFA cannot read own record',
    case when count(*)=0 then 'PASS' else 'FAIL' end from public.vault_beta_medicines where id=doc;
  delete from public.vault_beta_medicines where id=doc;
  get diagnostics affected = row_count;
  insert into vault_test_results values('Owner without MFA cannot delete own record',case when affected=0 then 'PASS' else 'FAIL' end);
  candidate := gen_random_uuid(); denied := false;
  begin
    insert into public.vault_beta_medicines(id,user_id,name)
      values(candidate,owner_uid,'Fictional forbidden insert');
  exception when insufficient_privilege then denied := true;
  end;
  insert into vault_test_results values('Owner without MFA cannot insert own record',case when denied then 'PASS' else 'FAIL' end);
end $$;

reset role;
set local role anon;
do $$
declare denied boolean := false;
begin
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  begin
    perform 1 from public.vault_beta_medicines where id=current_setting('vault_test.document')::uuid;
  exception when insufficient_privilege then denied := true;
  end;
  insert into vault_test_results values('Anonymous role cannot read medicine table',case when denied then 'PASS' else 'FAIL' end);
end $$;
reset role;
select check_name,result from vault_test_results order by check_name;
rollback;
