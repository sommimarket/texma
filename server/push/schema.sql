-- ============================================================
-- TEXMA · avisos en segundo plano (Web Push)
-- Pegar tal cual en Supabase → SQL Editor → Run
-- ============================================================

-- Un renglón por celular que instaló TEXMA.
create table if not exists texma_devices (
  device      text primary key,             -- id anónimo que genera la app
  endpoint    text not null unique,         -- endpoint del push del navegador
  p256dh      text not null,
  auth        text not null,
  tz          text default 'America/Argentina/Buenos_Aires',
  sound       text default 'texma',
  ua          text,
  created_at  timestamptz default now(),
  seen_at     timestamptz default now()
);

-- Los avisos que ese celular quiere recibir (los manda la app ya calculados).
create table if not exists texma_alerts (
  id          bigserial primary key,
  device      text not null references texma_devices(device) on delete cascade,
  key         text not null,                -- clave única del aviso (m|fecha|id|hora, etc.)
  at          timestamptz not null,         -- cuándo hay que mandarlo
  title       text not null,
  body        text not null,
  sent_at     timestamptz,
  unique (device, key)
);

create index if not exists texma_alerts_pend on texma_alerts (at) where sent_at is null;

-- Nadie entra directo: solo la Edge Function (service_role).
alter table texma_devices enable row level security;
alter table texma_alerts  enable row level security;

-- Limpieza: avisos viejos ya mandados.
create or replace function texma_limpiar() returns void language sql as $$
  delete from texma_alerts where sent_at is not null and at < now() - interval '7 days';
$$;
