# TEXMA · sistema de licencias

> **¿Primera vez? Andá a [GUIA.md](GUIA.md)** — está explicado paso a paso, sin
> dar nada por sabido: qué es el Worker, de dónde sale la URL, y qué escribir en
> la terminal. Este archivo es el resumen técnico.

Todo esto es **opcional**: mientras `LIC_ON = false` en `TEXMA.html`, la app funciona sin pedir nada.
Cuando quieras empezar a vender, seguí estos pasos.

## Qué protege y qué no

| Situación | ¿Lo frena? |
|---|---|
| Pasar el link de descarga a otra persona | Sí — el link se quema al primer uso |
| Pasar el código de activación a otra persona | Sí — queda atado al primer celular que lo canjea |
| Copiar el HTML/APK ya activado a otro celular | Sí — la licencia no valida (ID distinto) |
| Sacar la licencia del original y revenderla | Sí — al liberar hay que pedirnos reactivación |
| Alguien que sabe programar abre el HTML y borra el chequeo | **No.** Ninguna app web lo evita |

Si más adelante querés blindaje fuerte: empaquetar con Capacitor en un APK y ofuscar el bundle.
Sube mucho el costo de romperlo, pero tampoco es infinito.

## Puesta en marcha (una sola vez, ~20 min)

1. **Claves de firma**
   ```
   node server/keygen.mjs
   ```
   - Pegá la línea `const LIC_PUB=...` en `TEXMA.html` (reemplaza la que dice `PEGAR_X`).
   - Guardá la privada aparte, no va al repo.

2. **Cloudflare Workers** (gratis hasta 100 mil pedidos/día)
   ```
   cd server
   npx wrangler kv namespace create LIC      # copiá el id en wrangler.toml
   npx wrangler secret put LIC_PRIV          # pegá el JSON de la clave privada
   npx wrangler deploy
   ```
   Anotá la URL que te devuelve (`https://texma-lic.TU-CUENTA.workers.dev`).

   **No hay ninguna clave que configurar acá.** Tu usuario y contraseña los
   creás vos desde el panel, la primera vez que lo abrís (paso 4).

3. **Prender la licencia en la app**
   En `TEXMA.html`:
   ```js
   const LIC_ON = true;
   const LIC_API = 'https://texma-lic.TU-CUENTA.workers.dev';
   ```
   Subí los cambios y **subí el número de `CACHE` en `sw.js`** (`texma-v5` → `texma-v6`),
   si no el service worker sirve la versión vieja.

4. **Panel — tu usuario y contraseña**
   Abrí `server/panel.html` con doble clic (funciona desde el disco, no hace falta
   subirlo a ningún lado — y mejor que no lo subas).

   1. Pegá la URL del Worker → **Conectar**.
   2. Como todavía no hay ninguna cuenta, te muestra **«Primera vez · creá tu
      cuenta»**. Ponés tu nombre, el usuario y la contraseña que vos quieras
      (mínimo 8 caracteres, con el ojito para verla mientras la escribís).
   3. Esa primera cuenta queda como **dueño**. Listo, ya estás adentro.

   La contraseña se guarda en el servidor hasheada con PBKDF2 (120 mil vueltas
   + salt al azar). Ni nosotros podemos leerla, así que si la perdés hay que
   borrar la cuenta a mano desde Cloudflare (`wrangler kv key delete`).

   **Invitar a tu pareja**: dentro del panel, tarjeta *«Quién puede entrar»* →
   ponés su nombre, un usuario y una contraseña (hay un botón que sugiere una).
   Al crearla te muestra un cartel con los tres datos para pasarle: servidor,
   usuario y contraseña. Ella entra desde su compu con `panel.html` y genera sus
   propios links. Cada venta queda firmada con el nombre de quien la hizo, y el
   panel muestra el total por vendedor.

   Desde ahí mismo le podés **sacar el acceso** cuando quieras. Cada uno puede
   cambiar su propia contraseña en la tarjeta *«Mi contraseña»*.

## Vender

1. Cobrás.
2. En el panel: *Nueva venta* → nombre + contacto → **Generar link único**.
3. Le mandás ese link por WhatsApp. Al abrirlo entra a TEXMA con el código ya cargado y se activa sola.
4. El link muere ahí. El código queda pegado a ese celular.

## Casos que van a pasar

- **"Cambié de celular"** → panel → *Liberar celu* → que abra la app y pegue su código.
- **"Formateé y perdí todo"** → igual que arriba. Que antes exporte la copia de seguridad desde Ajustes.
- **Alguien revendió** → panel → *Dar de baja*. La app deja de validar en la próxima apertura.

## Datos

Nada de lo que carga la usuaria sale del celular. El Worker solo guarda:
código, nombre, contacto, precio, ID anónimo del dispositivo y fechas.
