# Guía para publicar el servidor de licencias

Explicado desde cero, sin dar nada por sabido.

## Antes que nada: por qué el panel no funciona todavía

El panel (`panel.html`) es solo una pantalla. **No guarda nada.** Todos los datos
—las licencias, los códigos, tu usuario y contraseña— viven en un programita
chiquito que hay que subir a internet una sola vez. Ese programita se llama
**Worker** y lo hospeda Cloudflare gratis.

Cuando lo subas, Cloudflare te va a dar una dirección. **Esa dirección es "la URL
del Worker"**, y es la que va en el primer campo del panel.

Hoy en tu Cloudflare no hay ningún proyecto porque todavía no subiste nada. Está
todo bien, no rompiste nada. Y la dirección `https://texma-lic.Lucas.workers.dev`
que probaste es inventada: nadie te la dio, por eso no conecta.

**Cuesta $0.** El plan gratis de Cloudflare Workers da 100.000 pedidos por día.
Vos vas a usar unos pocos por venta.

---

## Lo que vas a necesitar

- La compu (esto no se hace desde el celular).
- Tu cuenta de Cloudflare, la de `maxing.agent@gmail.com`. Ya la tenés.
- Node.js instalado. Ya lo tenés (lo usamos para probar TEXMA).

---

## Paso 1 · Abrir la terminal en la carpeta del proyecto

En Windows: abrí la carpeta `D:\MIS NEGOCIOS\Texma-planner\server` en el
Explorador, hacé clic en la barra de direcciones, escribí `cmd` y Enter.

Se abre una ventana negra ya parada en esa carpeta. Todo lo que sigue se escribe ahí.

## Paso 2 · Conectar tu cuenta de Cloudflare

```
npx wrangler login
```

- La primera vez pregunta si querés instalar `wrangler`. Contestá **y** y Enter.
- Se abre el navegador con la pantalla de Cloudflare. Entrá con
  `maxing.agent@gmail.com` y tocá **Allow** / **Permitir**.
- Volvés a la terminal y dice algo como *"Successfully logged in"*.

## Paso 3 · Crear la base de datos (donde se guardan las licencias)

```
npx wrangler kv namespace create LIC
```

Te va a escupir algo así:

```
[[kv_namespaces]]
binding = "LIC"
id = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
```

**Copiá ese `id`** (el texto largo entre comillas) y pegalo en el archivo
`server/wrangler.toml`, reemplazando donde dice `PEGAR_ID_DEL_KV`. Guardá.

## Paso 4 · Crear las claves de firma de licencias

Volvé a la terminal (o abrí otra en la carpeta del proyecto, no en `server`):

```
node server/keygen.mjs
```

Te muestra dos cosas:

1. Una línea que empieza con `const LIC_PUB=...` → esa es la **pública**.
2. Un JSON largo que empieza con `{"kty":"EC",...,"d":"..."}` → esa es la
   **privada**. Es la importante, no la compartas ni la subas a GitHub.

Dejá esa ventana abierta, las vas a usar en el paso 5 y en el 7.

## Paso 5 · Guardar la clave privada en Cloudflare

En la terminal parada en `server`:

```
npx wrangler secret put LIC_PRIV
```

Te pide el valor. **Pegá el JSON largo del punto 2 del paso anterior** y Enter.
No se ve mientras lo pegás, es normal.

## Paso 6 · Publicar

```
npx wrangler deploy
```

Al final te dice:

```
Published texma-lic
  https://texma-lic.ALGO.workers.dev
```

**Esa línea es la URL del Worker.** Copiala entera. `ALGO` va a ser el
subdominio que Cloudflare te asigne o que hayas elegido — puede no tener nada
que ver con tu nombre. No la inventes, usá la que dice ahí.

Para probar que quedó viva, pegala en el navegador agregándole `/admin/estado`:

```
https://texma-lic.ALGO.workers.dev/admin/estado
```

Tiene que responder `{"setup":true}`. Si ves eso, está funcionando.

## Paso 7 · Prender la licencia en la app

Abrí `TEXMA.html` y buscá estas tres líneas (están juntas, cerca del final):

```js
const LIC_ON=false;
const LIC_API='https://texma-lic.TU-CUENTA.workers.dev';
const LIC_PUB={kty:'EC',crv:'P-256',x:'PEGAR_X',y:'PEGAR_Y'};
```

Cambialas por:

```js
const LIC_ON=true;
const LIC_API='https://texma-lic.ALGO.workers.dev';   // la URL del paso 6
const LIC_PUB={kty:'EC',crv:'P-256',x:'...',y:'...'}; // la línea del paso 4
```

Después:

1. Copiá `TEXMA.html` sobre `index.html` (tienen que ser idénticos).
2. En `sw.js`, subile el número a `CACHE` (`texma-v9` → `texma-v10`).
3. `git add -A`, `git commit -m "prende licencias"`, `git push`.

**Ojo**: desde ese momento la app le pide código a cualquiera que la abra,
incluida tu pareja. Antes de pushear, generá un código en el panel para ella.

## Paso 8 · Tu usuario y contraseña

Abrí `server/panel.html` con doble clic.

1. Pegá la URL del paso 6 → **Conectar**.
2. Aparece **"Primera vez · creá tu cuenta"**. Poné tu nombre, el usuario y la
   contraseña que quieras (mínimo 8 caracteres, con el ojito para verla).
3. Entrás. Esa cuenta queda como dueño.

Anotá la contraseña en algún lado. Se guarda hasheada, o sea que **no hay
manera de recuperarla**: si la perdés, hay que borrar la cuenta a mano con
`npx wrangler kv key delete --binding LIC "user:tuusuario"`.

## Paso 9 · Vender

En el panel: nombre de la clienta, WhatsApp, precio → **Generar link único**.
Le mandás ese link por WhatsApp. Ella lo abre, TEXMA se activa sola en su celu,
y el link muere.

---

## Si algo sale mal

| Qué ves | Qué pasa |
|---|---|
| `npx: command not found` | Falta Node.js. Instalalo de nodejs.org y volvé a abrir la terminal. |
| `You need to login first` | Corré `npx wrangler login` de nuevo. |
| `KV namespace not found` | El `id` del paso 3 no quedó bien pegado en `wrangler.toml`. |
| El panel dice "No hay ningún servidor" | O la URL está mal escrita, o todavía no hiciste el paso 6. Probá la URL con `/admin/estado` en el navegador. |
| `{"setup":false}` cuando esperabas `true` | Ya creaste la cuenta. Andá al panel y entrá con tu usuario. |

---

## Volver atrás

Si te arrepentís, `LIC_ON=false` en `TEXMA.html` y push: la app vuelve a abrir
sin pedir nada. El Worker puede quedar publicado sin molestar a nadie.
