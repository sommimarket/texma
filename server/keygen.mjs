/* Genera el par de claves de firma de licencias.
   Uso:  node server/keygen.mjs
   - La PÚBLICA se pega en TEXMA.html (LIC_PUB).
   - La PRIVADA se carga como secreto del Worker (LIC_PRIV). NUNCA se publica. */
import { webcrypto as crypto } from 'node:crypto';

const kp = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
);
const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);

console.log('\n=== PEGAR EN TEXMA.html (LIC_PUB) ===');
console.log(`const LIC_PUB={kty:'EC',crv:'P-256',x:'${pub.x}',y:'${pub.y}'};`);
console.log('\n=== SECRETO DEL WORKER (LIC_PRIV) — no compartir ===');
console.log(JSON.stringify({ kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d }));
console.log('\nGuardalo con:  npx wrangler secret put LIC_PRIV\n');
