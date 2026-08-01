# TEXMA · app de Android (APK)

El mismo `TEXMA.html` sirve para las dos cosas:

- **Web / iPhone** → PWA en https://sommimarket.github.io/texma/
- **Android** → APK propio, con **alarmas exactas del sistema, sin internet y
  con el sonido de TEXMA**.

Los archivos web viven en la **raíz** (así GitHub Pages los publica sin
configurar nada). `www/` se **genera** para meter adentro del APK — no se edita
a mano y no va al repo.

```
TEXMA.html ─┬─► index.html  ──► GitHub Pages   (PWA)
            └─► www/        ──► android/       (APK)
```

## Qué hace falta (ya está todo en esta máquina)

| | Versión | Dónde |
|---|---|---|
| Node | 24 | ✓ |
| JDK | 17 | ✓ `C:\Program Files\Android\Android Studio\jbr` |
| Android SDK | — | ✓ `%LOCALAPPDATA%\Android\Sdk` |

Si Gradle se queja de `JAVA_HOME`, es porque apunta a un JDK viejo. Fijalo una
vez en Windows (Variables de entorno del sistema):

```
JAVA_HOME     = C:\Program Files\Android\Android Studio\jbr
ANDROID_HOME  = C:\Users\lucas\AppData\Local\Android\Sdk
```

## Comandos del día a día

```bash
npm run build:web     # copia los archivos de la raíz a www/
npm run sync          # build:web + mete todo adentro de android/
npm run apk:debug     # APK de prueba (se instala en tu celu, no se puede vender)
npm run apk           # APK de release (hay que firmarlo, ver abajo)
npm run abrir:android # abre Android Studio, para emulador o depurar
```

El APK sale en:
```
android\app\build\outputs\apk\debug\app-debug.apk
android\app\build\outputs\apk\release\app-release.apk
```

## Instalarlo en el celu

1. Pasar el `.apk` por WhatsApp, cable o Drive.
2. En el celu: abrirlo → Android va a pedir permitir *"instalar apps
   desconocidas"* para esa app (WhatsApp, Archivos, etc.). Es normal.
3. Al primer aviso, aceptar el permiso de **notificaciones**.

## El sonido propio

1. Dejar el mp3 en **dos lugares**:
   - `notif-texma.mp3` en la raíz → lo usa la versión web
   - `android/app/src/main/res/raw/notif_texma.mp3` → lo usa el APK
     (**guión BAJO**, minúsculas, sin espacios — si no, no compila)
2. `npm run apk:debug`

Detalle de `res/raw/`: **no pongas ningún otro archivo ahí**. Todo lo que esté
en esa carpeta Android lo trata como recurso y hasta un `.txt` rompe la
compilación. Las notas están en [`android/SONIDO.md`](android/SONIDO.md).

⚠ Android **congela** el sonido dentro del canal de notificaciones cuando la
app se instala. Si más adelante cambiás el mp3, en los celulares que ya la
tenían va a seguir sonando el viejo. Para forzarlo hay que cambiar el id del
canal en `TEXMA.html`:

```js
const CANAL='texma-avisos';   // → 'texma-avisos-2'
```

## Firmar el release (para vender)

Se hace **una sola vez**. Sin este archivo no vas a poder publicar
actualizaciones nunca más — guardalo en dos lugares y anotá las contraseñas.

```bash
keytool -genkey -v -keystore texma-release.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias texma
```

`android/keystore.properties` (ya está en `.gitignore`):

```properties
storeFile=../texma-release.jks
storePassword=LA-QUE-PUSISTE
keyAlias=texma
keyPassword=LA-QUE-PUSISTE
```

Y en `android/app/build.gradle`, adentro de `android { }`:

```gradle
def props = new Properties()
def f = rootProject.file('keystore.properties')
if (f.exists()) props.load(new FileInputStream(f))

signingConfigs {
    release {
        storeFile file(props['storeFile'])
        storePassword props['storePassword']
        keyAlias props['keyAlias']
        keyPassword props['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## Qué cambia adentro del APK

`TEXMA.html` detecta solo dónde está corriendo (`NATIVO`):

| | PWA (web) | APK |
|---|---|---|
| Avisos | Notification API + service worker | **`LocalNotifications` de Android** |
| Hora | aproximada, con la app viva | **exacta, con la app cerrada** |
| Sin internet | no avisa | **avisa igual** |
| Sonido | del navegador | **`notif_texma.mp3`** |
| Ícono en la barra | el del navegador | `ic_stat_texma` |
| Service worker | sí | no (los archivos ya son locales) |

Las alarmas se reprograman solas cada vez que se guarda algo y cada vez que se
abre la app, siempre 7 días para adelante.

## Íconos y splash

Se generan de `assets/` con:

```bash
npx @capacitor/assets generate --android \
    --iconBackgroundColor "#EC1968" --splashBackgroundColor "#F3EEE5"
```

`assets/` tiene los originales (`icon.png` 1024, `icon-foreground.png`,
`icon-background.png`, `splash.png`). Solo hay que volver a correrlo si cambia
el logo.

## Subir de versión

1. Editar `TEXMA.html`, `cp TEXMA.html index.html`.
2. Subir el `CACHE` de `sw.js` (para la PWA).
3. Subir `versionCode` y `versionName` en `android/app/build.gradle`
   (el `versionCode` tiene que crecer siempre, aunque sea de a 1).
4. `npm run apk` y repartir el nuevo `.apk`.

## iPhone

No hay APK para iOS y **Apple no deja instalar apps fuera de la App Store**.
Los de iPhone usan la PWA: Safari → Compartir → *Agregar a inicio*. Anda todo
salvo el sonido propio (usa el del sistema).

Si algún día querés la App Store: USD 99/año y hace falta una Mac (o un build
en la nube tipo Codemagic, que tiene macOS gratis unos minutos por mes).
