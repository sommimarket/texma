/* ============================================================
   TEXMA · Worker de licencias (Cloudflare Workers + KV)
   ------------------------------------------------------------
   Cuentas del panel
     GET  /admin/estado                     ¿hay que crear la primera cuenta?
     POST /admin/setup    {user,pass,nombre}  solo si no hay ninguna cuenta
     POST /admin/login    {user,pass}       → { token }
     GET  /admin/usuarios                   (solo dueña/o)
     POST /admin/usuarios/nuevo  {user,pass,nombre}   invitar (solo dueña/o)
     POST /admin/usuarios/clave  {user,pass}          cambiar contraseña
     POST /admin/usuarios/borrar {user}               (solo dueña/o)
   Ventas
     POST /admin/nueva    {nombre,contacto,precio}  → { code, link }
     GET  /admin/lista
     POST /admin/reset    {code}    libera el dispositivo
     POST /admin/revocar  {code}
   Público
     POST /activate       {code,device}  → { token }
     GET  /d/:token       descarga de un solo uso
   Secretos (wrangler secret put)
     LIC_PRIV   JWK privada de firma de licencias (server/keygen.mjs)
   Binding KV: LIC
   Las cuentas del panel se crean desde el panel, no hay claves en el código.
============================================================ */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json', ...CORS },
});

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(
  atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)),
  c => c.charCodeAt(0)
);

/* ---------- contraseñas ---------- */
async function derive(pass, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  /* 100.000 es el máximo que soporta Workers; pedir más tira NotSupportedError */
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, k, 256
  );
  return b64u(bits);
}
async function hashPass(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64u(salt), hash: await derive(pass, salt) };
}
async function checkPass(pass, u) {
  const h = await derive(pass, unb64u(u.salt));
  if (h.length !== u.hash.length) return false;
  let d = 0;
  for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ u.hash.charCodeAt(i);
  return d === 0;
}

/* ---------- sesiones ---------- */
async function sessKey(env) {
  let s = await env.LIC.get('sys:secret');
  if (!s) {
    s = b64u(crypto.getRandomValues(new Uint8Array(32)));
    await env.LIC.put('sys:secret', s);
  }
  return crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function makeSession(env, u) {
  const p = b64u(enc.encode(JSON.stringify({
    u: u.user, n: u.nombre || u.user, r: u.role, exp: Date.now() + 30 * 864e5,
  })));
  const sig = b64u(await crypto.subtle.sign('HMAC', await sessKey(env), enc.encode(p)));
  return p + '.' + sig;
}
async function session(env, req) {
  const raw = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!raw) return null;
  const [p, sig] = raw.split('.');
  if (!p || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await sessKey(env), unb64u(sig), enc.encode(p));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(unb64u(p)));
    if (Date.now() > d.exp) return null;
    const raw2 = await env.LIC.get('user:' + d.u);
    if (!raw2) return null;                       // cuenta borrada → sesión muerta
    return { ...d, role: JSON.parse(raw2).role };
  } catch (e) { return null; }
}

/* ---------- licencias ---------- */
async function signToken(env, payload) {
  /* .replace(): al cargar el secreto desde un archivo se le puede colar un BOM */
  const jwk = JSON.parse(String(env.LIC_PRIV).replace(/^﻿/, '').trim());
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(body));
  return body + '.' + b64u(sig);
}
/* código legible tipo TXM4-9K2P-7QW1 (sin letras confundibles) */
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const g = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => A[b % A.length]).join('');
  return `${g()}-${g()}-${g()}`;
}

async function contarUsuarios(env) {
  const ls = await env.LIC.list({ prefix: 'user:' });
  return ls.keys.length;
}
const limpioUser = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    /* ================= público ================= */

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

    /* ================= cuentas ================= */

    if (p === '/admin/estado') {
      return json({ setup: (await contarUsuarios(env)) === 0 });
    }

    if (p === '/admin/setup' && req.method === 'POST') {
      if ((await contarUsuarios(env)) > 0) return json({ error: 'Ya hay una cuenta creada' }, 409);
      const b = await req.json().catch(() => ({}));
      const user = limpioUser(b.user);
      if (user.length < 3) return json({ error: 'El usuario necesita 3 letras o más' }, 400);
      if (String(b.pass || '').length < 8) return json({ error: 'La contraseña necesita 8 caracteres o más' }, 400);
      const { salt, hash } = await hashPass(b.pass);
      const u = { user, nombre: (b.nombre || '').trim() || user, role: 'owner', salt, hash, createdAt: Date.now() };
      await env.LIC.put('user:' + user, JSON.stringify(u));
      return json({ token: await makeSession(env, u), yo: { user: u.user, nombre: u.nombre, role: u.role } });
    }

    if (p === '/admin/login' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const user = limpioUser(b.user);
      const raw = await env.LIC.get('user:' + user);
      if (!raw) { await hashPass('x'); return json({ error: 'Usuario o contraseña incorrectos' }, 401); }
      const u = JSON.parse(raw);
      if (!await checkPass(String(b.pass || ''), u)) return json({ error: 'Usuario o contraseña incorrectos' }, 401);
      u.lastLogin = Date.now();
      await env.LIC.put('user:' + user, JSON.stringify(u));
      return json({ token: await makeSession(env, u), yo: { user: u.user, nombre: u.nombre, role: u.role } });
    }

    /* de acá para abajo hace falta sesión */
    if (p.startsWith('/admin/')) {
      const yo = await session(env, req);
      if (!yo) return json({ error: 'Sesión vencida — volvé a entrar' }, 401);
      const dueño = yo.role === 'owner';

      if (p === '/admin/usuarios' && req.method === 'GET') {
        if (!dueño) return json({ error: 'Solo la dueña o el dueño ve las cuentas' }, 403);
        const ls = await env.LIC.list({ prefix: 'user:' });
        const out = [];
        for (const k of ls.keys) {
          const u = JSON.parse(await env.LIC.get(k.name));
          out.push({ user: u.user, nombre: u.nombre, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin || 0 });
        }
        out.sort((a, b) => a.createdAt - b.createdAt);
        return json({ usuarios: out });
      }

      if (p === '/admin/usuarios/nuevo' && req.method === 'POST') {
        if (!dueño) return json({ error: 'Solo la dueña o el dueño invita' }, 403);
        const b = await req.json().catch(() => ({}));
        const user = limpioUser(b.user);
        if (user.length < 3) return json({ error: 'El usuario necesita 3 letras o más' }, 400);
        if (String(b.pass || '').length < 8) return json({ error: 'La contraseña necesita 8 caracteres o más' }, 400);
        if (await env.LIC.get('user:' + user)) return json({ error: 'Ese usuario ya existe' }, 409);
        const { salt, hash } = await hashPass(b.pass);
        await env.LIC.put('user:' + user, JSON.stringify({
          user, nombre: (b.nombre || '').trim() || user, role: 'admin',
          salt, hash, createdAt: Date.now(), createdBy: yo.u,
        }));
        return json({ ok: true, user });
      }

      if (p === '/admin/usuarios/clave' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        const user = limpioUser(b.user) || yo.u;
        if (user !== yo.u && !dueño) return json({ error: 'Solo podés cambiar tu propia contraseña' }, 403);
        if (String(b.pass || '').length < 8) return json({ error: 'La contraseña necesita 8 caracteres o más' }, 400);
        const raw = await env.LIC.get('user:' + user);
        if (!raw) return json({ error: 'No existe esa cuenta' }, 404);
        const u = JSON.parse(raw);
        const { salt, hash } = await hashPass(b.pass);
        await env.LIC.put('user:' + user, JSON.stringify({ ...u, salt, hash }));
        return json({ ok: true });
      }

      if (p === '/admin/usuarios/borrar' && req.method === 'POST') {
        if (!dueño) return json({ error: 'Solo la dueña o el dueño borra cuentas' }, 403);
        const { user } = await req.json().catch(() => ({}));
        const u = limpioUser(user);
        if (u === yo.u) return json({ error: 'No podés borrar tu propia cuenta' }, 400);
        const raw = await env.LIC.get('user:' + u);
        if (!raw) return json({ error: 'No existe' }, 404);
        if (JSON.parse(raw).role === 'owner') return json({ error: 'No se puede borrar al dueño' }, 400);
        await env.LIC.delete('user:' + u);
        return json({ ok: true });
      }

      /* ---------- ventas ---------- */

      if (p === '/admin/nueva' && req.method === 'POST') {
        const { nombre, contacto, precio } = await req.json().catch(() => ({}));
        const code = newCode();
        await env.LIC.put('lic:' + code, JSON.stringify({
          code, nombre: nombre || '', contacto: contacto || '',
          precio: +precio || 30000, createdAt: Date.now(), vendedor: yo.n || yo.u,
          device: '', activatedAt: 0, opens: 0, revoked: false,
        }));
        const t = crypto.randomUUID().replace(/-/g, '');
        await env.LIC.put('dl:' + t, JSON.stringify({ code, exp: Date.now() + 7 * 864e5 }),
          { expirationTtl: 7 * 86400 });
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
          yo: { user: yo.u, nombre: yo.n, role: yo.role },
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
