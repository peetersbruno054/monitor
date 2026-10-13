-- Monitor IA · configurações (metas por IA e controle do alerta de falhas)
-- Rode uma vez no Supabase: SQL Editor → New query → cole este arquivo → Run.
-- O navegador nunca acessa esta tabela diretamente; só o servidor (chave secreta).

create table if not exists public.monitor_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.monitor_settings enable row level security;
revoke all on table public.monitor_settings from anon, authenticated;
grant all on table public.monitor_settings to service_role;

