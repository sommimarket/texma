# Dónde va el sonido de los avisos

El mp3 propio de TEXMA va en:

```
android/app/src/main/res/raw/notif_texma.mp3
```

Reglas de Android para esa carpeta — **si no se cumplen, el build falla**:

- todo en **minúsculas**
- **guión bajo**, nunca guión medio (`notif-texma.mp3` NO sirve)
- sin espacios, sin acentos, sin mayúsculas, sin empezar con número
- y **nada de otros archivos ahí adentro**: todo lo que se ponga en `res/raw/`
  Android lo trata como recurso, hasta un `.txt` rompe la compilación

Recomendado: 1–2 segundos, mp3 o wav, menos de 100 KB.

Después:

```bash
npm run sync
npm run apk:debug
```

El mismo sonido va también en la raíz del proyecto como **`notif-texma.mp3`**
(con guión medio) — ese es el que usa la versión web/PWA.

## ⚠ Si más adelante cambiás el mp3

Android **congela** el sonido dentro del canal de notificaciones cuando la app
se instala. En los celulares que ya la tenían va a seguir sonando el viejo.
Para forzar el cambio hay que cambiar el id del canal en `TEXMA.html`:

```js
const CANAL='texma-avisos';   // → 'texma-avisos-2'
```
