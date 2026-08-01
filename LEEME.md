# TEXMA · Planner personal · V1.2.0

Planner mobile-first, sin cuentas ni internet obligatorio. Todos los datos se
guardan en el dispositivo (localStorage) y sobreviven al cerrar y volver a abrir.

## Dos formas de usarla

| | Cómo | Avisos |
|---|---|---|
| **Android** | APK propio → [`APK.md`](APK.md) | alarmas exactas, sin internet, **sonido de TEXMA** |
| **iPhone / web** | PWA → https://sommimarket.github.io/texma/ | a la hora, sonido del sistema |

En iPhone: Safari → Compartir → *Agregar a inicio*.
En Chrome: menú ⋮ → *Instalar app*. Funciona 100% offline después de la
primera visita.

Repo: https://github.com/sommimarket/texma (cuenta `sommimarket`).
Para actualizar la PWA: editar `TEXMA.html`, copiarlo a `index.html`,
**subir el `CACHE` de `sw.js`** (`texma-v11` → `texma-v12`) y `git push`. Si no
se sube el número, el service worker sigue sirviendo la versión vieja.

También se puede mandar `TEXMA.html` suelto por WhatsApp y abrirlo con Chrome.

### Estructura

Los archivos web viven en la **raíz** (GitHub Pages los publica desde ahí).
`www/` se genera con `npm run build:web` solo para meterlo adentro del APK —
no se edita a mano y no va al repo.

## Qué tiene

- **Hoy**: saludo, agenda del día, tareas, medicamentos, costura, racha de
  entrenamiento y día del ciclo.
- **Agenda**: calendario mensual + próximos eventos y pagos.
- **Tareas**: prioridad, fecha límite, check animado.
- **Costura** ✂: proyectos con maniquí ilustrado y 15 medidas en cm, fotos,
  y toda la plata: **precio, seña, avíos, materiales propios, saldo y ganancia
  limpia**. Marca si **el cliente trajo el material** (si no, se listan los ítems
  que puso ella y se suman al total). Estados **pagado / entregado / cancelado**,
  cuánto hace que se terminó, cuántos días lleva **sin retirar**, y resumen por
  cliente con la **cantidad de arreglos** que pidió cada uno. Al marcar "pagado"
  entra solo como ingreso en Finanzas.
- **Lista de compras**: separada por **categorías** (Súper, Farmacia, Telas,
  Mercería, Casa + las que agregues), con **precios**, total de la lista y
  **historial de precios** por producto para armar presupuestos. Al tildar una
  compra con precio se registra sola como gasto.
- **Finanzas**: balance mensual, y al tocar **Ingresos** o **Gastos** se despliega
  el detalle: por categoría y uno por uno. Pagos recurrentes.
- **Entrenamiento**: **racha estilo Duolingo** (días seguidos, récord, logros),
  calendario del mes donde se anota qué se hizo cada día, y rutinas por día.
- **Ciclo menstrual**: registro informativo — día del ciclo, próximo período,
  ventana fértil estimada, historial y síntomas.
- **Control de stock**: inventario general para cualquier negocio (mercería,
  reventa, insumos). Cantidad, mínimo, costo, precio de venta, valor del
  inventario, alertas de reposición y movimientos de entrada/venta que pueden
  ir directo a Finanzas.
- **Notas, Agradecimientos, Pasatiempos, Medicamentos.**
- **Perfil y ajustes**: tu **foto y tu nombre** (TEXMA te saluda con eso),
  **color de la cabecera**, 7 paletas + color libre, secciones on/off,
  notificaciones con sonido, prueba y diagnóstico, exportar/importar copia,
  borrar todo.

## Primera vez

3 pantallas de presentación (se pasan deslizando o con *Siguiente*), en la
última un **botón deslizable** para entrar, y después un formulario para cargar
**foto de perfil, nombre y color de cabecera**. Todo se puede cambiar más tarde
desde Perfil.

## Aspecto

TEXMA es **siempre clara**. No hay modo oscuro: `color-scheme:only light` +
`forced-color-adjust:none` le prohíben al celular oscurecerla por su cuenta.

Arriba hay un **banner de color** (naranja por defecto) con la foto, el saludo
y la **campanita**, que muestra todo lo que TEXMA te va a avisar hoy.

## Navegación

Barra oscura flotante: **Hoy · Agenda · Finanzas · Costura**, y el **+ del
centro** abre *todas las secciones* como píldoras, una abajo de la otra.

Para **agregar** hay un **+ flotante abajo a la derecha** en cada sección, que
carga lo que corresponda a esa pantalla.

## Notificaciones

Remedios, citas, pagos, agradecimiento, entrenamiento y ciclo. El sonido se
elige en Perfil → Notificaciones: **TEXMA / del celu / mudo**.

**En el APK de Android** son alarmas del sistema: hora exacta, **con la app
cerrada, sin internet y con el sonido de TEXMA**. No hace falta ningún
servidor. Ver [`APK.md`](APK.md) y [`android/SONIDO.md`](android/SONIDO.md).

**En la PWA** suenan a la hora con la app abierta o recién usada, y hacen
puesta al día al abrirla. Con la app cerrada el sonido lo pone el navegador —
un sonido propio ahí es imposible en la web.

Opcional, solo para avisar con la PWA cerrada (iPhone): **Web Push**, ya
cableado en `sw.js` y en el bloque `AVISOS EN SEGUNDO PLANO` de `TEXMA.html`,
con backend en [`server/push/`](server/push/). Guía:
[`server/NOTIFICACIONES.md`](server/NOTIFICACIONES.md). Con el APK andando no
hace falta.

## Copias de seguridad

Perfil → "Exportar copia de seguridad" descarga un `.json` con todo.
Se restaura con "Importar copia" (acepta copias viejas de TEXMA y del viejo JIOM).

## Venta / licencias

Hoy: Cloudflare Worker, ver [`server/README.md`](server/README.md). Mientras
`LIC_ON = false` en `TEXMA.html`, la app funciona sin pedir código.

Casa futura de todas las apps (catálogo, licencias y panel multi-app en un solo
Supabase): [`server/SUPABASE.md`](server/SUPABASE.md).
