/* ============================================================
   TEXMA · arma la carpeta www/ que se mete adentro del APK.
   Los archivos web viven en la raíz (así GitHub Pages los publica
   sin tocar nada). Esto los copia a www/ para Capacitor.
   Correr:  npm run build:web
============================================================ */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(raiz, 'www');

/* lo que va adentro del APK */
const ARCHIVOS = [
  'index.html',
  'manifest.json',
  'favicon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-mask.png',
  'icon.svg',
  'maniqui.png',
  'onb1.jpg',
  'onb2.jpg',
  'onb3.jpg',
  'notif_texma.mp3',
  'gsap.min.js',
  'fonts',          // carpeta entera: fonts.css + los .woff2
];

/* sw.js NO va: adentro del APK el service worker no hace falta
   (los archivos ya son locales) y confunde a las actualizaciones. */

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });

const faltan = [];
for (const f of ARCHIVOS) {
  const src = join(raiz, f);
  if (!existsSync(src)) { faltan.push(f); continue; }
  await cp(src, join(www, f), { recursive: true });
}

/* adentro del APK no hay service worker: se saca el registro */
const html = await readFile(join(www, 'index.html'), 'utf8');
await writeFile(
  join(www, 'index.html'),
  html.replace(
    "if('serviceWorker' in navigator && location.protocol.startsWith('http')){",
    "if('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor?.isNativePlatform?.()){",
  ),
);

console.log(`✓ www/ armado con ${ARCHIVOS.length - faltan.length} archivos`);
if (faltan.length) {
  console.log(`⚠ faltan (no es fatal): ${faltan.join(', ')}`);
  if (faltan.includes('notif_texma.mp3')) {
    console.log('  → sin notif_texma.mp3 la app usa la campanita sintetizada.');
    console.log('    Para el sonido propio del APK, además hay que dejarlo en');
    console.log('    android/app/src/main/res/raw/notif_texma.mp3 (mismo nombre).');
  }
}
