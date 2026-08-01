// ============================================================
// TEXMA · Edge Function de avisos (Supabase / Deno)
//
//   POST /texma-push/sync   ← la app manda su suscripción + su agenda
//   POST /texma-push/tick   ← el cron (cada minuto) dispara lo que venció
//
// Desplegar:  supabase functions deploy texma-push --no-verify-jwt
// Secretos:   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT,
//             SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (estos dos ya vienen)
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hola@texma.app',
  Deno.env.get('VAPID_PUBLIC')!,
  Deno.env.get('VAPID_PRIVATE')!,
);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

/* ---------- la app manda su suscripción y qué tiene que avisar ---------- */
async function sync(req: Request) {
  const { device, sub, tz, sound, avisos } = await req.json();
  if (!device || !sub?.endpoint || !sub?.keys) return json({ error: 'faltan datos' }, 400);

  await db.from('texma_devices').upsert({
    device,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    tz: tz ?? null,
    sound: sound ?? 'texma',
    ua: req.headers.get('user-agent'),
    seen_at: new Date().toISOString(),
  });

  // La app es la fuente de la verdad: se reemplaza todo lo futuro que no salió.
  await db.from('texma_alerts')
    .delete()
    .eq('device', device)
    .is('sent_at', null)
    .gt('at', new Date().toISOString());

  const filas = (avisos ?? [])
    .filter((a: any) => a?.key && a?.at && a?.title)
    .slice(0, 400)
    .map((a: any) => ({
      device,
      key: a.key,
      at: a.at,
      title: a.title,
      body: a.body ?? '',
    }));

  if (filas.length) {
    await db.from('texma_alerts').upsert(filas, { onConflict: 'device,key' });
  }
  return json({ ok: true, guardados: filas.length });
}

/* ---------- el cron dispara lo que ya venció ---------- */
async function tick() {
  const ahora = new Date().toISOString();
  const { data: pend } = await db
    .from('texma_alerts')
    .select('id, device, key, title, body, at')
    .is('sent_at', null)
    .lte('at', ahora)
    // si el celu estuvo apagado 6 h, no lo inundamos con avisos viejos
    .gte('at', new Date(Date.now() - 6 * 3600e3).toISOString())
    .limit(300);

  if (!pend?.length) return json({ ok: true, enviados: 0 });

  const devices = [...new Set(pend.map((p) => p.device))];
  const { data: subs } = await db
    .from('texma_devices')
    .select('device, endpoint, p256dh, auth')
    .in('device', devices);
  const mapa = new Map((subs ?? []).map((s) => [s.device, s]));

  let enviados = 0;
  const hechos: number[] = [];
  const muertos: string[] = [];

  for (const a of pend) {
    const s = mapa.get(a.device);
    if (!s) { hechos.push(a.id); continue; }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: a.title, body: a.body, tag: a.key, url: './' }),
        { TTL: 3600, urgency: 'high' },
      );
      enviados++;
      hechos.push(a.id);
    } catch (e: any) {
      // 404/410 = el navegador tiró la suscripción: se borra el celular
      if (e?.statusCode === 404 || e?.statusCode === 410) muertos.push(a.device);
      hechos.push(a.id);
    }
  }

  if (hechos.length) {
    await db.from('texma_alerts').update({ sent_at: ahora }).in('id', hechos);
  }
  if (muertos.length) {
    await db.from('texma_devices').delete().in('device', muertos);
  }
  return json({ ok: true, enviados });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const ruta = new URL(req.url).pathname.split('/').pop();
  try {
    if (ruta === 'sync') return await sync(req);
    if (ruta === 'tick') return await tick();
    return json({ error: 'ruta desconocida' }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
