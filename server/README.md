# TEXMA · sistema de licencias

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
   npx wrangler secret put ADMIN_KEYS        # ver abajo
   npx wrangler deploy
   ```
   Anotá la URL que te devuelve (`https://texma-lic.TU-CUENTA.workers.dev`).

   **`ADMIN_KEYS` — quién entra al panel.** No hay usuario ni registro: la clave
   *es* el usuario. Vos la inventás. Se pega este JSON con una clave larga por
   persona (mínimo 20 caracteres, que no sea una palabra):

   ```json
   {"lucas":"kQ7v-panel-texma-2026-x9Lm","melu":"tR4w-panel-melu-2026-p2Zq"}
   ```

   Para sumar a tu pareja: agregás su nombre al JSON, volvés a correr
   `npx wrangler secret put ADMIN_KEYS` con el JSON completo (reemplaza al
   anterior) y `npx wrangler deploy`. Le pasás la URL del Worker + su clave y
   ya genera links ella también. Cada venta queda firmada con el nombre de quien
   la generó, y el panel muestra el total por vendedor.

   Para sacarle el acceso a alguien: lo borrás del JSON y volvés a subirlo.

   Generar una clave al azar:
   ```
   node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
   ```

3. **Prender la licencia en la app**
   En `TEXMA.html`:
   ```js
   const LIC_ON = true;
   const LIC_API = 'https://texma-lic.TU-CUENTA.workers.dev';
   ```
   Subí los cambios y **subí el número de `CACHE` en `sw.js`** (`texma-v5` → `texma-v6`),
   si no el service worker sirve la versión vieja.

4. **Panel de dueño**
   Abrí `server/panel.html` con doble clic (funciona desde el disco, no hace falta
   subirlo a ningún lado — y mejor que no lo subas). Poné la URL del Worker y tu
   clave. Ahí ves ventas, activaciones, facturado, el total por vendedor, y generás
   los links.

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
