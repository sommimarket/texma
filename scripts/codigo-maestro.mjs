/* ============================================================
   TEXMA · código maestro (la puerta de atrás nuestra)
   ------------------------------------------------------------
   Genera el SHA-256 de la frase que le pases, para pegar en
   `const LIC_MASTER_SHA` de TEXMA.html.

     node scripts/codigo-maestro.mjs "MI FRASE NUEVA"

   Se guarda el HASH y no la frase para que el código no se lea de
   un vistazo abriendo el archivo. OJO: esto NO es seguridad de
   verdad — quien sepa programar puede sacar el muro igual. Es solo
   para que no salte a la vista.
============================================================ */
import { createHash } from 'node:crypto';

const frase = process.argv.slice(2).join(' ').trim().toUpperCase();
if (!frase) {
  console.error('Uso: node scripts/codigo-maestro.mjs "MI FRASE NUEVA"');
  process.exit(1);
}
const hash = createHash('sha256').update(frase, 'utf8').digest('hex');
console.log('');
console.log('  Código maestro : ' + frase);
console.log('  Pegá esto en TEXMA.html (y en index.html):');
console.log('');
console.log(`  const LIC_MASTER_SHA='${hash}';`);
console.log('');
console.log('  Acordate de sincronizar index.html: npm run build:web');
console.log('');
