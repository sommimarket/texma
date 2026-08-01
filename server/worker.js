/* ============================================================
   TEXMA · Worker de licencias (Cloudflare Workers + KV)
   ------------------------------------------------------------
   Endpoints
     POST /activate            { code, device }  → { token }        público
     GET  /d/:token            descarga de un solo uso              público
     POST /admin/nueva         { nombre, contacto, precio }         admin
     POST /admin/reset         { code }   libera el dispositivo     admin
     POST /admin/revocar       { code }                             admin
     GET  /admin/lista                                              admin
   Secretos (wrangler secret put)
     LIC_PRIV    JWK privada de firma (server/keygen.mjs)
     ADMIN_KEYS  JSON con una clave por persona, ej:
                 {"lucas":"clave-larga-1","melu":"clave-larga-2"}
     ADMIN_KEY   (opcional, compatibilidad: una sola clave)
   Binding KV:  LIC
   No hay usuario: la clave ES el usuario. Cada venta queda firmada con
   el nombre de quien la generó.
============================================================ */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-admin-key',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json', ...CORS },
});

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function signToken(env, payload) {
  const key = await crypto.subtle.importKey(
    'jwk', JSON.parse(env.LIC_PRIV), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const body = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body)
  );
  return body + '.' + b64u(sig);
}

/* código legible tipo TXM4-9K2P-7QW1 (sin letras confundibles) */
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const g = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => A[b % A.length]).join('');
  return `${g()}-${g()}-${g()}`;
}
/* comparación en tiempo constante para no filtrar la clave por timing */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* devuelve el nombre del dueño/vendedor si la clave es válida, o null */
function whoIs(req, env) {
  const k = req.headers.get('x-admin-key') || '';
  if (!k) return null;
  let map = {};
  try { map = JSON.parse(env.ADMIN_KEYS || '{}'); } catch (e) { map = {}; }
  if (env.ADMIN_KEY && !map.dueño) map['dueño'] = env.ADMIN_KEY;
  for (const [nombre, clave] of Object.entries(map)) if (same(k, clave)) return nombre;
  return null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    /* ---------- activación (la hace la app) ---------- */
    if (p === '/activate' && req.method === 'POST') {
      const { code, device } = await req.json().catch(() => ({}));
      if (!code || !device) return json({ error: 'Faltan datos' }, 400);
      const raw = await env.LIC.get('lic:' + code);
      if (!raw) return json({ error: 'Código inexistente' }, 404);
      const lic = JSON.parse(raw);
      if (lic.revoked) return json({ error: 'Licencia dada de baja' }, 403);
      if (lic.device && lic.device !== device)
        return json({ error: 'Ese código ya se usó en otro celular' }, 409);

      lic.device = device;
      lic.activatedAt = lic.activatedAt || Date.now();
      lic.opens = (lic.opens || 0) + 1;
      lic.lastSeen = Date.now();
      await env.LIC.put('lic:' + code, JSON.stringify(lic));

      const token = await signToken(env, {
        id: code, device, name: lic.nombre || '', ts: Date.now(), v: 1,
      });
      return json({ token });
    }

    /* ---------- link de descarga de un solo uso ---------- */
    if (p.startsWith('/d/') && req.method === 'GET') {
      const t = p.slice(3);
      const raw = await env.LIC.get('dl:' + t);
      if (!raw) return new Response('Este link ya se usó o venció.', { status: 410 });
      const d = JSON.parse(raw);
      if (Date.now() > d.exp) {
        await env.LIC.delete('dl:' + t);
        return new Response('Link vencido. Escribinos y te mandamos otro.', { status: 410 });
      }
      await env.LIC.delete('dl:' + t);          // se quema al primer uso
      return Response.redirect(env.APP_URL + '?k=' + d.code, 302);
    }

    /* ---------- panel de dueño ---------- */
    if (p.startsWith('/admin/')) {
      const yo = whoIs(req, env);
      if (!yo) return json({ error: 'Clave incorrecta' }, 401);

      if (p === '/admin/nueva' && req.method === 'POST') {
        const { nombre, contacto, precio } = await req.json().catch(() => ({}));
        const code = newCode();
        const lic = {
          code, nombre: nombre || '', contacto: contacto || '',
          precio: +precio || 30000, createdAt: Date.now(), vendedor: yo,
          device: '', activatedAt: 0, opens: 0, revoked: false,
        };
        await env.LIC.put('lic:' + code, JSON.stringify(lic));
        const t = crypto.randomUUID().replace(/-/g, '');
        await env.LIC.put('dl:' + t, JSON.stringify({
          code, exp: Date.now() + 7 * 864e5,
        }), { expirationTtl: 7 * 86400 });
        return json({ code, link: url.origin + '/d/' + t });
      }

      if (p === '/admin/lista') {
        const ls = await env.LIC.list({ prefix: 'lic:' });
        const out = [];
        for (const k of ls.keys) out.push(JSON.parse(await env.LIC.get(k.name)));
        out.sort((a, b) => b.createdAt - a.createdAt);
        const porVendedor = {};
        out.forEach(l => {
          const v = l.vendedor || '—';
          const x = porVendedor[v] = porVendedor[v] || { vendidas: 0, activadas: 0, facturado: 0 };
          x.vendidas++;
          if (l.device) { x.activadas++; x.facturado += +l.precio || 0; }
        });
        return json({
          yo,
          total: out.length,
          activadas: out.filter(l => l.device).length,
          facturado: out.filter(l => l.device).reduce((s, l) => s + (+l.precio || 0), 0),
          porVendedor,
          licencias: out,
        });
      }

      if ((p === '/admin/reset' || p === '/admin/revocar') && req.method === 'POST') {
        const { code } = await req.json().catch(() => ({}));
        const raw = await env.LIC.get('lic:' + code);
        if (!raw) return json({ error: 'No existe' }, 404);
        const lic = JSON.parse(raw);
        if (p === '/admin/reset') { lic.device = ''; lic.activatedAt = 0; }
        else lic.revoked = !lic.revoked;
        await env.LIC.put('lic:' + code, JSON.stringify(lic));
        return json({ ok: true, lic });
      }
    }

    return json({ error: 'No encontrado' }, 404);
  },
};
