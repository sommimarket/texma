# TEXMA · avisos en segundo plano

Guía para que TEXMA avise **con la app cerrada**: remedios, citas, pagos,
eventos. Leer entero antes de tocar nada — hay una limitación importante
sobre el sonido.

---

## Lo primero: qué se puede y qué no

| | PWA (lo que hay hoy) | APK nativa (Capacitor) |
|---|---|---|
| Avisar con la app cerrada | **Sí**, con Web Push (esta guía) | Sí |
| Avisar sin internet | No (el push necesita red) | **Sí** (alarma local del celu) |
| Hora exacta garantizada | Casi (±1 min, depende del cron y de FCM) | **Sí** (`AlarmManager` exacto) |
| **Sonido propio de TEXMA con la app cerrada** | **NO se puede** | **Sí** |
| Sonido propio con la app abierta | Sí (ya está hecho) | Sí |
| iPhone | Solo si la instalan desde Safari → "Agregar a inicio" (iOS 16.4+) | Sí |

### Por qué el sonido propio no se puede en la web

En Android el sonido de una notificación lo define el **canal de
notificaciones**, y una PWA usa el canal del navegador (Chrome). La opción
`sound` de la Notification API está en el estándar pero **ningún navegador la
implementa**. No hay truco: mientras TEXMA sea una PWA, con la app cerrada
suena el sonido de notificaciones que tenga configurado Chrome.

**Lo que sí está hecho en la app**: con TEXMA abierta (o recién abierta) suena
`notif-texma.mp3`. Se elige en *Perfil → Notificaciones → Sonido del aviso*
(`♪ TEXMA` / `Del celu` / `Mudo`). Si el archivo todavía no está subido, la app
sintetiza una campanita sola, así nunca queda muda.

👉 **Para subir el sonido**: poner un `notif-texma.mp3` (corto, 1–2 segundos,
menos de 100 KB) en la raíz del proyecto, al lado de `index.html`. Ya está en
la lista de precarga de `sw.js`.

👉 **Si el sonido propio es innegociable**, hay que empaquetar TEXMA como APK
con Capacitor y `@capacitor/local-notifications`: ahí se crea un canal propio
con el `.mp3` en `android/app/src/main/res/raw/` y además las alarmas son
exactas y funcionan sin internet. Es el mismo HTML, cambia el envoltorio.

---

## Instalar el push (Supabase + cron)

### 1. Claves VAPID

```bash
npx web-push generate-vapid-keys
```

Guarda las dos. La **pública** va en la app, la **privada** nunca sale del
servidor.

### 2. Base de datos

Supabase → **SQL Editor** → pegar y correr `server/push/schema.sql`.

### 3. Edge Function

```bash
supabase functions new texma-push
# copiar server/push/index.ts adentro de supabase/functions/texma-push/
supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:vos@tumail.com
supabase functions deploy texma-push --no-verify-jwt
```

Queda en `https://TU-PROYECTO.supabase.co/functions/v1/texma-push`.

### 4. El cron

SQL Editor → `server/push/cron.sql`, cambiando `TU-PROYECTO` y la
`service_role key`. Corre cada minuto y dispara lo que venció.

> Alternativa sin pg_cron: un **Vercel Cron** (`vercel.json` con
> `{"crons":[{"path":"/api/tick","schedule":"* * * * *"}]}`) que le pegue a
> `/texma-push/tick`. En el plan gratis de Vercel el cron es **1 vez por día**,
> así que para avisos por hora conviene el pg_cron de Supabase.

### 5. Prender el push en la app

En `TEXMA.html`, buscar el bloque `AVISOS EN SEGUNDO PLANO` y completar:

```js
const PUSH_ON  = true;
const PUSH_API = 'https://TU-PROYECTO.supabase.co/functions/v1/texma-push';
const VAPID_PUB= 'BKx...';   // la clave PÚBLICA
```

Subir el `CACHE` de `sw.js` (`texma-v11` → `texma-v12`) y publicar.

---

## Cómo funciona por dentro

1. La app pide permiso de notificaciones y se suscribe al push del navegador.
2. Cada vez que se guarda algo, calcula **los avisos de los próximos 7 días**
   (remedios, citas, pagos, agradecimiento, entreno, ciclo) y los manda a
   `/sync` junto con la suscripción. El cálculo es el mismo `dueList()` que ya
   usaba la app.
3. El cron llama a `/tick` cada minuto: busca lo que ya venció, lo manda por
   Web Push y lo marca como enviado.
4. El `sw.js` recibe el `push` y muestra la notificación aunque TEXMA esté
   cerrada. Tocarla abre la app.

Nada de esto manda datos personales de más: viajan el texto del aviso y un id
anónimo de dispositivo (`texma_dev`), no el nombre ni la foto ni los datos de
la agenda completa.

### Si una suscripción muere

Cuando el navegador la tira, el push devuelve 404/410 y `/tick` borra ese
dispositivo solo. La app se vuelve a suscribir la próxima vez que se abre.

---

## Probar que anda

1. Instalar TEXMA en el celu (Chrome → ⋮ → *Instalar app*).
2. Perfil → Notificaciones → **Activar avisos** → *Probar un aviso ahora*.
3. Cargar un remedio 2 minutos en el futuro, **cerrar TEXMA del todo** y esperar.
4. En Supabase: `select * from texma_alerts order by at desc limit 20;` para ver
   si quedó agendado y si salió (`sent_at`).

En *Perfil → Notificaciones* el diagnóstico de abajo dice permiso, si está
instalada y si los avisos con la app cerrada están activos.
