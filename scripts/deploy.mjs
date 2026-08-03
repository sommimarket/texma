#!/usr/bin/env node
/* ============================================================
   deploy.mjs · publica una versión nueva en Supabase
   ------------------------------------------------------------
   Uso:
     node scripts/deploy.mjs <app> <version> [ruta-al-apk]
     node scripts/deploy.mjs texma 1.4.0
     node scripts/deploy.mjs texma 1.4.0 --debug        (usa el APK de debug)
     node scripts/deploy.mjs otraapp 2.0.0 C:/ruta/al/archivo.apk

   Qué hace:
     1. agarra el APK compilado (por defecto el de release de Capacitor),
     2. lo sube al bucket público `apks` del Storage (carpeta por app),
     3. actualiza la fila de la tabla `apps` (version + url_descarga).
   Con eso, todas las instalaciones ven el aviso de versión nueva.

   Credenciales: van en un archivo .env en la raíz del repo (NUNCA al git):
     SUPABASE_URL=https://xxxxxxxx.supabase.co
     SUPABASE_SERVICE_ROLE=eyJ...   (Project Settings → API → service_role)
   La service_role puede escribir saltándose el RLS: solo vive acá, en tu
   máquina. En las apps va únicamente la anon key de lectura.
============================================================ */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'apks';

const morir = (msg) => { console.error('✗ ' + msg); process.exit(1); };

/* ---------- .env casero (sin dependencias) ---------- */
function cargarEnv() {
  const ruta = resolve(RAIZ, '.env');
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/* ---------- argumentos ---------- */
const args = process.argv.slice(2).filter(a => a !== '--debug');
const usarDebug = process.argv.includes('--debug');
const [appId, version, rutaApk] = args;
if (!appId || !version) {
  console.log('Uso: node scripts/deploy.mjs <app> <version> [ruta-al-apk | --debug]');
  console.log('Ej.: node scripts/deploy.mjs texma 1.4.0');
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+$/.test(version)) morir(`«${version}» no parece una versión (esperaba x.y.z)`);

cargarEnv();
const URL_SB = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;
if (!URL_SB || !SERVICE) morir('faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE en el .env (ver cabecera de este script)');

/* ---------- el APK ---------- */
const candidatos = rutaApk ? [resolve(rutaApk)] : [
  ...(usarDebug ? [] : [resolve(RAIZ, 'android/app/build/outputs/apk/release/app-release.apk')]),
  resolve(RAIZ, 'android/app/build/outputs/apk/debug/app-debug.apk'),
];
const apk = candidatos.find(existsSync);
if (!apk) morir(`no encuentro el APK. Compilalo primero (npm run apk) o pasame la ruta.\nBusqué en:\n  ${candidatos.join('\n  ')}`);
if (apk.includes('debug') && !usarDebug && !rutaApk)
  morir('solo encontré el APK de DEBUG. Para publicar ese a propósito, agregá --debug.\nPara el de release: npm run apk');

const peso = statSync(apk).size;
if (peso < 1024 * 1024) morir(`el APK pesa ${(peso / 1024).toFixed(0)} KB — eso no es un APK sano`);

/* ---------- coherencia con el código (solo aviso, no frena) ---------- */
try {
  const html = readFileSync(resolve(RAIZ, 'TEXMA.html'), 'utf8');
  const m = html.match(/const\s+APP_VER\s*=\s*'([\d.]+)'/);
  if (appId === 'texma' && m && m[1] !== version)
    console.warn(`⚠ ojo: TEXMA.html dice APP_VER='${m[1]}' y estás publicando ${version}`);
} catch { /* otra app u otro repo: no aplica */ }

/* ---------- subir y publicar ---------- */
const sb = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
const destino = `${appId}/${appId.toUpperCase()}-${version}.apk`;

console.log(`→ ${appId} v${version}`);
console.log(`→ APK: ${apk} (${(peso / 1024 / 1024).toFixed(1)} MB)`);

/* la fila tiene que existir: este script actualiza, no da de alta apps */
const { data: fila, error: eSel } = await sb.from('apps').select('id,version').eq('id', appId).maybeSingle();
if (eSel) morir('no pude leer la tabla apps: ' + eSel.message);
if (!fila) morir(`no existe la app «${appId}» en la tabla apps — dala de alta primero (ver server/SUPABASE.md)`);
console.log(`→ versión publicada hasta ahora: ${fila.version || '(ninguna)'}`);

console.log(`→ subiendo a Storage: ${BUCKET}/${destino} …`);
const { error: eUp } = await sb.storage.from(BUCKET).upload(destino, readFileSync(apk), {
  contentType: 'application/vnd.android.package-archive',
  upsert: true,
});
if (eUp) morir(`falló la subida: ${eUp.message}\n(¿existe el bucket público «${BUCKET}»? Ver server/SUPABASE.md)`);

const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(destino);
const url = pub.publicUrl;

const { error: eUpd } = await sb.from('apps').update({ version, url_descarga: url }).eq('id', appId);
if (eUpd) morir('subí el APK pero no pude actualizar la tabla apps: ' + eUpd.message);

console.log('✓ publicado');
console.log(`  version:      ${version}`);
console.log(`  url_descarga: ${url}`);
console.log('Desde ahora todas las instalaciones van a ver el aviso de versión nueva.');
