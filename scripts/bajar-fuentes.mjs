/* ============================================================
   Baja las tipografías de Google a fonts/ y arma fonts/fonts.css
   con rutas locales. Así TEXMA no depende de internet — ni la PWA
   la primera vez, ni el APK nunca.
   Correr una sola vez (o cuando cambien las fuentes):
       node scripts/bajar-fuentes.mjs
============================================================ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(raiz, 'fonts');
await mkdir(dir, { recursive: true });

const css = await readFile(join(dir, '_google.css'), 'utf8');

/* Solo latin y latin-ext: el castellano no necesita cirílico ni vietnamita */
const bloques = css.split('/*').filter(Boolean);
const utiles = bloques.filter(b => /^\s*(latin|latin-ext)\s*\*\//.test(b));

let salida = `/* Tipografías de TEXMA · locales, sin depender de internet.
   Generado por scripts/bajar-fuentes.mjs — no editar a mano. */\n\n`;
const bajados = new Map();

for (const b of utiles) {
  const cuerpo = '/*' + b;
  const url = cuerpo.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!url) continue;

  const fam = cuerpo.match(/font-family:\s*'([^']+)'/)?.[1] ?? 'f';
  const peso = cuerpo.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
  const ital = /font-style:\s*italic/.test(cuerpo) ? 'i' : '';
  const sub = cuerpo.match(/^\/\*\s*(latin-ext|latin)\s*\*\//)?.[1] ?? 'latin';
  const nombre = `${fam.toLowerCase().replace(/\s+/g, '-')}-${peso}${ital}-${sub}.woff2`;

  if (!bajados.has(url)) {
    const r = await fetch(url);
    if (!r.ok) { console.log(`✗ ${nombre}`); continue; }
    await writeFile(join(dir, nombre), Buffer.from(await r.arrayBuffer()));
    bajados.set(url, nombre);
    console.log(`✓ ${nombre}`);
  }
  salida += cuerpo.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(${bajados.get(url)})`).trim() + '\n\n';
}

await writeFile(join(dir, 'fonts.css'), salida);
console.log(`\n✓ fonts/fonts.css con ${bajados.size} archivos`);
console.log('  Acordate de sumarlos a PRECACHE en sw.js y a ARCHIVOS en scripts/build-web.mjs');
