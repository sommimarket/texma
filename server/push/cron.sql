-- ============================================================
-- TEXMA · el cron que dispara los avisos (Supabase → SQL Editor)
-- Corre cada minuto y le pega a la Edge Function /tick.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ⚠ Reemplazar TU-PROYECTO y TU-SERVICE-ROLE-KEY.
select cron.schedule(
  'texma-push-tick',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://TU-PROYECTO.supabase.co/functions/v1/texma-push/tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer TU-SERVICE-ROLE-KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Limpieza diaria de avisos viejos.
select cron.schedule('texma-limpiar', '17 4 * * *', $$ select texma_limpiar(); $$);

-- Para ver / borrar:
--   select * from cron.job;
--   select cron.unschedule('texma-push-tick');
