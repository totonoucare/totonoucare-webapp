-- DBメタデータ確認SQL
-- データ変更はしません。

-- 1. RLS policy確認
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  p.polname as policy_name,
  case p.polcmd
    when 'r' then 'SELECT'
    when 'a' then 'INSERT'
    when 'w' then 'UPDATE'
    when 'd' then 'DELETE'
    when '*' then 'ALL'
  end as command,
  array(
    select r.rolname
    from pg_roles r
    where p.polroles is not null
      and r.oid = any(p.polroles)
  ) as roles,
  pg_get_expr(p.polqual, p.polrelid) as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname, p.polname;

-- 2. 制約確認
select
  n.nspname as schema_name,
  cls.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'u' then 'UNIQUE'
    when 'f' then 'FOREIGN KEY'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUSION'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace n on n.oid = cls.relnamespace
where n.nspname = 'public'
order by cls.relname, constraint_type, con.conname;

-- 3. index確認
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4. trigger確認
select
  event_object_schema as schema_name,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

-- 5. function確認
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  case p.provolatile
    when 'i' then 'immutable'
    when 's' then 'stable'
    when 'v' then 'volatile'
  end as volatility,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname;
